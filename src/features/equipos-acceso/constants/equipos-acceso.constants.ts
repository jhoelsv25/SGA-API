/** Estado de un equipo de acceso (columna `equipos_acceso.estado`): mismo valor que usa SGA-NET. */
export const ESTADO_EQUIPO_ACCESO = {
  PENDIENTE: 1,
  AUTORIZADO: 2,
  RECHAZADO: 3,
  REVOCADO: 4,
} as const;
export type EstadoEquipoAcceso = (typeof ESTADO_EQUIPO_ACCESO)[keyof typeof ESTADO_EQUIPO_ACCESO];

export const ESTADOS_EQUIPO_ACCESO: EstadoEquipoAcceso[] = Object.values(ESTADO_EQUIPO_ACCESO);
