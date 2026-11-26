export const MENSAJES_CONSOLIDADO = {
  YA_EXISTE_CONSOLIDADO:
    "El docente ya tiene un consolidado vigente para este bimestre. Reábralo para actualizarlo.",
  BIMESTRE_AUN_ABIERTO:
    "Solo se puede generar el consolidado en la última semana del bimestre o después de cerrarlo.",
  CONSOLIDADO_REABIERTO:
    "Consolidado reabierto. Ya se pueden corregir las sesiones y ausencias del docente en este bimestre.",
  CIERRE_SIN_REAPERTURA: "Solo se puede cerrar la versión vigente de un consolidado reabierto.",
  NUEVO_CIERRE_SIN_MOTIVO: "Indique el motivo del cambio.",
  SOLICITUD_ENVIADA: "Su solicitud de revisión fue enviada al Director.",
  SOLICITUD_SIN_MOTIVO: "Indique el motivo de su solicitud.",
  SOLICITUD_REPETIDA: "Ya tiene una solicitud de revisión pendiente para este consolidado.",
  SOLICITUD_RECHAZADA_SIN_RESPUESTA: "Indique la respuesta para el docente.",
  CONSOLIDADO_CERRADO: "El consolidado de este bimestre está cerrado. Solicite su reapertura.",
  NO_ENCONTRADO: "Consolidado no encontrado.",
  SOLICITUD_NO_ENCONTRADA: "Solicitud de revisión no encontrada.",
  SOLICITUD_NO_PENDIENTE: "La solicitud de revisión ya fue resuelta.",
  NO_TIENE_PERMISO: "No tiene permiso para realizar esta acción.",
  COMPROMISO_DECISION_NO_ADMITE:
    "Solo se registran compromisos cuando la decisión es compromiso de mejora o llamada de atención.",
  COMPROMISO_SIN_DESCRIPCION: "Indique la descripción del compromiso.",
  COMPROMISO_FECHA_PASADA: "La fecha de revisión debe ser hoy o posterior.",
  COMPROMISO_CIERRE_SIN_OBSERVACION: "Indique la observación de cierre.",
  COMPROMISO_CERRADO: "El compromiso ya está cerrado. No se puede volver a cerrar.",
  COMPROMISO_ANULACION_SIN_MOTIVO: "Indique el motivo de la anulación.",
  COMPROMISO_ANULADO: "El compromiso está anulado.",
  COMPROMISO_NO_ENCONTRADO: "Compromiso no encontrado.",
  COMPROMISO_NO_EDITABLE: "El compromiso ya está cerrado. No se puede modificar.",
  COMPROMISO_SIN_CAMBIOS: "Indique una fecha de revisión o una descripción distinta.",
  COMPROMISOS_PENDIENTES_CAMBIO_DECISION:
    "Hay compromisos pendientes. Ciérrelos o anúlelos antes de cambiar la decisión.",
  ENTERADO: "Gracias. Quedó registrado que está enterado.",
  INFORME_MES_SIN_SESIONES: "No hay sesiones en el mes elegido para exportar.",
  SIN_PENDIENTES: "No hay pendientes de seguimiento.",
  VARIABLE_FALTANTE: (codigo: string) => `Falta configurar la variable de sistema «${codigo}».`,
} as const;

export const mensajeCompromisoRegistrado = (fechaRevision: string): string =>
  `Compromiso registrado. Se le recordará el ${fechaRevision}.`;

export const mensajeCompromisoCerrado = (resultado: ResultadoCompromiso): string =>
  resultado === "cumplido"
    ? "Compromiso marcado como cumplido."
    : "Compromiso marcado como no cumplido.";

export const mensajeRecordatorioCompromiso = (apellido: string, descripcion: string): string =>
  `Hoy se revisa el compromiso de ${apellido}: ${descripcion}.`;

export const mensajeConsolidadosGenerados = (docentes: number, bimestre: string): string =>
  `Consolidado del ${bimestre} generado para ${docentes} docentes.`;

export const mensajeNuevaVersion = (version: number): string =>
  `Se generó la versión ${version} del consolidado.`;

export const DECISIONES_CONSOLIDADO = [
  "ninguna",
  "llamada_atencion",
  "compromiso_mejora",
  "derivado",
] as const;
export type DecisionConsolidado = (typeof DECISIONES_CONSOLIDADO)[number];

export const ESTADOS_CONSOLIDADO = ["cerrado", "reabierto"] as const;
export type EstadoConsolidado = (typeof ESTADOS_CONSOLIDADO)[number];

export const ESTADOS_SOLICITUD_REVISION = ["solicitada", "aceptada", "rechazada"] as const;
export type EstadoSolicitudRevision = (typeof ESTADOS_SOLICITUD_REVISION)[number];

export const DIAS_ULTIMA_SEMANA_BIMESTRE = 7;

/** Compromisos de mejora (RF-013 V2, HU5). */
export const ESTADOS_COMPROMISO = ["pendiente", "cumplido", "no_cumplido"] as const;
export type EstadoCompromiso = (typeof ESTADOS_COMPROMISO)[number];
export const RESULTADOS_COMPROMISO = ["cumplido", "no_cumplido"] as const;
export type ResultadoCompromiso = (typeof RESULTADOS_COMPROMISO)[number];
/** Solo estas decisiones admiten compromisos. */
export const DECISIONES_CON_COMPROMISO: readonly DecisionConsolidado[] = [
  "compromiso_mejora",
  "llamada_atencion",
];

/** Variables de sistema que usa el consolidado (RF-004 V3). */
export const VARIABLES_CONSOLIDADO = {
  MINUTOS_HORA_PEDAGOGICA: "sesion.minutos_hora_pedagogica",
  DIAS_PARA_DECIDIR: "consolidado.dias_para_decidir",
  PLAZO_DESCARGO_DIAS: "ausencia.plazo_descargo_dias",
} as const;

/** Tareas programadas: recordatorio diario de los compromisos (RF-013 V2, RF-019 V2). */
export const JOB_RECORDAR_COMPROMISOS = "recordar-compromisos-de-consolidado";
export const CRON_RECORDAR_COMPROMISOS = "0 7 * * 1-5";
export const ROL_DIRECTOR = "Director";

/** Tipos del reporte «Pendientes de seguimiento» (RF-013 V2, HU7). */
export const TIPOS_PENDIENTE = [
  "justificacion_sin_resolver",
  "descargo_vencido",
  "consolidado_sin_generar",
  "consolidado_sin_decision",
  "solicitud_revision_abierta",
  "compromiso_vencido",
] as const;
export type TipoPendiente = (typeof TIPOS_PENDIENTE)[number];

export const ETIQUETAS_PENDIENTE: Record<TipoPendiente, string> = {
  justificacion_sin_resolver: "Justificación sin resolver",
  descargo_vencido: "Ausencia con descargo vencido",
  consolidado_sin_generar: "Consolidado sin generar",
  consolidado_sin_decision: "Consolidado sin decisión",
  solicitud_revision_abierta: "Solicitud de revisión abierta",
  compromiso_vencido: "Compromiso vencido",
};
