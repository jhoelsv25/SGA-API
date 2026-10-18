export const ESTADOS_ESTUDIANTE = ["activo", "retirado", "trasladado", "egresado"] as const;
export type EstadoEstudiante = (typeof ESTADOS_ESTUDIANTE)[number];

export const ESTUDIANTE_MESSAGES = {
  CODIGO_DUPLICADO: "Ya existe un estudiante con ese código SIAGIE.",
  PERSONA_YA_ESTUDIANTE: "Esta persona ya está registrada como estudiante.",
  PERSONA_YA_DOCENTE:
    "Esta persona ya está registrada como docente; una persona solo puede tener una ficha (docente o estudiante).",
  DISCAPACIDAD_DETALLE_INVALIDO: "Indique el detalle solo si el estudiante tiene discapacidad.",
  FECHA_NACIMIENTO_FUTURA: "La fecha de nacimiento no puede ser futura.",
  NOT_FOUND: "Estudiante no encontrado.",
  ROL_NOT_FOUND: "No se encontró el rol Estudiante en el catálogo.",
  CARGO_NOT_FOUND: "No se encontró el cargo Estudiante en el catálogo.",
  DELETED_SUCCESS: "Estudiante eliminado correctamente.",
} as const;

export const CARGO_ESTUDIANTE_DEFAULT = "Estudiante";
export const ROL_ESTUDIANTE_DEFAULT = "Estudiante";
