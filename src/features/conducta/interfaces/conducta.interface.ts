import { GravedadFalta, TipoIncidencia, TipoObservacion } from "../constants";

export interface UserContext {
  id: string;
  rol?: string;
  permisos?: string[];
}

export interface IncidenciaItem {
  id: string;
  matriculaId: string;
  estudianteNombre?: string;
  codigoEstudiante?: string;
  seccionId?: string;
  seccionNombre?: string;
  periodoId: string;
  periodoNombre?: string;
  registradoPorId: string;
  registradoPorNombre?: string;
  fecha: string;
  tipo: TipoIncidencia;
  categoria: string;
  gravedad?: GravedadFalta | null;
  descripcion: string;
  lugar?: string | null;
  medidasTomadas?: string | null;
  apoderadoNotificado: boolean;
  fechaNotificacion?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ObservacionItem {
  id: string;
  matriculaId: string;
  estudianteNombre?: string;
  codigoEstudiante?: string;
  seccionId?: string;
  seccionNombre?: string;
  registradoPorId: string;
  registradoPorNombre?: string;
  fecha: string;
  tipo: TipoObservacion;
  observacion: string;
  seguimiento?: string | null;
  derivadoA?: string | null;
  esConfidencial: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface DesgloseBimestreConducta {
  periodoId: string;
  periodoNombre: string;
  numeroPeriodo: number;
  meritos: number;
  faltasLeves: number;
  faltasGraves: number;
  faltasMuyGraves: number;
  totalFaltas: number;
}

export interface ResumenConductaEstudiante {
  matriculaId: string;
  estudianteNombre: string;
  codigoEstudiante: string;
  gradoNombre: string;
  seccionNombre: string;
  totalMeritos: number;
  totalFaltas: number;
  desglosePorBimestre: DesgloseBimestreConducta[];
}

export interface InfoMatriculaEstudiante {
  matriculaId: string;
  estudianteId: string;
  estudianteUsuarioId?: string;
  nombreCompleto: string;
  codigoEstudiante: string;
  seccionId: string;
  gradoId: string;
  tutorUsuarioId?: string;
  apoderadoPrincipalUsuarioId?: string;
  apoderadoPrincipalNombre?: string;
}
