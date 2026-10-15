import type { DecisionConsolidado, EstadoConsolidado, EstadoSolicitudRevision } from "../constants";

export interface PeriodoParaConsolidado {
  id: string;
  nombre: string;
  numero: number;
  estado: string; // 'planificado' | 'en_curso' | 'cerrado'
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string; // YYYY-MM-DD
}

export interface DocenteParaConsolidado {
  id: string;
  personaId: string;
  usuarioId: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
  numeroDocumento: string;
  firmaUrl: string | null;
}

export interface MetricasCalculadasDocente {
  docenteId?: string;
  sesionesProgramadas: number;
  sesionesCumplidas: number;
  sesionesParciales: number;
  sesionesNoCumplidas: number;
  sesionesJustificadas: number;
  minutosPerdidosFirma: number;
  totalAusencias: number;
  minutosFueraAula: number;
  totalMinutosFueraClase: number;
}

export interface ConsolidadoFila {
  id: string;
  docenteId: string;
  periodoId: string;
  consolidadoRaizId: string | null;
  estado: EstadoConsolidado;
  version: number;
  vigente: boolean;
  motivoCambio: string | null;
  sesionesProgramadas: number;
  sesionesCumplidas: number;
  sesionesParciales: number;
  sesionesNoCumplidas: number;
  sesionesJustificadas: number;
  minutosPerdidosFirma: number;
  totalAusencias: number;
  minutosFueraAula: number;
  decision: DecisionConsolidado;
  observacion: string | null;
  generadoPorId: string;
  generadoEn: string;
  enviadoEn: string | null;
  reabiertoPorId: string | null;
  reabiertoEn: string | null;
}

export interface SolicitudRevisionFila {
  id: string;
  consolidadoId: string;
  docenteId: string;
  motivo: string;
  adjuntoRuta: string | null;
  adjuntoNombre: string | null;
  estado: EstadoSolicitudRevision;
  respuesta: string | null;
  resueltaPorId: string | null;
  creadoEn: string;
  resueltaEn: string | null;
}

export interface DatosCrearConsolidado {
  docenteId: string;
  periodoId: string;
  generadoPorId: string;
  metricas: MetricasCalculadasDocente;
}

export interface DatosNuevaVersionConsolidado {
  anteriorId: string;
  consolidadoRaizId: string;
  version: number;
  motivoCambio: string;
  generadoPorId: string;
  metricas: MetricasCalculadasDocente;
  decision: DecisionConsolidado;
  observacion?: string | null;
}

export interface DatosCrearSolicitud {
  consolidadoId: string;
  docenteId: string;
  motivo: string;
  adjuntoRuta?: string | null;
  adjuntoNombre?: string | null;
}

export interface FiltrosListarSolicitudesRepo {
  periodoId?: string;
  estado?: EstadoSolicitudRevision;
}

export interface ISeguimientoDocenteRepository {
  buscarPeriodoPorId(periodoId: string): Promise<PeriodoParaConsolidado | null>;
  buscarPeriodoPorFecha(fecha: string): Promise<PeriodoParaConsolidado | null>;
  buscarDocentesConSesionesEnPeriodo(periodoId: string): Promise<DocenteParaConsolidado[]>;
  buscarConsolidadoVigente(docenteId: string, periodoId: string): Promise<ConsolidadoFila | null>;
  buscarConsolidadoPorId(id: string): Promise<ConsolidadoFila | null>;
  buscarConsolidadoConDetalle(id: string): Promise<{
    consolidado: ConsolidadoFila;
    docente: DocenteParaConsolidado;
    periodo: PeriodoParaConsolidado;
    generadoPorNombre: string;
    reabiertoPorNombre: string | null;
    sesiones: Array<{
      id: string;
      fecha: string;
      cursoNombre: string;
      seccionNombre: string;
      tema: string | null;
      horaInicioPlan: string | null;
      horaFinPlan: string | null;
      horaInicioReal: string | null;
      horaFinReal: string | null;
      minutosRetraso: number;
      minutosPerdidos: number;
      estado: string;
      justificacionComentario: string | null;
      ausencias: Array<{
        id: string;
        horaDesde: string;
        horaHasta: string;
        minutos: number;
        motivo: string;
        observacion: string | null;
        descargo: string | null;
        descargoEn: string | null;
        fotos: Array<{ id: string; archivoUrl: string; tomadaEn: string | null; orden: number }>;
      }>;
    }>;
  } | null>;
  buscarHistorialVersiones(
    raizId: string,
  ): Promise<
    Array<ConsolidadoFila & { generadoPorNombre: string; reabiertoPorNombre: string | null }>
  >;
  calcularMetricasDocente(docenteId: string, periodoId: string): Promise<MetricasCalculadasDocente>;
  crearConsolidado(datos: DatosCrearConsolidado): Promise<ConsolidadoFila>;
  actualizarDecision(
    id: string,
    decision: DecisionConsolidado,
    observacion?: string | null,
  ): Promise<ConsolidadoFila>;
  reabrirConsolidado(id: string, reabiertoPorId: string): Promise<ConsolidadoFila>;
  crearNuevaVersion(datos: DatosNuevaVersionConsolidado): Promise<ConsolidadoFila>;
  docentePorPersonaId(personaId: string): Promise<DocenteParaConsolidado | null>;
  docentePorId(docenteId: string): Promise<DocenteParaConsolidado | null>;
  usuarioPorPersonaId(personaId: string): Promise<{ id: string } | null>;

  // Solicitudes de revisión
  crearSolicitud(datos: DatosCrearSolicitud): Promise<SolicitudRevisionFila>;
  buscarSolicitudPorId(
    id: string,
  ): Promise<
    | (SolicitudRevisionFila & {
        docente: DocenteParaConsolidado;
        periodo: PeriodoParaConsolidado;
        resueltaPorNombre: string | null;
      })
    | null
  >;
  buscarSolicitudAbierta(consolidadoId: string): Promise<SolicitudRevisionFila | null>;
  listarSolicitudes(
    filtros: FiltrosListarSolicitudesRepo,
  ): Promise<
    Array<
      SolicitudRevisionFila & {
        docente: DocenteParaConsolidado;
        periodo: PeriodoParaConsolidado;
        resueltaPorNombre: string | null;
      }
    >
  >;
  resolverSolicitud(
    id: string,
    estado: EstadoSolicitudRevision,
    resueltaPorId: string,
    respuesta?: string | null,
  ): Promise<SolicitudRevisionFila>;

  // Listar consolidados vigentes de un período (reporte general)
  listarConsolidadosVigentesPorPeriodo(
    periodoId: string,
  ): Promise<
    Array<
      ConsolidadoFila & {
        docente: DocenteParaConsolidado;
        generadoPorNombre: string;
        reabiertoPorNombre: string | null;
      }
    >
  >;
}
