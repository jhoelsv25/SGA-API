import { Inject, Injectable } from "@nestjs/common";
import { and, asc, between, eq, gte, inArray, isNotNull, lte, sql, type SQL } from "drizzle-orm";
import { alias, type AnyPgColumn } from "drizzle-orm/pg-core";
import { Database, DRIZZLE } from "@/core/database";
import {
  ausenciasSesion,
  calendarioEventos,
  cursos,
  cursosSeccion,
  docentes,
  grados,
  horarios,
  periodosAcademicos,
  personas,
  secciones,
  sesionesClase,
  variablesSistema,
} from "@/core/database/schema";
import { VARIABLE_JUSTIFICACION_AVISO_DIAS } from "../constants";
import type { FiltrosApoyo, IIndicadoresApoyoRepository, PeriodoResumen } from "../interfaces";
import type {
  AusenciaApoyo,
  JustificacionApoyo,
  SesionApoyo,
} from "../utils/indicadores-apoyo.util";

const personaDocente = alias(personas, "persona_apoyo_docente");

const nombreDocente = (p: {
  apellidoPaterno: AnyPgColumn;
  apellidoMaterno: AnyPgColumn;
  nombres: AnyPgColumn;
}) =>
  sql<string>`TRIM(${p.apellidoPaterno} || ' ' || COALESCE(${p.apellidoMaterno}, '') || ', ' || ${p.nombres})`;

/** Duración del bloque en minutos: la planificada de la sesión o, si no hay, la del horario. */
const minutosBloque = sql<number>`COALESCE((EXTRACT(EPOCH FROM (COALESCE(${sesionesClase.horaFinPlan}, ${horarios.horaFin}) - COALESCE(${sesionesClase.horaInicioPlan}, ${horarios.horaInicio}))) / 60)::int, 0)`;

/** Indicadores de apoyo del seguimiento docente (RF-020 V2): solo lecturas, nada se congela. */
@Injectable()
export class IndicadoresApoyoRepository implements IIndicadoresApoyoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async listarPeriodos(anioAcademicoId: string): Promise<PeriodoResumen[]> {
    const filas = await this.db
      .select({
        id: periodosAcademicos.id,
        nombre: periodosAcademicos.nombre,
        estado: periodosAcademicos.estado,
        fechaInicio: periodosAcademicos.fechaInicio,
        fechaFin: periodosAcademicos.fechaFin,
      })
      .from(periodosAcademicos)
      .where(eq(periodosAcademicos.anioAcademicoId, anioAcademicoId))
      .orderBy(asc(periodosAcademicos.fechaInicio));
    return filas.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      estado: p.estado,
      fechaInicio: String(p.fechaInicio),
      fechaFin: String(p.fechaFin),
    }));
  }

  /** Mismos filtros para sesiones, ausencias y justificaciones: se aplican a la sesión. */
  private condiciones(filtros: FiltrosApoyo): SQL[] {
    const c: SQL[] = [
      eq(secciones.anioAcademicoId, filtros.anioAcademicoId),
      between(sesionesClase.fecha, filtros.desde, filtros.hasta),
    ];
    if (filtros.docenteId) c.push(eq(sesionesClase.docenteId, filtros.docenteId));
    if (filtros.cursoId) c.push(eq(cursosSeccion.cursoId, filtros.cursoId));
    if (filtros.seccionId) c.push(eq(horarios.seccionId, filtros.seccionId));
    return c;
  }

  async sesiones(filtros: FiltrosApoyo): Promise<SesionApoyo[]> {
    const filas = await this.db
      .select({
        id: sesionesClase.id,
        fecha: sesionesClase.fecha,
        docenteId: sesionesClase.docenteId,
        docenteNombre: nombreDocente(personaDocente),
        cursoNombre: cursos.nombre,
        seccionNombre: sql<string>`${grados.numero} || '.° ' || ${secciones.nombre}`,
        estado: sesionesClase.estado,
        minutosBloque,
        minutosPerdidos: sesionesClase.minutosPerdidos,
        minutosRetraso: sesionesClase.minutosRetraso,
      })
      .from(sesionesClase)
      .innerJoin(horarios, eq(horarios.id, sesionesClase.horarioId))
      .innerJoin(secciones, eq(secciones.id, horarios.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .innerJoin(cursosSeccion, eq(cursosSeccion.id, horarios.cursoSeccionId))
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .innerJoin(docentes, eq(docentes.id, sesionesClase.docenteId))
      .innerJoin(personaDocente, eq(personaDocente.id, docentes.personaId))
      .where(
        and(
          ...this.condiciones(filtros),
          inArray(sesionesClase.estado, ["cumplida", "parcial", "no_cumplida", "justificada"]),
        ),
      )
      .orderBy(asc(sesionesClase.fecha));
    return filas.map((f) => ({
      ...f,
      fecha: String(f.fecha),
      minutosBloque: Number(f.minutosBloque),
    }));
  }

  async ausencias(filtros: FiltrosApoyo): Promise<AusenciaApoyo[]> {
    const filas = await this.db
      .select({
        id: ausenciasSesion.id,
        sesionId: sesionesClase.id,
        fecha: sesionesClase.fecha,
        docenteId: sesionesClase.docenteId,
        docenteNombre: nombreDocente(personaDocente),
        cursoNombre: cursos.nombre,
        seccionNombre: sql<string>`${grados.numero} || '.° ' || ${secciones.nombre}`,
        minutos: sql<number>`COALESCE(${ausenciasSesion.minutos}, 0)`,
        motivo: ausenciasSesion.motivo,
      })
      .from(ausenciasSesion)
      .innerJoin(sesionesClase, eq(sesionesClase.id, ausenciasSesion.sesionClaseId))
      .innerJoin(horarios, eq(horarios.id, sesionesClase.horarioId))
      .innerJoin(secciones, eq(secciones.id, horarios.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .innerJoin(cursosSeccion, eq(cursosSeccion.id, horarios.cursoSeccionId))
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .innerJoin(docentes, eq(docentes.id, sesionesClase.docenteId))
      .innerJoin(personaDocente, eq(personaDocente.id, docentes.personaId))
      .where(
        and(
          ...this.condiciones(filtros),
          eq(ausenciasSesion.vigente, true),
          eq(ausenciasSesion.anulada, false),
        ),
      )
      .orderBy(asc(sesionesClase.fecha));
    return filas.map((f) => ({ ...f, fecha: String(f.fecha), minutos: Number(f.minutos) }));
  }

  async justificaciones(filtros: FiltrosApoyo): Promise<JustificacionApoyo[]> {
    const filas = await this.db
      .select({
        sesionId: sesionesClase.id,
        fechaSesion: sesionesClase.fecha,
        docenteId: sesionesClase.docenteId,
        docenteNombre: nombreDocente(personaDocente),
        cursoNombre: cursos.nombre,
        seccionNombre: sql<string>`${grados.numero} || '.° ' || ${secciones.nombre}`,
        estado: sesionesClase.justificacionEstado,
        solicitadaEn: sesionesClase.justificacionSolicitadaEn,
        revisadaEn: sesionesClase.justificacionRevisadaEn,
      })
      .from(sesionesClase)
      .innerJoin(horarios, eq(horarios.id, sesionesClase.horarioId))
      .innerJoin(secciones, eq(secciones.id, horarios.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .innerJoin(cursosSeccion, eq(cursosSeccion.id, horarios.cursoSeccionId))
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .innerJoin(docentes, eq(docentes.id, sesionesClase.docenteId))
      .innerJoin(personaDocente, eq(personaDocente.id, docentes.personaId))
      .where(
        and(
          eq(secciones.anioAcademicoId, filtros.anioAcademicoId),
          gte(sesionesClase.fecha, filtros.desde),
          lte(sesionesClase.fecha, filtros.hasta),
          isNotNull(sesionesClase.justificacionEstado),
          isNotNull(sesionesClase.justificacionSolicitadaEn),
          ...(filtros.docenteId ? [eq(sesionesClase.docenteId, filtros.docenteId)] : []),
          ...(filtros.cursoId ? [eq(cursosSeccion.cursoId, filtros.cursoId)] : []),
          ...(filtros.seccionId ? [eq(horarios.seccionId, filtros.seccionId)] : []),
        ),
      );
    return filas.map((f) => ({
      ...f,
      fechaSesion: String(f.fechaSesion),
      estado: f.estado ?? "",
      solicitadaEn: f.solicitadaEn ?? "",
      revisadaEn: f.revisadaEn,
    }));
  }

  async diasSinClases(desde: string, hasta: string): Promise<string[]> {
    const filas = await this.db
      .select({ dia: sql<string>`to_char(d.dia, 'YYYY-MM-DD')` })
      .from(calendarioEventos)
      .innerJoin(
        sql`LATERAL generate_series(
              GREATEST(${calendarioEventos.fechaInicio}, ${desde}::date),
              LEAST(${calendarioEventos.fechaFin}, ${hasta}::date),
              interval '1 day'
            ) AS d(dia)`,
        sql`true`,
      )
      .where(
        and(
          eq(calendarioEventos.suspendeClases, true),
          lte(calendarioEventos.fechaInicio, hasta),
          gte(calendarioEventos.fechaFin, desde),
        ),
      );
    return [...new Set(filas.map((f) => f.dia))];
  }

  async avisoDiasJustificacion(): Promise<number | null> {
    const [fila] = await this.db
      .select({ valor: variablesSistema.valor })
      .from(variablesSistema)
      .where(
        and(
          eq(variablesSistema.codigo, VARIABLE_JUSTIFICACION_AVISO_DIAS),
          eq(variablesSistema.vigente, true),
        ),
      )
      .limit(1);
    const n = Number.parseInt(fila?.valor ?? "", 10);
    return Number.isNaN(n) || n < 0 ? null : n;
  }
}
