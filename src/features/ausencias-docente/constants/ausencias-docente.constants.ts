/**
 * Constantes de dominio para el módulo de Ausencias y Supervisión Docente (RF-012).
 */

/** Motivos válidos para registrar una ausencia docente. */
export const MOTIVOS_AUSENCIA = [
  "fuera_del_aula",
  "desayunando",
  "servicios_higienicos",
  "uso_celular",
  "otro",
] as const;

export type MotivoAusencia = (typeof MOTIVOS_AUSENCIA)[number];

/** Parámetros y límites de evidencias fotográficas. */
export const FOTO_TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB
export const FOTO_MIME_TYPES = ["image/png", "image/jpeg"] as const;
export type FotoMimeType = (typeof FOTO_MIME_TYPES)[number];

/** Códigos de variables de sistema configurables (RF-012 V2.0 P-10). */
export const VARIABLES_AUSENCIA = {
  PLAZO_DESCARGO_DIAS: "ausencia.plazo_descargo_dias",
  PLAZO_CORRECCION_HORAS: "ausencia.plazo_correccion_horas",
} as const;

/** Valores por defecto cuando las variables de sistema no estén definidas. */
export const VALORES_DEFECTO_AUSENCIA = {
  PLAZO_DESCARGO_DIAS: 7,
  PLAZO_CORRECCION_HORAS: 24,
} as const;

/**
 * Mensajes oficiales del requerimiento RF-012.
 * Textos exactos según la especificación funcional (tabla «Mensajes del requerimiento»).
 */
export const MENSAJES_AUSENCIA = {
  AUSENCIA_REGISTRADA: (minutos: number) =>
    `Ausencia registrada: ${minutos} minutos. Se notificó al docente.`,
  HORAS_INVERTIDAS: "La hora final debe ser posterior a la hora inicial.",
  FUERA_HORARIO_SESION: (horario: string) =>
    `El tramo debe estar dentro del horario de la sesión (${horario}).`,
  TRAMOS_SUPERPUESTOS: "El tramo se cruza con otra ausencia registrada en esta sesión.",
  FALTA_OBSERVACION: "Describa la situación cuando el motivo es «Otro».",
  FOTO_INVALIDA: "Las fotos deben ser PNG o JPG de hasta 5 MB.",
  CORRECCION_FUERA_DE_PLAZO:
    "Ya no se puede corregir esta ausencia. Puede anularla indicando el motivo.",
  ANULACION_SIN_MOTIVO: "Indique el motivo de la anulación.",
  CORRECCION_SIN_MOTIVO: "Indique el motivo del cambio.",
  DESCARGO_ENVIADO: "Su descargo fue registrado.",
  DESCARGO_FUERA_DE_PLAZO: (fecha: string) =>
    `El plazo para presentar su descargo venció el ${fecha}.`,
  DESCARGO_REPETIDO: "Ya presentó su descargo para esta ausencia.",
  BIMESTRE_CERRADO:
    "El bimestre está cerrado o consolidado. Las ausencias ya no se pueden modificar.",
} as const;
