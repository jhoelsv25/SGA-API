import { diasHabilesTranscurridos } from "../../sesiones-clase/utils";
import type { IndicadorApoyo } from "../constants";

/** Estados con firma o resolución definitiva: los únicos que cuentan en los indicadores de apoyo. */
const EJECUTADAS = ["cumplida", "parcial"];

export interface SesionApoyo {
  id: string;
  fecha: string;
  docenteId: string;
  docenteNombre: string;
  cursoNombre: string;
  seccionNombre: string;
  estado: string;
  minutosBloque: number;
  minutosPerdidos: number;
  minutosRetraso: number;
}

export interface AusenciaApoyo {
  id: string;
  sesionId: string;
  fecha: string;
  docenteId: string;
  docenteNombre: string;
  cursoNombre: string;
  seccionNombre: string;
  minutos: number;
  motivo: string;
}

export interface JustificacionApoyo {
  sesionId: string;
  fechaSesion: string;
  docenteId: string;
  docenteNombre: string;
  cursoNombre: string;
  seccionNombre: string;
  estado: string;
  solicitadaEn: string;
  revisadaEn: string | null;
}

export interface ContextoApoyo {
  desde: string;
  hasta: string;
  /** Fecha de hoy en el colegio: el día en curso aún no se cierra y no se calcula. */
  hoy: string;
  diasSinClases: ReadonlySet<string>;
  avisoDias: number;
}

export interface JornadasEfectivas {
  sinDatos: boolean;
  valor: number | null;
  minutosProgramados: number;
  minutosEfectivos: number;
}
export interface MinutosPerdidos {
  sinDatos: boolean;
  total: number | null;
  promedioPorSesion: number | null;
  sesionesEjecutadas: number;
}
export interface Puntualidad {
  sinDatos: boolean;
  valor: number | null;
  puntuales: number;
  sesionesConIngreso: number;
}
export interface MinutosFueraAula {
  sinDatos: boolean;
  minutos: number | null;
  supervisiones: number;
}
export interface TiempoResolucion {
  sinDatos: boolean;
  promedioDias: number | null;
  resueltas: number;
  vencidas: number;
}

/** Los cinco indicadores de apoyo. Sin meta, semáforo ni calificación (RF-020 V2). */
export interface ResumenApoyo {
  jornadasEfectivas: JornadasEfectivas;
  minutosPerdidos: MinutosPerdidos;
  puntualidad: Puntualidad;
  minutosFueraAula: MinutosFueraAula;
  tiempoResolucion: TiempoResolucion;
}

const redondear = (valor: number, decimales: number): number => {
  const f = 10 ** decimales;
  return Math.round(valor * f) / f;
};

const MS_DIA = 24 * 60 * 60 * 1000;
const marca = (texto: string): number => Date.parse(`${texto.replace(" ", "T").slice(0, 19)}Z`);

/** Día ya cerrado y dentro del rango. */
export function dentroDelRango(fecha: string, ctx: ContextoApoyo): boolean {
  return fecha >= ctx.desde && fecha <= ctx.hasta && fecha < ctx.hoy;
}

/**
 * Calcula los cinco indicadores de apoyo sobre las filas dadas. Solo cuentan los días ya
 * cerrados del rango; sin filas el indicador es «Sin datos» (nunca 0 % ni división por cero).
 */
export function calcularApoyo(
  sesionesTodas: readonly SesionApoyo[],
  ausenciasTodas: readonly AusenciaApoyo[],
  justificacionesTodas: readonly JustificacionApoyo[],
  ctx: ContextoApoyo,
): ResumenApoyo {
  const sesiones = sesionesTodas.filter((s) => dentroDelRango(s.fecha, ctx));
  const ejecutadas = sesiones.filter((s) => EJECUTADAS.includes(s.estado));

  // Jornadas efectivas: las justificadas salen del denominador; la parcial cuenta sus minutos reales.
  const programadas = sesiones.filter((s) => s.estado !== "justificada");
  const minutosProgramados = programadas.reduce((t, s) => t + s.minutosBloque, 0);
  const minutosEfectivos = ejecutadas.reduce(
    (t, s) => t + Math.max(0, s.minutosBloque - s.minutosPerdidos),
    0,
  );
  const jornadasEfectivas: JornadasEfectivas = {
    sinDatos: minutosProgramados === 0,
    valor:
      minutosProgramados === 0 ? null : redondear((minutosEfectivos / minutosProgramados) * 100, 2),
    minutosProgramados,
    minutosEfectivos,
  };

  const totalPerdidos = ejecutadas.reduce((t, s) => t + s.minutosPerdidos, 0);
  const minutosPerdidos: MinutosPerdidos = {
    sinDatos: ejecutadas.length === 0,
    total: ejecutadas.length === 0 ? null : totalPerdidos,
    promedioPorSesion:
      ejecutadas.length === 0 ? null : redondear(totalPerdidos / ejecutadas.length, 2),
    sesionesEjecutadas: ejecutadas.length,
  };

  // Puntualidad: ingreso dentro de la tolerancia (retraso 0) sobre las sesiones con firma de ingreso.
  const puntuales = ejecutadas.filter((s) => s.minutosRetraso === 0).length;
  const puntualidad: Puntualidad = {
    sinDatos: ejecutadas.length === 0,
    valor: ejecutadas.length === 0 ? null : redondear((puntuales / ejecutadas.length) * 100, 2),
    puntuales,
    sesionesConIngreso: ejecutadas.length,
  };

  const ausencias = ausenciasTodas.filter((a) => dentroDelRango(a.fecha, ctx));
  const minutosFueraAula: MinutosFueraAula = {
    sinDatos: ausencias.length === 0,
    minutos: ausencias.length === 0 ? null : ausencias.reduce((t, a) => t + a.minutos, 0),
    supervisiones: ausencias.length,
  };

  const resueltas = justificacionesTodas.filter(
    (j) =>
      (j.estado === "aprobada" || j.estado === "rechazada") &&
      j.revisadaEn !== null &&
      j.revisadaEn.slice(0, 10) >= ctx.desde &&
      j.revisadaEn.slice(0, 10) <= ctx.hasta,
  );
  const vencidas = justificacionesTodas.filter((j) => {
    if (j.estado !== "solicitada") return false;
    const solicitada = j.solicitadaEn.slice(0, 10);
    if (solicitada < ctx.desde || solicitada > ctx.hasta) return false;
    return diasHabilesTranscurridos(solicitada, ctx.hoy, ctx.diasSinClases) > ctx.avisoDias;
  });
  const dias = resueltas.map(
    (j) => (marca(j.revisadaEn as string) - marca(j.solicitadaEn)) / MS_DIA,
  );
  const tiempoResolucion: TiempoResolucion = {
    sinDatos: resueltas.length === 0 && vencidas.length === 0,
    promedioDias:
      resueltas.length === 0 ? null : redondear(dias.reduce((a, b) => a + b, 0) / dias.length, 1),
    resueltas: resueltas.length,
    vencidas: vencidas.length,
  };

  return { jornadasEfectivas, minutosPerdidos, puntualidad, minutosFueraAula, tiempoResolucion };
}

/** Valor numérico con el que se ordena el ranking; null = «Sin datos». */
export function valorParaOrdenar(resumen: ResumenApoyo, indicador: IndicadorApoyo): number | null {
  switch (indicador) {
    case "jornadasEfectivas":
      return resumen.jornadasEfectivas.valor;
    case "minutosPerdidos":
      return resumen.minutosPerdidos.total;
    case "promedioMinutosPerdidos":
      return resumen.minutosPerdidos.promedioPorSesion;
    case "puntualidad":
      return resumen.puntualidad.valor;
    case "minutosFueraAula":
      return resumen.minutosFueraAula.minutos;
    case "tiempoResolucion":
      return resumen.tiempoResolucion.promedioDias;
  }
}

export interface FilaRanking {
  docenteId: string;
  docenteNombre: string;
  resumen: ResumenApoyo;
}

/** Ordena el ranking por un indicador; los docentes con «Sin datos» quedan al final. */
export function ordenarRanking(
  filas: readonly FilaRanking[],
  indicador: IndicadorApoyo,
  orden: "asc" | "desc",
): FilaRanking[] {
  const signo = orden === "asc" ? 1 : -1;
  return [...filas].sort((a, b) => {
    const va = valorParaOrdenar(a.resumen, indicador);
    const vb = valorParaOrdenar(b.resumen, indicador);
    if (va === null && vb === null) return a.docenteNombre.localeCompare(b.docenteNombre);
    if (va === null) return 1;
    if (vb === null) return -1;
    return va === vb ? a.docenteNombre.localeCompare(b.docenteNombre) : (va - vb) * signo;
  });
}

/** Agrupa las filas por docente y calcula el resumen de cada uno. */
export function rankingDeDocentes(
  sesiones: readonly SesionApoyo[],
  ausencias: readonly AusenciaApoyo[],
  justificaciones: readonly JustificacionApoyo[],
  ctx: ContextoApoyo,
): FilaRanking[] {
  const nombres = new Map<string, string>();
  for (const f of [...sesiones, ...ausencias, ...justificaciones]) {
    nombres.set(f.docenteId, f.docenteNombre);
  }
  return [...nombres].map(([docenteId, docenteNombre]) => ({
    docenteId,
    docenteNombre,
    resumen: calcularApoyo(
      sesiones.filter((s) => s.docenteId === docenteId),
      ausencias.filter((a) => a.docenteId === docenteId),
      justificaciones.filter((j) => j.docenteId === docenteId),
      ctx,
    ),
  }));
}
