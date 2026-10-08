import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { CreateTurnoDto, TurnoResponseDto, UpdateTurnoDto } from "./dto";
import { TurnosRepository } from "./repositories/turnos.repository";
import { validateTurnoTimes } from "./utils/turno-validator.util";

@Injectable()
export class TurnosService {
  constructor(
    private readonly turnosRepository: TurnosRepository,
    private readonly auditService: AuditService,
  ) {}

  async findAll(): Promise<TurnoResponseDto[]> {
    return this.turnosRepository.findAll();
  }

  async findById(id: string): Promise<TurnoResponseDto> {
    const turno = await this.turnosRepository.findById(id);
    if (!turno) {
      throw new NotFoundException("Turno no encontrado.");
    }
    return turno;
  }

  async create(dto: CreateTurnoDto, actorId: string, ip?: string): Promise<TurnoResponseDto> {
    // 1. Validar que no exista ya un turno para ese tipo de persona
    const existing = await this.turnosRepository.findByAplicaA(dto.aplicaA);
    if (existing) {
      throw new ConflictException("Ya existe un turno para este tipo de persona.");
    }

    // 2. Validar reglas de horas y ventanas
    validateTurnoTimes(dto);

    // 3. Crear el turno
    const created = await this.turnosRepository.create(dto);

    // 4. Auditoría asíncrona
    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "turnos",
      registroId: created.id,
      valorNuevo: {
        aplicaA: created.aplicaA,
        horaEntrada: created.horaEntrada,
        horaSalida: created.horaSalida,
        toleranciaMin: created.toleranciaMin,
      },
      direccionIp: ip,
    });

    return created;
  }

  async update(
    id: string,
    dto: UpdateTurnoDto,
    actorId: string,
    ip?: string,
  ): Promise<TurnoResponseDto> {
    const current = await this.findById(id);

    // Si solo viene activo, tratar como toggleActivo
    if (dto.activo !== undefined && !dto.horaEntrada && !dto.horaSalida) {
      return this.toggleActivo(id, dto.activo, actorId, ip);
    }

    const merged = {
      horaEntrada: dto.horaEntrada ?? current.horaEntrada,
      horaSalida: dto.horaSalida ?? current.horaSalida,
      ventanaEntradaInicio: dto.ventanaEntradaInicio ?? current.ventanaEntradaInicio,
      ventanaEntradaFin: dto.ventanaEntradaFin ?? current.ventanaEntradaFin,
      ventanaSalidaInicio: dto.ventanaSalidaInicio ?? current.ventanaSalidaInicio,
      ventanaSalidaFin: dto.ventanaSalidaFin ?? current.ventanaSalidaFin,
      toleranciaMin: dto.toleranciaMin ?? current.toleranciaMin,
      diasLaborables: dto.diasLaborables ?? current.diasLaborables,
      ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
    };

    // Validar reglas de horas y ventanas
    validateTurnoTimes({
      horaEntrada: merged.horaEntrada,
      horaSalida: merged.horaSalida,
      ventanaEntradaInicio: merged.ventanaEntradaInicio,
      ventanaEntradaFin: merged.ventanaEntradaFin,
      ventanaSalidaInicio: merged.ventanaSalidaInicio,
      ventanaSalidaFin: merged.ventanaSalidaFin,
      toleranciaMin: merged.toleranciaMin,
      diasLaborables: merged.diasLaborables,
    });

    const updated = await this.turnosRepository.update(id, merged);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "turnos",
      registroId: id,
      valorAnterior: {
        horaEntrada: current.horaEntrada,
        horaSalida: current.horaSalida,
        toleranciaMin: current.toleranciaMin,
      },
      valorNuevo: {
        horaEntrada: updated.horaEntrada,
        horaSalida: updated.horaSalida,
        toleranciaMin: updated.toleranciaMin,
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
  ): Promise<TurnoResponseDto> {
    const current = await this.findById(id);

    const updated = await this.turnosRepository.toggleActivo(id, activo);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "turnos",
      registroId: id,
      valorAnterior: { activo: current.activo },
      valorNuevo: { activo: updated.activo },
      direccionIp: ip,
    });

    return updated;
  }
}
