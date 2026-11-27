import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CalendarioService } from "../calendario/calendario.service";
import type { TurnoResponseDto } from "../turnos/dto";
import { TurnosRepository } from "../turnos/repositories/turnos.repository";
import { VariablesSistemaService } from "../variables-sistema/variables-sistema.service";
import { MENSAJES_MARCACION, VARIABLE_HORARIO_POR_CLASES } from "./constants";
import type {
  ControlDiarioResponseDto,
  ControlMensualResponseDto,
  DiaDePersonaDto,
  MarcacionResponseDto,
} from "./dto";
import { MarcacionesRepository } from "./repositories";
import { claveClases } from "./repositories/clases-docente.query";
import { ControlDiarioRepository } from "./repositories/control-diario.repository";
import {
  ahoraEnColegio,
  esDiaLaborable,
  estadoDelDia,
  fechasDelMes,
  minutosDelDia,
  turnoSegunClases,
  type BloqueDeClase,
} from "./utils";

type TipoPersonal = "docentes" | "administrativos";
type Turnos = Record<TipoPersonal, TurnoResponseDto | null>;

/** Vista de administración: qué hizo cada persona en un día (asistencia y sesiones de clase). */
@Injectable()
export class ControlDiarioService {
  constructor(
    private readonly repository: ControlDiarioRepository,
    private readonly marcacionesRepository: MarcacionesRepository,
    private readonly turnosRepository: TurnosRepository,
    private readonly calendarioService: CalendarioService,
    private readonly variablesService: VariablesSistemaService,
  ) {}

  private horarioPorClases(): Promise<boolean> {
    return this.variablesService.isActiva(VARIABLE_HORARIO_POR_CLASES.codigo, false);
  }

  async delDia(fechaPedida?: string): Promise<ControlDiarioResponseDto> {
    const { fecha: hoy, hora: ahora } = ahoraEnColegio();
    const fecha = fechaPedida ?? hoy;
    if (fecha > hoy) throw new BadRequestException(MENSAJES_MARCACION.FECHA_FUTURA);

    const marcas = await this.marcacionesRepository.marcacionesEntre(fecha, fecha);
    const personal = await this.repository.personal([...new Set(marcas.map((m) => m.personaId))]);
    const ids = personal.map((p) => p.personaId);
    const porClases = await this.horarioPorClases();
    const [clases, sesiones, turnos, sinClases, sinTrabajo] = await Promise.all([
      this.repository.clases(ids, [fecha]),
      this.repository.sesiones(ids, [fecha]),
      this.turnosDelPersonal(),
      this.calendarioService.suspendeClasesEn(fecha),
      this.calendarioService.fechasSinTrabajoPersonal([fecha]),
    ]);
    const noLabora = sinTrabajo.has(fecha);

    return {
      fecha,
      esHoy: fecha === hoy,
      sinClases,
      personalLabora: sinClases && !noLabora,
      personas: personal.map((p) => {
        const clave = claveClases(p.personaId, fecha);
        return {
          ...p,
          ...this.armarDia({
            fecha,
            hoy,
            ahora,
            noLabora,
            general: turnos[p.tipoPersona],
            clases: porClases && p.tipoPersona === "docentes" ? (clases.get(clave) ?? []) : [],
            marcas: marcas.filter((m) => m.personaId === p.personaId),
          }),
          sesiones: sesiones.get(clave) ?? [],
        };
      }),
    };
  }

  async delMes(personaId: string, mesPedido?: string): Promise<ControlMensualResponseDto> {
    const { fecha: hoy, hora: ahora } = ahoraEnColegio();
    const mes = mesPedido ?? hoy.slice(0, 7);
    const [persona] = await this.repository.personal([], personaId);
    if (!persona) throw new NotFoundException(MENSAJES_MARCACION.PERSONA_NO_ENCONTRADA);
    const fechas = fechasDelMes(mes, hoy);
    const base = {
      mes,
      personaId,
      nombreCompleto: persona.nombreCompleto,
      tipoPersona: persona.tipoPersona,
    };
    if (fechas.length === 0) return { ...base, dias: [] };

    const porClases = await this.horarioPorClases();
    const [marcas, clases, sesiones, turnos, suspendidas] = await Promise.all([
      this.marcacionesRepository.marcacionesEntre(fechas[0], fechas[fechas.length - 1], personaId),
      this.repository.clases([personaId], fechas),
      this.repository.sesiones([personaId], fechas),
      this.turnosDelPersonal(),
      this.calendarioService.fechasSinTrabajoPersonal(fechas),
    ]);

    return {
      ...base,
      dias: fechas.map((fecha) => {
        const clave = claveClases(personaId, fecha);
        return {
          ...this.armarDia({
            fecha,
            hoy,
            ahora,
            noLabora: suspendidas.has(fecha),
            general: turnos[persona.tipoPersona],
            clases:
              porClases && persona.tipoPersona === "docentes" ? (clases.get(clave) ?? []) : [],
            marcas: marcas.filter((m) => m.fechaHora.slice(0, 10) === fecha),
          }),
          sesiones: sesiones.get(clave) ?? [],
        };
      }),
    };
  }

  private async turnosDelPersonal(): Promise<Turnos> {
    const [docentes, administrativos] = await Promise.all([
      this.turnosRepository.findByAplicaA("docentes"),
      this.turnosRepository.findByAplicaA("administrativos"),
    ]);
    return { docentes, administrativos };
  }

  private armarDia(params: {
    fecha: string;
    hoy: string;
    ahora: string;
    noLabora: boolean;
    general: TurnoResponseDto | null;
    clases: BloqueDeClase[];
    marcas: MarcacionResponseDto[];
  }): Omit<DiaDePersonaDto, "sesiones"> {
    const { fecha, hoy, ahora, noLabora, general, clases, marcas } = params;
    const turno = general?.activo ? turnoSegunClases(general, clases, fecha) : null;
    const esperado = Boolean(turno && !noLabora && esDiaLaborable(fecha, turno.diasLaborables));
    const entrada = marcas.find((m) => m.tipo === "entrada") ?? null;
    const salida = marcas.find((m) => m.tipo === "salida") ?? null;
    return {
      fecha,
      estado: estadoDelDia({
        esperado,
        tieneEntrada: entrada !== null,
        tieneSalida: salida !== null,
        esHoy: fecha === hoy,
        aunEnPlazo:
          fecha === hoy &&
          turno !== null &&
          minutosDelDia(ahora) <= minutosDelDia(turno.horaEntrada) + turno.toleranciaMin,
      }),
      horario:
        turno && esperado
          ? {
              fuente: clases.length > 0 ? "clases" : "turno",
              entrada: turno.horaEntrada.slice(0, 5),
              salida: turno.horaSalida.slice(0, 5),
            }
          : null,
      entrada,
      salida,
    };
  }
}
