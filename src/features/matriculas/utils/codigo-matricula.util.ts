/**
 * Genera el código correlativo único anual de matrícula según RF-009:
 * Formato: YYYY-000001 (Año + correlativo de 6 dígitos)
 */
export function generarCodigoMatricula(anio: number, correlativo: number): string {
  const numeroPadded = String(correlativo).padStart(6, "0");
  return `${anio}-${numeroPadded}`;
}
