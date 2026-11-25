import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  aniosAcademicos,
  apoderados,
  cursos,
  cursosSeccion,
  docentes,
  estudianteApoderados,
  estudiantes,
  grados,
  horarios,
  matriculas,
  personas,
  secciones,
} from "../../../core/database/schema";
import type { BloqueDocenteResponseDto } from "../dto";
import type {
  DocenteSimpleResultado,
  HorarioSeccionSqlResult,
  MatriculaEstudianteResultado,
  SeccionHorariosConsolidado,
} from "../interfaces";
import { normalizarHora } from "../utils";
import { mapearFilaABloqueResponse, SELECT_BLOQUE_HORARIO } from "./bloque-query.helper";

/**
 * Repositorio especializado en consultas de lectura, funciones SQL de horario
 * y reportes consolidados por año, docente o estudiante.
 */
@Injectable()
export class HorariosConsultaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async consultarHorarioSeccionSql(seccionId: string): Promise<HorarioSeccionSqlResult> {
    const payload = { seccionId };
    const result = (await this.db.execute(sql`
      SELECT fn_consultar_horario_seccion(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as { rows?: Array<{ resultado?: HorarioSeccionSqlResult }> };

    return (
      result.rows?.[0]?.resultado ?? {
        bloques: [],
        resumenHoras: [],
      }
    );
  }

  async findByDocente(anioId: string, docenteId: string): Promise<BloqueDocenteResponseDto[]> {
    const filas = await this.db
      .select({
        id: horarios.id,
        diaSemana: horarios.diaSemana,
        horaInicio: horarios.horaInicio,
        horaFin: horarios.horaFin,
        cursoNombre: cursos.nombre,
        colorHex: cursos.colorHex,
        seccionNombre: secciones.nombre,
        gradoNumero: grados.numero,
        aula: horarios.aula,
      })
      .from(horarios)
      .innerJoin(cursosSeccion, eq(horarios.cursoSeccionId, cursosSeccion.id))
      .innerJoin(secciones, eq(horarios.seccionId, secciones.id))
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .innerJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
      .where(and(eq(secciones.anioAcademicoId, anioId), eq(cursosSeccion.docenteId, docenteId)))
      .orderBy(asc(horarios.diaSemana), asc(horarios.horaInicio));

    return filas.map((f) => ({
      id: f.id,
      diaSemana: f.diaSemana,
      horaInicio: normalizarHora(f.horaInicio),
      horaFin: normalizarHora(f.horaFin),
      cursoNombre: f.cursoNombre,
      colorHex: f.colorHex,
      seccionNombre: f.seccionNombre,
      gradoNumero: f.gradoNumero,
      aula: f.aula,
    }));
  }

  async docentePorPersonaId(personaId: string): Promise<DocenteSimpleResultado | null> {
    const filas = await this.db
      .select({ id: docentes.id })
      .from(docentes)
      .where(or(eq(docentes.personaId, personaId), eq(docentes.id, personaId)))
      .limit(1);

    if (filas.length === 0) {
      return null;
    }

    return { id: filas[0].id };
  }

  async matriculaEstudiante(
    anioId: string,
    estudianteId: string,
  ): Promise<MatriculaEstudianteResultado | null> {
    const filas = await this.db
      .select({
        seccionId: matriculas.seccionId,
        estado: matriculas.estado,
      })
      .from(matriculas)
      .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
      .where(
        and(
          eq(matriculas.anioAcademicoId, anioId),
          or(eq(matriculas.estudianteId, estudianteId), eq(estudiantes.personaId, estudianteId)),
        ),
      )
      .limit(1);

    if (filas.length === 0) {
      return null;
    }

    return {
      seccionId: filas[0].seccionId,
      estado: filas[0].estado,
    };
  }

  async esApoderadoDeEstudiante(
    apoderadoPersonaId: string,
    estudianteId: string,
  ): Promise<boolean> {
    const filas = await this.db
      .select({
        estudianteId: estudianteApoderados.estudianteId,
      })
      .from(estudianteApoderados)
      .innerJoin(apoderados, eq(estudianteApoderados.apoderadoId, apoderados.id))
      .innerJoin(estudiantes, eq(estudianteApoderados.estudianteId, estudiantes.id))
      .where(
        and(
          or(eq(apoderados.personaId, apoderadoPersonaId), eq(apoderados.id, apoderadoPersonaId)),
          or(
            eq(estudianteApoderados.estudianteId, estudianteId),
            eq(estudiantes.personaId, estudianteId),
          ),
        ),
      )
      .limit(1);

    return filas.length > 0;
  }

  async infoSeccion(
    seccionId: string,
  ): Promise<{ gradoNombre: string; seccionNombre: string; anio: number } | null> {
    const filas = await this.db
      .select({
        gradoNombre: grados.nombre,
        seccionNombre: secciones.nombre,
        anio: aniosAcademicos.anio,
      })
      .from(secciones)
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .innerJoin(aniosAcademicos, eq(secciones.anioAcademicoId, aniosAcademicos.id))
      .where(eq(secciones.id, seccionId))
      .limit(1);

    return filas[0] ?? null;
  }

  async listarSeccionesYBloquesDeAnio(
    anioId: string,
    filtros?: { gradoId?: string; seccionId?: string },
  ): Promise<SeccionHorariosConsolidado[]> {
    const condiciones = [eq(secciones.anioAcademicoId, anioId)];
    if (filtros?.gradoId) {
      condiciones.push(eq(secciones.gradoId, filtros.gradoId));
    }
    if (filtros?.seccionId) {
      condiciones.push(eq(secciones.id, filtros.seccionId));
    }

    const filasSecciones = await this.db
      .select({
        seccionId: secciones.id,
        gradoId: secciones.gradoId,
        gradoNumero: grados.numero,
        gradoNombre: grados.nombre,
        seccionNombre: secciones.nombre,
      })
      .from(secciones)
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .where(and(...condiciones))
      .orderBy(asc(grados.numero), asc(secciones.nombre));

    if (filasSecciones.length === 0) {
      return [];
    }

    const seccionIds = filasSecciones.map((s) => s.seccionId);
    const filasBloques = await this.db
      .select({
        ...SELECT_BLOQUE_HORARIO,
        docenteId: docentes.id,
      })
      .from(horarios)
      .leftJoin(cursosSeccion, eq(horarios.cursoSeccionId, cursosSeccion.id))
      .leftJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
      .leftJoin(docentes, eq(cursosSeccion.docenteId, docentes.id))
      .leftJoin(personas, eq(docentes.personaId, personas.id))
      .where(inArray(horarios.seccionId, seccionIds))
      .orderBy(asc(horarios.diaSemana), asc(horarios.horaInicio));

    const bloquesPorSeccion = new Map<string, SeccionHorariosConsolidado["bloques"]>();
    for (const fila of filasBloques) {
      const lista = bloquesPorSeccion.get(fila.seccionId) ?? [];
      lista.push({
        ...mapearFilaABloqueResponse(fila),
        docenteId: fila.docenteId,
      });
      bloquesPorSeccion.set(fila.seccionId, lista);
    }

    return filasSecciones.map((sec) => ({
      ...sec,
      bloques: bloquesPorSeccion.get(sec.seccionId) ?? [],
    }));
  }
}
