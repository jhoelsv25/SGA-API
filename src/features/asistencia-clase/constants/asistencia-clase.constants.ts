export const ESTADOS_ASISTENCIA = ["presente", "tardanza", "falta", "falta_justificada"] as const;
export type EstadoAsistencia = (typeof ESTADOS_ASISTENCIA)[number];

/** Estados que el docente puede marcar; la justificación la hace Secretaría o el tutor. */
export const ESTADOS_MARCABLES_DOCENTE = ["presente", "tardanza", "falta"] as const;
export type EstadoMarcableDocente = (typeof ESTADOS_MARCABLES_DOCENTE)[number];

/** Roles que consultan y justifican sin ser docente de la sección. */
export const ROLES_CONSULTA_ASISTENCIA = [
  "Administrador",
  "Director",
  "Subdirector",
  "Secretaria",
] as const;
export const ROLES_JUSTIFICAN_FALTA = ["Administrador", "Secretaria"] as const;

export const MENSAJES_ASISTENCIA = {
  FUERA_DE_PLAZO: "La asistencia de esta sesión ya no se puede modificar.",
  SESION_AJENA: "Solo el docente que dicta la sesión puede tomar su asistencia.",
  SESION_NO_ENCONTRADA: "La sesión no existe.",
  SESION_SIN_FIRMA: "Firme el ingreso de la sesión antes de tomar su asistencia.",
  ASISTENCIA_NO_ENCONTRADA: "El registro de asistencia no existe.",
  SOLO_FALTA_SE_JUSTIFICA: "Solo se puede justificar una falta.",
  MOTIVO_REQUERIDO: "Indique el motivo de la justificación.",
  SIN_PERMISO_JUSTIFICAR:
    "Solo la Secretaria o el tutor de la sección pueden justificar una falta.",
  SIN_PERMISO_CONSULTA: "No tiene permiso para consultar la asistencia de este estudiante.",
  SIN_PERMISO_SECCION: "Solo el tutor de la sección puede consultar su asistencia.",
  ESTUDIANTE_NO_ENCONTRADO: "El estudiante no existe.",
  SECCION_NO_ENCONTRADA: "La sección no existe.",
  MATRICULA_NO_VIGENTE: "El estudiante no tiene matrícula en esa sección.",
  RANGO_INVALIDO: "La fecha de fin debe ser posterior al inicio.",
  ESTUDIANTE_FUERA_DE_LISTA: "Un estudiante enviado no tiene matrícula vigente en la sección.",
} as const;

const plural = (n: number, singular: string, pluralForma: string): string =>
  `${n} ${n === 1 ? singular : pluralForma}`;

export const mensajeAsistenciaGuardada = (
  presentes: number,
  tardanzas: number,
  faltas: number,
): string =>
  `Asistencia guardada: ${plural(presentes, "presente", "presentes")}, ${plural(
    tardanzas,
    "tardanza",
    "tardanzas",
  )}, ${plural(faltas, "falta", "faltas")}.`;
