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

/** Catálogo de motivos de justificación (RF-011 V3, HU4). */
export const MOTIVOS_JUSTIFICACION = [
  { codigo: "descanso_medico", etiqueta: "Descanso médico" },
  { codigo: "permiso_personal", etiqueta: "Permiso personal" },
  { codigo: "comision_de_servicio", etiqueta: "Comisión de servicio" },
  { codigo: "licencia", etiqueta: "Licencia" },
  { codigo: "caso_fortuito_o_fuerza_mayor", etiqueta: "Caso fortuito o fuerza mayor" },
  { codigo: "otro", etiqueta: "Otro" },
] as const;
export type MotivoJustificacion = (typeof MOTIVOS_JUSTIFICACION)[number]["codigo"];
export const CODIGOS_MOTIVO_JUSTIFICACION = MOTIVOS_JUSTIFICACION.map((m) => m.codigo);
export const MOTIVO_PERMISO_PERSONAL: MotivoJustificacion = "permiso_personal";
export const MOTIVO_OTRO: MotivoJustificacion = "otro";
/** Motivos cuya solicitud no da derecho al permiso o licencia (Lineamientos MINEDU, art. 3). */
export const MOTIVOS_CON_AVISO_NORMA: readonly MotivoJustificacion[] = [
  "permiso_personal",
  "licencia",
];

export const PROPOSITO_EQUIPO_SESIONES = "sesiones";
export const TIPO_BLOQUE_CLASE = "clase";
export const OBSERVACION_SIN_SALIDA = "Sin firma de salida";

/** Variables de sistema (RF-004 HU4) que configuran la firma (RF-011 V2). */
export const VARIABLES_SESION = {
  MINUTOS_ANTES_FIRMA_INGRESO: "sesion.minutos_antes_firma_ingreso",
  TOLERANCIA_INGRESO: "sesion.tolerancia_ingreso_min",
  TOLERANCIA_SALIDA: "sesion.tolerancia_salida_min",
  SALIDA_AUTOMATICA: "sesion.salida_automatica_sin_firma",
} as const;

/** Variables de sistema de las justificaciones (RF-004 V3, RF-011 V3). */
export const VARIABLES_JUSTIFICACION = {
  AVISO_DIAS: "sesion.justificacion_aviso_dias",
  MOTIVOS_CON_DOCUMENTO: "sesion.justificacion_motivos_con_documento",
  PERMISOS_MAX_ANIO: "sesion.permisos_personales_max_anio",
} as const;

/** Variables de sistema de las alertas del panel (RF-004 V3, RF-011 V3). */
export const VARIABLES_ALERTA = {
  SALIDA_MINUTOS: "sesion.alerta_salida_minutos",
  UMBRAL_DIA: "sesion.alerta_minutos_perdidos_umbral",
  UMBRAL_SEMANA: "sesion.alerta_minutos_perdidos_umbral_semana",
} as const;

/** Roles que reciben las alertas del seguimiento (RF-011 V3). */
export const ROLES_ALERTA_SESION = ["Subdirector", "Director"] as const;

export const JOB_EVALUAR_ALERTAS = "evaluar-alertas-de-sesiones";
/** Cada 5 minutos, de lunes a viernes en horario escolar (hora de Lima). */
export const CRON_EVALUAR_ALERTAS = "*/5 6-18 * * 1-5";

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
  JUSTIFICACION_SIN_MOTIVO: "Elija el motivo de la justificación.",
  JUSTIFICACION_SIN_DOCUMENTO: "Para este motivo debe adjuntar un documento.",
  JUSTIFICACION_SIN_OBSERVACION: "Indique la observación del motivo «Otro».",
  AVISO_NORMA: "Presentar la solicitud no da derecho al permiso o licencia; debe ser aprobada.",
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
} as const;

export const mensajeContadorPermisos = (usados: number, tope: number): string =>
  `Lleva ${usados} de ${tope} días de permiso personal este año.`;

export const mensajeTopePermisosSuperado = (tope: number): string =>
  `Con esta aprobación superará los ${tope} días de permiso personal al año. ¿Desea continuar?`;

export const mensajeSolicitudVencida = (
  docente: string,
  curso: string,
  seccion: string,
  fecha: string,
  dias: number,
): string =>
  `La justificación de ${docente} (${curso} – ${seccion}, ${fecha}) lleva ${dias} días sin respuesta.`;

export const mensajeAlertaSalida = (
  curso: string,
  seccion: string,
  profesor: string,
  faltan: number,
): string =>
  faltan > 0
    ? `${curso} – ${seccion} (prof. ${profesor}): faltan ${faltan} minutos y no hay firma de salida.`
    : `${curso} – ${seccion} (prof. ${profesor}): la clase terminó y no hay firma de salida.`;

export const mensajeAlertaMinutos = (
  apellido: string,
  minutos: number,
  umbral: number,
  periodo: "dia" | "semana",
): string =>
  `El docente ${apellido} acumula ${minutos} minutos perdidos ${
    periodo === "dia" ? "hoy" : "esta semana"
  } (umbral: ${umbral}).`;

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
