import { and, desc, eq, sql } from "drizzle-orm";
import {
  ausenciasSesion,
  compromisosConsolidado,
  consolidadosDocente,
  horarios,
  sesionesClase,
  usuarios,
  variablesSistema,
} from "../../../../core/database/schema";
import type {
  DecisionConsolidado,
  EstadoConsolidado,
  HistorialVersionConsolidadoItem,
  MetricasConsolidado,
  MetricasConsolidadoGuardadas,
} from "../../interfaces";
import { formatearMinutosAHrsMin } from "../../utils";
import type { ConsolidadoDocenteRepositoryDeps } from "./deps";

export async function calcularMetricasDocente(
  deps: ConsolidadoDocenteRepositoryDeps,
  docenteId: string,
  fechaInicio: string,
  fechaFin: string,
): Promise<MetricasConsolidado> {
  const sesiones = await deps.db
    .select({
      id: sesionesClase.id,
      estado: sesionesClase.estado,
      minutosPerdidos: sesionesClase.minutosPerdidos,
      duracion: sql<number>`COALESCE((EXTRACT(epoch FROM (COALESCE(${sesionesClase.horaFinPlan}, ${horarios.horaFin}) - COALESCE(${sesionesClase.horaInicioPlan}, ${horarios.horaInicio}))) / 60)::int, 0)`,
    })
    .from(sesionesClase)
    .innerJoin(horarios, eq(horarios.id, sesionesClase.horarioId))
    .where(
      and(
        eq(sesionesClase.docenteId, docenteId),
        sql`${sesionesClase.fecha} >= ${fechaInicio}`,
        sql`${sesionesClase.fecha} <= ${fechaFin}`,
      ),
    );

  let cumplidas = 0;
  let parciales = 0;
  let noCumplidas = 0;
  let justificadas = 0;
  let minutosPerdidosFirma = 0;
  let minutosProgramados = 0;
  let minutosDictados = 0;

  for (const s of sesiones) {
    const duracion = Number(s.duracion) || 0;
    minutosProgramados += duracion;
    // Las horas dictadas salen solo de las firmas: la cumplida por su duración y la parcial por lo firmado.
    if (s.estado === "cumplida") minutosDictados += duracion;
    else if (s.estado === "parcial") {
      minutosDictados += Math.max(0, duracion - (s.minutosPerdidos || 0));
    }
    if (s.estado === "cumplida") cumplidas++;
    else if (s.estado === "parcial") parciales++;
    else if (s.estado === "no_cumplida") noCumplidas++;
    else if (s.estado === "justificada") justificadas++;

    minutosPerdidosFirma += s.minutosPerdidos || 0;
  }

  const ausencias = await deps.db
    .select({
      id: ausenciasSesion.id,
      minutos: ausenciasSesion.minutos,
    })
    .from(ausenciasSesion)
    .innerJoin(sesionesClase, eq(sesionesClase.id, ausenciasSesion.sesionClaseId))
    .where(
      and(
        eq(sesionesClase.docenteId, docenteId),
        sql`${sesionesClase.fecha} >= ${fechaInicio}`,
        sql`${sesionesClase.fecha} <= ${fechaFin}`,
        eq(ausenciasSesion.vigente, true),
        eq(ausenciasSesion.anulada, false),
      ),
    );

  const totalAusencias = ausencias.length;
  const minutosFueraAula = ausencias.reduce((sum, a) => sum + (a.minutos || 0), 0);
  const minutosTotalFuera = minutosPerdidosFirma + minutosFueraAula;

  return {
    sesionesProgramadas: sesiones.length,
    sesionesCumplidas: cumplidas,
    sesionesParciales: parciales,
    sesionesNoCumplidas: noCumplidas,
    sesionesJustificadas: justificadas,
    minutosPerdidosFirma,
    totalAusencias,
    minutosFueraAula,
    minutosTotalFuera,
    minutosProgramados,
    minutosDictados,
  };
}

export async function contarCompromisosPendientes(
  deps: ConsolidadoDocenteRepositoryDeps,
  docenteId: string,
  periodoId: string,
): Promise<number> {
  const [fila] = await deps.db
    .select({ total: sql<number>`count(*)::int` })
    .from(compromisosConsolidado)
    .innerJoin(
      consolidadosDocente,
      eq(consolidadosDocente.id, compromisosConsolidado.consolidadoId),
    )
    .where(
      and(
        eq(compromisosConsolidado.docenteId, docenteId),
        eq(consolidadosDocente.periodoId, periodoId),
        eq(compromisosConsolidado.vigente, true),
        eq(compromisosConsolidado.anulado, false),
        eq(compromisosConsolidado.estado, "pendiente"),
      ),
    );
  return fila?.total ?? 0;
}

export async function valorVariable(
  deps: ConsolidadoDocenteRepositoryDeps,
  codigo: string,
): Promise<string | null> {
  const [fila] = await deps.db
    .select({ valor: variablesSistema.valor })
    .from(variablesSistema)
    .where(and(eq(variablesSistema.codigo, codigo), eq(variablesSistema.vigente, true)))
    .limit(1);
  return fila?.valor ?? null;
}

export async function crearConsolidado(
  deps: ConsolidadoDocenteRepositoryDeps,
  datos: MetricasConsolidadoGuardadas & {
    docenteId: string;
    periodoId: string;
    generadoPorId: string;
  },
) {
  const [creado] = await deps.db
    .insert(consolidadosDocente)
    .values({
      docenteId: datos.docenteId,
      periodoId: datos.periodoId,
      estado: "cerrado",
      version: 1,
      vigente: true,
      sesionesProgramadas: datos.sesionesProgramadas,
      sesionesCumplidas: datos.sesionesCumplidas,
      sesionesParciales: datos.sesionesParciales,
      sesionesNoCumplidas: datos.sesionesNoCumplidas,
      sesionesJustificadas: datos.sesionesJustificadas,
      minutosPerdidosFirma: datos.minutosPerdidosFirma,
      totalAusencias: datos.totalAusencias,
      minutosFueraAula: datos.minutosFueraAula,
      minutosTotalFuera: datos.minutosTotalFuera,
      minutosProgramados: datos.minutosProgramados,
      minutosDictados: datos.minutosDictados,
      minutosHoraPedagogica: datos.minutosHoraPedagogica,
      decision: "ninguna",
      generadoPorId: datos.generadoPorId,
    })
    .returning();

  return creado;
}

export async function actualizarDecision(
  deps: ConsolidadoDocenteRepositoryDeps,
  consolidadoId: string,
  decision: DecisionConsolidado,
  observacion?: string,
) {
  const [actualizado] = await deps.db
    .update(consolidadosDocente)
    .set({
      decision,
      observacion: observacion || null,
      decisionRegistradaEn: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(consolidadosDocente.id, consolidadoId))
    .returning();

  return actualizado;
}

export async function reabrirConsolidado(
  deps: ConsolidadoDocenteRepositoryDeps,
  consolidadoId: string,
) {
  const [actualizado] = await deps.db
    .update(consolidadosDocente)
    .set({ estado: "reabierto" })
    .where(eq(consolidadosDocente.id, consolidadoId))
    .returning();

  return actualizado;
}

export async function cerrarConNuevaVersion(
  deps: ConsolidadoDocenteRepositoryDeps,
  consolidadoAnteriorId: string,
  motivoCambio: string,
  metricasRecalculadas: MetricasConsolidadoGuardadas,
  generadoPorId: string,
) {
  return await deps.db.transaction(async (tx) => {
    const [anterior] = await tx
      .select()
      .from(consolidadosDocente)
      .where(eq(consolidadosDocente.id, consolidadoAnteriorId))
      .limit(1);

    if (!anterior) {
      throw new Error("Consolidado anterior no encontrado.");
    }

    await tx
      .update(consolidadosDocente)
      .set({ vigente: false, estado: "cerrado" })
      .where(eq(consolidadosDocente.id, consolidadoAnteriorId));

    const [nuevaVersion] = await tx
      .insert(consolidadosDocente)
      .values({
        docenteId: anterior.docenteId,
        periodoId: anterior.periodoId,
        version: anterior.version + 1,
        estado: "cerrado",
        vigente: true,
        motivoCambio,
        sesionesProgramadas: metricasRecalculadas.sesionesProgramadas,
        sesionesCumplidas: metricasRecalculadas.sesionesCumplidas,
        sesionesParciales: metricasRecalculadas.sesionesParciales,
        sesionesNoCumplidas: metricasRecalculadas.sesionesNoCumplidas,
        sesionesJustificadas: metricasRecalculadas.sesionesJustificadas,
        minutosPerdidosFirma: metricasRecalculadas.minutosPerdidosFirma,
        totalAusencias: metricasRecalculadas.totalAusencias,
        minutosFueraAula: metricasRecalculadas.minutosFueraAula,
        minutosTotalFuera: metricasRecalculadas.minutosTotalFuera,
        minutosProgramados: metricasRecalculadas.minutosProgramados,
        minutosDictados: metricasRecalculadas.minutosDictados,
        minutosHoraPedagogica: metricasRecalculadas.minutosHoraPedagogica,
        decision: anterior.decision,
        decisionRegistradaEn: anterior.decisionRegistradaEn,
        observacion: anterior.observacion,
        generadoPorId,
      })
      .returning();

    return nuevaVersion;
  });
}

export async function listarHistorialVersiones(
  deps: ConsolidadoDocenteRepositoryDeps,
  docenteId: string,
  periodoId: string,
): Promise<HistorialVersionConsolidadoItem[]> {
  const filas = await deps.db
    .select({
      id: consolidadosDocente.id,
      version: consolidadosDocente.version,
      vigente: consolidadosDocente.vigente,
      estado: sql<EstadoConsolidado>`${consolidadosDocente.estado}`,
      motivoCambio: consolidadosDocente.motivoCambio,
      minutosTotalFuera: consolidadosDocente.minutosTotalFuera,
      sesionesProgramadas: consolidadosDocente.sesionesProgramadas,
      sesionesCumplidas: consolidadosDocente.sesionesCumplidas,
      sesionesParciales: consolidadosDocente.sesionesParciales,
      sesionesNoCumplidas: consolidadosDocente.sesionesNoCumplidas,
      sesionesJustificadas: consolidadosDocente.sesionesJustificadas,
      totalAusencias: consolidadosDocente.totalAusencias,
      minutosFueraAula: consolidadosDocente.minutosFueraAula,
      decision: sql<DecisionConsolidado>`${consolidadosDocente.decision}`,
      observacion: consolidadosDocente.observacion,
      generadoPorNombre: sql<string>`concat_ws(' ', u_per.nombres, u_per.apellido_paterno)`,
      generadoEn: sql<string>`${consolidadosDocente.generadoEn}::text`,
    })
    .from(consolidadosDocente)
    .innerJoin(usuarios, eq(usuarios.id, consolidadosDocente.generadoPorId))
    .innerJoin(sql`personas u_per`, sql`u_per.id = ${usuarios.personaId}`)
    .where(
      and(
        eq(consolidadosDocente.docenteId, docenteId),
        eq(consolidadosDocente.periodoId, periodoId),
      ),
    )
    .orderBy(desc(consolidadosDocente.version));

  return filas.map((f) => ({
    ...f,
    tiempoTotalFueraTexto: formatearMinutosAHrsMin(f.minutosTotalFuera),
  }));
}
