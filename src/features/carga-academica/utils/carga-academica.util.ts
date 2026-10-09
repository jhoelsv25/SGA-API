/**
 * Utilidades puras para el cálculo y formato de la carga académica.
 */

export function construirMensajeExcesoJornada(horasTotales: number, jornadaHoras: number): string {
  return `El docente supera su jornada: tendrá ${horasTotales} horas asignadas de ${jornadaHoras}.`;
}

export function formatearNombreCompleto(
  nombres?: string | null,
  apellidoPaterno?: string | null,
  apellidoMaterno?: string | null,
): string {
  return [nombres, apellidoPaterno, apellidoMaterno].filter(Boolean).join(" ");
}
