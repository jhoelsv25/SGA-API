import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import {
  apoderados,
  cursosSeccion,
  docentes,
  estudianteApoderados,
  estudiantes,
  matriculas,
  periodosAcademicos,
  personas,
  secciones,
  usuarios,
} from "@/core/database/schema";
import { InfoMatriculaEstudiante } from "../../interfaces";
import type { ConductaRepositoryDeps } from "./deps";

export async function obtenerInfoMatricula(
  deps: ConductaRepositoryDeps,
  matriculaId: string,
): Promise<InfoMatriculaEstudiante | null> {
  const rows = await deps.db
    .select({
      matriculaId: matriculas.id,
      anioAcademicoId: matriculas.anioAcademicoId,
      estudianteId: estudiantes.id,
      codigoEstudiante: estudiantes.codigo,
      estudiantePersonaId: estudiantes.personaId,
      nombre: personas.nombres,
      apellidoPaterno: personas.apellidoPaterno,
      apellidoMaterno: personas.apellidoMaterno,
      seccionId: matriculas.seccionId,
      gradoId: secciones.gradoId,
      tutorDocenteId: secciones.tutorId,
    })
    .from(matriculas)
    .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
    .innerJoin(personas, eq(estudiantes.personaId, personas.id))
    .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
    .where(eq(matriculas.id, matriculaId))
    .limit(1);

  if (!rows.length) return null;
  const row = rows[0];

  // Obtener usuarioId del estudiante
  const estUser = await deps.db
    .select({ usuarioId: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.personaId, row.estudiantePersonaId))
    .limit(1);

  // Obtener usuarioId del tutor
  let tutorUsuarioId: string | undefined;
  if (row.tutorDocenteId) {
    const tutorRows = await deps.db
      .select({ usuarioId: usuarios.id })
      .from(docentes)
      .innerJoin(usuarios, eq(docentes.personaId, usuarios.personaId))
      .where(eq(docentes.id, row.tutorDocenteId))
      .limit(1);
    if (tutorRows.length) tutorUsuarioId = tutorRows[0].usuarioId;
  }

  // Obtener apoderado principal del estudiante
  let apoderadoPrincipalUsuarioId: string | undefined;
  let apoderadoPrincipalNombre: string | undefined;

  const apodRows = await deps.db
    .select({
      usuarioId: usuarios.id,
      nombres: personas.nombres,
      apellidoPaterno: personas.apellidoPaterno,
      apellidoMaterno: personas.apellidoMaterno,
    })
    .from(estudianteApoderados)
    .innerJoin(apoderados, eq(estudianteApoderados.apoderadoId, apoderados.id))
    .innerJoin(personas, eq(apoderados.personaId, personas.id))
    .innerJoin(usuarios, eq(personas.id, usuarios.personaId))
    .where(
      and(
        eq(estudianteApoderados.estudianteId, row.estudianteId),
        eq(estudianteApoderados.esPrincipal, true),
      ),
    )
    .limit(1);

  if (apodRows.length) {
    apoderadoPrincipalUsuarioId = apodRows[0].usuarioId;
    apoderadoPrincipalNombre =
      `${apodRows[0].nombres} ${apodRows[0].apellidoPaterno} ${apodRows[0].apellidoMaterno || ""}`.trim();
  }

  const nombreCompleto = `${row.nombre} ${row.apellidoPaterno} ${row.apellidoMaterno || ""}`.trim();

  return {
    matriculaId: row.matriculaId,
    estudianteId: row.estudianteId,
    estudianteUsuarioId: estUser.length ? estUser[0].usuarioId : undefined,
    nombreCompleto,
    codigoEstudiante: row.codigoEstudiante,
    seccionId: row.seccionId,
    gradoId: row.gradoId,
    tutorUsuarioId,
    apoderadoPrincipalUsuarioId,
    apoderadoPrincipalNombre,
  };
}

export async function esDocenteDeSeccion(
  deps: ConductaRepositoryDeps,
  usuarioId: string,
  seccionId: string,
): Promise<boolean> {
  const docRows = await deps.db
    .select({ docenteId: docentes.id })
    .from(usuarios)
    .innerJoin(docentes, eq(usuarios.personaId, docentes.personaId))
    .where(eq(usuarios.id, usuarioId))
    .limit(1);

  if (!docRows.length) return false;
  const docenteId = docRows[0].docenteId;

  // Verificar si es tutor
  const secRows = await deps.db
    .select({ id: secciones.id })
    .from(secciones)
    .where(and(eq(secciones.id, seccionId), eq(secciones.tutorId, docenteId)))
    .limit(1);

  if (secRows.length) return true;

  // Verificar si dicta algún curso en la sección
  const cursoRows = await deps.db
    .select({ id: cursosSeccion.id })
    .from(cursosSeccion)
    .where(and(eq(cursosSeccion.seccionId, seccionId), eq(cursosSeccion.docenteId, docenteId)))
    .limit(1);

  return cursoRows.length > 0;
}

export async function esTutorDeSeccion(
  deps: ConductaRepositoryDeps,
  usuarioId: string,
  seccionId: string,
): Promise<boolean> {
  const docRows = await deps.db
    .select({ docenteId: docentes.id })
    .from(usuarios)
    .innerJoin(docentes, eq(usuarios.personaId, docentes.personaId))
    .where(eq(usuarios.id, usuarioId))
    .limit(1);

  if (!docRows.length) return false;

  const secRows = await deps.db
    .select({ id: secciones.id })
    .from(secciones)
    .where(and(eq(secciones.id, seccionId), eq(secciones.tutorId, docRows[0].docenteId)))
    .limit(1);

  return secRows.length > 0;
}

export async function esApoderadoDeEstudiante(
  deps: ConductaRepositoryDeps,
  usuarioId: string,
  matriculaId: string,
): Promise<boolean> {
  const rows = await deps.db
    .select({ estudianteId: matriculas.estudianteId })
    .from(matriculas)
    .where(eq(matriculas.id, matriculaId))
    .limit(1);

  if (!rows.length) return false;
  const estudianteId = rows[0].estudianteId;

  const apodRows = await deps.db
    .select({ id: estudianteApoderados.apoderadoId })
    .from(estudianteApoderados)
    .innerJoin(apoderados, eq(estudianteApoderados.apoderadoId, apoderados.id))
    .innerJoin(usuarios, eq(apoderados.personaId, usuarios.personaId))
    .where(and(eq(estudianteApoderados.estudianteId, estudianteId), eq(usuarios.id, usuarioId)))
    .limit(1);

  return apodRows.length > 0;
}

export async function esEstudianteDeMatricula(
  deps: ConductaRepositoryDeps,
  usuarioId: string,
  matriculaId: string,
): Promise<boolean> {
  const rows = await deps.db
    .select({ personaId: estudiantes.personaId })
    .from(matriculas)
    .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
    .where(eq(matriculas.id, matriculaId))
    .limit(1);

  if (!rows.length) return false;

  const userRows = await deps.db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(and(eq(usuarios.id, usuarioId), eq(usuarios.personaId, rows[0].personaId)))
    .limit(1);

  return userRows.length > 0;
}

export async function obtenerMatriculasDeUsuario(
  deps: ConductaRepositoryDeps,
  usuarioId: string,
  rol: "estudiante" | "apoderado",
): Promise<string[]> {
  if (rol === "estudiante") {
    const rows = await deps.db
      .select({ matriculaId: matriculas.id })
      .from(matriculas)
      .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
      .innerJoin(usuarios, eq(estudiantes.personaId, usuarios.personaId))
      .where(
        and(eq(usuarios.id, usuarioId), inArray(matriculas.estado, ["matriculado", "vigente"])),
      )
      .orderBy(desc(matriculas.creadoEn));
    return rows.map((r) => r.matriculaId);
  }

  const rows = await deps.db
    .select({ matriculaId: matriculas.id })
    .from(matriculas)
    .innerJoin(estudianteApoderados, eq(matriculas.estudianteId, estudianteApoderados.estudianteId))
    .innerJoin(apoderados, eq(estudianteApoderados.apoderadoId, apoderados.id))
    .innerJoin(usuarios, eq(apoderados.personaId, usuarios.personaId))
    .where(and(eq(usuarios.id, usuarioId), inArray(matriculas.estado, ["matriculado", "vigente"])))
    .orderBy(desc(matriculas.creadoEn));
  return rows.map((r) => r.matriculaId);
}

export async function deducirPeriodoId(
  deps: ConductaRepositoryDeps,
  matriculaId: string,
  fecha: string,
): Promise<string> {
  const matRows = await deps.db
    .select({ anioAcademicoId: matriculas.anioAcademicoId })
    .from(matriculas)
    .where(eq(matriculas.id, matriculaId))
    .limit(1);

  if (!matRows.length) {
    throw new Error("Matrícula no encontrada");
  }

  const anioId = matRows[0].anioAcademicoId;

  // Buscar periodo que contenga la fecha
  const periodos = await deps.db
    .select({ id: periodosAcademicos.id })
    .from(periodosAcademicos)
    .where(
      and(
        eq(periodosAcademicos.anioAcademicoId, anioId),
        lte(periodosAcademicos.fechaInicio, fecha),
        gte(periodosAcademicos.fechaFin, fecha),
      ),
    )
    .limit(1);

  if (periodos.length) return periodos[0].id;

  // Fallback: periodo en curso
  const enCurso = await deps.db
    .select({ id: periodosAcademicos.id })
    .from(periodosAcademicos)
    .where(
      and(
        eq(periodosAcademicos.anioAcademicoId, anioId),
        eq(periodosAcademicos.estado, "en_curso"),
      ),
    )
    .limit(1);

  if (enCurso.length) return enCurso[0].id;

  // Fallback: primer periodo del año
  const primerPeriodo = await deps.db
    .select({ id: periodosAcademicos.id })
    .from(periodosAcademicos)
    .where(eq(periodosAcademicos.anioAcademicoId, anioId))
    .orderBy(periodosAcademicos.numero)
    .limit(1);

  if (!primerPeriodo.length) {
    throw new Error("No existen periodos académicos configurados para el año lectivo.");
  }

  return primerPeriodo[0].id;
}
