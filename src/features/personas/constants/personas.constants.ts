export const PERSONA_MESSAGES = {
  NOT_FOUND: "Persona no encontrada.",
  DOCUMENTO_DUPLICADO: "Esta persona ya está registrada. Se usarán sus datos.",
  DNI_INVALID: "El DNI debe tener 8 dígitos.",
  FECHA_NACIMIENTO_FUTURA: "La fecha de nacimiento no puede ser futura.",
  CORREO_DUPLICADO: "El correo ya está registrado para otra persona.",
  CRITICAL_DATA_UNAUTHORIZED:
    "Su rol no está autorizado para modificar datos críticos de la persona.",
  CRITICAL_DATA_MOTIVO_REQUIRED: "Indique el motivo de la corrección.",
  DELETE_WITH_RELATIONS_CONFLICT:
    "No se puede eliminar una persona con fichas o cuenta asociadas. Debe inactivarse desde su ficha correspondiente.",
  CREATED_SUCCESS: "Persona registrada correctamente en el padrón.",
  UPDATED_SUCCESS: "Los datos de la persona se actualizaron correctamente.",
  CRITICAL_UPDATED_SUCCESS: "Los datos críticos fueron corregidos y registrados en la bitácora.",
  DELETED_SUCCESS: "Persona eliminada del padrón.",
} as const;

export const TIPOS_DOCUMENTO = [
  "dni",
  "carne_extranjeria",
  "pasaporte",
  "partida_nacimiento",
] as const;

export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const CAMPOS_CRITICOS = [
  "tipoDocumento",
  "numeroDocumento",
  "nombres",
  "apellidoPaterno",
  "apellidoMaterno",
  "sexo",
  "fechaNacimiento",
] as const;

export type CampoCritico = (typeof CAMPOS_CRITICOS)[number];
