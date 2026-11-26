import { and, count, eq, isNull, sql } from "drizzle-orm";
import {
  aniosAcademicos,
  credenciales,
  estudiantes,
  grados,
  institucion,
  matriculas,
  personas,
  secciones,
  usuarios,
} from "../../../../core/database/schema";
import { decodeCursor, encodeCursor } from "../../../../common/utils";
import { retirarRolConservandoCuenta } from "../../../../common/utils/retiro-rol.util";
import {
  DatosConstanciaMatricula,
  DbMatriculasProcedureExecutionResult,
  EstudianteParaMatricula,
  MatriculaCursorPayload,
  ResumenSeccionPromocionRow,
} from "../../interfaces";
import { MatriculaQueryDto, PaginatedMatriculasResponseDto } from "../../dto";
import type { MatriculasRepositoryDeps } from "./deps";

export async function obtenerResumenPromocionPorAnio(
  deps: MatriculasRepositoryDeps,
  anioOrigenId: string,
  anioDestinoId?: string,
): Promise<ResumenSeccionPromocionRow[]> {
  const yaMatriculadoExpr = anioDestinoId
    ? sql<boolean>`EXISTS(
          SELECT 1 FROM matriculas m2
          WHERE m2.estudiante_id = ${estudiantes.id}
            AND m2.anio_academico_id = ${anioDestinoId}
        )`
    : sql<boolean>`false`;

  const rows = await deps.db
    .select({
      seccionId: secciones.id,
      gradoNumero: grados.numero,
      gradoNombre: grados.nombre,
      nombre: secciones.nombre,
      totalCulminados: count(sql`CASE WHEN ${matriculas.estado} = 'culminado' THEN 1 END`),
      yaMatriculadosDestino: count(
        sql`CASE WHEN ${matriculas.estado} = 'culminado' AND (${yaMatriculadoExpr}) THEN 1 END`,
      ),
      yaEgresados: count(
        sql`CASE WHEN ${matriculas.estado} = 'culminado' AND ${estudiantes.estado} = 'egresado' THEN 1 END`,
      ),
      pendientes: count(
        sql`CASE WHEN ${matriculas.estado} = 'culminado' AND ${estudiantes.estado} = 'activo' AND NOT (${yaMatriculadoExpr}) THEN 1 END`,
      ),
    })
    .from(secciones)
    .innerJoin(grados, eq(secciones.gradoId, grados.id))
    .leftJoin(
      matriculas,
      and(eq(matriculas.seccionId, secciones.id), eq(matriculas.estado, "culminado")),
    )
    .leftJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
    .where(and(eq(secciones.anioAcademicoId, anioOrigenId), eq(secciones.estado, "activa")))
    .groupBy(secciones.id, grados.numero, grados.nombre, secciones.nombre)
    .orderBy(grados.numero, secciones.nombre);

  return rows.map((r) => ({
    seccionId: r.seccionId,
    gradoNumero: r.gradoNumero,
    gradoNombre: r.gradoNombre,
    nombre: r.nombre,
    totalCulminados: Number(r.totalCulminados) || 0,
    yaMatriculadosDestino: Number(r.yaMatriculadosDestino) || 0,
    yaEgresados: Number(r.yaEgresados) || 0,
    pendientes: Number(r.pendientes) || 0,
  }));
}

export async function desactivarEstudianteYCredenciales(
  deps: MatriculasRepositoryDeps,
  estudianteId: string,
  nuevoEstado: "retirado" | "trasladado",
  actorId: string,
): Promise<void> {
  await deps.db.transaction(async (tx) => {
    const [est] = await tx
      .update(estudiantes)
      .set({ estado: nuevoEstado, actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(estudiantes.id, estudianteId))
      .returning({ personaId: estudiantes.personaId });
    if (!est) return;

    await tx
      .update(credenciales)
      .set({
        activa: false,
        anuladaEn: sql`CURRENT_TIMESTAMP`,
        motivoAnulacion: `Estudiante ${nuevoEstado} del colegio`,
      })
      .where(and(eq(credenciales.personaId, est.personaId), eq(credenciales.activa, true)));

    const [cuenta] = await tx
      .select({
        id: usuarios.id,
        tieneOtraFicha: sql<boolean>`(
            EXISTS(SELECT 1 FROM apoderados a WHERE a.persona_id = ${est.personaId} AND a.eliminado_en IS NULL)
            OR EXISTS(SELECT 1 FROM docentes d WHERE d.persona_id = ${est.personaId} AND d.eliminado_en IS NULL AND d.estado IN ('activo', 'licencia'))
          )`,
      })
      .from(usuarios)
      .where(and(eq(usuarios.personaId, est.personaId), isNull(usuarios.eliminadoEn)))
      .limit(1);
    if (!cuenta) return;

    // RF-009 V2: con otra ficha vigente y otro rol, la cuenta se conserva
    const conservaCuenta =
      cuenta.tieneOtraFicha &&
      (await retirarRolConservandoCuenta(tx, cuenta.id, "Estudiante", actorId));
    if (!conservaCuenta) {
      await tx
        .update(usuarios)
        .set({ estado: "inactivo", actualizadoEn: sql`CURRENT_TIMESTAMP` })
        .where(eq(usuarios.id, cuenta.id));
    }
  });
}

export async function findMatriculas(
  deps: MatriculasRepositoryDeps,
  query?: MatriculaQueryDto,
): Promise<PaginatedMatriculasResponseDto> {
  const limit = query?.limit && query.limit > 0 ? query.limit : 20;
  const decodedCursor = decodeCursor<MatriculaCursorPayload>(query?.cursor);

  const payload = {
    anioAcademicoId: query?.anioAcademicoId || null,
    gradoId: query?.gradoId || null,
    seccionId: query?.seccionId || null,
    tipo: query?.tipo || null,
    estado: query?.estado || null,
    search: query?.search?.trim() || null,
    cursorCreadoEn: decodedCursor?.creadoEn || null,
    cursorId: decodedCursor?.id || null,
    limit,
  };

  const result = (await deps.db.execute(sql`
      SELECT fn_consultar_matriculas(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbMatriculasProcedureExecutionResult;

  const jsonResult = result.rows?.[0]?.resultado ?? {};
  const data = jsonResult.data ?? [];
  const hasMore = Boolean(jsonResult.hasMore);

  const nextCursor =
    hasMore && jsonResult.nextCursorId && jsonResult.nextCursorCreadoEn != null
      ? encodeCursor<MatriculaCursorPayload>({
          creadoEn: jsonResult.nextCursorCreadoEn,
          id: jsonResult.nextCursorId,
        })
      : null;

  return {
    data,
    nextCursor,
    hasMore,
    limit,
  };
}

export async function obtenerEstudiantesCulminadosSeccion(
  deps: MatriculasRepositoryDeps,
  seccionOrigenId: string,
): Promise<EstudianteParaMatricula[]> {
  const rows = await deps.db
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
    .from(matriculas)
    .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
    .innerJoin(personas, eq(estudiantes.personaId, personas.id))
    .where(and(eq(matriculas.seccionId, seccionOrigenId), eq(matriculas.estado, "culminado")))
    .orderBy(personas.apellidoPaterno, personas.apellidoMaterno, personas.nombres);

  return rows;
}

export async function getDatosConstancia(
  deps: MatriculasRepositoryDeps,
  matriculaId: string,
): Promise<DatosConstanciaMatricula | null> {
  const [row] = await deps.db
    .select({
      codigoMatricula: matriculas.codigo,
      fechaMatricula: matriculas.fechaMatricula,
      tipoMatricula: matriculas.tipo,
      anioEscolar: aniosAcademicos.anio,
      gradoNumero: grados.numero,
      gradoNombre: grados.nombre,
      seccionNombre: secciones.nombre,
      estudianteCodigo: estudiantes.codigo,
      estudianteNombres: personas.nombres,
      estudianteApellidoPaterno: personas.apellidoPaterno,
      estudianteApellidoMaterno: personas.apellidoMaterno,
      estudianteTipoDocumento: personas.tipoDocumento,
      estudianteNumeroDocumento: personas.numeroDocumento,
      estudianteFechaNacimiento: personas.fechaNacimiento,
    })
    .from(matriculas)
    .innerJoin(aniosAcademicos, eq(matriculas.anioAcademicoId, aniosAcademicos.id))
    .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
    .innerJoin(grados, eq(secciones.gradoId, grados.id))
    .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
    .innerJoin(personas, eq(estudiantes.personaId, personas.id))
    .where(eq(matriculas.id, matriculaId))
    .limit(1);

  if (!row) return null;

  // Obtener datos institucionales
  const [inst] = await deps.db
    .select({
      nombre: institucion.nombre,
      codigoModular: institucion.codigoModular,
      direccion: institucion.direccion,
      telefono: institucion.telefono,
      correo: institucion.correo,
      ugel: institucion.ugel,
      dre: institucion.dre,
      director: institucion.director,
      logoUrl: institucion.logoUrl,
      distrito: institucion.distrito,
      provincia: institucion.provincia,
      departamento: institucion.departamento,
    })
    .from(institucion)
    .limit(1);

  return {
    codigoMatricula: row.codigoMatricula,
    fechaMatricula: row.fechaMatricula,
    tipoMatricula: row.tipoMatricula,
    anioEscolar: row.anioEscolar,
    gradoNumero: row.gradoNumero,
    gradoNombre: row.gradoNombre,
    seccionNombre: row.seccionNombre,
    estudiante: {
      codigo: row.estudianteCodigo,
      nombres: row.estudianteNombres,
      apellidos: `${row.estudianteApellidoPaterno} ${row.estudianteApellidoMaterno ?? ""}`.trim(),
      tipoDocumento: row.estudianteTipoDocumento,
      numeroDocumento: row.estudianteNumeroDocumento,
      fechaNacimiento: row.estudianteFechaNacimiento,
    },
    institucion: {
      nombre: inst?.nombre || "I.E. De Mujeres Nuestra Señora del Carmen",
      codigoModular: inst?.codigoModular || null,
      direccion: inst?.direccion || null,
      telefono: inst?.telefono || null,
      correo: inst?.correo || null,
      ugel: inst?.ugel || null,
      dre: inst?.dre || null,
      director: inst?.director || null,
      logoUrl: inst?.logoUrl || null,
      distrito: inst?.distrito || null,
      provincia: inst?.provincia || null,
      departamento: inst?.departamento || null,
    },
  };
}
