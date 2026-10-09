/**
 * Constantes y mensajes de dominio para el módulo de horarios (RF-008).
 */

export const TABLA_HORARIOS = "horarios";

export const VARIABLE_MINUTOS_HORA_PEDAGOGICA = "jornada.minutos_hora_pedagogica";

export const MENSAJES_HORARIOS = {
  FIN_DEBE_SER_POSTERIOR: "La hora de fin debe ser posterior a la hora de inicio.",
  BLOQUES_SUPERPUESTOS: "El bloque se cruza con otro bloque de la sección.",
  SECCION_NO_ENCONTRADA: "Sección no encontrada.",
  BLOQUE_NO_ENCONTRADO: "Bloque de horario no encontrado.",
  ANIO_CERRADO: "No se pueden realizar cambios en un año lectivo cerrado.",
  ELIMINAR_CON_SESIONES: "No se puede eliminar un bloque que ya tiene sesiones de clase.",
  HORARIO_GUARDADO_VIGENCIA: "El horario se guardó. Los cambios rigen desde mañana.",
  CLASE_REQUIERE_CURSO: "Un bloque de clase requiere un curso asignado.",
} as const;

export const DIAS_SEMANA_MAP: Record<number, string> = {
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
};
