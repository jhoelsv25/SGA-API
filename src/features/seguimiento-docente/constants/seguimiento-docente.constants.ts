/**
 * Constantes de dominio para el módulo de Consolidado y Seguimiento Docente (RF-013).
 */

/** Estados posibles de un consolidado docente. */
export const ESTADOS_CONSOLIDADO = ["cerrado", "reabierto"] as const;
export type EstadoConsolidado = (typeof ESTADOS_CONSOLIDADO)[number];

/** Decisiones directivas aplicables sobre el consolidado docente. */
export const DECISIONES_CONSOLIDADO = [
  "ninguna",
  "llamada_atencion",
  "compromiso_mejora",
  "derivado",
] as const;
export type DecisionConsolidado = (typeof DECISIONES_CONSOLIDADO)[number];

/** Estados del flujo de solicitudes de revisión de consolidado. */
export const ESTADOS_SOLICITUD_REVISION = ["solicitada", "aceptada", "rechazada"] as const;
export type EstadoSolicitudRevision = (typeof ESTADOS_SOLICITUD_REVISION)[number];

/** Límites y tipos admitidos para adjuntos de solicitudes de revisión. */
export const ADJUNTO_SOLICITUD_TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB
export const ADJUNTO_SOLICITUD_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;
export type AdjuntoSolicitudMimeType = (typeof ADJUNTO_SOLICITUD_MIME_TYPES)[number];

/**
 * Mensajes oficiales del requerimiento RF-013.
 * Textos exactos según la especificación funcional (tabla «Mensajes del requerimiento»).
 */
export const MENSAJES_CONSOLIDADO = {
  CONSOLIDADO_GENERADO: (bimestre: string, cantidad: number) =>
    `Consolidado del ${bimestre} generado para ${cantidad} docentes.`,
  CONSOLIDADO_YA_EXISTE:
    "El docente ya tiene un consolidado vigente para este bimestre. Reábralo para actualizarlo.",
  BIMESTRE_AUN_ABIERTO:
    "Solo se puede generar el consolidado en la última semana del bimestre o después de cerrarlo.",
  CONSOLIDADO_REABIERTO:
    "Consolidado reabierto. Ya se pueden corregir las sesiones y ausencias del docente en este bimestre.",
  NUEVO_CIERRE_SIN_MOTIVO: "Indique el motivo del cambio.",
  NUEVA_VERSION: (version: number) => `Se generó la versión ${version} del consolidado.`,
  SOLICITUD_ENVIADA: "Su solicitud de revisión fue enviada al Director.",
  SOLICITUD_SIN_MOTIVO: "Indique el motivo de su solicitud.",
  SOLICITUD_REPETIDA: "Ya tiene una solicitud de revisión pendiente para este consolidado.",
  SOLICITUD_RECHAZADA_SIN_RESPUESTA: "Indique la respuesta para el docente.",
  CONSOLIDADO_CERRADO: "El consolidado de este bimestre está cerrado. Solicite su reapertura.",
  CONSOLIDADO_NO_ENCONTRADO: "Consolidado docente no encontrado.",
  CONSOLIDADO_NO_VIGENTE: "No se puede reabrir ni cerrar una versión histórica del consolidado.",
  SOLICITUD_NO_ENCONTRADA: "Solicitud de revisión no encontrada.",
} as const;

/**
 * Nombre institucional oficial para membretes de documentos (Ficha PDF y Reporte Excel).
 * Propuesta R3: Centralizar lectura en repositorio o InstitucionService cuando T08 integre módulos.
 */
export const NOMBRE_INSTITUCION_DEFECTO = "I.E. NUESTRA SEÑORA DEL CARMEN";
