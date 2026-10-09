export const TIPOS_CONTRATO = ["nombrado", "contratado", "practicante"] as const;
export type TipoContrato = (typeof TIPOS_CONTRATO)[number];

export const JORNADAS_HORAS = [20, 24, 30, 40] as const;
export type JornadaHoras = (typeof JORNADAS_HORAS)[number];

export const ESTADOS_DOCENTE = ["activo", "licencia", "cesado"] as const;
export type EstadoDocente = (typeof ESTADOS_DOCENTE)[number];

export const DOCENTE_MESSAGES = {
  CODIGO_DUPLICADO: "Ya existe un docente con ese código.",
  PERSONA_YA_DOCENTE: "Esta persona ya está registrada como docente.",
  FECHA_CESE_INVALIDA: "La fecha de cese debe ser posterior a la fecha de ingreso.",
  NOT_FOUND: "Docente no encontrado.",
  ALREADY_CESADO: "El docente ya se encuentra en estado cesado.",
  DNI_INVALIDO: "El DNI debe tener 8 dígitos.",
  CARGO_NOT_FOUND: "No se encontró el cargo docente en el catálogo.",
  ROL_NOT_FOUND: "No se encontró el rol Docente en el catálogo.",
  CESADO_SUCCESS: "El docente fue cesado correctamente.",
  DELETED_SUCCESS: "Docente eliminado correctamente.",
} as const;

export const CARGO_DOCENTE_DEFAULT = "Docente de aula";
export const ROL_DOCENTE_DEFAULT = "Docente";
