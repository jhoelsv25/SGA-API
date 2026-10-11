import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  cursos,
  cursosSeccion,
  docentes,
  grados,
  horarios,
  personas,
  planEstudios,
  secciones,
} from "../../../core/database/schema";
import type { CargaAcademicaItemDto, CursoDocenteItemDto } from "../dto";
import type { CursoSeccionDetalle, ICargaAcademicaRepository } from "../interfaces";
import { formatearNombreCompleto } from "../utils";

@Injectable()
export class CargaAcademicaRepository implements ICargaAcademicaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findCursoSeccionById(id: string): Promise<CursoSeccionDetalle | null> {
    const rows = await this.db
      .select({
        id: cursosSeccion.id,
        seccionId: cursosSeccion.seccionId,
        cursoId: cursosSeccion.cursoId,
        cursoNombre: cursos.nombre,
        docenteId: cursosSeccion.docenteId,
        horasPlan: sql<number>`COALESCE(${planEstudios.horasSemanales}, 0)`.mapWith(Number),
        anioAcademicoId: secciones.anioAcademicoId,
        seccionEstado: secciones.estado,
      })
      .from(cursosSeccion)
      .innerJoin(secciones, eq(cursosSeccion.seccionId, secciones.id))
      .innerJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
      .leftJoin(
        planEstudios,
        and(
          eq(planEstudios.gradoId, secciones.gradoId),
          eq(planEstudios.cursoId, cursosSeccion.cursoId),
          eq(planEstudios.activo, true),
        ),
      )
      .where(eq(cursosSeccion.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return rows[0];
  }

  async findBySeccion(seccionId: string): Promise<CargaAcademicaItemDto[]> {
    const rows = await this.db
      .select({
        id: cursosSeccion.id,
        cursoId: cursosSeccion.cursoId,
        cursoNombre: cursos.nombre,
        colorHex: cursos.colorHex,
        horasPlan: sql<number>`COALESCE(${planEstudios.horasSemanales}, 0)`.mapWith(Number),
        horasHorario: sql<number>`COALESCE((
          SELECT SUM(
            ROUND(
              EXTRACT(EPOCH FROM (${horarios.horaFin}::time - ${horarios.horaInicio}::time)) / 2700
            )
          )::int
          FROM ${horarios}
          WHERE ${horarios.cursoSeccionId} = ${cursosSeccion.id}
            AND ${horarios.tipoBloque} = 'clase'
        ), 0)`.mapWith(Number),
        docenteId: docentes.id,
        docenteCodigo: docentes.codigo,
        docentePersonaNombres: personas.nombres,
        docentePersonaApellidoPaterno: personas.apellidoPaterno,
        docentePersonaApellidoMaterno: personas.apellidoMaterno,
      })
      .from(cursosSeccion)
      .innerJoin(secciones, eq(cursosSeccion.seccionId, secciones.id))
      .innerJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
      .leftJoin(
        planEstudios,
        and(
          eq(planEstudios.gradoId, secciones.gradoId),
          eq(planEstudios.cursoId, cursosSeccion.cursoId),
          eq(planEstudios.activo, true),
        ),
      )
      .leftJoin(docentes, eq(cursosSeccion.docenteId, docentes.id))
      .leftJoin(personas, eq(docentes.personaId, personas.id))
      .where(eq(cursosSeccion.seccionId, seccionId))
      .orderBy(asc(cursos.nombre));

    return rows.map((row) => ({
      id: row.id,
      cursoId: row.cursoId,
      cursoNombre: row.cursoNombre,
      colorHex: row.colorHex,
      horasPlan: row.horasPlan,
      horasHorario: row.horasHorario,
      docente:
        row.docenteId && row.docenteCodigo
          ? {
              id: row.docenteId,
              codigo: row.docenteCodigo,
              nombreCompleto: formatearNombreCompleto(
                row.docentePersonaNombres,
                row.docentePersonaApellidoPaterno,
                row.docentePersonaApellidoMaterno,
              ),
            }
          : null,
    }));
  }

  async findCargaItemById(id: string): Promise<CargaAcademicaItemDto | null> {
    const rows = await this.db
      .select({
        id: cursosSeccion.id,
        cursoId: cursosSeccion.cursoId,
        cursoNombre: cursos.nombre,
        colorHex: cursos.colorHex,
        horasPlan: sql<number>`COALESCE(${planEstudios.horasSemanales}, 0)`.mapWith(Number),
        horasHorario: sql<number>`COALESCE((
          SELECT SUM(
            ROUND(
              EXTRACT(EPOCH FROM (${horarios.horaFin}::time - ${horarios.horaInicio}::time)) / 2700
            )
          )::int
          FROM ${horarios}
          WHERE ${horarios.cursoSeccionId} = ${cursosSeccion.id}
            AND ${horarios.tipoBloque} = 'clase'
        ), 0)`.mapWith(Number),
        docenteId: docentes.id,
        docenteCodigo: docentes.codigo,
        docentePersonaNombres: personas.nombres,
        docentePersonaApellidoPaterno: personas.apellidoPaterno,
        docentePersonaApellidoMaterno: personas.apellidoMaterno,
      })
      .from(cursosSeccion)
      .innerJoin(secciones, eq(cursosSeccion.seccionId, secciones.id))
      .innerJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
      .leftJoin(
        planEstudios,
        and(
          eq(planEstudios.gradoId, secciones.gradoId),
          eq(planEstudios.cursoId, cursosSeccion.cursoId),
          eq(planEstudios.activo, true),
        ),
      )
      .leftJoin(docentes, eq(cursosSeccion.docenteId, docentes.id))
      .leftJoin(personas, eq(docentes.personaId, personas.id))
      .where(eq(cursosSeccion.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      cursoId: row.cursoId,
      cursoNombre: row.cursoNombre,
      colorHex: row.colorHex,
      horasPlan: row.horasPlan,
      horasHorario: row.horasHorario,
      docente:
        row.docenteId && row.docenteCodigo
          ? {
              id: row.docenteId,
              codigo: row.docenteCodigo,
              nombreCompleto: formatearNombreCompleto(
                row.docentePersonaNombres,
                row.docentePersonaApellidoPaterno,
                row.docentePersonaApellidoMaterno,
              ),
            }
          : null,
    };
  }

  async updateDocente(id: string, docenteId: string | null): Promise<CargaAcademicaItemDto> {
    await this.db
      .update(cursosSeccion)
      .set({
        docenteId,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(cursosSeccion.id, id));

    const actualizado = await this.findCargaItemById(id);
    if (!actualizado) {
      throw new Error("No se pudo recuperar el curso-sección actualizado.");
    }
    return actualizado;
  }

  async horasAsignadasDocente(
    anioId: string,
    docenteId: string,
    exceptoCursoSeccionId?: string,
  ): Promise<number> {
    const condiciones = [
      eq(secciones.anioAcademicoId, anioId),
      eq(cursosSeccion.docenteId, docenteId),
    ];

    if (exceptoCursoSeccionId) {
      condiciones.push(ne(cursosSeccion.id, exceptoCursoSeccionId));
    }

    const rows = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${planEstudios.horasSemanales})::int, 0)`.mapWith(Number),
      })
      .from(cursosSeccion)
      .innerJoin(secciones, eq(cursosSeccion.seccionId, secciones.id))
      .innerJoin(
        planEstudios,
        and(
          eq(planEstudios.gradoId, secciones.gradoId),
          eq(planEstudios.cursoId, cursosSeccion.cursoId),
          eq(planEstudios.activo, true),
        ),
      )
      .where(and(...condiciones));

    return rows[0]?.total ?? 0;
  }

  async findByDocente(anioId: string, docenteId: string): Promise<CursoDocenteItemDto[]> {
    const rows = await this.db
      .select({
        cursoSeccionId: cursosSeccion.id,
        cursoNombre: cursos.nombre,
        seccionId: secciones.id,
        gradoNumero: grados.numero,
        seccionNombre: secciones.nombre,
        horas: sql<number>`COALESCE(${planEstudios.horasSemanales}, 0)`.mapWith(Number),
      })
      .from(cursosSeccion)
      .innerJoin(secciones, eq(cursosSeccion.seccionId, secciones.id))
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .innerJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
      .innerJoin(
        planEstudios,
        and(
          eq(planEstudios.gradoId, secciones.gradoId),
          eq(planEstudios.cursoId, cursosSeccion.cursoId),
          eq(planEstudios.activo, true),
        ),
      )
      .where(and(eq(secciones.anioAcademicoId, anioId), eq(cursosSeccion.docenteId, docenteId)))
      .orderBy(asc(grados.numero), asc(secciones.nombre), asc(cursos.nombre));

    return rows.map((r) => ({
      cursoSeccionId: r.cursoSeccionId,
      cursoNombre: r.cursoNombre,
      seccionId: r.seccionId,
      gradoNumero: r.gradoNumero,
      seccionNombre: r.seccionNombre,
      horas: r.horas,
    }));
  }
}
