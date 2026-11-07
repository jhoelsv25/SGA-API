import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/**
 * Normaliza la fecha y hora de una marcación del reloj a "YYYY-MM-DD HH:mm:ss".
 * Acepta "YYYY-MM-DD HH:mm:ss" o "YYYY-MM-DDTHH:mm:ss" (hora de Lima, sin zona). Devuelve null si
 * no es una fecha real.
 */
export function normalizarFechaHora(valor: string): string | null {
  const texto = valor.trim().replace("T", " ");
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(texto)) return null;
  const fecha = dayjs(texto, "YYYY-MM-DD HH:mm:ss", true);
  return fecha.isValid() ? texto : null;
}

/** Diferencia absoluta, en minutos, entre la hora del reloj y la del servidor. */
export function desfaseEnMinutos(horaReloj: string, horaServidor: string): number {
  const a = dayjs(horaReloj, "YYYY-MM-DD HH:mm:ss", true);
  const b = dayjs(horaServidor, "YYYY-MM-DD HH:mm:ss", true);
  return Math.abs(Math.round(b.diff(a, "minute", true)));
}

/** Ordena de la más antigua a la más reciente, para aplicar "entrada primero y salida después". */
export function ordenarPorHora<T extends { fechaHora: string }>(marcaciones: readonly T[]): T[] {
  return [...marcaciones].sort((x, y) => x.fechaHora.localeCompare(y.fechaHora));
}

/** Minutos transcurridos desde un timestamp "YYYY-MM-DD HH:mm:ss" hasta otro. */
export function minutosDesde(desde: string, hasta: string): number {
  const a = dayjs(desde, "YYYY-MM-DD HH:mm:ss", true);
  const b = dayjs(hasta, "YYYY-MM-DD HH:mm:ss", true);
  return Math.round(b.diff(a, "minute", true));
}
