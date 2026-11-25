import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
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
  matriculas,
  periodosAcademicos,
  personas,
  roles,
  secciones,
  usuarioRoles,
  usuarios,
  variablesSistema,
} from "../../../core/database/schema";
import type { CursoAula, CursoAulaResumen, PeriodoAula } from "../interfaces";
import {
  docentePersonaSql,
  nombreSql,
  seccionNombreSql,
  totalEstudiantesSeccionSql,
} from "./aula-shared.helper";

/**
 * Repositorio especializado en contexto de cursos, períodos, variables de sistema
 * y verificación de permisos de acceso (docente, estudiante, apoderado y directivos).
 */
@Injectable()
export class AulaAccesoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findDocenteIdPorPersona(personaId: string): Promise<string | null> {
    const [fila] = await this.db
      .select({ id: docentes.id })
      .from(docentes)
      .where(eq(docentes.personaId, personaId))
      .limit(1);
    return fila?.id ?? null;
  }

  async findCurso(cursoSeccionId: string): Promise<CursoAula | null> {
    const [fila] = await this.db
      .select({
        id: cursosSeccion.id,
        docenteId: cursosSeccion.docenteId,
        seccionId: cursosSeccion.seccionId,
        anioAcademicoId: secciones.anioAcademicoId,
        cursoNombre: cursos.nombre,
        seccionNombre: seccionNombreSql,
      })
      .from(cursosSeccion)
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .where(eq(cursosSeccion.id, cursoSeccionId))
      .limit(1);
    return fila ?? null;
  }

  async findPeriodo(periodoId: string): Promise<PeriodoAula | null> {
    const [fila] = await this.db
      .select({
        id: periodosAcademicos.id,
        anioAcademicoId: periodosAcademicos.anioAcademicoId,
        nombre: periodosAcademicos.nombre,
        fechaInicio: periodosAcademicos.fechaInicio,
        fechaFin: periodosAcademicos.fechaFin,
        estado: periodosAcademicos.estado,
      })
      .from(periodosAcademicos)
      .where(eq(periodosAcademicos.id, periodoId))
      .limit(1);
    return fila ?? null;
  }

  async findPeriodoEnCurso(anioAcademicoId: string): Promise<PeriodoAula | null> {
    const [fila] = await this.db
      .select({
        id: periodosAcademicos.id,
        anioAcademicoId: periodosAcademicos.anioAcademicoId,
        nombre: periodosAcademicos.nombre,
        fechaInicio: periodosAcademicos.fechaInicio,
        fechaFin: periodosAcademicos.fechaFin,
        estado: periodosAcademicos.estado,
      })
      .from(periodosAcademicos)
      .where(
        and(
          eq(periodosAcademicos.anioAcademicoId, anioAcademicoId),
          eq(periodosAcademicos.estado, "en_curso"),
        ),
      )
      .limit(1);
    return fila ?? null;
  }

  async leerVariableEntera(codigo: string, porDefecto: number): Promise<number> {
    const [fila] = await this.db
      .select({ valor: variablesSistema.valor })
      .from(variablesSistema)
      .where(and(eq(variablesSistema.codigo, codigo), eq(variablesSistema.vigente, true)))
      .limit(1);
    const numero = fila ? Number(fila.valor) : Number.NaN;
    return Number.isFinite(numero) ? numero : porDefecto;
  }

  async cursosDelDocente(docenteId: string, anioAcademicoId: string): Promise<CursoAulaResumen[]> {
    return this.db
      .select({
        cursoSeccionId: cursosSeccion.id,
        cursoNombre: cursos.nombre,
        seccionNombre: seccionNombreSql,
        docenteNombre: nombreSql(personas),
        colorHex: cursos.colorHex,
        areaCurricular: cursos.areaCurricular,
        gradoNombre: grados.nombre,
        totalEstudiantes: totalEstudiantesSeccionSql,
      })
      .from(cursosSeccion)
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .innerJoin(docentes, eq(docentes.id, cursosSeccion.docenteId))
      .innerJoin(personas, eq(personas.id, docentes.personaId))
      .where(
        and(eq(cursosSeccion.docenteId, docenteId), eq(secciones.anioAcademicoId, anioAcademicoId)),
      )
      .orderBy(asc(grados.numero), asc(secciones.nombre), asc(cursos.nombre));
  }

  async cursosDelEstudiante(
    personaId: string,
    anioAcademicoId: string,
  ): Promise<CursoAulaResumen[]> {
    return this.db
      .select({
        cursoSeccionId: cursosSeccion.id,
        cursoNombre: cursos.nombre,
        seccionNombre: seccionNombreSql,
        docenteNombre: docentePersonaSql,
        colorHex: cursos.colorHex,
        areaCurricular: cursos.areaCurricular,
        gradoNombre: grados.nombre,
        totalEstudiantes: totalEstudiantesSeccionSql,
      })
      .from(matriculas)
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .innerJoin(secciones, eq(secciones.id, matriculas.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .innerJoin(cursosSeccion, eq(cursosSeccion.seccionId, secciones.id))
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .where(
        and(
          or(eq(estudiantes.personaId, personaId), eq(estudiantes.id, personaId)),
          eq(matriculas.anioAcademicoId, anioAcademicoId),
          inArray(matriculas.estado, ["matriculado", "vigente"]),
        ),
      )
      .orderBy(asc(cursos.nombre));
  }

  async estudianteTieneMatriculaEnSeccion(personaId: string, seccionId: string): Promise<boolean> {
    const [fila] = await this.db
      .select({ id: matriculas.id })
      .from(matriculas)
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .where(
        and(
          eq(estudiantes.personaId, personaId),
          eq(matriculas.seccionId, seccionId),
          inArray(matriculas.estado, ["matriculado", "vigente"]),
        ),
      )
      .limit(1);
    return Boolean(fila);
  }

  async cursosDelAnio(anioAcademicoId: string): Promise<CursoAulaResumen[]> {
    return this.db
      .select({
        cursoSeccionId: cursosSeccion.id,
        cursoNombre: cursos.nombre,
        seccionNombre: seccionNombreSql,
        docenteNombre: docentePersonaSql,
        colorHex: cursos.colorHex,
        areaCurricular: cursos.areaCurricular,
        gradoNombre: grados.nombre,
        totalEstudiantes: totalEstudiantesSeccionSql,
      })
      .from(cursosSeccion)
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .where(eq(secciones.anioAcademicoId, anioAcademicoId))
      .orderBy(asc(grados.numero), asc(secciones.nombre), asc(cursos.nombre));
  }

  async cursosDelApoderado(
    apoderadoPersonaId: string,
    anioAcademicoId: string,
  ): Promise<CursoAulaResumen[]> {
    const filas = await this.db
      .select({
        cursoSeccionId: cursosSeccion.id,
        cursoNombre: cursos.nombre,
        seccionNombre: seccionNombreSql,
        docenteNombre: docentePersonaSql,
        colorHex: cursos.colorHex,
        areaCurricular: cursos.areaCurricular,
        gradoNombre: grados.nombre,
        totalEstudiantes: totalEstudiantesSeccionSql,
      })
      .from(estudianteApoderados)
      .innerJoin(apoderados, eq(apoderados.id, estudianteApoderados.apoderadoId))
      .innerJoin(estudiantes, eq(estudiantes.id, estudianteApoderados.estudianteId))
      .innerJoin(matriculas, eq(matriculas.estudianteId, estudiantes.id))
      .innerJoin(secciones, eq(secciones.id, matriculas.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .innerJoin(cursosSeccion, eq(cursosSeccion.seccionId, secciones.id))
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .where(
        and(
          eq(apoderados.personaId, apoderadoPersonaId),
          isNull(apoderados.eliminadoEn),
          eq(matriculas.anioAcademicoId, anioAcademicoId),
          inArray(matriculas.estado, ["matriculado", "vigente"]),
        ),
      )
      .orderBy(asc(grados.numero), asc(secciones.nombre), asc(cursos.nombre));

    const vistos = new Set<string>();
    return filas.filter((f) => {
      if (vistos.has(f.cursoSeccionId)) return false;
      vistos.add(f.cursoSeccionId);
      return true;
    });
  }

  async apoderadoTieneHijoEnSeccion(
    apoderadoPersonaId: string,
    seccionId: string,
  ): Promise<boolean> {
    const [fila] = await this.db
      .select({ id: matriculas.id })
      .from(estudianteApoderados)
      .innerJoin(apoderados, eq(apoderados.id, estudianteApoderados.apoderadoId))
      .innerJoin(estudiantes, eq(estudiantes.id, estudianteApoderados.estudianteId))
      .innerJoin(matriculas, eq(matriculas.estudianteId, estudiantes.id))
      .where(
        and(
          eq(apoderados.personaId, apoderadoPersonaId),
          isNull(apoderados.eliminadoEn),
          eq(matriculas.seccionId, seccionId),
          inArray(matriculas.estado, ["matriculado", "vigente"]),
        ),
      )
      .limit(1);
    return Boolean(fila);
  }

  async esApoderadoDeEstudiante(
    apoderadoPersonaId: string,
    estudiantePersonaIdOId: string,
  ): Promise<boolean> {
    const [fila] = await this.db
      .select({ estudianteId: estudiantes.id })
      .from(estudianteApoderados)
      .innerJoin(apoderados, eq(apoderados.id, estudianteApoderados.apoderadoId))
      .innerJoin(estudiantes, eq(estudiantes.id, estudianteApoderados.estudianteId))
      .where(
        and(
          eq(apoderados.personaId, apoderadoPersonaId),
          isNull(apoderados.eliminadoEn),
          or(
            eq(estudiantes.personaId, estudiantePersonaIdOId),
            eq(estudiantes.id, estudiantePersonaIdOId),
          ),
        ),
      )
      .limit(1);
    return Boolean(fila);
  }

  async estudiantesDeApoderadoEnSeccion(
    apoderadoPersonaId: string,
    seccionId: string,
  ): Promise<
    Array<{
      estudianteId: string;
      personaId: string;
      matriculaId: string;
      nombreCompleto: string;
    }>
  > {
    return this.db
      .select({
        estudianteId: estudiantes.id,
        personaId: personas.id,
        matriculaId: matriculas.id,
        nombreCompleto: nombreSql(personas),
      })
      .from(estudianteApoderados)
      .innerJoin(apoderados, eq(apoderados.id, estudianteApoderados.apoderadoId))
      .innerJoin(estudiantes, eq(estudiantes.id, estudianteApoderados.estudianteId))
      .innerJoin(personas, eq(personas.id, estudiantes.personaId))
      .innerJoin(matriculas, eq(matriculas.estudianteId, estudiantes.id))
      .where(
        and(
          eq(apoderados.personaId, apoderadoPersonaId),
          isNull(apoderados.eliminadoEn),
          eq(matriculas.seccionId, seccionId),
          inArray(matriculas.estado, ["matriculado", "vigente"]),
        ),
      )
      .orderBy(asc(personas.apellidoPaterno), asc(personas.nombres));
  }

  async usuariosConRol(nombresRol: readonly string[]): Promise<string[]> {
    const filas = await this.db
      .selectDistinct({ id: usuarios.id })
      .from(usuarios)
      .innerJoin(usuarioRoles, eq(usuarioRoles.usuarioId, usuarios.id))
      .innerJoin(roles, eq(roles.id, usuarioRoles.rolId))
      .where(
        and(
          inArray(roles.nombre, [...nombresRol]),
          eq(usuarioRoles.vigente, true),
          isNull(usuarios.eliminadoEn),
          eq(usuarios.estado, "activo"),
        ),
      );
    return filas.map((fila) => fila.id);
  }

  async usuariosEstudiantesDeSeccion(
    seccionId: string,
    anioAcademicoId: string,
  ): Promise<string[]> {
    const filas = await this.db
      .selectDistinct({ id: usuarios.id })
      .from(matriculas)
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .innerJoin(usuarios, eq(usuarios.personaId, estudiantes.personaId))
      .where(
        and(
          eq(matriculas.seccionId, seccionId),
          eq(matriculas.anioAcademicoId, anioAcademicoId),
          eq(matriculas.estado, "matriculado"),
          isNull(usuarios.eliminadoEn),
        ),
      );
    return filas.map((fila) => fila.id);
  }

  async obtenerAnioPorCursoSeccion(
    cursoSeccionId: string,
  ): Promise<{ id: string; anio: number; estado: string } | null> {
    const [fila] = await this.db
      .select({
        id: aniosAcademicos.id,
        anio: aniosAcademicos.anio,
        estado: aniosAcademicos.estado,
      })
      .from(cursosSeccion)
      .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
      .innerJoin(aniosAcademicos, eq(aniosAcademicos.id, secciones.anioAcademicoId))
      .where(eq(cursosSeccion.id, cursoSeccionId))
      .limit(1);
    return fila ?? null;
  }

  async obtenerDocenteUsuarioId(cursoSeccionId: string): Promise<string | null> {
    const [fila] = await this.db
      .select({ usuarioId: usuarios.id })
      .from(cursosSeccion)
      .innerJoin(docentes, eq(docentes.id, cursosSeccion.docenteId))
      .innerJoin(usuarios, eq(usuarios.personaId, docentes.personaId))
      .where(eq(cursosSeccion.id, cursoSeccionId))
      .limit(1);
    return fila?.usuarioId ?? null;
  }

  async obtenerMatriculaActivaEstudiante(
    personaId: string,
    seccionId: string,
  ): Promise<{ id: string; estudianteId: string } | null> {
    const [fila] = await this.db
      .select({ id: matriculas.id, estudianteId: estudiantes.id })
      .from(matriculas)
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .where(
        and(
          eq(estudiantes.personaId, personaId),
          eq(matriculas.seccionId, seccionId),
          inArray(matriculas.estado, ["matriculado", "vigente"]),
        ),
      )
      .limit(1);
    return fila ?? null;
  }
}
