import * as path from "path";
import { EXTENSIONES_POR_TIPO, type TipoMaterial } from "../constants";

export type EstadoPlazo = "pendiente" | "a_tiempo" | "fuera_de_plazo" | "no_publicado";

const REGEX_ENLACE = /^https?:\/\/\S+$/i;

function aUtc(fecha: string): Date {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

/** Suma (o resta) días a una fecha "YYYY-MM-DD". */
export function sumarDias(fecha: string, dias: number): string {
  const d = aUtc(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Día ISO de la semana (1 = lunes … 7 = domingo) de una fecha "YYYY-MM-DD". */
export function diaIsoDe(fecha: string): number {
  const dia = aUtc(fecha).getUTCDay();
  return dia === 0 ? 7 : dia;
}

/** "2027-05-15" → "15/05/2027" */
export function formatearFecha(fecha: string): string {
  const [a, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** Último día de la semana de planificación: el día de inicio del bimestre cuenta como día 1. */
export function finVentanaPlanificacion(inicioBimestre: string, diasPlanificacion: number): string {
  return sumarDias(inicioBimestre, diasPlanificacion - 1);
}

export function estaEnVentana(
  hoy: string,
  inicioBimestre: string,
  diasPlanificacion: number,
): boolean {
  return hoy <= finVentanaPlanificacion(inicioBimestre, diasPlanificacion);
}

/** Fecha mínima de un material planificado fuera de la ventana: hoy + N días. */
export function fechaMinimaFueraDeVentana(hoy: string, diasPlanificacion: number): string {
  return sumarDias(hoy, diasPlanificacion);
}

/**
 * A tiempo: publicado hasta el final del día programado (primera publicación).
 * No publicado: la fecha pasó sin publicarse. Pendiente: aún no llega la fecha.
 */
export function estadoPlazo(
  fechaProgramada: string,
  primeraPublicacion: string | null,
  hoy: string,
): EstadoPlazo {
  if (primeraPublicacion) {
    return primeraPublicacion.slice(0, 10) <= fechaProgramada ? "a_tiempo" : "fuera_de_plazo";
  }
  return hoy > fechaProgramada ? "no_publicado" : "pendiente";
}

export function esEnlaceValido(url: string): boolean {
  return REGEX_ENLACE.test(url.trim());
}

export function formatoPermitido(tipo: TipoMaterial, nombreArchivo: string): boolean {
  if (tipo === "enlace") return false;
  const extension = path.extname(nombreArchivo).toLowerCase();
  return EXTENSIONES_POR_TIPO[tipo].includes(extension);
}

export function porcentajeATiempo(aTiempo: number, planificados: number): number {
  if (planificados === 0) return 0;
  return Math.round((aTiempo / planificados) * 1000) / 10;
}
