import { and, eq, sql } from "drizzle-orm";
import {
  consolidadosDocente,
  docentes,
  periodosAcademicos,
  personas,
  sesionesClase,
  solicitudesRevisionConsolidado,
  usuarios,
} from "../../../../core/database/schema";
import type {
  ConsolidadoResumenItem,
  DecisionConsolidado,
  EstadoConsolidado,
} from "../../interfaces";
import { calcularHorasPedagogicas, formatearMinutosAHrsMin } from "../../utils";
import type { ConsolidadoDocenteRepositoryDeps } from "./deps";

export async function obtenerPeriodo(deps: ConsolidadoDocenteRepositoryDeps, periodoId: string) {
  const [periodo] = await deps.db
    .select({
      id: periodosAcademicos.id,
      nombre: periodosAcademicos.nombre,
      fechaInicio: sql<string>`${periodosAcademicos.fechaInicio}::text`,
      fechaFin: sql<string>`${periodosAcademicos.fechaFin}::text`,
      estado: periodosAcademicos.estado,
      anioAcademicoId: periodosAcademicos.anioAcademicoId,
    })
    .from(periodosAcademicos)
    .where(eq(periodosAcademicos.id, periodoId))
    .limit(1);

  return periodo ?? null;
}

export async function listarDocentesConSesionesEnPeriodo(
  deps: ConsolidadoDocenteRepositoryDeps,
  fechaInicio: string,
  fechaFin: string,
  docenteId?: string,
) {
  const condiciones = [
    sql`${sesionesClase.fecha} >= ${fechaInicio}`,
    sql`${sesionesClase.fecha} <= ${fechaFin}`,
  ];

  if (docenteId) {
    condiciones.push(eq(sesionesClase.docenteId, docenteId));
  }

  const filas = await deps.db
    .selectDistinct({
      docenteId: docentes.id,
      nombreCompleto: sql<string>`concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno})`,
      numeroDocumento: personas.numeroDocumento,
      usuarioId: usuarios.id,
      personaId: personas.id,
    })
    .from(sesionesClase)
    .innerJoin(docentes, eq(docentes.id, sesionesClase.docenteId))
    .innerJoin(personas, eq(personas.id, docentes.personaId))
    .leftJoin(usuarios, eq(usuarios.personaId, personas.id))
    .where(and(...condiciones));

  return filas;
}

export async function obtenerConsolidadosVigentesPeriodo(
  deps: ConsolidadoDocenteRepositoryDeps,
  periodoId: string,
): Promise<ConsolidadoResumenItem[]> {
  const filas = await deps.db
    .select({
      id: consolidadosDocente.id,
      docenteId: consolidadosDocente.docenteId,
      docenteNombre: sql<string>`concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno})`,
      docenteDni: personas.numeroDocumento,
      periodoId: consolidadosDocente.periodoId,
      periodoNombre: periodosAcademicos.nombre,
      version: consolidadosDocente.version,
      vigente: consolidadosDocente.vigente,
      estado: sql<EstadoConsolidado>`${consolidadosDocente.estado}`,
      sesionesProgramadas: consolidadosDocente.sesionesProgramadas,
      sesionesCumplidas: consolidadosDocente.sesionesCumplidas,
      sesionesParciales: consolidadosDocente.sesionesParciales,
      sesionesNoCumplidas: consolidadosDocente.sesionesNoCumplidas,
      sesionesJustificadas: consolidadosDocente.sesionesJustificadas,
      minutosPerdidosFirma: consolidadosDocente.minutosPerdidosFirma,
      totalAusencias: consolidadosDocente.totalAusencias,
      minutosFueraAula: consolidadosDocente.minutosFueraAula,
      minutosTotalFuera: consolidadosDocente.minutosTotalFuera,
      minutosProgramados: consolidadosDocente.minutosProgramados,
      minutosDictados: consolidadosDocente.minutosDictados,
      minutosHoraPedagogica: consolidadosDocente.minutosHoraPedagogica,
      decision: sql<DecisionConsolidado>`${consolidadosDocente.decision}`,
      decisionRegistradaEn: sql<string | null>`${consolidadosDocente.decisionRegistradaEn}::text`,
      observacion: consolidadosDocente.observacion,
      motivoCambio: consolidadosDocente.motivoCambio,
      generadoEn: sql<string>`${consolidadosDocente.generadoEn}::text`,
      generadoPorNombre: sql<string>`concat_ws(' ', u_per.nombres, u_per.apellido_paterno)`,
    })
    .from(consolidadosDocente)
    .innerJoin(docentes, eq(docentes.id, consolidadosDocente.docenteId))
    .innerJoin(personas, eq(personas.id, docentes.personaId))
    .innerJoin(periodosAcademicos, eq(periodosAcademicos.id, consolidadosDocente.periodoId))
    .innerJoin(usuarios, eq(usuarios.id, consolidadosDocente.generadoPorId))
    .innerJoin(sql`personas u_per`, sql`u_per.id = ${usuarios.personaId}`)
    .where(
      and(eq(consolidadosDocente.periodoId, periodoId), eq(consolidadosDocente.vigente, true)),
    );

  const resultado: ConsolidadoResumenItem[] = [];
  for (const fila of filas) {
    const [solicitud] = await deps.db
      .select({
        total: sql<number>`count(*)::int`,
      })
      .from(solicitudesRevisionConsolidado)
      .where(
        and(
          eq(solicitudesRevisionConsolidado.consolidadoId, fila.id),
          eq(solicitudesRevisionConsolidado.estado, "solicitada"),
        ),
      );

    resultado.push({
      ...fila,
      ...calcularHorasPedagogicas(
        fila.minutosProgramados,
        fila.minutosDictados,
        fila.minutosHoraPedagogica,
      ),
      tiempoTotalFueraTexto: formatearMinutosAHrsMin(fila.minutosTotalFuera),
      solicitudesPendientesCount: solicitud?.total ?? 0,
    });
  }

  return resultado;
}

export async function obtenerConsolidadoVigenteDocente(
  deps: ConsolidadoDocenteRepositoryDeps,
  docenteId: string,
  periodoId: string,
) {
  const [fila] = await deps.db
    .select({
      id: consolidadosDocente.id,
      docenteId: consolidadosDocente.docenteId,
      periodoId: consolidadosDocente.periodoId,
      version: consolidadosDocente.version,
      vigente: consolidadosDocente.vigente,
      estado: sql<EstadoConsolidado>`${consolidadosDocente.estado}`,
      sesionesProgramadas: consolidadosDocente.sesionesProgramadas,
      sesionesCumplidas: consolidadosDocente.sesionesCumplidas,
      sesionesParciales: consolidadosDocente.sesionesParciales,
      sesionesNoCumplidas: consolidadosDocente.sesionesNoCumplidas,
      sesionesJustificadas: consolidadosDocente.sesionesJustificadas,
      minutosPerdidosFirma: consolidadosDocente.minutosPerdidosFirma,
      totalAusencias: consolidadosDocente.totalAusencias,
      minutosFueraAula: consolidadosDocente.minutosFueraAula,
      minutosTotalFuera: consolidadosDocente.minutosTotalFuera,
      decision: sql<DecisionConsolidado>`${consolidadosDocente.decision}`,
      observacion: consolidadosDocente.observacion,
      motivoCambio: consolidadosDocente.motivoCambio,
      generadoPorId: consolidadosDocente.generadoPorId,
      generadoEn: sql<string>`${consolidadosDocente.generadoEn}::text`,
    })
    .from(consolidadosDocente)
    .where(
      and(
        eq(consolidadosDocente.docenteId, docenteId),
        eq(consolidadosDocente.periodoId, periodoId),
        eq(consolidadosDocente.vigente, true),
      ),
    )
    .limit(1);

  return fila ?? null;
}

export async function obtenerConsolidadoPorId(
  deps: ConsolidadoDocenteRepositoryDeps,
  consolidadoId: string,
) {
  const [fila] = await deps.db
    .select({
      id: consolidadosDocente.id,
      docenteId: consolidadosDocente.docenteId,
      docenteNombre: sql<string>`concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno})`,
      docenteDni: personas.numeroDocumento,
      firmaDocenteUrl: docentes.firmaUrl,
      periodoId: consolidadosDocente.periodoId,
      periodoNombre: periodosAcademicos.nombre,
      version: consolidadosDocente.version,
      vigente: consolidadosDocente.vigente,
      estado: sql<EstadoConsolidado>`${consolidadosDocente.estado}`,
      sesionesProgramadas: consolidadosDocente.sesionesProgramadas,
      sesionesCumplidas: consolidadosDocente.sesionesCumplidas,
      sesionesParciales: consolidadosDocente.sesionesParciales,
      sesionesNoCumplidas: consolidadosDocente.sesionesNoCumplidas,
      sesionesJustificadas: consolidadosDocente.sesionesJustificadas,
      minutosPerdidosFirma: consolidadosDocente.minutosPerdidosFirma,
      totalAusencias: consolidadosDocente.totalAusencias,
      minutosFueraAula: consolidadosDocente.minutosFueraAula,
      minutosTotalFuera: consolidadosDocente.minutosTotalFuera,
      minutosProgramados: consolidadosDocente.minutosProgramados,
      minutosDictados: consolidadosDocente.minutosDictados,
      minutosHoraPedagogica: consolidadosDocente.minutosHoraPedagogica,
      decision: sql<DecisionConsolidado>`${consolidadosDocente.decision}`,
      decisionRegistradaEn: sql<string | null>`${consolidadosDocente.decisionRegistradaEn}::text`,
      observacion: consolidadosDocente.observacion,
      motivoCambio: consolidadosDocente.motivoCambio,
      generadoEn: sql<string>`${consolidadosDocente.generadoEn}::text`,
      generadoPorId: consolidadosDocente.generadoPorId,
      generadoPorNombre: sql<string>`concat_ws(' ', u_per.nombres, u_per.apellido_paterno)`,
    })
    .from(consolidadosDocente)
    .innerJoin(docentes, eq(docentes.id, consolidadosDocente.docenteId))
    .innerJoin(personas, eq(personas.id, docentes.personaId))
    .innerJoin(periodosAcademicos, eq(periodosAcademicos.id, consolidadosDocente.periodoId))
    .innerJoin(usuarios, eq(usuarios.id, consolidadosDocente.generadoPorId))
    .innerJoin(sql`personas u_per`, sql`u_per.id = ${usuarios.personaId}`)
    .where(eq(consolidadosDocente.id, consolidadoId))
    .limit(1);

  return fila ?? null;
}
