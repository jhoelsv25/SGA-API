export const GRADOS_INSTRUCCION = [
  "sin_estudios",
  "primaria",
  "secundaria",
  "tecnica",
  "universitaria",
  "posgrado",
] as const;
export type GradoInstruccion = (typeof GRADOS_INSTRUCCION)[number];

export const PARENTESCOS = [
  "padre",
  "madre",
  "abuelo",
  "abuela",
  "hermano",
  "hermana",
  "tio",
  "tia",
  "tutor_legal",
  "otro",
] as const;
export type Parentesco = (typeof PARENTESCOS)[number];

export const APODERADO_MESSAGES = {
  SEGUNDO_PRINCIPAL: "El estudiante ya tiene un apoderado principal. Se cambiará al nuevo.",
  VINCULO_REPETIDO: "Este apoderado ya está vinculado al estudiante.",
  PERSONA_YA_APODERADO: "Esta persona ya está registrada como apoderado.",
  NOT_FOUND: "Apoderado no encontrado.",
  ESTUDIANTE_NOT_FOUND: "Estudiante no encontrado.",
  VINCULO_NOT_FOUND: "El vínculo familiar no existe.",
  ROL_NOT_FOUND: "No se encontró el rol Apoderado en el catálogo.",
  CARGO_NOT_FOUND: "No se encontró el cargo Apoderado(a) en el catálogo.",
  DELETED_SUCCESS: "Apoderado eliminado correctamente.",
  DESVINCULADO_SUCCESS: "Vínculo familiar retirado correctamente.",
} as const;

export const CARGO_APODERADO_DEFAULT = "Apoderado(a)";
export const ROL_APODERADO_DEFAULT = "Apoderado";
