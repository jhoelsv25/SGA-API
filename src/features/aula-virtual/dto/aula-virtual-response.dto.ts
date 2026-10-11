import type { EstadoPlazo } from "../utils";
import type { EstadoSolicitudFecha, TipoMaterial } from "../constants";
import type { CambioFechaHistorial } from "../interfaces";

export interface CursoAulaResponse {
  cursoSeccionId: string;
  cursoNombre: string;
  seccionNombre: string;
  docenteNombre: string | null;
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

export interface AulaVirtualResponse {
  cursoSeccionId: string;
  cursoNombre: string;
  seccionNombre: string;
  /** El docente asignado puede administrar el aula; el resto solo la consulta. */
  puedeAdministrar: boolean;
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
