import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { MENSAJES, TIPOS_SUSPENDEN_POR_DEFECTO } from "./constants";
import {
  CalendarioConsultaResponseDto,
  CreateEventoCalendarioDto,
  EventoCalendarioResponseDto,
  UpdateEventoCalendarioDto,
} from "./dto";
import { EventoPersistido, SesionesAfectadas } from "./interfaces";
import { AniosAcademicosService } from "../anio-escolar/anios.service";
import { CalendarioRepository } from "./repositories/calendario.repository";
import {
  diasEntre,
  esFechaIso,
  finDeMes,
  hoyEnColegio,
  inicioDeMes,
  mensajeSiRangoInvalido,
} from "./utils";

@Injectable()
export class CalendarioService {
  constructor(
    private readonly calendarioRepository: CalendarioRepository,
    private readonly aniosService: AniosAcademicosService,
    private readonly auditService: AuditService,
  ) {}

  async consultar(mes?: number, anio?: number): Promise<CalendarioConsultaResponseDto> {
    const vigente = await this.aniosService.findEnCurso();
    const defecto = this.rangoPorDefecto(vigente);
    const anioNumero = anio ?? defecto.anio;
    const mesNumero = mes ?? defecto.mes;
    if (!Number.isInteger(mesNumero) || mesNumero < 1 || mesNumero > 12) {
      throw new BadRequestException(MENSAJES.mesInvalido);
    }

    const desde = inicioDeMes(anioNumero, mesNumero);
    const hasta = finDeMes(anioNumero, mesNumero);
    const eventos = await this.calendarioRepository.listarEnRango(vigente.id, desde, hasta);

    return {
      anioAcademicoId: vigente.id,
      anio: vigente.anio,
      desde,
      hasta,
      eventos,
      diasSinClases: this.diasSinClases(eventos, desde, hasta),
    };
  }

  async create(
    dto: CreateEventoCalendarioDto,
    actorId: string,
    ip?: string,
  ): Promise<EventoCalendarioResponseDto> {
    this.assertRangoEvento(dto.fechaInicio, dto.fechaFin);
    const anio = await this.resolverAnio(dto.anioAcademicoId);
    const suspendeClases = dto.suspendeClases ?? TIPOS_SUSPENDEN_POR_DEFECTO.has(dto.tipo);

    const creado = await this.calendarioRepository.create({
      anioAcademicoId: anio.id,
      titulo: dto.titulo.trim(),
      descripcion: dto.descripcion?.trim() || null,
      tipo: dto.tipo,
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
      suspendeClases,
      creadoPorId: actorId,
    });

    const mensaje = await this.aplicarSuspension(creado);
    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "calendario_eventos",
      registroId: creado.id,
      valorNuevo: this.resumen(creado),
      direccionIp: ip,
    });

    return mensaje ? { ...creado, mensaje } : creado;
  }

  async update(
    id: string,
    dto: UpdateEventoCalendarioDto,
    actorId: string,
    ip?: string,
  ): Promise<EventoCalendarioResponseDto> {
    const actual = await this.requireEvento(id);
    const fechaInicio = dto.fechaInicio ?? actual.fechaInicio;
    const fechaFin = dto.fechaFin ?? actual.fechaFin;
    this.assertRangoEvento(fechaInicio, fechaFin);

    const tipo = dto.tipo ?? actual.tipo;
    const suspendeClases =
      dto.suspendeClases ??
      (dto.tipo && dto.suspendeClases === undefined
        ? TIPOS_SUSPENDEN_POR_DEFECTO.has(tipo)
        : actual.suspendeClases);

    const actualizado = await this.calendarioRepository.update(id, {
      ...(dto.titulo !== undefined ? { titulo: dto.titulo.trim() } : {}),
      ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion?.trim() || null } : {}),
      tipo,
      fechaInicio,
      fechaFin,
      suspendeClases,
    });

    const mensaje = await this.aplicarSuspension(actualizado);
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "calendario_eventos",
      registroId: id,
      valorAnterior: this.resumen(actual),
      valorNuevo: this.resumen(actualizado),
      direccionIp: ip,
    });

    return mensaje ? { ...actualizado, mensaje } : actualizado;
  }

  async remove(id: string, actorId: string, ip?: string): Promise<void> {
    const actual = await this.requireEvento(id);
    await this.calendarioRepository.remove(id);
    await this.auditService.log({
      usuarioId: actorId,
      accion: "eliminar",
      tabla: "calendario_eventos",
      registroId: id,
      valorAnterior: this.resumen(actual),
      direccionIp: ip,
    });
  }

  /** Lo consulta RF-011 para no generar sesiones en días que suspenden clases. */
  async suspendeClasesEn(fecha: string): Promise<boolean> {
    return this.calendarioRepository.suspendeClasesEn(fecha);
  }

  private async resolverAnio(anioAcademicoId?: string) {
    if (anioAcademicoId) {
      return this.aniosService.findById(anioAcademicoId);
    }
    return this.aniosService.findEnCurso();
  }

  private async requireEvento(id: string): Promise<EventoPersistido> {
    const evento = await this.calendarioRepository.findById(id);
    if (!evento) throw new NotFoundException(MENSAJES.eventoNoEncontrado);
    return evento;
  }

  private assertRangoEvento(inicio: string, fin: string): void {
    if (!esFechaIso(inicio) || !esFechaIso(fin)) {
      throw new BadRequestException(MENSAJES.fechaInvalida);
    }
    const mensaje = mensajeSiRangoInvalido(inicio, fin);
    if (mensaje) throw new BadRequestException(mensaje);
  }

  private async aplicarSuspension(evento: EventoPersistido): Promise<string | undefined> {
    if (!evento.suspendeClases) return undefined;
    const afectadas = await this.calendarioRepository.eliminarSesionesPendientes(
      evento.fechaInicio,
      evento.fechaFin,
    );
    return this.mensajeSesiones(afectadas);
  }

  private mensajeSesiones(afectadas: SesionesAfectadas): string | undefined {
    if (afectadas.eliminadas === 0 && afectadas.firmadas === 0) return undefined;
    return MENSAJES.sesionesPendientes;
  }

  private diasSinClases(eventos: EventoPersistido[], desde: string, hasta: string): string[] {
    const dias = new Set<string>();
    for (const evento of eventos) {
      if (!evento.suspendeClases) continue;
      const inicio = evento.fechaInicio > desde ? evento.fechaInicio : desde;
      const fin = evento.fechaFin < hasta ? evento.fechaFin : hasta;
      for (const dia of diasEntre(inicio, fin)) {
        dias.add(dia);
      }
    }
    return [...dias].sort();
  }

  private rangoPorDefecto(vigente: { fechaInicio: string; fechaFin: string }): {
    anio: number;
    mes: number;
  } {
    const hoy = hoyEnColegio();
    const referencia =
      hoy >= vigente.fechaInicio && hoy <= vigente.fechaFin ? hoy : vigente.fechaInicio;
    return { anio: Number(referencia.slice(0, 4)), mes: Number(referencia.slice(5, 7)) };
  }

  private resumen(evento: EventoPersistido): Record<string, unknown> {
    return {
      titulo: evento.titulo,
      tipo: evento.tipo,
      fechaInicio: evento.fechaInicio,
      fechaFin: evento.fechaFin,
      suspendeClases: evento.suspendeClases,
    };
  }
}
