import { and, desc, eq, sql, SQL } from "drizzle-orm";
import {
  estudiantes,
  grados,
  incidenciasConducta,
  matriculas,
  observacionesEstudiante,
  periodosAcademicos,
  personas,
  secciones,
} from "@/core/database/schema";
import { decodeCursor, encodeCursor } from "@/common/utils";
import {
  DesgloseBimestreConducta,
  ObservacionItem,
  ResumenConductaEstudiante,
} from "../../interfaces";
import { QueryObservacionesDto } from "../../dto";
import { TipoObservacion } from "../../constants";
import type { ConductaRepositoryDeps, ConductaRepositoryCalls } from "./deps";

export async function obtenerObservacionPorId(
  deps: ConductaRepositoryDeps,
  id: string,
): Promise<ObservacionItem | null> {
  const rows = await deps.db
    .select({
      id: observacionesEstudiante.id,
      matriculaId: observacionesEstudiante.matriculaId,
      registradoPorId: observacionesEstudiante.registradoPorId,
      fecha: observacionesEstudiante.fecha,
      tipo: observacionesEstudiante.tipo,
      observacion: observacionesEstudiante.observacion,
      seguimiento: observacionesEstudiante.seguimiento,
      derivadoA: observacionesEstudiante.derivadoA,
      esConfidencial: observacionesEstudiante.esConfidencial,
      creadoEn: observacionesEstudiante.creadoEn,
      actualizadoEn: observacionesEstudiante.actualizadoEn,
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
          WHERE u2.id = ${observacionesEstudiante.registradoPorId}
          LIMIT 1
        )`,
    })
    .from(observacionesEstudiante)
    .innerJoin(matriculas, eq(observacionesEstudiante.matriculaId, matriculas.id))
    .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
    .innerJoin(personas, eq(estudiantes.personaId, personas.id))
    .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
    .where(eq(observacionesEstudiante.id, id))
    .limit(1);

  if (!rows.length) return null;
  const r = rows[0];

  return {
    id: r.id,
    matriculaId: r.matriculaId,
    estudianteNombre: `${r.estNombres} ${r.estPaterno} ${r.estMaterno || ""}`.trim(),
    codigoEstudiante: r.codigoEstudiante,
    seccionId: r.seccionId,
    seccionNombre: r.seccionNombre,
    registradoPorId: r.registradoPorId,
    registradoPorNombre: r.registradoPorNombre || undefined,
    fecha: r.fecha,
    tipo: r.tipo as TipoObservacion,
    observacion: r.observacion,
    seguimiento: r.seguimiento,
    derivadoA: r.derivadoA,
    esConfidencial: r.esConfidencial,
    creadoEn: r.creadoEn,
    actualizadoEn: r.actualizadoEn,
  };
}

export async function listarObservaciones(
  deps: ConductaRepositoryDeps,
  dto: QueryObservacionesDto,
): Promise<{ data: ObservacionItem[]; nextCursor: string | null; hasMore: boolean }> {
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
    conditions.push(eq(observacionesEstudiante.matriculaId, dto.matriculaId));
  }
  if (dto.seccionId) {
    conditions.push(eq(matriculas.seccionId, dto.seccionId));
  }

  if (cursorDate && cursorId) {
    conditions.push(
      sql`(${observacionesEstudiante.fecha}, ${observacionesEstudiante.id}) < (${cursorDate}, ${cursorId}::uuid)`,
    );
  }

  const rows = await deps.db
    .select({
      id: observacionesEstudiante.id,
      matriculaId: observacionesEstudiante.matriculaId,
      registradoPorId: observacionesEstudiante.registradoPorId,
      fecha: observacionesEstudiante.fecha,
      tipo: observacionesEstudiante.tipo,
      observacion: observacionesEstudiante.observacion,
      seguimiento: observacionesEstudiante.seguimiento,
      derivadoA: observacionesEstudiante.derivadoA,
      esConfidencial: observacionesEstudiante.esConfidencial,
      creadoEn: observacionesEstudiante.creadoEn,
      actualizadoEn: observacionesEstudiante.actualizadoEn,
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
          WHERE u2.id = ${observacionesEstudiante.registradoPorId}
          LIMIT 1
        )`,
    })
    .from(observacionesEstudiante)
    .innerJoin(matriculas, eq(observacionesEstudiante.matriculaId, matriculas.id))
    .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
    .innerJoin(personas, eq(estudiantes.personaId, personas.id))
    .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
    .where(and(...conditions))
    .orderBy(desc(observacionesEstudiante.fecha), desc(observacionesEstudiante.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1];
    nextCursor = encodeCursor({ fecha: last.fecha, id: last.id });
  }

  const data: ObservacionItem[] = items.map((r) => ({
    id: r.id,
    matriculaId: r.matriculaId,
    estudianteNombre: `${r.estNombres} ${r.estPaterno} ${r.estMaterno || ""}`.trim(),
    codigoEstudiante: r.codigoEstudiante,
    seccionId: r.seccionId,
    seccionNombre: r.seccionNombre,
    registradoPorId: r.registradoPorId,
    registradoPorNombre: r.registradoPorNombre || undefined,
    fecha: r.fecha,
    tipo: r.tipo as TipoObservacion,
    observacion: r.observacion,
    seguimiento: r.seguimiento,
    derivadoA: r.derivadoA,
    esConfidencial: r.esConfidencial,
    creadoEn: r.creadoEn,
    actualizadoEn: r.actualizadoEn,
  }));

  return { data, nextCursor, hasMore };
}

export async function obtenerResumenConducta(
  deps: ConductaRepositoryDeps,
  calls: ConductaRepositoryCalls,
  matriculaId: string,
): Promise<ResumenConductaEstudiante> {
  const matInfo = await calls.obtenerInfoMatricula(matriculaId);
  if (!matInfo) {
    throw new Error("Matrícula no encontrada");
  }

  const secRows = await deps.db
    .select({
      seccionNombre: secciones.nombre,
      gradoNombre: grados.nombre,
      anioAcademicoId: matriculas.anioAcademicoId,
    })
    .from(matriculas)
    .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
    .innerJoin(grados, eq(secciones.gradoId, grados.id))
    .where(eq(matriculas.id, matriculaId))
    .limit(1);

  const seccionNombre = secRows[0]?.seccionNombre || "";
  const gradoNombre = secRows[0]?.gradoNombre || "";
  const anioId = secRows[0]?.anioAcademicoId;

  // Periodos del año
  const periodos = await deps.db
    .select({
      id: periodosAcademicos.id,
      nombre: periodosAcademicos.nombre,
      numero: periodosAcademicos.numero,
    })
    .from(periodosAcademicos)
    .where(eq(periodosAcademicos.anioAcademicoId, anioId))
    .orderBy(periodosAcademicos.numero);

  // Incidencias del estudiante
  const incidencias = await deps.db
    .select({
      periodoId: incidenciasConducta.periodoId,
      tipo: incidenciasConducta.tipo,
      gravedad: incidenciasConducta.gravedad,
    })
    .from(incidenciasConducta)
    .where(eq(incidenciasConducta.matriculaId, matriculaId));

  let totalMeritos = 0;
  let totalFaltas = 0;

  const desglosePorBimestre: DesgloseBimestreConducta[] = periodos.map((p) => {
    const incsBimestre = incidencias.filter((i) => i.periodoId === p.id);
    const meritos = incsBimestre.filter((i) => i.tipo === "merito").length;
    const faltasLeves = incsBimestre.filter(
      (i) => i.tipo === "falta" && i.gravedad === "leve",
    ).length;
    const faltasGraves = incsBimestre.filter(
      (i) => i.tipo === "falta" && i.gravedad === "grave",
    ).length;
    const faltasMuyGraves = incsBimestre.filter(
      (i) => i.tipo === "falta" && i.gravedad === "muy_grave",
    ).length;
    const totalFaltasBimestre = faltasLeves + faltasGraves + faltasMuyGraves;

    totalMeritos += meritos;
    totalFaltas += totalFaltasBimestre;

    return {
      periodoId: p.id,
      periodoNombre: p.nombre,
      numeroPeriodo: p.numero,
      meritos,
      faltasLeves,
      faltasGraves,
      faltasMuyGraves,
      totalFaltas: totalFaltasBimestre,
    };
  });

  return {
    matriculaId,
    estudianteNombre: matInfo.nombreCompleto,
    codigoEstudiante: matInfo.codigoEstudiante,
    gradoNombre,
    seccionNombre,
    totalMeritos,
    totalFaltas,
    desglosePorBimestre,
  };
}
