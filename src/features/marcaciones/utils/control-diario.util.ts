export type EstadoDia =
  | "completo"
  | "en_el_colegio"
  | "sin_salida"
  | "sin_entrada"
  | "por_llegar"
  | "sin_marca"
  | "no_corresponde";

/** Situación de una persona en un día según sus marcas de asistencia. */
export function estadoDelDia(params: {
  esperado: boolean;
  tieneEntrada: boolean;
  tieneSalida: boolean;
  esHoy: boolean;
  /** Es hoy y todavía no pasa su hora de entrada más la tolerancia. */
  aunEnPlazo?: boolean;
}): EstadoDia {
  const { esperado, tieneEntrada, tieneSalida, esHoy, aunEnPlazo = false } = params;
  if (tieneEntrada) {
    if (tieneSalida) return "completo";
    return esHoy ? "en_el_colegio" : "sin_salida";
  }
  if (tieneSalida) return "sin_entrada";
  if (!esperado) return "no_corresponde";
  return aunEnPlazo ? "por_llegar" : "sin_marca";
}

/** Fechas de un mes "YYYY-MM" desde el día 1 hasta fin de mes, sin pasar de `hoy`. */
export function fechasDelMes(mes: string, hoy: string): string[] {
  const [anio, numero] = mes.split("-").map(Number);
  const dias = new Date(Date.UTC(anio, numero, 0)).getUTCDate();
  return Array.from({ length: dias }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`).filter(
    (fecha) => fecha <= hoy,
  );
}
