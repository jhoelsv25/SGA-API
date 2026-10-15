export const MENSAJES_CONSOLIDADO = {
  YA_EXISTE_CONSOLIDADO:
    "El docente ya tiene un consolidado vigente para este bimestre. Reábralo para actualizarlo.",
  BIMESTRE_AUN_ABIERTO:
    "Solo se puede generar el consolidado en la última semana del bimestre o después de cerrarlo.",
  CONSOLIDADO_REABIERTO:
    "Consolidado reabierto. Ya se pueden corregir las sesiones y ausencias del docente en este bimestre.",
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
  DOCENTE_NO_ENCONTRADO: "Perfil de docente no encontrado.",
} as const;

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
