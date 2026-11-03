export const MOTIVOS_PENDIENTE = ["codigo_desconocido", "no_docente", "sin_turno"] as const;
export type MotivoPendiente = (typeof MOTIVOS_PENDIENTE)[number];

export const ESTADOS_PENDIENTE = ["pendiente", "asignada", "descartada"] as const;
export type EstadoPendiente = (typeof ESTADOS_PENDIENTE)[number];

export const ESTADOS_RELOJ = [
  "nunca_conectado",
  "ok",
  "app_sin_conexion",
  "reloj_no_responde",
  "fuera_de_horario",
] as const;
export type EstadoReloj = (typeof ESTADOS_RELOJ)[number];

export const LIMITE_LOTE_BIOMETRICO = 500;
export const LIMITE_PENDIENTES = 200;

/** Variables de sistema (RF-022). Los valores por defecto se confirman con el colegio (P-42). */
export const VARIABLES_BIOMETRICO = {
  MINUTOS_ANTIRREBOTE: { codigo: "biometrico.minutos_antirrebote", porDefecto: 5 },
  DESFASE_MAXIMO_MIN: { codigo: "biometrico.desfase_maximo_min", porDefecto: 2 },
  MINUTOS_SIN_COMUNICACION: { codigo: "biometrico.minutos_sin_comunicacion", porDefecto: 10 },
} as const;

export const MENSAJES_BIOMETRICO = {
  CLAVE_INVALIDA: "Clave de la app puente inválida o reloj inactivo.",
  RELOJ_SIN_SERIE: "Indique el número de serie del reloj biométrico.",
  CODIGO_ASIGNADO: (nombre: string): string => `Código biométrico asignado a ${nombre}.`,
  CODIGO_QUITADO: (nombre: string): string => `Código biométrico quitado a ${nombre}.`,
  CODIGO_REPETIDO: "Ese código biométrico ya pertenece a otra persona.",
  CODIGO_INVALIDO: "El código biométrico solo admite letras y números (máximo 20).",
  PERSONA_NO_ENCONTRADA: "La persona no existe.",
  PENDIENTE_NO_ENCONTRADA: "La marcación pendiente no existe.",
  PENDIENTE_YA_RESUELTA: "Esta marcación ya fue resuelta.",
  PENDIENTE_ASIGNADA: (nombre: string): string => `Marcación asignada a ${nombre}.`,
  PENDIENTE_DESCARTADA: "Marcación descartada.",
  MOTIVO_DESCARTE_REQUERIDO: "Indique el motivo para descartar la marcación.",
  PERSONA_NO_DOCENTE: "Solo se puede asignar la marcación a un docente activo.",
  YA_COMPLETO: "El docente ya tiene entrada y salida ese día.",
  SIN_TURNO: "No hay un turno configurado para docentes.",
  FECHA_HORA_INVALIDA: "La fecha y hora debe tener el formato AAAA-MM-DD HH:mm:ss.",
  ALERTA_APP: (nombre: string, hora: string): string =>
    `La app puente del reloj ${nombre} no se comunica desde las ${hora}.`,
  ALERTA_APP_NUNCA: (nombre: string): string =>
    `La app puente del reloj ${nombre} todavía no se ha comunicado.`,
  ALERTA_RELOJ: (nombre: string, hora: string): string =>
    `El reloj ${nombre} no responde a la app puente desde las ${hora}.`,
  ALERTA_DESFASE: (nombre: string, minutos: number): string =>
    `El reloj ${nombre} tiene la hora desfasada ${minutos} minutos. Se sincronizó con el servidor.`,
} as const;
