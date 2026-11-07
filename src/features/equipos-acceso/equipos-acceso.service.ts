import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { ESTADO_EQUIPO_ACCESO, EstadoEquipoAcceso } from "./constants";
import { EquipoAccesoResponseDto } from "./dto";
import { EquiposAccesoRepository } from "./repositories/equipos-acceso.repository";

const TABLA = "equipos_acceso";

@Injectable()
export class EquiposAccesoService {
  constructor(
    private readonly repositorio: EquiposAccesoRepository,
    private readonly auditService: AuditService,
  ) {}

  findAll(estado?: EstadoEquipoAcceso): Promise<EquipoAccesoResponseDto[]> {
    return this.repositorio.findAll(estado);
  }

  async autorizar(
    id: string,
    actorId: string,
    vigenteHasta: string | undefined,
    ip?: string,
  ): Promise<EquipoAccesoResponseDto> {
    if (vigenteHasta && new Date(vigenteHasta).getTime() <= Date.now()) {
      throw new BadRequestException("La fecha límite debe ser posterior a hoy.");
    }
    return this.resolver(
      id,
      actorId,
      ESTADO_EQUIPO_ACCESO.AUTORIZADO,
      null,
      vigenteHasta ?? null,
      ip,
    );
  }

  rechazar(
    id: string,
    actorId: string,
    motivo?: string,
    ip?: string,
  ): Promise<EquipoAccesoResponseDto> {
    return this.resolver(id, actorId, ESTADO_EQUIPO_ACCESO.RECHAZADO, motivo ?? null, null, ip);
  }

  revocar(
    id: string,
    actorId: string,
    motivo?: string,
    ip?: string,
  ): Promise<EquipoAccesoResponseDto> {
    return this.resolver(id, actorId, ESTADO_EQUIPO_ACCESO.REVOCADO, motivo ?? null, null, ip);
  }

  // Transiciones: pendiente → autorizado/rechazado; autorizado → revocado; rechazado/revocado → autorizado.
  private permitida(desde: EstadoEquipoAcceso, hacia: EstadoEquipoAcceso): boolean {
    const { PENDIENTE, AUTORIZADO, RECHAZADO, REVOCADO } = ESTADO_EQUIPO_ACCESO;
    if (hacia === AUTORIZADO) return desde !== AUTORIZADO;
    if (hacia === RECHAZADO) return desde === PENDIENTE;
    return hacia === REVOCADO && desde === AUTORIZADO;
  }

  private async resolver(
    id: string,
    actorId: string,
    estado: EstadoEquipoAcceso,
    motivo: string | null,
    vigenteHasta: string | null,
    ip?: string,
  ): Promise<EquipoAccesoResponseDto> {
    const actual = await this.repositorio.findById(id);
    if (!actual) throw new NotFoundException("Equipo de acceso no encontrado.");
    if (!this.permitida(actual.estado, estado)) {
      throw new BadRequestException("El equipo no está en un estado que permita esta acción.");
    }

    const actualizado = await this.repositorio.resolver(id, {
      estado,
      resueltoPor: actorId,
      motivo: motivo?.trim() || null,
      vigenteHasta,
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: TABLA,
      registroId: id,
      valorAnterior: { estado: actual.estado },
      valorNuevo: { estado, motivo: actualizado.motivo, vigenteHasta: actualizado.vigenteHasta },
      direccionIp: ip,
    });
    return actualizado;
  }
}
