import {
  MENU_AUSENCIAS_DOCENTES,
  MENU_CONSOLIDADOS_DOCENTES,
  MENU_INDICADORES,
  MENU_INFORME_HORAS_EFECTIVAS,
  MENU_JUSTIFICACIONES_SESION,
  MENU_MIS_AUSENCIAS,
  MENU_MIS_INDICADORES,
  MENU_MIS_OBSERVACIONES,
  MENU_MIS_SESIONES,
  MENU_MI_SEGUIMIENTO,
  MENU_OBSERVACIONES_AULA,
  MENU_PENDIENTES_SEGUIMIENTO,
  MENU_SESIONES_HOY,
} from "../../common/constants";

/**
 * Matriz de accesos del grupo «Seguimiento docente» (RF-021 V2, alineada con el catálogo de
 * RF-002 V5). Es la carga inicial de Roles-Menú: el Administrador la puede ajustar y él ve todo
 * por regla del servicio de menús, por eso no figura en `roles`.
 *
 * `habilitada: false` = la opción aún no tiene endpoint: el seed no la registra para no dejar
 * un enlace roto. Hoy todas están habilitadas (RF-023 V1 ya tiene su API; ver P-78).
 */
export interface MenuSeguimientoDocente {
  nombre: string;
  ruta: string;
  icono: string;
  orden: number;
  roles: readonly string[];
  habilitada: boolean;
}

const DIRECCION = ["Director", "Subdirector"] as const;

export const MENUS_SEGUIMIENTO_DOCENTE: readonly MenuSeguimientoDocente[] = [
  {
    nombre: "Sesiones de hoy",
    ruta: MENU_SESIONES_HOY,
    icono: "Clock01Icon",
    orden: 1,
    roles: DIRECCION,
    habilitada: true,
  },
  {
    nombre: "Justificaciones de sesiones",
    ruta: MENU_JUSTIFICACIONES_SESION,
    icono: "CheckmarkCircle02Icon",
    orden: 2,
    // RF-002 V5, RF-011 V3: el Director la ve (consulta); solo el Subdirector aprueba o rechaza.
    roles: DIRECCION,
    habilitada: true,
  },
  {
    nombre: "Mis sesiones",
    ruta: MENU_MIS_SESIONES,
    icono: "BookOpen01Icon",
    orden: 3,
    roles: ["Docente"],
    habilitada: true,
  },
  {
    nombre: "Ausencias docentes",
    ruta: MENU_AUSENCIAS_DOCENTES,
    icono: "UserGroupIcon",
    orden: 4,
    roles: DIRECCION,
    habilitada: true,
  },
  {
    nombre: "Mis ausencias",
    ruta: MENU_MIS_AUSENCIAS,
    icono: "Task01Icon",
    orden: 5,
    roles: ["Docente"],
    habilitada: true,
  },
  {
    nombre: "Consolidados docentes",
    ruta: MENU_CONSOLIDADOS_DOCENTES,
    icono: "ChartBarLineIcon",
    orden: 6,
    roles: DIRECCION,
    habilitada: true,
  },
  {
    nombre: "Mi seguimiento",
    ruta: MENU_MI_SEGUIMIENTO,
    icono: "File02Icon",
    orden: 7,
    roles: ["Docente"],
    habilitada: true,
  },
  {
    nombre: "Pendientes de seguimiento",
    ruta: MENU_PENDIENTES_SEGUIMIENTO,
    icono: "Task01Icon",
    orden: 8,
    roles: DIRECCION,
    habilitada: true,
  },
  {
    nombre: "Informe mensual de horas efectivas",
    ruta: MENU_INFORME_HORAS_EFECTIVAS,
    icono: "File02Icon",
    orden: 9,
    roles: DIRECCION,
    habilitada: true,
  },
  {
    nombre: "Observaciones de aula",
    ruta: MENU_OBSERVACIONES_AULA,
    icono: "Task01Icon",
    orden: 10,
    roles: DIRECCION,
    habilitada: true,
  },
  {
    nombre: "Mis observaciones",
    ruta: MENU_MIS_OBSERVACIONES,
    icono: "File02Icon",
    orden: 11,
    roles: ["Docente"],
    habilitada: true,
  },
  {
    nombre: "Indicadores",
    ruta: MENU_INDICADORES,
    icono: "ChartBarLineIcon",
    orden: 12,
    roles: DIRECCION,
    habilitada: true,
  },
  {
    nombre: "Mis indicadores",
    ruta: MENU_MIS_INDICADORES,
    icono: "File02Icon",
    orden: 13,
    roles: ["Docente"],
    habilitada: true,
  },
];

/** Roles que ven una opción del grupo según la matriz (sin el Administrador, que ve todo). */
export function rolesDeOpcion(ruta: string): readonly string[] {
  return MENUS_SEGUIMIENTO_DOCENTE.find((m) => m.ruta === ruta)?.roles ?? [];
}
