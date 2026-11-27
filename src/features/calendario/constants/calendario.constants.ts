export const TIPOS_EVENTO = [
  "feriado",
  "suspension",
  "jornada_pedagogica",
  "reunion",
  "actividad",
  "examen",
] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export const TIPOS_SUSPENDEN_POR_DEFECTO: ReadonlySet<TipoEvento> = new Set([
  "feriado",
  "suspension",
  "jornada_pedagogica",
]);

// RF-005: registrar eventos exige que el rol tenga el menú del calendario (Roles-Menú, RF-002 V3)
export { MENU_CALENDARIO } from "../../../common/constants/menu-rutas.constants";

export const ZONA_HORARIA_COLEGIO = "America/Lima";

export const MENSAJES = {
  fechasInvertidas: "La fecha de fin debe ser posterior a la fecha de inicio.",
  sesionesPendientes:
    "Se eliminaron las sesiones pendientes de esas fechas. Las sesiones ya firmadas se conservan.",
  eventoNoEncontrado: "Evento de calendario no encontrado.",
  fechaInvalida: "Indique una fecha válida (AAAA-MM-DD).",
  mesInvalido: "Indique un mes entre 1 y 12.",
  anioNoDisponible: "Un año planificado aún no inicia. No se puede consultar.",
} as const;
