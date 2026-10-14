/**
 * Utilidades de tiempo para el módulo de seguimiento docente (RF-013).
 */

/**
 * Convierte un total de minutos en la representación textual requerida por el RF-013:
 * Formato exacto: 'X h Y min' (ej. 100 -> '1 h 40 min', 40 -> '0 h 40 min', 0 -> '0 h 0 min').
 */
export function formatearTiempoMinutos(minutosTotales: number): string {
  const min = Math.max(0, Math.floor(minutosTotales || 0));
  const horas = Math.floor(min / 60);
  const minutosRestantes = min % 60;
  return `${horas} h ${minutosRestantes} min`;
}

/**
 * Calcula la diferencia en días naturales entre dos fechas 'YYYY-MM-DD'.
 * Devuelve un número positivo si fechaFin es posterior a fechaInicio.
 */
export function diasEntreFechas(fechaInicio: string, fechaFin: string): number {
  const [y1, m1, d1] = fechaInicio.split("-").map(Number);
  const [y2, m2, d2] = fechaFin.split("-").map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}
