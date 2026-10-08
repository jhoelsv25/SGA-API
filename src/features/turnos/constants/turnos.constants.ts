export const PERSONA_TYPES_TURNO = ["estudiantes", "docentes", "administrativos"] as const;
export type PersonaTypeTurno = (typeof PERSONA_TYPES_TURNO)[number];

export const MIN_TOLERANCIA_MIN = 0;
export const MAX_TOLERANCIA_MIN = 60;
