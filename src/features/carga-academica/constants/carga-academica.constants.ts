/**
 * Constantes y mensajes de dominio para el módulo de carga académica (RF-008 HU2).
 */
export const MENSAJES_CARGA_ACADEMICA = {
  DOCENTE_INACTIVO: "Solo se pueden asignar docentes activos.",
  CURSO_SECCION_NO_ENCONTRADO: "Curso de la sección no encontrado.",
  DOCENTE_NO_ENCONTRADO: "Docente no encontrado.",
  ANIO_CERRADO: "No se pueden realizar cambios en un año escolar cerrado.",
} as const;

export const TABLA_CURSOS_SECCION = "cursos_seccion";
export const MINUTOS_HORA_PEDAGOGICA_DEFAULT = 45;
