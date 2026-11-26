import { and, desc, eq, gte, lte, sql, SQL } from "drizzle-orm";
import {
  estudiantes,
  incidenciasConducta,
  matriculas,
  observacionesEstudiante,
  periodosAcademicos,
  personas,
  secciones,
} from "@/core/database/schema";
import { decodeCursor, encodeCursor } from "@/common/utils";
import { IncidenciaItem } from "../../interfaces";
import {
  ActualizarIncidenciaDto,
  CrearIncidenciaDto,
  CrearObservacionDto,
  QueryIncidenciasDto,
} from "../../dto";
import type { ConductaRepositoryDeps } from "./deps";

export async function crearIncidencia(
  deps: ConductaRepositoryDeps,
  dto: CrearIncidenciaDto,
  periodoId: string,
  registradoPorId: string,
  apoderadoNotificado: boolean,
): Promise<string> {
  const result = await deps.db
    .insert(incidenciasConducta)
    .values({
      matriculaId: dto.matriculaId,
      periodoId,
      registradoPorId,
      fecha: dto.fecha,
      tipo: dto.tipo,
      categoria: dto.categoria,
      gravedad: dto.tipo === "falta" ? (dto.gravedad ?? null) : null,
      descripcion: dto.descripcion,
      lugar: dto.lugar ?? null,
      medidasTomadas: dto.medidasTomadas ?? null,
      apoderadoNotificado,
      fechaNotificacion: apoderadoNotificado ? dto.fecha : null,
    })
    .returning({ id: incidenciasConducta.id });

  return result[0].id;
}

export async function obtenerIncidenciaPorId(
  deps: ConductaRepositoryDeps,
  id: string,
): Promise<IncidenciaItem | null> {
  const rows = await deps.db
    .select({
      id: incidenciasConducta.id,
      matriculaId: incidenciasConducta.matriculaId,
      periodoId: incidenciasConducta.periodoId,
      periodoNombre: periodosAcademicos.nombre,
      registradoPorId: incidenciasConducta.registradoPorId,
      fecha: incidenciasConducta.fecha,
      tipo: incidenciasConducta.tipo,
      categoria: incidenciasConducta.categoria,
      gravedad: incidenciasConducta.gravedad,
      descripcion: incidenciasConducta.descripcion,
      lugar: incidenciasConducta.lugar,
      medidasTomadas: incidenciasConducta.medidasTomadas,
      apoderadoNotificado: incidenciasConducta.apoderadoNotificado,
      fechaNotificacion: incidenciasConducta.fechaNotificacion,
      creadoEn: incidenciasConducta.creadoEn,
      actualizadoEn: incidenciasConducta.actualizadoEn,
      seccionId: matriculas.seccionId,
      seccionNombre: secciones.nombre,
      codigoEstudiante: estudiantes.codigo,
      estNombres: personas.nombres,
      estPaterno: personas.apellidoPaterno,
      estMaterno: personas.apellidoMaterno,
      registradoPorNombre: sql<string>`(
          SELECT TRIM(CONCAT(p2.nombres, ' ', p2.apellido_paterno, ' ', COALESCE(p2.apellido_materno, '')))
          FROM usuarios u2
          JOIN personas p2 ON p2.id = u2.persona_id
          WHERE u2.id = ${incidenciasConducta.registradoPorId}
          LIMIT 1
        )`,
    })
    .from(incidenciasConducta)
    .innerJoin(periodosAcademicos, eq(incidenciasConducta.periodoId, periodosAcademicos.id))
    .innerJoin(matriculas, eq(incidenciasConducta.matriculaId, matriculas.id))
    .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
    .innerJoin(personas, eq(estudiantes.personaId, personas.id))
    .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
    .where(eq(incidenciasConducta.id, id))
    .limit(1);

  if (!rows.length) return null;
  const r = rows[0];

  const estudianteNombre = `${r.estNombres} ${r.estPaterno} ${r.estMaterno || ""}`.trim();

  return {
    id: r.id,
    matriculaId: r.matriculaId,
    estudianteNombre,
    codigoEstudiante: r.codigoEstudiante,
    seccionId: r.seccionId,
    seccionNombre: r.seccionNombre,
    periodoId: r.periodoId,
    periodoNombre: r.periodoNombre,
    registradoPorId: r.registradoPorId,
    registradoPorNombre: r.registradoPorNombre || undefined,
    fecha: r.fecha,
    tipo: r.tipo as "merito" | "falta",
    categoria: r.categoria,
    gravedad: r.gravedad as "leve" | "grave" | "muy_grave" | null,
    descripcion: r.descripcion,
    lugar: r.lugar,
    medidasTomadas: r.medidasTomadas,
    apoderadoNotificado: r.apoderadoNotificado,
    fechaNotificacion: r.fechaNotificacion,
    creadoEn: r.creadoEn,
    actualizadoEn: r.actualizadoEn,
  };
}

export async function actualizarIncidencia(
  deps: ConductaRepositoryDeps,
  id: string,
  dto: ActualizarIncidenciaDto,
): Promise<void> {
  await deps.db
    .update(incidenciasConducta)
    .set({
      ...(dto.categoria ? { categoria: dto.categoria } : {}),
      ...(dto.gravedad !== undefined ? { gravedad: dto.gravedad } : {}),
      ...(dto.descripcion ? { descripcion: dto.descripcion } : {}),
      ...(dto.lugar !== undefined ? { lugar: dto.lugar } : {}),
      ...(dto.medidasTomadas !== undefined ? { medidasTomadas: dto.medidasTomadas } : {}),
      actualizadoEn: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(incidenciasConducta.id, id));
}

export async function eliminarIncidencia(deps: ConductaRepositoryDeps, id: string): Promise<void> {
  await deps.db.delete(incidenciasConducta).where(eq(incidenciasConducta.id, id));
}

export async function listarIncidencias(
  deps: ConductaRepositoryDeps,
  dto: QueryIncidenciasDto,
): Promise<{ data: IncidenciaItem[]; nextCursor: string | null; hasMore: boolean }> {
  const limit = dto.limit || 20;

  let cursorDate: string | null = null;
  let cursorId: string | null = null;

  if (dto.cursor) {
    const decoded = decodeCursor<{ fecha: string; id: string }>(dto.cursor);
    if (decoded) {
      cursorDate = decoded.fecha;
      cursorId = decoded.id;
    }
  }

  const conditions: SQL[] = [];

  if (dto.matriculaId) {
    conditions.push(eq(incidenciasConducta.matriculaId, dto.matriculaId));
  }
  if (dto.seccionId) {
    conditions.push(eq(matriculas.seccionId, dto.seccionId));
  }
  if (dto.periodoId) {
    conditions.push(eq(incidenciasConducta.periodoId, dto.periodoId));
  }
  if (dto.tipo) {
    conditions.push(eq(incidenciasConducta.tipo, dto.tipo));
  }
  if (dto.gravedad) {
    conditions.push(eq(incidenciasConducta.gravedad, dto.gravedad));
  }
  if (dto.fechaDesde) {
    conditions.push(gte(incidenciasConducta.fecha, dto.fechaDesde));
  }
  if (dto.fechaHasta) {
    conditions.push(lte(incidenciasConducta.fecha, dto.fechaHasta));
  }

  if (cursorDate && cursorId) {
    conditions.push(
      sql`(${incidenciasConducta.fecha}, ${incidenciasConducta.id}) < (${cursorDate}, ${cursorId}::uuid)`,
    );
  }

  const rows = await deps.db
    .select({
      id: incidenciasConducta.id,
      matriculaId: incidenciasConducta.matriculaId,
      periodoId: incidenciasConducta.periodoId,
      periodoNombre: periodosAcademicos.nombre,
      registradoPorId: incidenciasConducta.registradoPorId,
      fecha: incidenciasConducta.fecha,
      tipo: incidenciasConducta.tipo,
      categoria: incidenciasConducta.categoria,
      gravedad: incidenciasConducta.gravedad,
      descripcion: incidenciasConducta.descripcion,
      lugar: incidenciasConducta.lugar,
      medidasTomadas: incidenciasConducta.medidasTomadas,
      apoderadoNotificado: incidenciasConducta.apoderadoNotificado,
      fechaNotificacion: incidenciasConducta.fechaNotificacion,
      creadoEn: incidenciasConducta.creadoEn,
      actualizadoEn: incidenciasConducta.actualizadoEn,
      seccionId: matriculas.seccionId,
      seccionNombre: secciones.nombre,
      codigoEstudiante: estudiantes.codigo,
      estNombres: personas.nombres,
      estPaterno: personas.apellidoPaterno,
      estMaterno: personas.apellidoMaterno,
      registradoPorNombre: sql<string>`(
          SELECT TRIM(CONCAT(p2.nombres, ' ', p2.apellido_paterno, ' ', COALESCE(p2.apellido_materno, '')))
          FROM usuarios u2
          JOIN personas p2 ON p2.id = u2.persona_id
          WHERE u2.id = ${incidenciasConducta.registradoPorId}
          LIMIT 1
        )`,
    })
    .from(incidenciasConducta)
    .innerJoin(periodosAcademicos, eq(incidenciasConducta.periodoId, periodosAcademicos.id))
    .innerJoin(matriculas, eq(incidenciasConducta.matriculaId, matriculas.id))
    .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
    .innerJoin(personas, eq(estudiantes.personaId, personas.id))
    .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
    .where(and(...conditions))
    .orderBy(desc(incidenciasConducta.fecha), desc(incidenciasConducta.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1];
    nextCursor = encodeCursor({ fecha: last.fecha, id: last.id });
  }

  const data: IncidenciaItem[] = items.map((r) => ({
    id: r.id,
    matriculaId: r.matriculaId,
    estudianteNombre: `${r.estNombres} ${r.estPaterno} ${r.estMaterno || ""}`.trim(),
    codigoEstudiante: r.codigoEstudiante,
    seccionId: r.seccionId,
    seccionNombre: r.seccionNombre,
    periodoId: r.periodoId,
    periodoNombre: r.periodoNombre,
    registradoPorId: r.registradoPorId,
    registradoPorNombre: r.registradoPorNombre || undefined,
    fecha: r.fecha,
    tipo: r.tipo as "merito" | "falta",
    categoria: r.categoria,
    gravedad: r.gravedad as "leve" | "grave" | "muy_grave" | null,
    descripcion: r.descripcion,
    lugar: r.lugar,
    medidasTomadas: r.medidasTomadas,
    apoderadoNotificado: r.apoderadoNotificado,
    fechaNotificacion: r.fechaNotificacion,
    creadoEn: r.creadoEn,
    actualizadoEn: r.actualizadoEn,
  }));

  return { data, nextCursor, hasMore };
}

export async function crearObservacion(
  deps: ConductaRepositoryDeps,
  dto: CrearObservacionDto,
  registradoPorId: string,
): Promise<string> {
  const result = await deps.db
    .insert(observacionesEstudiante)
    .values({
      matriculaId: dto.matriculaId,
      registradoPorId,
      fecha: dto.fecha,
      tipo: dto.tipo,
      observacion: dto.observacion,
      seguimiento: dto.seguimiento ?? null,
      derivadoA: dto.derivadoA ?? null,
      esConfidencial: Boolean(dto.esConfidencial),
    })
    .returning({ id: observacionesEstudiante.id });

  return result[0].id;
}
