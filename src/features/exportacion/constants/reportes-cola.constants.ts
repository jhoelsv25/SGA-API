import { join } from "path";

export const TIPOS_REPORTE_COLA = [
  "matriculas",
  "marcaciones",
  "libretas",
  "asistencia-seccion",
  "asistencia-personal",
  "personas",
  "estudiantes",
  "docentes",
  "apoderados",
  "usuarios",
] as const;

export type TipoReporteCola = (typeof TIPOS_REPORTE_COLA)[number];

export const ROLES_POR_TIPO_REPORTE: Record<TipoReporteCola, readonly string[]> = {
  matriculas: ["Administrador", "Secretaria", "Director", "Subdirector"],
  marcaciones: ["Administrador", "Secretaria", "Director", "Subdirector", "Auxiliar"],
  libretas: ["Administrador", "Secretaria", "Director", "Subdirector", "Docente"],
  "asistencia-seccion": [
    "Administrador",
    "Secretaria",
    "Director",
    "Subdirector",
    "Auxiliar",
    "Docente",
  ],
  "asistencia-personal": ["Administrador", "Secretaria", "Director", "Subdirector", "Auxiliar"],
  personas: ["Administrador", "Secretaria"],
  estudiantes: ["Administrador", "Secretaria"],
  docentes: ["Administrador", "Secretaria"],
  apoderados: ["Administrador", "Secretaria"],
  usuarios: ["Administrador"],
};

export const ETIQUETA_TIPO_REPORTE: Record<TipoReporteCola, string> = {
  matriculas: "Nómina Oficial de Matrículas",
  marcaciones: "Marcaciones de Puerta",
  libretas: "Seguimiento de Libretas SIAGIE",
  "asistencia-seccion": "Asistencia Consolidada de Estudiantes",
  "asistencia-personal": "Asistencia Consolidada de Docentes y Personal",
  personas: "Padrón General de Personas",
  estudiantes: "Padrón de Estudiantes",
  docentes: "Padrón de Docentes",
  apoderados: "Padrón de Apoderados",
  usuarios: "Usuarios del Sistema",
};

export const JOB_GENERAR_REPORTE = "generar-reporte-excel";
export const TTL_ARCHIVO_REPORTE_MS = 2 * 60 * 60 * 1000; // 2 horas
export const DIRECTORIO_REPORTES_TEMP = join(process.cwd(), "uploads", "reportes-temp");
