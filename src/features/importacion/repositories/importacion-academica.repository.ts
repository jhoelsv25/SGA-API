import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  aniosAcademicos,
  cursos,
  cursosSeccion,
  docentes,
  grados,
  horarios,
  personas,
  planEstudios,
  secciones,
} from "../../../core/database/schema";
import type { CursoIdentificable, DocenteIdentificable, SeccionIdentificable } from "../utils";

export interface AnioImportacionAcademica {
  id: string;
  anio: number;
  estado: string;
}

export interface SeccionConTutorImportacion extends SeccionIdentificable {
  anioAcademicoId: string;
  tutorId: string | null;
  estado: string;
}

export interface PlanEstudioRegistro {
  id: string;
  gradoId: string;
  cursoId: string;
  horasSemanales: number;
  activo: boolean;
}

export interface CursoSeccionRegistro {
  id: string;
  seccionId: string;
  cursoId: string;
  docenteId: string | null;
}

export interface BloqueHorarioAnioRegistro {
  id: string;
  seccionId: string;
  cursoSeccionId: string | null;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  tipoBloque: string;
  aula: string | null;
  gradoNumero: number;
  seccionNombre: string;
  docenteId: string | null;
}

export interface InsertarBloqueHorarioImportData {
  seccionId: string;
  cursoSeccionId: string | null;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  tipoBloque: "clase" | "receso";
  aula: string | null;
}

@Injectable()
export class ImportacionAcademicaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAnioParaImportacion(
    anioAcademicoId?: string,
  ): Promise<AnioImportacionAcademica | null> {
    if (anioAcademicoId) {
      const [row] = await this.db
        .select({
          id: aniosAcademicos.id,
          anio: aniosAcademicos.anio,
          estado: aniosAcademicos.estado,
        })
        .from(aniosAcademicos)
        .where(eq(aniosAcademicos.id, anioAcademicoId))
        .limit(1);
      return row ?? null;
    }

    const rows = await this.db
      .select({
        id: aniosAcademicos.id,
        anio: aniosAcademicos.anio,
        estado: aniosAcademicos.estado,
      })
      .from(aniosAcademicos)
      .where(
        or(
          eq(aniosAcademicos.estado, "en_curso"),
          eq(aniosAcademicos.estado, "reabierto"),
          eq(aniosAcademicos.estado, "planificado"),
        ),
      );

    return (
      rows.find((r) => r.estado === "en_curso") ??
      rows.find((r) => r.estado === "reabierto") ??
      rows.find((r) => r.estado === "planificado") ??
      null
    );
  }

  async listarSeccionesActivasConTutor(
    anioAcademicoId: string,
  ): Promise<SeccionConTutorImportacion[]> {
    return this.db
      .select({
        id: secciones.id,
        anioAcademicoId: secciones.anioAcademicoId,
        gradoId: secciones.gradoId,
        gradoNumero: grados.numero,
        gradoNombre: grados.nombre,
        nombre: secciones.nombre,
        tutorId: secciones.tutorId,
        estado: secciones.estado,
      })
      .from(secciones)
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .where(and(eq(secciones.anioAcademicoId, anioAcademicoId), eq(secciones.estado, "activa")))
      .orderBy(asc(grados.numero), asc(secciones.nombre));
  }

  async listarCursosActivos(): Promise<CursoIdentificable[]> {
    const rows = await this.db
      .select({
        id: cursos.id,
        codigo: cursos.codigo,
        nombre: cursos.nombre,
        areaCurricular: cursos.areaCurricular,
      })
      .from(cursos)
      .where(isNull(cursos.eliminadoEn))
      .orderBy(asc(cursos.nombre));

    return rows.map((r) => ({ ...r, activo: true }));
  }

  async listarDocentesConPersona(): Promise<DocenteIdentificable[]> {
    return this.db
      .select({
        id: docentes.id,
        codigo: docentes.codigo,
        estado: docentes.estado,
        numeroDocumento: personas.numeroDocumento,
        apellidoPaterno: personas.apellidoPaterno,
        apellidoMaterno: personas.apellidoMaterno,
        nombres: personas.nombres,
      })
      .from(docentes)
      .innerJoin(personas, eq(docentes.personaId, personas.id))
      .orderBy(asc(personas.apellidoPaterno), asc(personas.nombres));
  }

  async listarPlanEstudios(): Promise<PlanEstudioRegistro[]> {
    return this.db
      .select({
        id: planEstudios.id,
        gradoId: planEstudios.gradoId,
        cursoId: planEstudios.cursoId,
        horasSemanales: planEstudios.horasSemanales,
        activo: planEstudios.activo,
      })
      .from(planEstudios);
  }

  async listarCursosSeccionDeAnio(anioAcademicoId: string): Promise<CursoSeccionRegistro[]> {
    return this.db
      .select({
        id: cursosSeccion.id,
        seccionId: cursosSeccion.seccionId,
        cursoId: cursosSeccion.cursoId,
        docenteId: cursosSeccion.docenteId,
      })
      .from(cursosSeccion)
      .innerJoin(secciones, eq(cursosSeccion.seccionId, secciones.id))
      .where(eq(secciones.anioAcademicoId, anioAcademicoId));
  }

  async listarHorariosDeAnio(anioAcademicoId: string): Promise<BloqueHorarioAnioRegistro[]> {
    return this.db
      .select({
        id: horarios.id,
        seccionId: horarios.seccionId,
        cursoSeccionId: horarios.cursoSeccionId,
        diaSemana: horarios.diaSemana,
        horaInicio: horarios.horaInicio,
        horaFin: horarios.horaFin,
        tipoBloque: horarios.tipoBloque,
        aula: horarios.aula,
        gradoNumero: grados.numero,
        seccionNombre: secciones.nombre,
        docenteId: cursosSeccion.docenteId,
      })
      .from(horarios)
      .innerJoin(secciones, eq(horarios.seccionId, secciones.id))
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .leftJoin(cursosSeccion, eq(horarios.cursoSeccionId, cursosSeccion.id))
      .where(eq(secciones.anioAcademicoId, anioAcademicoId))
      .orderBy(asc(horarios.diaSemana), asc(horarios.horaInicio));
  }

  async asegurarPlanEstudios(
    gradoId: string,
    cursoId: string,
    horasSemanales: number,
  ): Promise<void> {
    await this.db
      .insert(planEstudios)
      .values({
        gradoId,
        cursoId,
        horasSemanales,
        activo: true,
      })
      .onConflictDoUpdate({
        target: [planEstudios.gradoId, planEstudios.cursoId],
        set: {
          horasSemanales,
          activo: true,
        },
      });
  }

  async asegurarYAsignarCursoSeccion(
    seccionId: string,
    cursoId: string,
    docenteId: string,
  ): Promise<{ id: string; anteriorDocenteId: string | null }> {
    const [existente] = await this.db
      .select({ id: cursosSeccion.id, docenteId: cursosSeccion.docenteId })
      .from(cursosSeccion)
      .where(and(eq(cursosSeccion.seccionId, seccionId), eq(cursosSeccion.cursoId, cursoId)))
      .limit(1);

    if (existente) {
      await this.db
        .update(cursosSeccion)
        .set({
          docenteId,
          actualizadoEn: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(cursosSeccion.id, existente.id));
      return { id: existente.id, anteriorDocenteId: existente.docenteId };
    }

    const [creado] = await this.db
      .insert(cursosSeccion)
      .values({
        seccionId,
        cursoId,
        docenteId,
      })
      .returning({ id: cursosSeccion.id });

    return { id: creado.id, anteriorDocenteId: null };
  }

  async asignarTutorSeccionSiLibre(
    _anioAcademicoId: string,
    seccionId: string,
    docenteId: string,
  ): Promise<boolean> {
    await this.db
      .update(secciones)
      .set({
        tutorId: docenteId,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(secciones.id, seccionId));

    return true;
  }

  async insertarBloqueHorario(data: InsertarBloqueHorarioImportData): Promise<string> {
    const [creado] = await this.db
      .insert(horarios)
      .values({
        seccionId: data.seccionId,
        cursoSeccionId: data.cursoSeccionId,
        diaSemana: data.diaSemana,
        horaInicio: data.horaInicio,
        horaFin: data.horaFin,
        tipoBloque: data.tipoBloque,
        aula: data.aula,
      })
      .returning({ id: horarios.id });

    return creado.id;
  }
}
