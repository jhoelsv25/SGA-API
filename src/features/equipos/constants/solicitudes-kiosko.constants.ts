export const ESTADO_SOLICITUD_KIOSKO = {
  PENDIENTE: 1,
  APROBADA: 2,
  RECHAZADA: 3,
} as const;
export type EstadoSolicitudKiosko =
  (typeof ESTADO_SOLICITUD_KIOSKO)[keyof typeof ESTADO_SOLICITUD_KIOSKO];

/** Tope de solicitudes pendientes activas; frena el llenado de la tabla desde el endpoint público. */
export const MAX_SOLICITUDES_KIOSKO_PENDIENTES = 20;
