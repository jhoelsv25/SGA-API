export const EQUIPO_TIPOS = ["kiosko"] as const;
export type EquipoTipo = (typeof EQUIPO_TIPOS)[number];

export const EQUIPO_PROPOSITOS = ["marcacion", "sesiones"] as const;
export type EquipoProposito = (typeof EQUIPO_PROPOSITOS)[number];
