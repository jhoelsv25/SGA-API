import type {
  DecisionConsolidado,
  EstadoCompromiso,
  EstadoConsolidado,
  EstadoSolicitudRevision,
} from "../constants";

export type { DecisionConsolidado, EstadoCompromiso, EstadoConsolidado, EstadoSolicitudRevision };

export interface ActorConsolidado {
  id: string;
  roleId: string;
  role: string;
  personaId: string;
}

/** Datos calculados al generar o volver a cerrar un consolidado. */
export interface MetricasConsolidado {
  sesionesProgramadas: number;
  sesionesCumplidas: number;
  sesionesParciales: number;
  sesionesNoCumplidas: number;
  sesionesJustificadas: number;
  minutosPerdidosFirma: number;
  totalAusencias: number;
  minutosFueraAula: number;
  minutosTotalFuera: number;
  /** Duración total de las sesiones programadas (RF-013 V2). */
  minutosProgramados: number;
  /** Minutos firmados: cumplidas completas + parciales por lo firmado (RF-013 V2). */
  minutosDictados: number;
}

export interface MetricasConsolidadoGuardadas extends MetricasConsolidado {
  /** Valor de `sesion.minutos_hora_pedagogica` vigente al guardar. */
  minutosHoraPedagogica: number;
}

export interface ConsolidadoResumenItem {
  id: string;
  docenteId: string;
  docenteNombre: string;
  docenteDni: string;
  periodoId: string;
  periodoNombre: string;
  version: number;
  vigente: boolean;
  estado: EstadoConsolidado;
  sesionesProgramadas: number;
  sesionesCumplidas: number;
  sesionesParciales: number;
  sesionesNoCumplidas: number;
  sesionesJustificadas: number;
  minutosPerdidosFirma: number;
  totalAusencias: number;
  minutosFueraAula: number;
  minutosTotalFuera: number;
  tiempoTotalFueraTexto: string;
  /** Horas pedagógicas con un decimal; nulas en los consolidados anteriores a la V2. */
  minutosProgramados: number | null;
  minutosDictados: number | null;
  minutosHoraPedagogica: number | null;
  horasProgramadas: number | null;
  horasDictadas: number | null;
  horasPerdidas: number | null;
  minutosNoDictados: number | null;
  decision: DecisionConsolidado;
  /** Fecha y hora en que el Director registró su decisión; nula si aún no decide. */
  decisionRegistradaEn: string | null;
  observacion: string | null;
  motivoCambio?: string | null;
  generadoEn: string;
  generadoPorNombre: string;
  solicitudesPendientesCount?: number;
}

export interface DetalleAusenciaConsolidado {
  ausenciaId: string;
  tramoHorario: string;
  minutos: number;
  motivo: string;
  observacion: string | null;
  descargo: string | null;
  anulada: boolean;
  fotos: string[];
}

export interface DetalleSesionConsolidado {
  sesionId: string;
  fecha: string;
  cursoNombre: string;
  seccionNombre: string;
  gradoNombre: string;
  tema: string | null;
  horaIngresoProgramada: string;
  horaSalidaProgramada: string;
  horaIngresoFirmada: string | null;
  horaSalidaFirmada: string | null;
  minutosPerdidos: number;
  estado: string;
  ausencias: DetalleAusenciaConsolidado[];
}

export interface SolicitudRevisionItem {
  id: string;
  consolidadoId: string;
  docenteId: string;
  docenteNombre?: string;
  estado: EstadoSolicitudRevision;
  motivo: string;
  adjuntoUrl: string | null;
  solicitadoEn: string;
  resueltoPorNombre: string | null;
  resueltoEn: string | null;
  respuesta: string | null;
}

export interface DetalleDocenteConsolidadoResponse {
  consolidado: ConsolidadoResumenItem;
  sesiones: DetalleSesionConsolidado[];
  solicitudPendiente: SolicitudRevisionItem | null;
  firmaDocenteUrl: string | null;
}

export interface HistorialVersionConsolidadoItem {
  id: string;
  version: number;
  vigente: boolean;
  estado: EstadoConsolidado;
  motivoCambio: string | null;
  minutosTotalFuera: number;
  tiempoTotalFueraTexto: string;
  sesionesProgramadas: number;
  sesionesCumplidas: number;
  sesionesParciales: number;
  sesionesNoCumplidas: number;
  sesionesJustificadas: number;
  totalAusencias: number;
  minutosFueraAula: number;
  decision: DecisionConsolidado;
  observacion: string | null;
  generadoPorNombre: string;
  generadoEn: string;
}

/** Una versión de un compromiso de mejora (RF-013 V2). */
export interface CompromisoItem {
  /** Identificador de esta versión. */
  id: string;
  /** Identificador estable del compromiso a través de sus versiones. */
  compromisoId: string;
  consolidadoId: string;
  /** Versión del consolidado en que se registró (se conserva al reabrir). */
  consolidadoVersion: number;
  docenteId: string;
  docenteNombre: string;
  version: number;
  vigente: boolean;
  descripcion: string;
  fechaRevision: string;
  estado: EstadoCompromiso;
  /** Pendiente con fecha de revisión pasada. */
  vencido: boolean;
  observacionCierre: string | null;
  cerradoEn: string | null;
  enteradoEn: string | null;
  anulado: boolean;
  motivoAnulacion: string | null;
  anuladoEn: string | null;
  creadoPorId: string;
  creadoEn: string;
}

export interface DetalleCompromisoResponse {
  compromiso: CompromisoItem;
  /** Versiones anteriores y la vigente; el docente no lo recibe. */
  historial: CompromisoItem[];
}
