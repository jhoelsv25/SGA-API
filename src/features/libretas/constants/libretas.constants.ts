export const MAX_ARCHIVOS_POR_CARGA = 50;
export const MAX_BYTES_PDF = 5 * 1024 * 1024;
export const CARPETA_LIBRETAS = "libretas";

export const ALCANCES_LIBRETA = ["tutoria", "mis_secciones", "colegio"] as const;
export const ESTADOS_LIBRETA = ["pendiente", "a_tiempo", "fuera_de_plazo"] as const;

export const ROLES_PROGRAMAN = ["director", "subdirector", "administrador"] as const;
export const ROLES_HISTORIAL = ["director", "subdirector", "administrador"] as const;

export const MENSAJES_LIBRETAS = {
  ARCHIVO_INVALIDO: "Solo se aceptan archivos PDF de hasta 5 MB.",
  DEMASIADOS_ARCHIVOS: "Puede subir hasta 50 archivos por carga.",
  CODIGO_NO_RECONOCIDO:
    "No se encontró el código del estudiante en el archivo. Asígnelo manualmente.",
  SIN_PROGRAMAR: "El bimestre aún no tiene libretas programadas.",
  REEMPLAZO_SIN_MOTIVO: "Indique el motivo del reemplazo.",
  SIN_PERMISO_SECCION: "No tiene permiso para subir libretas de esta sección.",
  YA_PROGRAMADO: "El bimestre ya tiene libretas programadas.",
  SIN_PENDIENTES: "No hay libretas pendientes para cambiar la fecha límite.",
  SIN_ASIGNADAS: "No hay libretas asignadas para publicar.",
  SIN_ARCHIVOS: "Seleccione al menos un archivo PDF.",
  LIBRETA_NO_ENCONTRADA: "No se encontró la libreta.",
  ACCESO_DENEGADO: "No tiene acceso a esta libreta.",
  HISTORIAL_DENEGADO: "No tiene permiso para ver el historial de libretas.",
  PROGRAMAR_DENEGADO: "No tiene permiso para programar libretas.",
  ALCANCE_DENEGADO: "No tiene permiso para cambiar el alcance de las libretas.",
  PERIODO_NO_ENCONTRADO: "No se encontró el bimestre.",
  ANIO_NO_DISPONIBLE: "No hay un año lectivo en curso.",
  ASIGNACION_INVALIDA: "La asignación manual no corresponde a un archivo sin reconocer.",
} as const;

export function mensajeProgramadas(
  cantidad: number,
  bimestre: string,
  fechaLimite: string,
): string {
  return `Se programaron ${cantidad} libretas del ${bimestre} con fecha límite ${fechaLimite}.`;
}

export function mensajeVistaPrevia(
  asignadas: number,
  sinReconocer: number,
  otraSeccion: number,
): string {
  return `${asignadas} libretas asignadas, ${sinReconocer} sin reconocer, ${otraSeccion} de otra sección.`;
}

export function mensajePublicadas(cantidad: number): string {
  return `Se publicaron ${cantidad} libretas. Se notificó a los estudiantes y apoderados.`;
}

export function mensajeOtraSeccion(nombre: string): string {
  return `El estudiante ${nombre} no pertenece a esta sección.`;
}

export function mensajeNoDisponible(bimestre: string): string {
  return `Tu libreta del ${bimestre} aún no está disponible.`;
}
