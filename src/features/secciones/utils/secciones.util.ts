/**
 * Utilidades para el formato y mensajes de secciones.
 */

export function construirMensajeSeccionRepetida(nombre: string, gradoNumero: number): string {
  return `Ya existe la sección ${nombre} de ${gradoNumero}.° en este año.`;
}

export function formatearNombreCompleto(
  nombres?: string | null,
  apellidoPaterno?: string | null,
  apellidoMaterno?: string | null,
): string {
  return [nombres, apellidoPaterno, apellidoMaterno].filter(Boolean).join(" ");
}
