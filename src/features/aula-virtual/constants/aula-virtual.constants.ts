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
