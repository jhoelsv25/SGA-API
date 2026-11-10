import type { TipoPendiente } from "../constants";

export interface FilaInformeMensual {
  docenteId: string;
  docenteNombre: string;
  docenteDni: string;
  jornadaHoras: number;
  sesiones: number;
  minutosProgramados: number;
  minutosDictados: number;
  justificadas: number;
  injustificadas: number;
  tardanzas: number;
  minutosPerdidosFirma: number;
  minutosFueraAula: number;
}

export interface PendienteItem {
  tipo: TipoPendiente;
  tipoEtiqueta: string;
  docenteId: string;
  docenteNombre: string;
  periodoId: string | null;
  periodoNombre: string | null;
  /** AAAA-MM-DD en que nació el pendiente. */
  fechaOrigen: string;
  /** Días calendario desde que venció (o desde que se pidió, si no tiene plazo). */
  diasAtraso: number;
  /** Id de la sesión, ausencia, docente, consolidado, solicitud o compromiso, según el tipo. */
  referenciaId: string;
  /** Ruta de la pantalla donde se atiende, con sus parámetros. */
  enlace: string;
}

export interface PendientesResponse {
  fecha: string;
  conteos: Record<TipoPendiente, number>;
  total: number;
  items: PendienteItem[];
  /** «No hay pendientes de seguimiento.» cuando no hay nada. */
  mensaje: string | null;
}

export interface FiltrosPendientes {
  periodoId?: string;
  docenteId?: string;
}

/** Fila cruda de una consulta de pendientes, antes de calcular los días de atraso. */
export interface PendienteCrudo {
  tipo: TipoPendiente;
  docenteId: string;
  docenteNombre: string;
  periodoId: string | null;
  periodoNombre: string | null;
  origen: string;
  vence: string;
  referenciaId: string;
}
