import * as crypto from "crypto";
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { ESTADO_SOLICITUD_KIOSKO, MAX_SOLICITUDES_KIOSKO_PENDIENTES } from "./constants";
import { EstadoSolicitudKioskoDto, SolicitudKioskoResponseDto } from "./dto";
import { EquiposRepository } from "./repositories/equipos.repository";
import {
  SolicitudKiosko,
  SolicitudesKioskoRepository,
} from "./repositories/solicitudes-kiosko.repository";
import { importarLlavePublica } from "./utils/firma-kiosko.util";

const TABLA = "solicitudes_kiosko";

const sha256 = (valor: string) => crypto.createHash("sha256").update(valor).digest("hex");

/** Código corto y estable para reconocer el equipo. No sirve como clave de acceso. */
export function codigoDeEquipo(secretoHash: string): string {
  const base = sha256(`codigo:${secretoHash}`).slice(0, 8).toUpperCase();
  return `KSK-${base.slice(0, 4)}-${base.slice(4)}`;
}

@Injectable()
export class SolicitudesKioskoService {
  constructor(
    private readonly solicitudes: SolicitudesKioskoRepository,
    private readonly equipos: EquiposRepository,
    private readonly auditService: AuditService,
  ) {}

  findAll(): Promise<SolicitudKioskoResponseDto[]> {
    return this.solicitudes.findAll();
  }

  /** Registra el navegador la primera vez y, después, informa el estado de su solicitud. */
  async registrar(llavePublica: string): Promise<EstadoSolicitudKioskoDto> {
    if (!importarLlavePublica(llavePublica)) {
      throw new BadRequestException("El identificador del equipo no es válido.");
    }
    // En `secreto_hash` va la huella de la llave pública; la privada nunca sale del navegador
    const secretoHash = sha256(llavePublica);
    const actual = await this.solicitudes.findBySecretoHash(secretoHash);

    if (!actual) {
      const pendientes = await this.solicitudes.contarPendientesActivas();
      if (pendientes >= MAX_SOLICITUDES_KIOSKO_PENDIENTES) {
        throw new HttpException(
          "Hay demasiadas solicitudes pendientes. Pida al administrador que las revise.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      const codigo = codigoDeEquipo(secretoHash);
      await this.solicitudes.crear(codigo, secretoHash);
      return { codigo, estado: ESTADO_SOLICITUD_KIOSKO.PENDIENTE };
    }

    if (actual.estado === ESTADO_SOLICITUD_KIOSKO.APROBADA && !(await this.conservaClave(actual))) {
      // El kiosko se volvió a autorizar en otro navegador: este debe pedir aprobación otra vez
      await this.solicitudes.reabrir(actual.id);
      return { codigo: actual.codigo, estado: ESTADO_SOLICITUD_KIOSKO.PENDIENTE };
    }

    await this.solicitudes.registrarConsulta(actual.id);
    return { codigo: actual.codigo, estado: actual.estado as EstadoSolicitudKioskoDto["estado"] };
  }

  async aprobar(id: string, equipoId: string, actorId: string, ip?: string): Promise<void> {
    const solicitud = await this.obtener(id);
    if (solicitud.estado === ESTADO_SOLICITUD_KIOSKO.APROBADA) {
      throw new BadRequestException("Esta solicitud ya fue aprobada.");
    }
    const equipo = await this.equipos.findById(equipoId);
    if (!equipo) throw new NotFoundException("Equipo no encontrado.");
    if (!equipo.activo) {
      throw new BadRequestException("No se puede autorizar un equipo desactivado.");
    }

    // La llave del navegador pasa a identificar al kiosko; reemplaza la anterior
    await this.equipos.authorize(equipoId, solicitud.secretoHash, actorId);
    await this.solicitudes.resolver(id, ESTADO_SOLICITUD_KIOSKO.APROBADA, actorId, equipoId);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: TABLA,
      registroId: id,
      valorAnterior: { estado: solicitud.estado },
      valorNuevo: { estado: ESTADO_SOLICITUD_KIOSKO.APROBADA, codigo: solicitud.codigo, equipoId },
      direccionIp: ip,
    });
  }

  async rechazar(id: string, actorId: string, ip?: string): Promise<void> {
    const solicitud = await this.obtener(id);
    if (solicitud.estado !== ESTADO_SOLICITUD_KIOSKO.PENDIENTE) {
      throw new BadRequestException("Solo se puede rechazar una solicitud pendiente.");
    }
    await this.solicitudes.resolver(id, ESTADO_SOLICITUD_KIOSKO.RECHAZADA, actorId, null);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: TABLA,
      registroId: id,
      valorAnterior: { estado: solicitud.estado },
      valorNuevo: { estado: ESTADO_SOLICITUD_KIOSKO.RECHAZADA, codigo: solicitud.codigo },
      direccionIp: ip,
    });
  }

  private async obtener(id: string): Promise<SolicitudKiosko> {
    const solicitud = await this.solicitudes.findById(id);
    if (!solicitud) throw new NotFoundException("Solicitud no encontrada.");
    return solicitud;
  }

  private async conservaClave(solicitud: SolicitudKiosko): Promise<boolean> {
    const equipo = await this.equipos.findByTokenHash(solicitud.secretoHash);
    return equipo?.id === solicitud.equipoId;
  }
}
