import * as crypto from "crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import {
  AutorizarEquipoResponseDto,
  CreateEquipoDto,
  EquipoResponseDto,
  UpdateEquipoDto,
  ValidarEquipoResponseDto,
} from "./dto";
import { EquiposRepository } from "./repositories/equipos.repository";
import { importarLlavePublica } from "./utils/firma-kiosko.util";

@Injectable()
export class EquiposService {
  constructor(
    private readonly equiposRepository: EquiposRepository,
    private readonly auditService: AuditService,
  ) {}

  private hashToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
  }

  async findAll(): Promise<EquipoResponseDto[]> {
    return this.equiposRepository.findAll();
  }

  async findById(id: string): Promise<EquipoResponseDto> {
    const equipo = await this.equiposRepository.findById(id);
    if (!equipo) {
      throw new NotFoundException("Equipo no encontrado.");
    }
    return equipo;
  }

  async create(dto: CreateEquipoDto, actorId: string, ip?: string): Promise<EquipoResponseDto> {
    // 1. Validar nombre repetido
    const existing = await this.equiposRepository.findByName(dto.nombre);
    if (existing) {
      throw new ConflictException("Ya existe un equipo con ese nombre.");
    }

    // 2. Validar que tenga usuarios permitidos
    if (!dto.usuariosPermitidos || dto.usuariosPermitidos.trim().length === 0) {
      throw new BadRequestException("Indique quién puede usar este equipo.");
    }

    // 3. Regla de negocio: Kiosko de sesiones
    if (dto.proposito === "sesiones") {
      const isKiosko = dto.tipo === "kiosko";
      const isSoloDocentes = dto.usuariosPermitidos.trim().toLowerCase() === "docentes";
      if (!isKiosko || !isSoloDocentes) {
        throw new BadRequestException(
          "Un equipo de sesiones debe ser un kiosko de uso exclusivo de docentes.",
        );
      }
    }

    const created = await this.equiposRepository.create(dto);

    // 4. Auditoría
    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "equipos_autorizados",
      registroId: created.id,
      valorNuevo: {
        nombre: created.nombre,
        tipo: created.tipo,
        proposito: created.proposito,
        usuariosPermitidos: created.usuariosPermitidos,
      },
      direccionIp: ip,
    });

    return created;
  }

  async update(
    id: string,
    dto: UpdateEquipoDto,
    actorId: string,
    ip?: string,
  ): Promise<EquipoResponseDto> {
    const current = await this.findById(id);

    if (current.nombre.toLowerCase() !== dto.nombre.trim().toLowerCase()) {
      const existing = await this.equiposRepository.findByName(dto.nombre);
      if (existing && existing.id !== id) {
        throw new ConflictException("Ya existe un equipo con ese nombre.");
      }
    }

    if (!dto.usuariosPermitidos || dto.usuariosPermitidos.trim().length === 0) {
      throw new BadRequestException("Indique quién puede usar este equipo.");
    }

    if (current.proposito === "sesiones") {
      if (dto.usuariosPermitidos.trim().toLowerCase() !== "docentes") {
        throw new BadRequestException(
          "Un equipo de sesiones debe ser un kiosko de uso exclusivo de docentes.",
        );
      }
    }

    const updated = await this.equiposRepository.update(id, dto);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "equipos_autorizados",
      registroId: id,
      valorAnterior: {
        nombre: current.nombre,
        ubicacion: current.ubicacion,
        usuariosPermitidos: current.usuariosPermitidos,
      },
      valorNuevo: {
        nombre: updated.nombre,
        ubicacion: updated.ubicacion,
        usuariosPermitidos: updated.usuariosPermitidos,
      },
      direccionIp: ip,
    });

    return updated;
  }

  async toggleActivo(
    id: string,
    activo: boolean,
    actorId: string,
    ip?: string,
  ): Promise<EquipoResponseDto> {
    const current = await this.findById(id);

    const updated = await this.equiposRepository.toggleActivo(id, activo);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "equipos_autorizados",
      registroId: id,
      valorAnterior: { activo: current.activo },
      valorNuevo: { activo: updated.activo },
      direccionIp: ip,
    });

    return updated;
  }

  async autorizar(
    id: string,
    llavePublica: string,
    actorId: string,
    ip?: string,
  ): Promise<AutorizarEquipoResponseDto> {
    const current = await this.findById(id);

    if (!current.activo) {
      throw new BadRequestException("No se puede autorizar un equipo desactivado.");
    }

    if (!importarLlavePublica(llavePublica)) {
      throw new BadRequestException("El identificador del equipo no es válido.");
    }
    // Solo se guarda la huella de la llave pública
    const tokenHash = this.hashToken(llavePublica);

    const updated = await this.equiposRepository.authorize(id, tokenHash, actorId);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "equipos_autorizados",
      registroId: id,
      valorNuevo: {
        autorizado: true,
        autorizadoPorId: actorId,
        fechaAutorizacion: updated.autorizadoEn,
      },
      direccionIp: ip,
    });

    return {
      message: "Equipo autorizado. Ya puede usarse como kiosko.",
      equipo: updated,
    };
  }

  async validarKiosko(rawToken: string | undefined): Promise<ValidarEquipoResponseDto> {
    if (!rawToken || rawToken.trim().length === 0) {
      throw new UnauthorizedException(
        "Este equipo no está autorizado. Comuníquese con el área de TI.",
      );
    }

    const tokenHash = this.hashToken(rawToken.trim());
    const equipo = await this.equiposRepository.findByTokenHash(tokenHash);

    if (!equipo || !equipo.autorizado || !equipo.activo) {
      throw new UnauthorizedException(
        "Este equipo no está autorizado. Comuníquese con el área de TI.",
      );
    }

    // Actualizar marca de último acceso
    await this.equiposRepository.updateLastAccess(equipo.id);

    return {
      valido: true,
      message: "Equipo autorizado y activo.",
      equipo,
    };
  }
}
