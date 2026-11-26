import { and, count, eq, sql } from "drizzle-orm";
import {
  aniosAcademicos,
  asistenciasEstudiante,
  credenciales,
  entregasTarea,
  estudianteApoderados,
  estudiantes,
  grados,
  matriculas,
  personas,
  secciones,
} from "../../../../core/database/schema";
import { SeccionConVacantes } from "../../interfaces";
import { MatriculaQueryDto } from "../../dto";
import type { MatriculasRepositoryDeps, MatriculasRepositoryCalls } from "./deps";

export async function listarSeccionesActivasDeAnio(
  deps: MatriculasRepositoryDeps,
  anioAcademicoId: string,
): Promise<SeccionConVacantes[]> {
  const rows = await deps.db
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
    .where(and(eq(secciones.anioAcademicoId, anioAcademicoId), eq(secciones.estado, "activa")))
    .groupBy(secciones.id, aniosAcademicos.anio, grados.numero, grados.nombre);

  return rows.map((row) => {
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
  });
}

export async function obtenerResumen(
  deps: MatriculasRepositoryDeps,
  calls: MatriculasRepositoryCalls,
  query?: MatriculaQueryDto,
  anioClsId?: string,
): Promise<{
  totalMatriculados: number;
  totalRetirados: number;
  totalTrasladados: number;
  vacantesTotales: number;
  vacantesOcupadas: number;
  vacantesDisponibles: number;
}> {
  let anioId = query?.anioAcademicoId || anioClsId;
  if (!anioId) {
    const anio = await calls.findAnioParaMatricula();
    anioId = anio?.id;
  }

  if (!anioId) {
    return {
      totalMatriculados: 0,
      totalRetirados: 0,
      totalTrasladados: 0,
      vacantesTotales: 0,
      vacantesOcupadas: 0,
      vacantesDisponibles: 0,
    };
  }

  const condicionesMatricula = [eq(matriculas.anioAcademicoId, anioId)];
  if (query?.gradoId) condicionesMatricula.push(eq(secciones.gradoId, query.gradoId));
  if (query?.seccionId) condicionesMatricula.push(eq(matriculas.seccionId, query.seccionId));
  if (query?.tipo) condicionesMatricula.push(eq(matriculas.tipo, query.tipo));
  if (query?.search && query.search.trim().length >= 2) {
    const patron = `%${query.search.trim()}%`;
    condicionesMatricula.push(
      sql`(
          ${personas.nombres} ILIKE ${patron}
          OR ${personas.apellidoPaterno} ILIKE ${patron}
          OR ${personas.apellidoMaterno} ILIKE ${patron}
          OR ${personas.numeroDocumento} ILIKE ${patron}
          OR ${matriculas.codigo} ILIKE ${patron}
          OR ${estudiantes.codigo} ILIKE ${patron}
        )`,
    );
  }

  const [conteos] = await deps.db
    .select({
      totalMatriculados: sql<number>`COUNT(*) FILTER (WHERE ${matriculas.estado} = 'matriculado')::int`,
      totalRetirados: sql<number>`COUNT(*) FILTER (WHERE ${matriculas.estado} = 'retirado')::int`,
      totalTrasladados: sql<number>`COUNT(*) FILTER (WHERE ${matriculas.estado} = 'trasladado')::int`,
    })
    .from(matriculas)
    .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
    .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
    .innerJoin(personas, eq(estudiantes.personaId, personas.id))
    .where(and(...condicionesMatricula));

  const condicionesSeccion = [
    eq(secciones.anioAcademicoId, anioId),
    eq(secciones.estado, "activa"),
  ];
  if (query?.gradoId) condicionesSeccion.push(eq(secciones.gradoId, query.gradoId));
  if (query?.seccionId) condicionesSeccion.push(eq(secciones.id, query.seccionId));

  const seccionesRows = await deps.db
    .select({
      vacantes: secciones.vacantes,
      ocupadas: sql<number>`COUNT(*) FILTER (WHERE ${matriculas.estado} = 'matriculado')::int`,
    })
    .from(secciones)
    .leftJoin(matriculas, eq(secciones.id, matriculas.seccionId))
    .where(and(...condicionesSeccion))
    .groupBy(secciones.id);

  let vacantesTotales = 0;
  let vacantesOcupadas = 0;
  for (const s of seccionesRows) {
    vacantesTotales += Number(s.vacantes ?? 0);
    vacantesOcupadas += Number(s.ocupadas ?? 0);
  }

  return {
    totalMatriculados: Number(conteos?.totalMatriculados ?? 0),
    totalRetirados: Number(conteos?.totalRetirados ?? 0),
    totalTrasladados: Number(conteos?.totalTrasladados ?? 0),
    vacantesTotales,
    vacantesOcupadas,
    vacantesDisponibles: Math.max(0, vacantesTotales - vacantesOcupadas),
  };
}

export async function hasApoderadoPrincipal(
  deps: MatriculasRepositoryDeps,
  estudianteId: string,
): Promise<boolean> {
  const [row] = await deps.db
    .select({ id: estudianteApoderados.apoderadoId })
    .from(estudianteApoderados)
    .where(
      and(
        eq(estudianteApoderados.estudianteId, estudianteId),
        eq(estudianteApoderados.esPrincipal, true),
      ),
    )
    .limit(1);

  return Boolean(row);
}

export async function getNextCorrelativo(
  deps: MatriculasRepositoryDeps,
  anio: number,
): Promise<number> {
  const prefix = `${anio}-%`;
  const [row] = await deps.db
    .select({
      maxCodigo: sql<string>`MAX(${matriculas.codigo})`,
    })
    .from(matriculas)
    .where(sql`${matriculas.codigo} LIKE ${prefix}`);

  if (!row?.maxCodigo) return 1;

  const parts = row.maxCodigo.split("-");
  const num = Number(parts[1]);
  return Number.isFinite(num) ? num + 1 : 1;
}

export async function countMatriculadosActivosEnSeccion(
  deps: MatriculasRepositoryDeps,
  seccionId: string,
): Promise<number> {
  const [row] = await deps.db
    .select({ total: count() })
    .from(matriculas)
    .where(and(eq(matriculas.seccionId, seccionId), eq(matriculas.estado, "matriculado")));

  return Number(row?.total ?? 0);
}

export async function hasActividadRegistrada(
  deps: MatriculasRepositoryDeps,
  matriculaId: string,
): Promise<boolean> {
  const [asistenciasRow] = await deps.db
    .select({ total: count() })
    .from(asistenciasEstudiante)
    .where(eq(asistenciasEstudiante.matriculaId, matriculaId));

  if (Number(asistenciasRow?.total ?? 0) > 0) return true;

  const [entregasRow] = await deps.db
    .select({ total: count() })
    .from(entregasTarea)
    .where(eq(entregasTarea.matriculaId, matriculaId));

  return Number(entregasRow?.total ?? 0) > 0;
}

export async function create(
  deps: MatriculasRepositoryDeps,
  data: {
    estudianteId: string;
    seccionId: string;
    anioAcademicoId: string;
    codigo: string;
    fechaMatricula: string;
    tipo: string;
    esRepitente?: boolean;
    colegioProcedencia?: string | null;
    observaciones?: string | null;
    registradoPorId?: string | null;
  },
): Promise<string> {
  const [inserted] = await deps.db
    .insert(matriculas)
    .values({
      estudianteId: data.estudianteId,
      seccionId: data.seccionId,
      anioAcademicoId: data.anioAcademicoId,
      codigo: data.codigo,
      fechaMatricula: data.fechaMatricula,
      tipo: data.tipo,
      estado: "matriculado",
      esRepitente: data.esRepitente ?? false,
      colegioProcedencia: data.colegioProcedencia ?? null,
      observaciones: data.observaciones ?? null,
      registradoPorId: data.registradoPorId ?? null,
    })
    .returning({ id: matriculas.id });

  return inserted.id;
}

export async function update(
  deps: MatriculasRepositoryDeps,
  id: string,
  data: Partial<typeof matriculas.$inferInsert>,
): Promise<void> {
  await deps.db
    .update(matriculas)
    .set({
      ...data,
      actualizadoEn: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(matriculas.id, id));
}

export async function deleteRecord(deps: MatriculasRepositoryDeps, id: string): Promise<void> {
  await deps.db.delete(matriculas).where(eq(matriculas.id, id));
}

export async function actualizarEstadoEstudiante(
  deps: MatriculasRepositoryDeps,
  estudianteId: string,
  nuevoEstado: "activo" | "retirado" | "trasladado" | "egresado",
): Promise<void> {
  await deps.db
    .update(estudiantes)
    .set({ estado: nuevoEstado, actualizadoEn: sql`CURRENT_TIMESTAMP` })
    .where(eq(estudiantes.id, estudianteId));
}

export async function egresarEstudianteYDesactivarCredenciales(
  deps: MatriculasRepositoryDeps,
  estudianteId: string,
): Promise<void> {
  await deps.db.transaction(async (tx) => {
    const [est] = await tx
      .update(estudiantes)
      .set({ estado: "egresado", actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(estudiantes.id, estudianteId))
      .returning({ personaId: estudiantes.personaId });
    if (!est) return;

    await tx
      .update(credenciales)
      .set({
        activa: false,
        anuladaEn: sql`CURRENT_TIMESTAMP`,
        motivoAnulacion: "Estudiante egresado de 5.° de secundaria",
      })
      .where(and(eq(credenciales.personaId, est.personaId), eq(credenciales.activa, true)));
  });
}
