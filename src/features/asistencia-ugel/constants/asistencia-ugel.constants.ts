/** RF-025: reporte mensual de asistencia a la UGEL (RSG 326-2017-MINEDU y RSG 121-2018-MINEDU). */

/**
 * Leyenda del Anexo 03. El modificado por la RSG 121-2018 no tiene 3T: solo se muestra si la
 * UGEL lo pide y se activa en Variables.
 */
export const LEYENDA_ANEXO_03 = [
  ["A", "Día laborado"],
  ["I", "Inasistencia injustificada"],
  ["3T", "Tercera tardanza, considerada como inasistencia injustificada"],
  ["J", "Inasistencia justificada (licencia, permiso, vacaciones)"],
  ["L", "Licencia sin goce de remuneraciones"],
  ["P", "Permiso sin goce de remuneraciones"],
  ["T", "Tardanza"],
  ["H", "Huelga o paro"],
] as const;

export type CodigoDia = (typeof LEYENDA_ANEXO_03)[number][0] | "";

export const leyendaAnexo03 = (conTerceraTardanza: boolean) =>
  LEYENDA_ANEXO_03.filter(([codigo]) => conTerceraTardanza || codigo !== "3T");

/** Justificaciones que se registran y el código con que salen en el Anexo 03. */
export const TIPOS_NOVEDAD = {
  licencia_con_goce: { etiqueta: "Licencia con goce", codigo: "J" },
  licencia_sin_goce: { etiqueta: "Licencia sin goce de remuneraciones", codigo: "L" },
  permiso_con_goce: { etiqueta: "Permiso con goce", codigo: "J" },
  permiso_sin_goce: { etiqueta: "Permiso sin goce de remuneraciones", codigo: "P" },
  vacaciones: { etiqueta: "Vacaciones", codigo: "J" },
  huelga: { etiqueta: "Huelga o paro", codigo: "H" },
  // RM 239-2025: las semanas de gestión pueden ser virtuales.
  trabajo_remoto: { etiqueta: "Trabajo virtual en día sin clases", codigo: "A" },
  // 6.1.5: queda justificada solo la marca omitida que se indique.
  omision_justificada: { etiqueta: "Omisión de marca justificada", codigo: null },
} as const;

export type TipoNovedad = keyof typeof TIPOS_NOVEDAD;
export const CODIGOS_TIPO_NOVEDAD = Object.keys(TIPOS_NOVEDAD) as TipoNovedad[];

/** Tipos que se conceden por un solo día. */
export const TIPOS_DE_UN_DIA: readonly TipoNovedad[] = [
  "permiso_con_goce",
  "permiso_sin_goce",
  "omision_justificada",
];

export const VARIABLES_REPORTE = {
  TARDANZAS_PARA_INASISTENCIA: { codigo: "asistencia.tardanzas_para_inasistencia", porDefecto: 0 },
  INCOMPLETA_ES_INASISTENCIA: {
    codigo: "asistencia.marca_incompleta_es_inasistencia",
    porDefecto: true,
  },
  OMISIONES_POR_MES: { codigo: "asistencia.omisiones_justificables_mes", porDefecto: 1 },
  HORAS_PARA_JUSTIFICAR: { codigo: "asistencia.horas_para_justificar_omision", porDefecto: 24 },
  NIVEL_MODALIDAD: { codigo: "asistencia.reporte_nivel_modalidad", porDefecto: "EBR - Secundaria" },
  TURNO: { codigo: "asistencia.reporte_turno", porDefecto: "Mañana" },
} as const;

export const MENSAJES_REPORTE = {
  SIN_TURNO_DOCENTES:
    "Configure y active el turno de docentes en Turnos antes de generar el reporte.",
  MES_FUTURO: "Todavía no empieza el mes pedido.",
  PERSONA_NO_ES_PERSONAL: "La persona no es docente ni auxiliar de educación.",
  RANGO_INVALIDO: "La fecha final no puede ser anterior a la inicial.",
  UN_SOLO_DIA: "Este tipo se registra por un solo día.",
  FALTAN_MINUTOS: "Indique los minutos del permiso sin goce (los pide el Anexo 04).",
  CRUCE: "La persona ya tiene una justificación en esas fechas.",
  FALTA_PRESENTACION: "Indique cuándo se presentó el sustento de la omisión.",
  PRESENTACION_FUTURA: "La presentación del sustento no puede ser futura ni anterior a la omisión.",
  PRESENTACION_FUERA_DE_PLAZO: (horas: number) =>
    `El sustento se presentó después del plazo de ${horas} horas.`,
  LIMITE_OMISIONES: (limite: number) =>
    `Ya se usó el límite de ${limite} omisión(es) justificada(s) en el mes.`,
  NOVEDAD_NO_ENCONTRADA: "Justificación no encontrada.",
  YA_ANULADA: "La justificación ya está anulada.",
  FALTA_MARCA_OMITIDA: "Indique si faltó la marca de ingreso o la de salida.",
  OMISION_SIN_HORARIO: "Ese día la persona no tiene un turno activo.",
  REMOTO_CON_CLASES:
    "El trabajo virtual solo se registra en días sin clases en los que el personal trabaja. Revise el Calendario.",
  GUARDADA: "Justificación registrada.",
  ANULADA: "Justificación anulada.",
} as const;
