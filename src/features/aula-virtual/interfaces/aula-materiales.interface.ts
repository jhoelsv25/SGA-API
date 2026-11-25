import type { EstadoSolicitudFecha, TipoMaterial } from "../constants";

export interface CursoAula {
  id: string;
  docenteId: string | null;
  seccionId: string;
  anioAcademicoId: string;
  cursoNombre: string;
  seccionNombre: string;
}

export interface PeriodoAula {
  id: string;
  anioAcademicoId: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
}

export interface UnidadFila {
  id: string;
  cursoSeccionId: string;
  periodoId: string | null;
  titulo: string;
  descripcion: string | null;
  orden: number;
  fechaInicio: string | null;
  fechaFin: string | null;
  publicada: boolean;
}

export interface MaterialFila {
  id: string;
  unidadId: string;
  cursoSeccionId: string;
  periodoId: string | null;
  docenteId: string;
  titulo: string;
  descripcion: string | null;
  tipo: TipoMaterial;
  url: string | null;
  archivoNombre: string | null;
  archivoTamanoBytes: number | null;
  horarioId: string | null;
  esPlanificado: boolean;
  fechaCongelada: boolean;
  vigente: boolean;
  visible: boolean;
  orden: number;
  fechaProgramada: string | null;
  publicadoEn: string | null;
  sesionClaseId: string | null;
}

export interface HorarioBloque {
  id: string;
  cursoSeccionId: string | null;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  tipoBloque: string;
}

export interface SesionEnlazada {
  id: string;
  fecha: string;
  tema: string | null;
}

export interface NuevaUnidad {
  cursoSeccionId: string;
  periodoId: string;
  titulo: string;
  descripcion: string | null;
  orden: number;
  fechaInicio: string;
  fechaFin: string;
  publicada: boolean;
}

export interface NuevoMaterial {
  unidadId: string;
  docenteId: string;
  titulo: string;
  descripcion: string | null;
  tipo: TipoMaterial;
  horarioId: string | null;
  esPlanificado: boolean;
  fechaCongelada: boolean;
  fechaProgramada: string | null;
  orden: number;
}

export interface ContenidoMaterial {
  url: string;
  archivoNombre: string | null;
  archivoTamanoBytes: number | null;
}

export interface SolicitudFila {
  id: string;
  materialId: string;
  materialTitulo: string;
  cursoSeccionId: string;
  cursoNombre: string;
  seccionNombre: string;
  docenteNombre: string;
  fechaAnterior: string;
  fechaSolicitada: string;
  motivo: string;
  estado: EstadoSolicitudFecha;
  solicitadoPorId: string;
  solicitadoEn: string;
  resueltoEn: string | null;
  respuesta: string | null;
}

export interface CambioFechaHistorial {
  id: string;
  fechaAnterior: string;
  fechaSolicitada: string;
  motivo: string;
  estado: EstadoSolicitudFecha;
  solicitadoEn: string;
  resueltoEn: string | null;
  respuesta: string | null;
}

export interface FilaSeguimiento {
  docenteId: string;
  docenteNombre: string;
  cursoSeccionId: string;
  cursoNombre: string;
  seccionNombre: string;
  planificados: number;
  aTiempo: number;
  fueraDePlazo: number;
  noPublicados: number;
  solicitudesPendientes: number;
}

export interface CursoAulaResumen {
  cursoSeccionId: string;
  cursoNombre: string;
  seccionNombre: string;
  docenteNombre: string | null;
  colorHex?: string | null;
  areaCurricular?: string | null;
  gradoNombre?: string | null;
  totalEstudiantes?: number;
}
