/** RF-023 V1: observación de aula y retroalimentación. */

export const ESTADOS_OBSERVACION = [
  "programada",
  "en_observacion",
  "notas_cerradas",
  "calificada",
  "retroalimentada",
  "cancelada",
] as const;
export type EstadoObservacion = (typeof ESTADOS_OBSERVACION)[number];

export const ESTADOS_COMPROMISO_OBS = ["pendiente", "cumplido", "no_cumplido"] as const;
export type EstadoCompromisoObs = (typeof ESTADOS_COMPROMISO_OBS)[number];
export const RESULTADOS_COMPROMISO_OBS = ["cumplido", "no_cumplido"] as const;
export type ResultadoCompromisoObs = (typeof RESULTADOS_COMPROMISO_OBS)[number];

export const CANTIDAD_DESEMPENOS = 5;
export const NIVELES = [1, 2, 3, 4] as const;
export type Nivel = (typeof NIVELES)[number];
export const NIVEL_ROMANO: Record<Nivel, string> = { 1: "I", 2: "II", 3: "III", 4: "IV" };
export const NIVEL_NOMBRE: Record<Nivel, string> = {
  1: "Muy deficiente",
  2: "En proceso",
  3: "Suficiente",
  4: "Destacado",
};
/** Etiqueta informativa del instructivo; no es una nota. */
export const nivelGrupo = (nivel: number): "insatisfactorio" | "satisfactorio" =>
  nivel <= 2 ? "insatisfactorio" : "satisfactorio";

export const DURACION_HABITUAL_MIN = 45;
export const DURACION_HABITUAL_MAX = 90;

export const VARIABLES_OBSERVACION = {
  ANTICIPACION: "observacion.anticipacion_minima_dias",
  CANTIDAD_OBJETIVO: "observacion.cantidad_objetivo_anual",
  PLAZO_DESCARGO: "observacion.plazo_descargo_dias",
} as const;
export const ANTICIPACION_POR_DEFECTO = 2;
export const CANTIDAD_OBJETIVO_POR_DEFECTO = 2;
export const PLAZO_DESCARGO_POR_DEFECTO = 7;

export const ROL_DIRECTOR = "Director";
export const ROL_ADMINISTRADOR = "Administrador";
/** Quienes corrigen lo ya cerrado (RF-023, «Quién corrige»). */
export const ROLES_CORRIGEN = [ROL_DIRECTOR, ROL_ADMINISTRADOR] as const;

export const ARCHIVO_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;
export const ARCHIVO_TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

export const QUEUE_JOB_RECORDAR_COMPROMISOS_OBS = "recordar-compromisos-observacion";
/** Todos los días a las 6:45 (hora de Lima). */
export const CRON_RECORDAR_COMPROMISOS_OBS = "45 6 * * *";

export const MENSAJES_OBSERVACION = {
  ANTICIPACION: (dias: number) =>
    `La observación debe programarse con al menos ${dias} días de anticipación.`,
  OBSERVADOR_PROPIO: "No puede observar su propia clase.",
  OBSERVADOR_SIN_OPCION: "El observador elegido no tiene la opción «Observaciones de aula».",
  CRUCE: "El observador ya tiene una observación programada en ese horario.",
  BIMESTRE_CERRADO:
    "El bimestre está cerrado. No se pueden programar ni modificar observaciones en él.",
  SIN_BIMESTRE: "La fecha no pertenece a ningún bimestre del año lectivo.",
  SIN_MOTIVO: "Indique el motivo.",
  SIN_HORARIO: "El docente no dicta ese curso en esa fecha. Revise el horario.",
  HORARIO_AMBIGUO:
    "El docente dicta ese curso en más de un bloque ese día. Indique la hora de inicio.",
  SIN_INSTRUMENTO: "No hay una versión vigente del instrumento de observación.",
  NO_ENCONTRADA: "Observación no encontrada.",
  DOCENTE_NO_ENCONTRADO: "Docente no encontrado.",
  NO_TIENE_PERMISO: "No tiene permiso para realizar esta acción.",
  SOLO_PROGRAMADA: "Solo se puede hacer con una observación programada.",
  SOLO_EL_DIA: "Solo se puede iniciar la observación el día programado.",
  NOTA_VACIA: "Escriba la conducta observada. No se aceptan calificaciones en las notas.",
  NOTAS_NO_ABIERTAS: "La toma de notas no está abierta.",
  CERRAR_NOTAS_PRIMERO: "Cierre la toma de notas para poder calificar.",
  NOTAS_CERRADAS: "Toma de notas cerrada. Ya puede calificar la observación.",
  HORA_FIN_INVALIDA: "La hora de fin debe ser posterior a la de inicio.",
  FUNDAMENTO: "Explique el fundamento del nivel con base en las notas.",
  NIVEL_INVALIDO: "El nivel debe ser I, II, III o IV.",
  DESEMPENO_INVALIDO: "El desempeño debe estar entre 1 y 5.",
  CALIFICACION_INCOMPLETA: "Califique los 5 desempeños para cerrar la calificación.",
  SIN_EVIDENCIAS: "No hay notas en este desempeño; se requiere el fundamento de todas formas.",
  NO_CALIFICABLE: "La observación no está en etapa de calificación.",
  YA_CALIFICADA: "La calificación ya está cerrada. Solo el Director puede corregirla.",
  SOLO_DIRECTOR: "Solo el Director puede corregir esta etapa.",
  MOTIVO_CAMBIO: "Indique el motivo del cambio.",
  SIN_CAMBIOS: "No hay cambios que guardar.",
  RETRO_NO_DISPONIBLE: "Registre la retroalimentación sobre una observación calificada.",
  RETRO_SIN_REUNION: "Registre la reunión antes de agregar compromisos.",
  COMPROMISO_INCOMPLETO: "Indique el desempeño, el compromiso y la fecha de revisión.",
  REVISION_ANTERIOR: "La fecha de revisión debe ser posterior a la reunión.",
  RETRO_SIN_COMPROMISOS:
    "Agregue al menos un compromiso, o confirme que no hace falta ninguno cuando todos los desempeños están en nivel IV.",
  RETRO_REGISTRADA: "Retroalimentación registrada. El docente ya puede ver su observación.",
  COMPROMISO_NO_ENCONTRADO: "Compromiso no encontrado.",
  COMPROMISO_CERRADO: "El compromiso ya fue cerrado.",
  SOLO_RETROALIMENTADA: "La observación aún no está retroalimentada.",
  NO_VISIBLE: "Esta observación se mostrará cuando se haya realizado la retroalimentación.",
  ENTERADO: "Quedó registrado su enterado.",
  COMENTARIO_REGISTRADO: "Su comentario fue registrado.",
  COMENTARIO_REPETIDO: "Ya dejó su comentario para esta observación.",
  COMENTARIO_VACIO: "Escriba su comentario.",
  ARCHIVO_INVALIDO: "El archivo debe ser PDF, PNG o JPG de hasta 5 MB.",
  SIN_OBSERVACIONES: "Este docente aún no tiene observaciones en el año.",
  INSTRUMENTO_INCOMPLETO:
    "El instrumento debe tener los 5 desempeños, con 4 niveles y la descripción de cada nivel.",
  INSTRUMENTO_NO_ENCONTRADO: "Versión del instrumento no encontrada.",
  INSTRUMENTO_CODIGO_REPETIDO: "Ya existe una versión del instrumento con ese código.",
  SIN_ANIO: "No hay un año lectivo de trabajo.",
} as const;

const dd = (fecha: string) => fecha.split("-").reverse().join("/");

export const mensajeProgramada = (fecha: string, hora: string): string =>
  `Observación programada para el ${dd(fecha)} a las ${hora.slice(0, 5)}. Se avisó al docente.`;
export const mensajeReprogramada = (fecha: string): string =>
  `Observación reprogramada para el ${dd(fecha)}. Se avisó al docente.`;
export const mensajeDuracionFuera = (minutos: number): string =>
  `La observación duró ${minutos} minutos; lo habitual es entre ${DURACION_HABITUAL_MIN} y ${DURACION_HABITUAL_MAX}.`;
export const mensajeNuevaVersion = (version: number): string =>
  `Se generó la versión ${version} de la calificación.`;
export const mensajeCompromisoCerradoObs = (resultado: ResultadoCompromisoObs): string =>
  resultado === "cumplido"
    ? "Compromiso marcado como cumplido."
    : "Compromiso marcado como no cumplido. Se sugiere programar una reobservación.";
export const mensajePlazoVencido = (fechaLimite: string): string =>
  `El plazo para dejar su comentario venció el ${dd(fechaLimite)}.`;
export const mensajeRecordatorioRevision = (docente: string, compromiso: string): string =>
  `Hoy se revisa el compromiso de ${docente}: ${compromiso}`.slice(0, 500);
