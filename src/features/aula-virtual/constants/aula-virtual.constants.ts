/**
 * Constantes y mensajes del aula virtual (RF-015: unidades y materiales de reforzamiento).
 */

export const TIPOS_MATERIAL = [
  "documento",
  "presentacion",
  "hoja_calculo",
  "imagen",
  "audio",
  "video",
  "enlace",
] as const;
export type TipoMaterial = (typeof TIPOS_MATERIAL)[number];

/** Extensiones permitidas por tipo de material (en minúsculas, con punto). */
export const EXTENSIONES_POR_TIPO: Record<Exclude<TipoMaterial, "enlace">, readonly string[]> = {
  documento: [".pdf", ".doc", ".docx"],
  presentacion: [".ppt", ".pptx", ".pdf"],
  hoja_calculo: [".xls", ".xlsx"],
  imagen: [".png", ".jpg", ".jpeg"],
  audio: [".mp3"],
  video: [".mp4"],
};

export const VARIABLES_MATERIAL = {
  DIAS_PLANIFICACION: "material.dias_planificacion",
  TAMANO_MAXIMO_MB: "material.tamano_maximo_mb",
} as const;

export const DIAS_PLANIFICACION_POR_DEFECTO = 7;
export const TAMANO_MAXIMO_MB_POR_DEFECTO = 50;
/** Tope duro de multer: el límite de negocio sale de la variable `material.tamano_maximo_mb`. */
export const LIMITE_DURO_SUBIDA_BYTES = 500 * 1024 * 1024;

export const ROLES_SEGUIMIENTO_MATERIALES = ["Administrador", "Director", "Subdirector"] as const;
export const ROLES_NOTIFICADOS_SOLICITUD = ["Subdirector"] as const;

export const ESTADOS_SOLICITUD_FECHA = ["solicitada", "aprobada", "rechazada"] as const;
export type EstadoSolicitudFecha = (typeof ESTADOS_SOLICITUD_FECHA)[number];

export const CARPETA_MATERIALES = "materiales";

export const MENSAJES_AULA_VIRTUAL = {
  AULA_AJENA: "Solo el docente asignado puede administrar esta aula virtual.",
  AULA_NO_ENCONTRADA: "El aula virtual no existe.",
  SIN_ACCESO_AULA: "No tiene acceso a esta aula virtual.",
  UNIDAD_NO_ENCONTRADA: "La unidad no existe.",
  MATERIAL_NO_ENCONTRADO: "El material no existe.",
  SOLICITUD_NO_ENCONTRADA: "La solicitud de cambio de fecha no existe.",
  BIMESTRE_NO_ENCONTRADO: "El bimestre no existe.",
  BIMESTRE_AJENO: "El bimestre no pertenece al año escolar de este curso.",
  FECHAS_UNIDAD_INVERTIDAS:
    "La fecha de fin de la unidad debe ser igual o posterior a la de inicio.",
  FECHA_FUERA_BIMESTRE: "La fecha programada debe estar dentro del bimestre.",
  FECHA_MUY_CERCANA: (dias: number) =>
    `Fuera de la semana de planificación, la fecha programada debe ser al menos ${dias} días después de hoy.`,
  FECHA_CONGELADA: "La fecha programada está congelada. Solicite el cambio al Subdirector.",
  FECHA_NO_CONGELADA: "La fecha programada aún no está congelada: edítela directamente.",
  FECHA_REQUERIDA: "Indique la fecha programada del material.",
  BLOQUE_CLASE_REQUERIDO: "Indique la fecha de la clase del bloque elegido.",
  BLOQUE_AJENO: "El bloque del horario no pertenece a este curso.",
  FECHA_NO_COINCIDE_BLOQUE: "La fecha elegida no corresponde al día de la semana del bloque.",
  SOLICITUD_ENVIADA: "Su solicitud de cambio de fecha fue enviada al Subdirector.",
  MOTIVO_REQUERIDO: "Indique el motivo del cambio de fecha.",
  SOLICITUD_REPETIDA: "Ya tiene una solicitud pendiente para este material.",
  SOLICITUD_RESUELTA: "La solicitud ya fue atendida.",
  RESPUESTA_REQUERIDA: "Indique la respuesta para el docente.",
  SOLO_PLANIFICADOS: "Solo los materiales planificados tienen fecha programada.",
  PUBLICADO_A_TIEMPO: "Material publicado a tiempo.",
  MATERIAL_EXTRA_PUBLICADO: "Material extra publicado. No cuenta en el IGM.",
  ARCHIVO_REQUERIDO: "Adjunte el archivo del material.",
  YA_PUBLICADO: "El material ya está publicado: use reemplazar.",
  NO_PUBLICADO: "El material aún no está publicado.",
  MATERIAL_RETIRADO: "El material está retirado.",
  SOLO_PUBLICADO_SE_RETIRA: "Solo se puede retirar un material ya publicado.",
  ARCHIVO_MUY_PESADO: (maximoMb: number) => `El archivo supera el máximo de ${maximoMb} MB.`,
  FORMATO_NO_PERMITIDO: "Formato no permitido para el tipo de material elegido.",
  ENLACE_INVALIDO: "Ingrese un enlace válido que empiece con http:// o https://.",
  BIMESTRE_CERRADO:
    "El bimestre está cerrado. Ya no se pueden planificar materiales ni cambiar fechas.",
} as const;

export const mensajePlanificado = (fechaDdMmAaaa: string): string =>
  `Material planificado para el ${fechaDdMmAaaa}.`;

export const mensajeFueraDePlazo = (fechaDdMmAaaa: string): string =>
  `Material publicado fuera de plazo (fecha programada: ${fechaDdMmAaaa}).`;

/**
 * Constantes y mensajes de tareas, entregas y calificación (RF-016).
 */
export const TIPOS_TAREA = ["trabajo", "proyecto", "cuestionario", "examen"] as const;
export type TipoTarea = (typeof TIPOS_TAREA)[number];

export const TIPOS_PREGUNTA = ["opcion_unica", "opcion_multiple", "respuesta_corta"] as const;
export type TipoPregunta = (typeof TIPOS_PREGUNTA)[number];

export const CALCULOS_NOTA_INTENTOS = ["mas_alta", "ultima", "promedio"] as const;
export type CalculoNotaIntentos = (typeof CALCULOS_NOTA_INTENTOS)[number];

export const REVELAR_RESPUESTAS = [
  "al_terminar_intentos",
  "despues_fecha_limite",
  "inmediato",
  "nunca",
] as const;
export type RevelarRespuestas = (typeof REVELAR_RESPUESTAS)[number];

export const ESTADOS_TAREA = ["borrador", "publicada", "cerrada"] as const;
export type EstadoTarea = (typeof ESTADOS_TAREA)[number];

export const ESTADOS_ENTREGA = [
  "en_progreso",
  "borrador",
  "entregada",
  "calificada",
  "devuelta",
] as const;
export type EstadoEntrega = (typeof ESTADOS_ENTREGA)[number];

export const VARIABLES_NOTA_PESO = {
  EXAMEN: "nota.peso_examen",
  CUESTIONARIO: "nota.peso_cuestionario",
  TRABAJO: "nota.peso_trabajo",
  PROYECTO: "nota.peso_proyecto",
} as const;

export const MENSAJES_TAREA = {
  PUBLICADA: "Tarea publicada. Se notificó a los estudiantes.",
  FECHA_LIMITE_INVALIDA: "La fecha límite debe ser posterior a la fecha de publicación.",
  CUESTIONARIO_SIN_PREGUNTAS: "Agregue al menos una pregunta antes de publicar.",
  PREGUNTA_SIN_CORRECTA: "Marque al menos una opción correcta en cada pregunta cerrada.",
  ENTREGA_ENVIADA: "Tu entrega fue enviada.",
  INTENTO_CALIFICADO: (nota: string, restantes: number) =>
    `Obtuviste ${nota} de 20. Te quedan ${restantes} intentos.`,
  SIN_INTENTOS: "Ya usaste todos tus intentos.",
  FUERA_DE_PLAZO: "La fecha límite ya pasó. Esta tarea no acepta entregas tardías.",
  ENTREGA_TARDIA: "Tu entrega fue enviada fuera de plazo.",
  FORMATO_NO_PERMITIDO: "Formato de archivo no permitido para esta tarea.",
  NOTA_FUERA_DE_RANGO: "La nota debe estar entre 0 y 20.",
  ENTREGA_YA_CALIFICADA:
    "La entrega ya fue calificada. Pide al docente que te la devuelva para corregir.",
  TIEMPO_AGOTADO: "Se agotó el tiempo. Tu intento se envió con las respuestas marcadas.",
  BIMESTRE_CERRADO: "El bimestre está cerrado. Las notas ya no se pueden modificar.",
  TAREA_NO_ENCONTRADA: "La tarea no existe.",
  ENTREGA_NO_ENCONTRADA: "La entrega no existe.",
  MOTIVO_DEVOLUCION_REQUERIDO: "Indique la retroalimentación para devolver la entrega.",
  TRABAJO_SIN_INTENTOS:
    "El sistema no ofrece varios intentos para trabajos o proyectos porque tienen una sola entrega editable.",
} as const;

export const JOB_RECORDATORIO_TAREAS = "verificar-recordatorios-tareas";
export const CRON_RECORDATORIO_TAREAS = "*/5 * * * *"; // Cada 5 minutos en horario escolar

/**
 * Constantes y mensajes de interacción y actividad del curso (RF-017).
 */
export const TAMANO_MAXIMO_ADJUNTO_INTERACCION_BYTES = 10 * 1024 * 1024; // 10 MB
export const MINUTOS_MAXIMO_EDICION_INTERACCION = 15;

export const CARPETA_INTERACCION = "interaccion";

export const TIPOS_MODERACION = ["publicacion", "comentario", "chat"] as const;
export type TipoModeracion = (typeof TIPOS_MODERACION)[number];

export const ACCIONES_ACTIVIDAD_AULA = ["visualizo", "descargo", "abrio", "completo"] as const;
export type AccionActividadAula = (typeof ACCIONES_ACTIVIDAD_AULA)[number];

export const MENSAJES_INTERACCION = {
  PUBLICACION_VACIA: "Escriba un texto o agregue un adjunto.",
  ADJUNTO_MUY_PESADO: "El adjunto supera el máximo de 10 MB.",
  EDICION_FUERA_DE_PLAZO: "Solo puede editar dentro de los 15 minutos de publicado.",
  MOTIVO_REQUERIDO: "Indique el motivo para ocultar el contenido.",
  CONTENIDO_OCULTADO: "El contenido se ocultó para los estudiantes.",
  CONTENIDO_RESTAURADO: "El contenido volvió a estar visible.",
  SIN_ACCESO: "No participa en esta aula virtual.",
  ANIO_CERRADO: "El año escolar está cerrado. El muro y el chat son de solo lectura.",
  PUBLICACION_NO_ENCONTRADA: "La publicación no existe.",
  COMENTARIO_NO_ENCONTRADO: "El comentario no existe.",
  MENSAJE_NO_ENCONTRADO: "El mensaje no existe.",
  SOLO_DOCENTE_FIJA: "Solo el docente asignado puede fijar publicaciones.",
  SOLO_DOCENTE_MODERA: "Solo el docente puede moderar el contenido del curso.",
  SOLO_AUTOR_EDITA: "Solo el autor puede editar su contenido dentro del plazo permitido.",
} as const;
