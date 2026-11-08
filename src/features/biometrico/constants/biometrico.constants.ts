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
  HORA_INVALIDA: "La hora debe tener el formato HH:mm (por ejemplo 07:30).",
  DIAS_INVALIDOS: "Los días van de 1 (lunes) a 7 (domingo), separados por comas.",
  HORA_REPETIDA: (hora: string): string => `La hora ${hora} está repetida.`,
  PROGRAMACION_GUARDADA:
    "Programación guardada. En el equipo del reloj, pulse «Crear y sincronizar tareas programadas».",
} as const;

export const MAX_HORAS_PROGRAMACION = 24;
