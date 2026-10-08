export const VARIABLE_TIPOS = [
  "texto",
  "entero",
  "decimal",
  "booleano",
  "fecha",
  "hora",
  "lista",
] as const;

export type VariableTipo = (typeof VARIABLE_TIPOS)[number];

export const ERROR_MESSAGES = {
  MOTIVO_REQUERIDO: "Indique el motivo del cambio.",
  NUMERO_ENTERO: "Ingrese un número entero.",
  NUMERO_DECIMAL: "Ingrese un número decimal válido.",
  BOOLEANO_INVALIDO: "Ingrese un valor booleano válido (true o false).",
  VALOR_RANGO_0_60: "El valor debe estar entre 0 y 60.",
  PESOS_SUMA_100: "Los pesos de la nota deben sumar 100 %.",
  VARIABLE_NO_EDITABLE: "Esta variable no es editable.",
  VARIABLE_NO_ENCONTRADA: "Variable no encontrada.",
} as const;
