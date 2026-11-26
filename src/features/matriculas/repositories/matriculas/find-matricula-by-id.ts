import { and, count, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import {
  aniosAcademicos,
  apoderados,
  estudianteApoderados,
  estudiantes,
  grados,
  matriculas,
  personas,
  secciones,
} from "../../../../core/database/schema";
import { EstudianteParaMatricula, SeccionConVacantes } from "../../interfaces";
import { MatriculaResponseDto } from "../../dto";
import type { MatriculasRepositoryDeps, MatriculasRepositoryCalls } from "./deps";

export async function findMatriculaById(
  deps: MatriculasRepositoryDeps,
  calls: MatriculasRepositoryCalls,
  id: string,
): Promise<MatriculaResponseDto | null> {
  const [row] = await deps.db
    .select({
      id: matriculas.id,
      codigo: matriculas.codigo,
      fechaMatricula: matriculas.fechaMatricula,
      tipo: matriculas.tipo,
      estado: matriculas.estado,
      esRepitente: matriculas.esRepitente,
      colegioProcedencia: matriculas.colegioProcedencia,
      fechaRetiro: matriculas.fechaRetiro,
      motivoRetiro: matriculas.motivoRetiro,
      observaciones: matriculas.observaciones,
      creadoEn: matriculas.creadoEn,
      anioAcademicoId: matriculas.anioAcademicoId,
      anioNumero: aniosAcademicos.anio,
      gradoId: secciones.gradoId,
      gradoNumero: grados.numero,
      gradoNombre: grados.nombre,
      seccionId: matriculas.seccionId,
      seccionNombre: secciones.nombre,
      estudianteId: estudiantes.id,
      codigoEstudiante: estudiantes.codigo,
      estudianteEstado: estudiantes.estado,
      personaNombres: personas.nombres,
      personaApellidoPaterno: personas.apellidoPaterno,
      personaApellidoMaterno: personas.apellidoMaterno,
      personaTipoDocumento: personas.tipoDocumento,
      personaNumeroDocumento: personas.numeroDocumento,
    })
    .from(matriculas)
    .innerJoin(aniosAcademicos, eq(matriculas.anioAcademicoId, aniosAcademicos.id))
    .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
    .innerJoin(grados, eq(secciones.gradoId, grados.id))
    .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
    .innerJoin(personas, eq(estudiantes.personaId, personas.id))
    .where(eq(matriculas.id, id))
    .limit(1);

  if (!row) return null;

  const apoderadosRows = await deps.db
    .select({
      id: apoderados.id,
      nombres: personas.nombres,
      apellidoPaterno: personas.apellidoPaterno,
      apellidoMaterno: personas.apellidoMaterno,
      tipoDocumento: personas.tipoDocumento,
      numeroDocumento: personas.numeroDocumento,
      telefono: personas.telefono,
      parentesco: estudianteApoderados.parentesco,
      esPrincipal: estudianteApoderados.esPrincipal,
    })
    .from(estudianteApoderados)
    .innerJoin(apoderados, eq(estudianteApoderados.apoderadoId, apoderados.id))
    .innerJoin(personas, eq(apoderados.personaId, personas.id))
    .where(
      and(eq(estudianteApoderados.estudianteId, row.estudianteId), isNull(apoderados.eliminadoEn)),
    )
    .orderBy(desc(estudianteApoderados.esPrincipal));

  return {
    ...calls.mapToResponseDto(row),
    apoderados: apoderadosRows.map((a) => ({
      id: a.id,
      nombreCompleto: [a.apellidoPaterno, a.apellidoMaterno, a.nombres].filter(Boolean).join(" "),
      tipoDocumento: a.tipoDocumento,
      numeroDocumento: a.numeroDocumento,
      parentesco: a.parentesco,
      telefono: a.telefono ?? null,
      esPrincipal: a.esPrincipal,
    })),
  };
}

export async function findMatriculaByEstudianteYAnio(
  deps: MatriculasRepositoryDeps,
  estudianteId: string,
  anioAcademicoId: string,
): Promise<{ id: string; codigo: string; estado: string } | null> {
  const [row] = await deps.db
    .select({
      id: matriculas.id,
      codigo: matriculas.codigo,
      estado: matriculas.estado,
    })
    .from(matriculas)
    .where(
      and(
        eq(matriculas.estudianteId, estudianteId),
        eq(matriculas.anioAcademicoId, anioAcademicoId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function findEstudianteById(
  deps: MatriculasRepositoryDeps,
  estudianteId: string,
): Promise<EstudianteParaMatricula | null> {
  const [row] = await deps.db
    .select({
      id: estudiantes.id,
      personaId: estudiantes.personaId,
      codigo: estudiantes.codigo,
      estado: estudiantes.estado,
      nombres: personas.nombres,
      apellidoPaterno: personas.apellidoPaterno,
      apellidoMaterno: personas.apellidoMaterno,
      numeroDocumento: personas.numeroDocumento,
      tipoDocumento: personas.tipoDocumento,
    })
    .from(estudiantes)
    .innerJoin(personas, eq(estudiantes.personaId, personas.id))
    .where(eq(estudiantes.id, estudianteId))
    .limit(1);

  return row ?? null;
}

export async function findSeccionById(
  deps: MatriculasRepositoryDeps,
  seccionId: string,
): Promise<SeccionConVacantes | null> {
  const [row] = await deps.db
    .select({
      id: secciones.id,
      anioAcademicoId: secciones.anioAcademicoId,
      anioNumero: aniosAcademicos.anio,
      gradoId: secciones.gradoId,
      gradoNumero: grados.numero,
      gradoNombre: grados.nombre,
      nombre: secciones.nombre,
      vacantes: secciones.vacantes,
      estado: secciones.estado,
      matriculadosCount: count(sql`CASE WHEN ${matriculas.estado} = 'matriculado' THEN 1 END`),
    })
    .from(secciones)
    .innerJoin(aniosAcademicos, eq(secciones.anioAcademicoId, aniosAcademicos.id))
    .innerJoin(grados, eq(secciones.gradoId, grados.id))
    .leftJoin(matriculas, eq(secciones.id, matriculas.seccionId))
    .where(eq(secciones.id, seccionId))
    .groupBy(secciones.id, aniosAcademicos.anio, grados.numero, grados.nombre)
    .limit(1);

  if (!row) return null;

  const matriculados = Number(row.matriculadosCount ?? 0);
  return {
    id: row.id,
    anioAcademicoId: row.anioAcademicoId,
    anioNumero: row.anioNumero,
    gradoId: row.gradoId,
    gradoNumero: row.gradoNumero,
    gradoNombre: row.gradoNombre,
    nombre: row.nombre,
    vacantes: row.vacantes,
    estado: row.estado,
    matriculadosCount: matriculados,
    vacantesDisponibles: Math.max(0, row.vacantes - matriculados),
  };
}

export async function findAnioById(
  deps: MatriculasRepositoryDeps,
  anioId: string,
): Promise<{ id: string; anio: number; estado: string } | null> {
  const [row] = await deps.db
    .select({
      id: aniosAcademicos.id,
      anio: aniosAcademicos.anio,
      estado: aniosAcademicos.estado,
    })
    .from(aniosAcademicos)
    .where(eq(aniosAcademicos.id, anioId))
    .limit(1);

  return row ?? null;
}

export async function findAnioParaMatricula(
  deps: MatriculasRepositoryDeps,
  calls: MatriculasRepositoryCalls,
  anioId?: string,
): Promise<{ id: string; anio: number; estado: string } | null> {
  if (anioId) {
    return calls.findAnioById(anioId);
  }

  const [enCurso] = await deps.db
    .select({
      id: aniosAcademicos.id,
      anio: aniosAcademicos.anio,
      estado: aniosAcademicos.estado,
    })
    .from(aniosAcademicos)
    .where(sql`${aniosAcademicos.estado} IN ('en_curso', 'reabierto')`)
    .orderBy(desc(aniosAcademicos.anio))
    .limit(1);

  if (enCurso) return enCurso;

  const [planificado] = await deps.db
    .select({
      id: aniosAcademicos.id,
      anio: aniosAcademicos.anio,
      estado: aniosAcademicos.estado,
    })
    .from(aniosAcademicos)
    .where(eq(aniosAcademicos.estado, "planificado"))
    .orderBy(desc(aniosAcademicos.anio))
    .limit(1);

  return planificado ?? null;
}

export async function findEstudiantePorCodigoODocumento(
  calls: MatriculasRepositoryCalls,
  identificador: string,
): Promise<EstudianteParaMatricula | null> {
  const limpio = identificador.trim();
  if (!limpio) return null;

  const lista = await calls.findEstudiantesPorCodigosODocumentos([limpio]);
  return lista[0] ?? null;
}

export async function findEstudiantesPorCodigosODocumentos(
  deps: MatriculasRepositoryDeps,
  identificadores: string[],
): Promise<EstudianteParaMatricula[]> {
  const unicos = Array.from(new Set(identificadores.map((i) => i.trim()).filter(Boolean)));
  if (unicos.length === 0) return [];

  return deps.db
    .select({
      id: estudiantes.id,
      personaId: estudiantes.personaId,
      codigo: estudiantes.codigo,
      estado: estudiantes.estado,
      nombres: personas.nombres,
      apellidoPaterno: personas.apellidoPaterno,
      apellidoMaterno: personas.apellidoMaterno,
      numeroDocumento: personas.numeroDocumento,
      tipoDocumento: personas.tipoDocumento,
    })
    .from(estudiantes)
    .innerJoin(personas, eq(estudiantes.personaId, personas.id))
    .where(
      and(
        isNull(estudiantes.eliminadoEn),
        or(inArray(estudiantes.codigo, unicos), inArray(personas.numeroDocumento, unicos)),
      ),
    );
}

export async function findMatriculasDeEstudiantesEnAnio(
  deps: MatriculasRepositoryDeps,
  estudianteIds: string[],
  anioAcademicoId: string,
): Promise<Array<{ estudianteId: string; id: string; codigo: string; estado: string }>> {
  const unicos = Array.from(new Set(estudianteIds.filter(Boolean)));
  if (unicos.length === 0) return [];

  return deps.db
    .select({
      estudianteId: matriculas.estudianteId,
      id: matriculas.id,
      codigo: matriculas.codigo,
      estado: matriculas.estado,
    })
    .from(matriculas)
    .where(
      and(
        eq(matriculas.anioAcademicoId, anioAcademicoId),
        inArray(matriculas.estudianteId, unicos),
      ),
    );
}
