export const TIPOS_INCIDENCIA = ["merito", "falta"] as const;
export type TipoIncidencia = (typeof TIPOS_INCIDENCIA)[number];

export const GRAVEDADES_FALTA = ["leve", "grave", "muy_grave"] as const;
export type GravedadFalta = (typeof GRAVEDADES_FALTA)[number];

export const TIPOS_OBSERVACION = [
  "academica",
  "conductual",
  "socioemocional",
  "salud",
  "familiar",
] as const;
export type TipoObservacion = (typeof TIPOS_OBSERVACION)[number];

export const MENSAJES_CONDUCTA = {
  INCIDENCIA_REGISTRADA: "Incidencia registrada. Se notificó al apoderado.",
  INCIDENCIA_REGISTRADA_SIN_NOTIFICAR: "Incidencia registrada exitosamente.",
  FALTA_SIN_GRAVEDAD: "Indique la gravedad de la falta.",
  MERITO_CON_GRAVEDAD: "Los méritos no admiten nivel de gravedad.",
  FECHA_FUTURA: "La fecha no puede ser posterior a hoy.",
  FUERA_DE_ALCANCE: "No tiene permiso para registrar sobre estudiantes de esta sección.",
  CORRECCION_FUERA_DE_PLAZO: "Ya no se puede corregir. Puede anularla indicando el motivo.",
  ANULACION_SIN_MOTIVO: "Indique el motivo de la anulación.",
  SIN_ACCESO_OBSERVACION: "No tiene acceso a esta observación.",
  SIN_ACCESO_ESTUDIANTE: "No tiene permiso para consultar información de este estudiante.",
  ESTUDIANTE_NO_ENCONTRADO: "Estudiante o matrícula no encontrada.",
  INCIDENCIA_NO_ENCONTRADA: "La incidencia no existe.",
  OBSERVACION_NO_ENCONTRADA: "La observación no existe.",
} as const;

export const LIMITE_HORAS_CORRECCION = 24;
