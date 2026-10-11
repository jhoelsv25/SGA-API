/**
 * Constantes y mensajes de dominio para el módulo de secciones (RF-008 HU1).
 */
export const MENSAJES_SECCIONES = {
  VACANTES_INVALIDAS: "Las vacantes deben ser mayores que 0.",
  TUTOR_DOCENTE_INACTIVO: "Solo se pueden asignar docentes activos.",
  TUTOR_OCUPADO: "Este docente ya es tutor de otra sección en este año.",
  SECCION_CON_MATRICULADOS: "No se puede cerrar una sección con estudiantes matriculados.",
  SECCION_CERRADA: "La sección está cerrada y solo admite consulta.",
  SECCION_NO_ENCONTRADA: "Sección no encontrada.",
  ANIO_CERRADO: "No se pueden realizar cambios en un año escolar cerrado.",
} as const;

export const TABLA_SECCIONES = "secciones";

export const ESTADOS_SECCION = ["activa", "cerrada"] as const;
export type EstadoSeccion = (typeof ESTADOS_SECCION)[number];
