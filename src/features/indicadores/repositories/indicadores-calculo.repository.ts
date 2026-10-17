import { Inject, Injectable } from "@nestjs/common";
import { and, between, eq, isNull, sql, type SQL } from "drizzle-orm";
import { Database, DRIZZLE } from "@/core/database";
import {
  cursos,
  cursosSeccion,
  docentes,
  grados,
  horarios,
  libretas,
  materiales,
  matriculas,
  periodosAcademicos,
  personas,
  secciones,
  sesionesClase,
  unidadesAprendizaje,
} from "@/core/database/schema";
import type {
  ConteoLibretasFila,
  ConteoMaterialesFila,
  ConteoSesionesFila,
  CursoDocenteFila,
  DocenteResumen,
  FiltrosConsultaCalculo,
  IIndicadoresCalculoRepository,
  PeriodoResumen,
} from "../interfaces";

@Injectable()
export class IndicadoresCalculoRepository implements IIndicadoresCalculoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async obtenerPeriodoPorId(periodoId: string): Promise<PeriodoResumen | null> {
    const [periodo] = await this.db
      .select({
        id: periodosAcademicos.id,
        nombre: periodosAcademicos.nombre,
        estado: periodosAcademicos.estado,
        fechaInicio: periodosAcademicos.fechaInicio,
        fechaFin: periodosAcademicos.fechaFin,
      })
      .from(periodosAcademicos)
      .where(eq(periodosAcademicos.id, periodoId))
      .limit(1);

    if (!periodo) {
      return null;
    }

    return {
      id: periodo.id,
      nombre: periodo.nombre,
      estado: periodo.estado,
      fechaInicio: String(periodo.fechaInicio),
      fechaFin: String(periodo.fechaFin),
    };
  }

  async obtenerPeriodoEnCurso(anioAcademicoId: string): Promise<PeriodoResumen | null> {
    const [periodo] = await this.db
      .select({
        id: periodosAcademicos.id,
        nombre: periodosAcademicos.nombre,
        estado: periodosAcademicos.estado,
        fechaInicio: periodosAcademicos.fechaInicio,
        fechaFin: periodosAcademicos.fechaFin,
      })
      .from(periodosAcademicos)
      .where(
        and(
          eq(periodosAcademicos.anioAcademicoId, anioAcademicoId),
          eq(periodosAcademicos.estado, "en_curso"),
        ),
      )
      .limit(1);

    if (!periodo) {
      return null;
    }

    return {
      id: periodo.id,
      nombre: periodo.nombre,
      estado: periodo.estado,
      fechaInicio: String(periodo.fechaInicio),
      fechaFin: String(periodo.fechaFin),
    };
  }

  async contarSesiones(filtros: FiltrosConsultaCalculo): Promise<ConteoSesionesFila> {
    const condiciones: SQL[] = [eq(secciones.anioAcademicoId, filtros.anioAcademicoId)];

    let fechaInicio = filtros.fechaInicio;
    let fechaFin = filtros.fechaFin;

    if (!fechaInicio && !fechaFin && filtros.periodoId) {
      const periodo = await this.obtenerPeriodoPorId(filtros.periodoId);
      if (periodo) {
        fechaInicio = periodo.fechaInicio;
        fechaFin = periodo.fechaFin;
      }
    }

    if (fechaInicio && fechaFin) {
      condiciones.push(between(sesionesClase.fecha, fechaInicio, fechaFin));
    }

    if (filtros.docenteId) {
      condiciones.push(eq(sesionesClase.docenteId, filtros.docenteId));
    }

    if (filtros.cursoId) {
      condiciones.push(eq(cursosSeccion.cursoId, filtros.cursoId));
    }

    if (filtros.seccionId) {
      condiciones.push(eq(horarios.seccionId, filtros.seccionId));
    }

    const [resultado] = await this.db
      .select({
        planificadas: sql<number>`COALESCE(COUNT(*), 0)::int`,
        cumplidas: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${sesionesClase.estado} = 'cumplida'), 0)::int`,
        parciales: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${sesionesClase.estado} = 'parcial'), 0)::int`,
        noCumplidas: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${sesionesClase.estado} = 'no_cumplida'), 0)::int`,
        justificadas: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${sesionesClase.estado} = 'justificada'), 0)::int`,
      })
      .from(sesionesClase)
      .innerJoin(horarios, eq(horarios.id, sesionesClase.horarioId))
      .innerJoin(secciones, eq(secciones.id, horarios.seccionId))
      .leftJoin(cursosSeccion, eq(cursosSeccion.id, horarios.cursoSeccionId))
      .where(and(...condiciones));

    return {
      planificadas: Number(resultado?.planificadas ?? 0),
      cumplidas: Number(resultado?.cumplidas ?? 0),
      parciales: Number(resultado?.parciales ?? 0),
      noCumplidas: Number(resultado?.noCumplidas ?? 0),
      justificadas: Number(resultado?.justificadas ?? 0),
    };
  }

  async contarLibretas(filtros: FiltrosConsultaCalculo): Promise<ConteoLibretasFila> {
    const condiciones: SQL[] = [
      eq(matriculas.anioAcademicoId, filtros.anioAcademicoId),
      sql`(${matriculas.estado} <> 'retirado' OR ${matriculas.fechaRetiro} >= ${libretas.fechaLimite} OR ${matriculas.fechaRetiro} IS NULL)`,
    ];

    if (filtros.periodoId) {
      condiciones.push(eq(libretas.periodoId, filtros.periodoId));
    }

    if (filtros.fechaInicio && filtros.fechaFin) {
      condiciones.push(between(libretas.fechaLimite, filtros.fechaInicio, filtros.fechaFin));
    }

    if (filtros.seccionId) {
      condiciones.push(eq(matriculas.seccionId, filtros.seccionId));
    }

    const [resultado] = await this.db
      .select({
        programadas: sql<number>`COALESCE(COUNT(*), 0)::int`,
        publicadasATiempo: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${libretas.estado} = 'a_tiempo'), 0)::int`,
        publicadasFueraDePlazo: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${libretas.estado} = 'fuera_de_plazo'), 0)::int`,
        pendientes: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${libretas.estado} = 'pendiente'), 0)::int`,
        vistasPorFamilia: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${libretas.vistoEn} IS NOT NULL), 0)::int`,
      })
      .from(libretas)
      .innerJoin(matriculas, eq(matriculas.id, libretas.matriculaId))
      .where(and(...condiciones));

    return {
      programadas: Number(resultado?.programadas ?? 0),
      publicadasATiempo: Number(resultado?.publicadasATiempo ?? 0),
      publicadasFueraDePlazo: Number(resultado?.publicadasFueraDePlazo ?? 0),
      pendientes: Number(resultado?.pendientes ?? 0),
      vistasPorFamilia: Number(resultado?.vistasPorFamilia ?? 0),
    };
  }

  async contarMateriales(filtros: FiltrosConsultaCalculo): Promise<ConteoMaterialesFila> {
    const condiciones: SQL[] = [
      eq(secciones.anioAcademicoId, filtros.anioAcademicoId),
      eq(materiales.vigente, true),
    ];

    let fechaInicio = filtros.fechaInicio;
    let fechaFin = filtros.fechaFin;

    if (!fechaInicio && !fechaFin && filtros.periodoId) {
      const periodo = await this.obtenerPeriodoPorId(filtros.periodoId);
      if (periodo) {
        fechaInicio = periodo.fechaInicio;
        fechaFin = periodo.fechaFin;
      }
    }

    if (fechaInicio && fechaFin) {
      condiciones.push(between(materiales.fechaProgramada, fechaInicio, fechaFin));
    }

    if (filtros.docenteId) {
      condiciones.push(eq(cursosSeccion.docenteId, filtros.docenteId));
    }

    if (filtros.cursoId) {
      condiciones.push(eq(cursosSeccion.cursoId, filtros.cursoId));
    }

    if (filtros.seccionId) {
      condiciones.push(eq(cursosSeccion.seccionId, filtros.seccionId));
    }

    const [resultado] = await this.db
      .select({
        planificados: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${materiales.esPlanificado} = true), 0)::int`,
        publicadosATiempo: sql<number>`COALESCE(COUNT(*) FILTER (
          WHERE ${materiales.esPlanificado} = true
            AND ${materiales.publicadoEn} IS NOT NULL
            AND (${materiales.publicadoEn} AT TIME ZONE 'America/Lima')::date <= ${materiales.fechaProgramada}
        ), 0)::int`,
        publicadosFueraDePlazo: sql<number>`COALESCE(COUNT(*) FILTER (
          WHERE ${materiales.esPlanificado} = true
            AND ${materiales.publicadoEn} IS NOT NULL
            AND (${materiales.publicadoEn} AT TIME ZONE 'America/Lima')::date > ${materiales.fechaProgramada}
        ), 0)::int`,
        pendientes: sql<number>`COALESCE(COUNT(*) FILTER (
          WHERE ${materiales.esPlanificado} = true
            AND ${materiales.publicadoEn} IS NULL
        ), 0)::int`,
        extras: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${materiales.esPlanificado} = false), 0)::int`,
      })
      .from(materiales)
      .innerJoin(unidadesAprendizaje, eq(unidadesAprendizaje.id, materiales.unidadId))
      .innerJoin(cursosSeccion, eq(cursosSeccion.id, unidadesAprendizaje.cursoSeccionId))
      .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
      .where(and(...condiciones));

    return {
      planificados: Number(resultado?.planificados ?? 0),
      publicadosATiempo: Number(resultado?.publicadosATiempo ?? 0),
      publicadosFueraDePlazo: Number(resultado?.publicadosFueraDePlazo ?? 0),
      pendientes: Number(resultado?.pendientes ?? 0),
      extras: Number(resultado?.extras ?? 0),
    };
  }

  async listarCursosDeDocente(
    docenteId: string,
    anioAcademicoId: string,
    _periodoId?: string,
  ): Promise<CursoDocenteFila[]> {
    const filas = await this.db
      .select({
        cursoId: cursos.id,
        cursoNombre: cursos.nombre,
        seccionId: secciones.id,
        seccionNombre: secciones.nombre,
        gradoNombre: grados.nombre,
      })
      .from(cursosSeccion)
      .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .where(
        and(
          eq(cursosSeccion.docenteId, docenteId),
          eq(secciones.anioAcademicoId, anioAcademicoId),
          eq(secciones.estado, "activa"),
        ),
      )
      .orderBy(grados.numero, secciones.nombre, cursos.nombre);

    return filas.map((f) => ({
      cursoId: f.cursoId,
      cursoNombre: f.cursoNombre,
      seccionId: f.seccionId,
      seccionNombre: f.seccionNombre,
      gradoNombre: f.gradoNombre,
    }));
  }

  async obtenerDocentePorPersonaId(personaId: string): Promise<DocenteResumen | null> {
    const [docente] = await this.db
      .select({
        id: docentes.id,
        nombres: personas.nombres,
        apellidoPaterno: personas.apellidoPaterno,
        apellidoMaterno: personas.apellidoMaterno,
      })
      .from(docentes)
      .innerJoin(personas, eq(personas.id, docentes.personaId))
      .where(
        and(
          eq(docentes.personaId, personaId),
          eq(docentes.estado, "activo"),
          isNull(docentes.eliminadoEn),
        ),
      )
      .limit(1);

    if (!docente) {
      return null;
    }

    return {
      id: docente.id,
      nombres: docente.nombres,
      apellidoPaterno: docente.apellidoPaterno,
      apellidoMaterno: docente.apellidoMaterno ?? "",
    };
  }
}
