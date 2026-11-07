/**
 * RF-002 V3: rutas de opciones del menú que el servidor valida con @MenuAccess.
 * Deben coincidir con las rutas que crea el seed.
 */
export const MENU_CORREGIR_DATOS_CRITICOS = "/personas/corregir-datos-criticos";

/**
 * RF-008: opciones de menú para organización escolar (las escrituras exigen este menú).
 */
export const MENU_SECCIONES = "/admin/secciones";
export const MENU_HORARIOS = "/admin/horarios";
export const MENU_MI_HORARIO = "/admin/mi-horario";

/**
 * RF-010: marcación y asistencia de estudiantes.
 */
export const MENU_MARCACIONES_HOY = "/admin/marcaciones-hoy";
export const MENU_MARCACION_MANUAL = "/admin/marcacion-manual";
export const MENU_ASISTENCIA_CLASE = "/admin/asistencia";
export const MENU_ASISTENCIA_SECCION = "/admin/asistencia-seccion";
export const MENU_MI_ASISTENCIA = "/admin/mi-asistencia";

/**
 * RF-022: integración con biométrico ZKTeco.
 */
export const MENU_MARCACIONES_PENDIENTES = "/admin/marcaciones-pendientes";

/**
 * RF-011: registro de sesión de clase.
 */
export const MENU_SESIONES_HOY = "/admin/sesiones-hoy";
export const MENU_JUSTIFICACIONES_SESION = "/admin/justificaciones-sesion";
export const MENU_MIS_SESIONES = "/admin/mis-sesiones";

/**
 * RF-015: aula virtual (unidades y materiales de reforzamiento).
 */
export const MENU_AULA_VIRTUAL = "/admin/aula-virtual";
export const MENU_SOLICITUDES_CAMBIO_FECHA = "/admin/solicitudes-cambio-fecha";
export const MENU_MATERIALES_BIMESTRE = "/admin/materiales-bimestre";

/**
 * RF-014: libretas del SIAGIE.
 */
export const MENU_LIBRETAS = "/admin/libretas";
export const MENU_MIS_LIBRETAS = "/admin/mis-libretas";

/**
 * RF-012: supervisión y ausencias del docente.
 */
export const MENU_AUSENCIAS_DOCENTES = "/admin/ausencias-docentes";
export const MENU_MIS_AUSENCIAS = "/admin/mis-ausencias";

/**
 * RF-013: consolidado y ficha de seguimiento docente.
 */
export const MENU_CONSOLIDADOS_DOCENTES = "/admin/consolidados-docentes";
export const MENU_MI_SEGUIMIENTO = "/admin/mi-seguimiento";

/**
 * RF-020: indicadores de la tesis y panel general.
 */
export const MENU_INDICADORES = "/admin/indicadores";
export const MENU_MIS_INDICADORES = "/admin/mis-indicadores";

/**
 * Opciones propias de la aplicación de escritorio (`menus.aplicaciones` = escritorio).
 * La ruta es la de la página en esa aplicación; el portal web no las muestra.
 */
export const MENU_ESCRITORIO_BIOMETRICOS = "/biometricos";
