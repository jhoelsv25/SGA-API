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

export const PERMISO_CALENDARIO_REGISTRAR = "calendario:registrar";

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
