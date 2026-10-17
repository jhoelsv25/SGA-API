/**
 * Tipos e identificadores de los indicadores de la tesis (RF-020).
 */
export type Indicador = "CSP" | "ISA" | "IGM";

export const INDICADORES_LISTA: readonly Indicador[] = ["CSP", "ISA", "IGM"] as const;

export interface MetadataIndicador {
  readonly codigo: Indicador;
  readonly nombre: string;
  readonly dimension: string;
  readonly fuente: string;
  readonly formula: string;
}

export const METADATA_INDICADORES: Record<Indicador, MetadataIndicador> = {
  CSP: {
    codigo: "CSP",
    nombre: "Cumplimiento de sesiones planificadas",
    dimension: "Prácticas pedagógicas",
    fuente: "Sesiones de clase (RF-011)",
    formula: "(cumplidas + parciales) ÷ (planificadas − justificadas) × 100",
  },
  ISA: {
    codigo: "ISA",
    nombre: "Informes de seguimiento académico",
    dimension: "Seguimiento académico",
    fuente: "Libretas (RF-014)",
    formula: "libretas publicadas a tiempo ÷ libretas programadas × 100",
  },
  IGM: {
    codigo: "IGM",
    nombre: "Gestión de materiales",
    dimension: "Aula virtual",
    fuente: "Materiales (RF-015)",
    formula: "materiales planificados publicados a tiempo ÷ materiales planificados × 100",
  },
} as const;

export const DIMENSIONES_INDICADOR: Record<Indicador, string> = {
  CSP: "Prácticas pedagógicas",
  ISA: "Seguimiento académico",
  IGM: "Aula virtual",
} as const;

export const FUENTES_INDICADOR: Record<Indicador, string> = {
  CSP: "Sesiones de clase (RF-011)",
  ISA: "Libretas (RF-014)",
  IGM: "Materiales (RF-015)",
} as const;

/**
 * Mensajes oficiales del requerimiento RF-020.
 */
export const MENSAJES_INDICADORES = {
  PRETEST_REGISTRADO: (indicador: string, porcentaje: number | string): string =>
    `Pretest de ${indicador} registrado: ${Number(porcentaje).toFixed(2)} %.`,
  PRETEST_SIN_FUENTE: "Indique la fuente del pretest (de dónde se obtuvo el dato).",
  NUMERADOR_MAYOR: "El numerador no puede ser mayor que el denominador.",
  MEDICION_CERRADA: (
    nombrePeriodo: string,
    csp: number | string,
    isa: number | string,
    igm: number | string,
  ): string =>
    `Medición del ${nombrePeriodo} cerrada: CSP ${Number(csp).toFixed(2)} %, ISA ${Number(isa).toFixed(2)} %, IGM ${Number(igm).toFixed(2)} %.`,
  BIMESTRE_ABIERTO: "Solo se puede cerrar la medición de un bimestre cerrado.",
  MEDICION_YA_CERRADA:
    "Este bimestre ya tiene una medición cerrada. Genere una nueva versión indicando el motivo.",
  NUEVA_VERSION_SIN_MOTIVO: "Indique el motivo de la nueva versión.",
  SIN_DATOS: "No hay datos para el periodo y los filtros elegidos.",
  SIN_PRETEST: "Registre el pretest para ver la comparación.",
} as const;
