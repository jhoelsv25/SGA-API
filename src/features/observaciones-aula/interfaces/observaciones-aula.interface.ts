import type { EstadoCompromisoObs, EstadoObservacion, Nivel } from "../constants";

export interface ActorObservacion {
  id: string;
  roleId: string;
  role: string;
  personaId: string;
}

export interface NivelInstrumento {
  nivel: Nivel;
  nombre: string;
  grupo: "insatisfactorio" | "satisfactorio";
  descripcion: string;
}

export interface DesempenoInstrumento {
  numero: number;
  nombre: string;
  aspectos: string[];
  niveles: NivelInstrumento[];
}

export interface InstrumentoContenido {
  desempenos: DesempenoInstrumento[];
}

export interface InstrumentoFila {
  id: string;
  codigo: string;
  nombre: string;
  fuente: string | null;
  contenido: InstrumentoContenido;
  vigente: boolean;
  creadoEn: string;
}

export interface ObservacionFila {
  id: string;
  docenteId: string;
  docentePersonaId: string;
  docenteNombre: string;
  docenteApellido: string;
  docenteDocumento: string;
  cursoSeccionId: string;
  cursoNombre: string;
  seccionNombre: string;
  gradoNombre: string;
  horarioId: string | null;
  sesionClaseId: string | null;
  periodoId: string;
  periodoNombre: string;
  periodoEstado: string;
  observadorUsuarioId: string;
  observadorPersonaId: string;
  observadorNombre: string;
  instrumentoId: string;
  observacionAnteriorId: string | null;
  fecha: string;
  horaInicioProgramada: string;
  horaFinProgramada: string;
  estado: EstadoObservacion;
  avisadoEn: string | null;
  horaInicioReal: string | null;
  horaFinReal: string | null;
  minutosTotales: number | null;
  estudiantesPresentes: number | null;
  retroFecha: string | null;
  retroHoraInicio: string | null;
  retroHoraFin: string | null;
  retroResumen: string | null;
  retroalimentadaEn: string | null;
  enteradoEn: string | null;
  motivoCancelacion: string | null;
  creadoEn: string;
}

export interface NotaFila {
  id: string;
  observacionId: string;
  desempeno: number;
  aspecto: string | null;
  texto: string;
  horaAproximada: string | null;
  creadoEn: string;
}

export interface CalificacionFila {
  id: string;
  observacionId: string;
  desempeno: number;
  nivel: Nivel;
  fundamento: string;
  version: number;
  vigente: boolean;
  motivoCambio: string | null;
  creadoPorId: string;
  creadoEn: string;
}

export interface CompromisoObsFila {
  id: string;
  compromisoId: string;
  observacionId: string;
  desempeno: number;
  descripcion: string;
  fechaRevision: string;
  estado: EstadoCompromisoObs;
  observacionCierre: string | null;
  cerradoEn: string | null;
  version: number;
  vigente: boolean;
  motivoCambio: string | null;
  creadoPorId: string;
  creadoEn: string;
}

export interface CambioFila {
  id: string;
  tipo: "reprogramacion" | "cancelacion";
  fechaAnterior: string | null;
  horaAnterior: string | null;
  fechaNueva: string | null;
  horaNueva: string | null;
  motivo: string;
  usuarioId: string;
  creadoEn: string;
}

export interface ArchivoFila {
  id: string;
  url: string;
  nombreOriginal: string | null;
  retirado: boolean;
  creadoEn: string;
}

export interface ComentarioFila {
  id: string;
  texto: string;
  creadoEn: string;
}

export interface FiltrosObservacion {
  docenteId?: string;
  estado?: EstadoObservacion;
  periodoId?: string;
  anioAcademicoId?: string;
  desde?: string;
  hasta?: string;
}

export interface CoberturaDocente {
  docenteId: string;
  docenteNombre: string;
  realizadas: number;
  programadas: number;
  meta: number;
  faltanParaMeta: number;
  faltanPorProgramar: number;
}

export interface FilaMatriz {
  docenteId: string;
  docenteNombre: string;
  /** Último nivel vigente por desempeño (1 a 5); null si nunca se calificó. */
  niveles: Record<number, { nivel: Nivel; fecha: string } | null>;
}
