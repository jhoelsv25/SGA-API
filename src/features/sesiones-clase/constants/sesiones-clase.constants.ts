export const ESTADOS_SESION = [
  "pendiente",
  "en_curso",
  "cumplida",
  "parcial",
  "no_cumplida",
  "justificada",
  "reprogramada",
] as const;
export type EstadoSesion = (typeof ESTADOS_SESION)[number];

export const ESTADOS_JUSTIFICACION = ["solicitada", "aprobada", "rechazada"] as const;
export type EstadoJustificacion = (typeof ESTADOS_JUSTIFICACION)[number];

export const PROPOSITO_EQUIPO_SESIONES = "sesiones";
export const TIPO_BLOQUE_CLASE = "clase";
export const OBSERVACION_SIN_SALIDA = "Sin firma de salida";

/** Variables de sistema (RF-004 HU4) que configuran la firma (RF-011 V2). */
export const VARIABLES_SESION = {
  MINUTOS_ANTES_FIRMA_INGRESO: "sesion.minutos_antes_firma_ingreso",
  TOLERANCIA_INGRESO: "sesion.tolerancia_ingreso_min",
  TOLERANCIA_SALIDA: "sesion.tolerancia_salida_min",
  SALIDA_AUTOMATICA: "sesion.salida_automatica_sin_firma",
  PERMITIR_FIRMA_WEB: "sesion.permitir_firma_web",
} as const;

export const JOB_GENERAR_SESIONES = "generar-sesiones-del-dia";
export const JOB_CERRAR_SESIONES = "cerrar-sesiones-del-dia";
/** A primera hora se generan; al final del día se cierran (hora de Lima). */
export const CRON_GENERAR_SESIONES = "0 5 * * *";
export const CRON_CERRAR_SESIONES = "55 23 * * *";

export const MENSAJES_SESION = {
  FALTA_TEMA: "Ingrese el tema de la sesión para firmar el ingreso.",
  SESION_TERMINADA: "La sesión ya terminó. No se puede firmar el ingreso.",
  SIN_SESIONES_HOY: "No tiene sesiones programadas para hoy.",
  SESION_AJENA: "Esta sesión está asignada a otro docente.",
  EQUIPO_NO_AUTORIZADO: "Este equipo no está autorizado. Comuníquese con el área de TI.",
  BIMESTRE_CERRADO: "El bimestre está cerrado. La sesión ya no se puede modificar.",
  JUSTIFICACION_ENVIADA: "Su justificación fue enviada al subdirector.",
  JUSTIFICACION_SIN_MOTIVO: "Indique el motivo de la justificación.",
  JUSTIFICACION_APROBADA: "Sesión justificada.",
  JUSTIFICACION_RECHAZADA: "La justificación fue rechazada.",
  RECHAZO_SIN_COMENTARIO: "Indique el motivo del rechazo.",
  SOLO_DOCENTES: "Este kiosko es solo para docentes.",
  SESION_NO_ENCONTRADA: "La sesión no existe.",
  INGRESO_YA_FIRMADO: "El ingreso de esta sesión ya está firmado.",
  SALIDA_SIN_INGRESO: "Primero firme el ingreso de la sesión.",
  SALIDA_YA_FIRMADA: "La salida de esta sesión ya está firmada.",
  SOLO_NO_CUMPLIDA: "Solo se puede justificar una sesión no cumplida.",
  JUSTIFICACION_EN_CURSO: "Esta sesión ya tiene una justificación solicitada o aprobada.",
  SIN_JUSTIFICACION_SOLICITADA: "La sesión no tiene una justificación por revisar.",
  REEMPLAZO_SOLO_PENDIENTE: "Solo se puede asignar un reemplazo a una sesión sin firmar.",
  REEMPLAZO_MISMO_DOCENTE: "La sesión ya está asignada a ese docente.",
  DOCENTE_NO_DISPONIBLE: "El docente no existe o no está activo.",
  SESION_NO_ES_SUYA: "Solo el docente de la sesión puede hacer esta acción.",
  TEMA_CERRADO: "El tema ya no se puede corregir: la salida está firmada.",
  VARIABLE_FALTANTE: (codigo: string) => `Falta configurar la variable de sistema «${codigo}».`,
  RANGO_INVALIDO: "La fecha de fin debe ser posterior al inicio.",
  FIRMA_WEB_DESHABILITADA:
    "La firma desde la web no está habilitada. Use un equipo kiosko autorizado.",
  FIRMA_BLOQUEADA_SIMULACION: "No puede firmar sesiones de clase mientras usa la vista simulada.",
} as const;

export const mensajeIngreso = (hora: string, curso: string, seccion: string): string =>
  `Ingreso firmado a las ${hora}. ${curso} – ${seccion}.`;

export const mensajeIngresoConRetraso = (hora: string, minutos: number): string =>
  `Ingreso firmado a las ${hora} con ${minutos} minutos de retraso.`;

export const mensajeSalidaCumplida = (hora: string): string =>
  `Salida firmada a las ${hora}. Sesión cumplida.`;

export const mensajeSalidaParcial = (hora: string, minutos: number): string =>
  `Salida firmada a las ${hora}. Sesión parcial: ${minutos} minutos perdidos.`;

export const mensajeAntesDeVentana = (hora: string): string =>
  `Aún no puede firmar. El ingreso se habilita a las ${hora}.`;
