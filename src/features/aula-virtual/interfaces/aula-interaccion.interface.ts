import type { TipoModeracion } from "../constants";

export interface PublicacionMuroFila {
  id: string;
  cursoSeccionId: string;
  autorId: string;
  autorNombre: string;
  autorRol?: string;
  contenido: string;
  adjuntoUrl: string | null;
  fijada: boolean;
  vigente: boolean;
  creadoEn: string;
  actualizadoEn: string;
  ocultadoPorId: string | null;
  ocultadoEn: string | null;
  motivoOcultamiento: string | null;
  comentariosCount?: number;
}

export interface ComentarioMuroFila {
  id: string;
  publicacionId: string;
  autorId: string;
  autorNombre: string;
  autorRol?: string;
  contenido: string;
  vigente: boolean;
  creadoEn: string;
  actualizadoEn: string;
  ocultadoPorId: string | null;
  ocultadoEn: string | null;
  motivoOcultamiento: string | null;
}

export interface MensajeChatFila {
  id: string;
  cursoSeccionId: string;
  emisorId: string;
  emisorNombre: string;
  emisorRol?: string;
  contenido: string;
  adjuntoUrl: string | null;
  vigente: boolean;
  enviadoEn: string;
  actualizadoEn?: string | null;
  ocultadoPorId: string | null;
  ocultadoEn: string | null;
  motivoOcultamiento: string | null;
}

export interface HistorialModeracionFila {
  id: string;
  tipo: TipoModeracion;
  cursoSeccionId: string;
  contenido: string | null;
  adjuntoUrl: string | null;
  autorNombre: string;
  ocultadoPorNombre: string;
  ocultadoEn: string;
  motivoOcultamiento: string;
}

export interface ActividadEstudianteMaterial {
  matriculaId: string;
  estudianteId: string;
  codigo: string;
  nombreCompleto: string;
  visualizo: boolean;
  visualizoEn: string | null;
  descargo: boolean;
  descargoEn: string | null;
}

export interface ActividadEstudianteTarea {
  matriculaId: string;
  estudianteId: string;
  codigo: string;
  nombreCompleto: string;
  abrio: boolean;
  abrioEn: string | null;
  completo: boolean;
  completoEn: string | null;
}
