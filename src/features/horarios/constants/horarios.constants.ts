/**
 * Constantes y mensajes de dominio para el módulo de horarios (RF-008).
 */

export const TABLA_HORARIOS = "horarios";

export const VARIABLES_JORNADA = {
  MINUTOS_HORA_PEDAGOGICA: "jornada.minutos_hora_pedagogica",
  HORAS_PEDAGOGICAS_DIA: "jornada.horas_pedagogicas_dia",
  RECREO_DESPUES_DE_HORA: "jornada.recreo_despues_de_hora",
  MINUTOS_RECREO: "jornada.minutos_recreo",
} as const;

export const VARIABLE_MINUTOS_HORA_PEDAGOGICA = VARIABLES_JORNADA.MINUTOS_HORA_PEDAGOGICA;

export const MENSAJES_HORARIOS = {
  FIN_DEBE_SER_POSTERIOR: "La hora de fin debe ser posterior a la hora de inicio.",
  BLOQUES_SUPERPUESTOS: "El bloque se cruza con otro bloque de la sección.",
  SECCION_NO_ENCONTRADA: "Sección no encontrada.",
  BLOQUE_NO_ENCONTRADO: "Bloque de horario no encontrado.",
  ANIO_CERRADO: "No se pueden realizar cambios en un año lectivo cerrado.",
  ELIMINAR_CON_SESIONES: "No se puede eliminar un bloque que ya tiene sesiones de clase.",
  HORARIO_GUARDADO_VIGENCIA: "El horario se guardó. Los cambios rigen desde mañana.",
  CLASE_REQUIERE_CURSO: "Un bloque de clase requiere un curso asignado.",
  COPIA_DISTINTO_GRADO: "Solo se pueden copiar horarios entre secciones del mismo grado.",
  COPIA_DESTINO_CON_BLOQUES: "La sección destino ya cuenta con bloques de horario registrados.",
  FORMATO_HORA_INVALIDO: "El formato de horaEntrada debe ser HH:mm.",
} as const;

export const DIAS_SEMANA_MAP: Record<number, string> = {
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
};

export const DIAS_SEMANA_CLASE: readonly number[] = [1, 2, 3, 4, 5];

export const REGEX_HORA_HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
