import type { EstadoPlazo } from "../utils";
import type { EstadoSolicitudFecha, TipoMaterial } from "../constants";
import type { CambioFechaHistorial } from "../interfaces";

export interface CursoAulaResponse {
  cursoSeccionId: string;
  cursoNombre: string;
  seccionNombre: string;
  docenteNombre: string | null;
  colorHex?: string | null;
  areaCurricular?: string | null;
  gradoNombre?: string | null;
  totalEstudiantes?: number;
}

export interface MaterialResponse {
  id: string;
  unidadId: string;
  titulo: string;
  descripcion: string | null;
  tipo: TipoMaterial;
  url: string | null;
  archivoNombre: string | null;
  esPlanificado: boolean;
  esExtra: boolean;
  visible: boolean;
  vigente: boolean;
  fechaProgramada: string | null;
  fechaCongelada: boolean;
  publicadoEn: string | null;
  /** pendiente | a_tiempo | fuera_de_plazo | no_publicado (null en materiales extra). */
  plazo: EstadoPlazo | null;
  horarioId: string | null;
  sesionClase: { id: string; fecha: string; tema: string | null } | null;
  solicitudAbierta: boolean;
  cambiosDeFecha: CambioFechaHistorial[];
}

export interface UnidadResponse {
  id: string;
  periodoId: string | null;
  titulo: string;
  descripcion: string | null;
  orden: number;
  fechaInicio: string | null;
  fechaFin: string | null;
  publicada: boolean;
  materiales: MaterialResponse[];
}

export interface BloqueCursoResponse {
  id: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

export interface HijoAulaResponse {
  estudianteId: string;
  personaId: string;
  matriculaId: string;
  nombreCompleto: string;
}

export interface AulaVirtualResponse {
  cursoSeccionId: string;
  cursoNombre: string;
  seccionNombre: string;
  /** El docente asignado puede administrar el aula; el resto solo la consulta. */
  puedeAdministrar: boolean;
  /** Rol efectivo del usuario dentro de esta aula virtual. */
  rolEnAula?: "docente" | "estudiante" | "directivo" | "apoderado";
  /** Indica si el usuario puede consultar el historial de moderación. */
  puedeVerModeracion?: boolean;
  /** Hijos del apoderado matriculados en la sección de este curso. */
  hijosEnCurso?: HijoAulaResponse[];
  diasPlanificacion: number;
  tamanoMaximoMb: number;
  bloques: BloqueCursoResponse[];
  unidades: UnidadResponse[];
}

export interface MutacionMaterialResponse {
  mensaje: string;
  material: MaterialResponse;
}

export interface SolicitudCambioResponse {
  id: string;
  materialId: string;
  materialTitulo: string;
  cursoNombre: string;
  seccionNombre: string;
  docenteNombre: string;
  fechaAnterior: string;
  fechaSolicitada: string;
  motivo: string;
  estado: EstadoSolicitudFecha;
  solicitadoEn: string;
  resueltoEn: string | null;
  respuesta: string | null;
}

export interface SeguimientoFilaResponse {
  docenteId: string;
  docenteNombre: string;
  cursoSeccionId: string;
  cursoNombre: string;
  seccionNombre: string;
  planificados: number;
  aTiempo: number;
  fueraDePlazo: number;
  noPublicados: number;
  porcentajeATiempo: number;
  solicitudesPendientes: number;
}

export interface SeguimientoResponse {
  periodoId: string;
  periodoNombre: string;
  filas: SeguimientoFilaResponse[];
  totales: {
    planificados: number;
    aTiempo: number;
    fueraDePlazo: number;
    noPublicados: number;
    porcentajeATiempo: number;
    solicitudesPendientes: number;
  };
}

/* === RF-016 Interfaces de respuesta === */

export interface OpcionPreguntaResponse {
  id: string;
  texto: string;
  esCorrecta?: boolean;
  orden: number;
}

export interface PreguntaResponse {
  id: string;
  enunciado: string;
  tipo: string;
  puntaje: number;
  orden: number;
  opciones: OpcionPreguntaResponse[];
}

export interface TareaResponse {
  id: string;
  cursoSeccionId: string;
  periodoId: string | null;
  unidadId: string | null;
  sesionClaseId: string | null;
  titulo: string;
  instrucciones: string | null;
  tipo: string;
  puntajeMaximo: number;
  publicadaEn: string | null;
  fechaLimite: string;
  permiteEntregaTardia: boolean;
  intentosMaximos: number;
  limiteTiempoMinutos: number | null;
  calculoNotaIntentos: string;
  revelarRespuestas: string;
  tiposArchivo: string | null;
  estado: string;
  preguntas?: PreguntaResponse[];
  miEntrega?: EntregaResponse | null;
  intentosRestantes?: number;
}

export interface EntregaResponse {
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
  estado: string;
  nota: number | null;
  retroalimentacion: string | null;
  calificadaPorId: string | null;
  calificadaEn: string | null;
}

export interface FilaEstudianteLibroNotas {
  matriculaId: string;
  estudianteId: string;
  codigo: string;
  estudianteNombre: string;
  notasPorTarea: Record<
    string,
    {
      nota: number | null;
      estado: string;
      esTardia: boolean;
    }
  >;
  promediosPorTipo: Record<string, number | null>;
  notaFinal: number;
  notaLiteral: string;
}

export interface LibroNotasResponse {
  cursoSeccionId: string;
  cursoNombre: string;
  seccionNombre: string;
  periodoId: string;
  periodoNombre: string;
  pesosConfig: Record<string, number>;
  pesosEfectivos: Record<string, number>;
  tareas: Array<{
    id: string;
    titulo: string;
    tipo: string;
    fechaLimite: string;
  }>;
  estudiantes: FilaEstudianteLibroNotas[];
}
