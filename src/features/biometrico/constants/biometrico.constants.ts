/** Variables de sistema (RF-022). Los valores por defecto se confirman con el colegio (P-42). */
export const VARIABLES_BIOMETRICO = {
  MINUTOS_ANTIRREBOTE: { codigo: "biometrico.minutos_antirrebote", porDefecto: 5 },
} as const;

export const MENSAJES_BIOMETRICO = {
  CODIGO_ASIGNADO: (nombre: string): string => `Código biométrico asignado a ${nombre}.`,
  CODIGO_QUITADO: (nombre: string): string => `Código biométrico quitado a ${nombre}.`,
  CODIGO_REPETIDO: "Ese código biométrico ya pertenece a otra persona.",
  CODIGO_INVALIDO: "El código biométrico solo admite letras y números (máximo 20).",
  PERSONA_NO_ENCONTRADA: "La persona no existe.",
} as const;
