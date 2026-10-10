export const MATRICULA_ESTADOS = {
  MATRICULADO: "matriculado",
  RETIRADO: "retirado",
  TRASLADADO: "trasladado",
  CULMINADO: "culminado",
} as const;

export type MatriculaEstado = (typeof MATRICULA_ESTADOS)[keyof typeof MATRICULA_ESTADOS];

export const MATRICULA_TIPOS = {
  NUEVO: "nuevo",
  CONTINUADOR: "continuador",
  TRASLADO: "traslado",
} as const;

export type MatriculaTipo = (typeof MATRICULA_TIPOS)[keyof typeof MATRICULA_TIPOS];

export const MATRICULA_MESSAGES = {
  YA_MATRICULADO: "El estudiante ya está matriculado en el año escolar.",
  SIN_VACANTES: "La sección no tiene vacantes disponibles.",
  ESTUDIANTE_NO_ACTIVO: "Solo se pueden matricular estudiantes en estado activo.",
  FALTA_COLEGIO_PROCEDENCIA: "Indique el colegio de procedencia del estudiante trasladado.",
  SIN_APODERADO_PRINCIPAL:
    "El estudiante no tiene apoderado principal registrado. Regístrelo para que reciba la libreta.",
  RETIRO_INCOMPLETO: "Indique la fecha y el motivo del retiro.",
  TRASLADO_INCOMPLETO: "Indique la fecha y el colegio de destino.",
  CAMBIO_OTRO_GRADO: "Solo se puede cambiar a una sección del mismo grado.",
  ANULACION_CON_ACTIVIDAD:
    "No se puede anular: el estudiante ya tiene actividad. Regístrelo como retirado.",
  MATRICULA_NO_ENCONTRADA: "Matrícula no encontrada.",
  SECCION_NO_ENCONTRADA: "Sección no encontrada o no está activa.",
  ANIO_NO_VALIDO: "Solo se puede matricular en años escolares planificados o en curso.",
} as const;
