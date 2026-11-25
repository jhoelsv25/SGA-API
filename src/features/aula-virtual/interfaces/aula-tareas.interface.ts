import type {
  CalculoNotaIntentos,
  EstadoEntrega,
  EstadoTarea,
  RevelarRespuestas,
  TipoPregunta,
  TipoTarea,
} from "../constants";

export interface TareaFila {
  id: string;
  cursoSeccionId: string;
  periodoId: string | null;
  unidadId: string | null;
  sesionClaseId: string | null;
  titulo: string;
  instrucciones: string | null;
  tipo: TipoTarea;
  puntajeMaximo: number;
  publicadaEn: string | null;
  fechaLimite: string;
  permiteEntregaTardia: boolean;
  intentosMaximos: number;
  limiteTiempoMinutos: number | null;
  calculoNotaIntentos: CalculoNotaIntentos;
  revelarRespuestas: RevelarRespuestas;
  tiposArchivo: string | null;
  estado: EstadoTarea;
  creadoEn: string;
  actualizadoEn: string;
}

export interface PreguntaConOpciones {
  id: string;
  tareaId: string;
  enunciado: string;
  tipo: TipoPregunta;
  puntaje: number;
  orden: number;
  opciones: Array<{ id: string; texto: string; esCorrecta: boolean; orden: number }>;
}

export interface TareaConPreguntas extends TareaFila {
  preguntas: PreguntaConOpciones[];
}

export interface EntregaFila {
  id: string;
  tareaId: string;
  matriculaId: string;
  estudianteId?: string;
  estudianteNombre?: string;
  intento: number;
  iniciadoEn: string;
  entregadaEn: string | null;
  texto: string | null;
  archivoUrl: string | null;
  archivoNombre: string | null;
  archivoTamanoBytes: number | null;
  enlaceUrl: string | null;
  respuestas: Record<string, unknown> | null;
  esTardia: boolean;
  estado: EstadoEntrega;
  nota: number | null;
  retroalimentacion: string | null;
  calificadaPorId: string | null;
  calificadaEn: string | null;
}

export interface NuevaTarea {
  cursoSeccionId: string;
  periodoId?: string | null;
  unidadId?: string | null;
  sesionClaseId?: string | null;
  titulo: string;
  instrucciones?: string | null;
  tipo: TipoTarea;
  fechaLimite: string;
  permiteEntregaTardia?: boolean;
  intentosMaximos?: number;
  limiteTiempoMinutos?: number | null;
  calculoNotaIntentos?: CalculoNotaIntentos;
  revelarRespuestas?: RevelarRespuestas;
  tiposArchivo?: string | null;
  estado?: EstadoTarea;
}
