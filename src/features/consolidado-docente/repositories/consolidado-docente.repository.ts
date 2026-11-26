import { Inject, Injectable } from "@nestjs/common";
import { Database, DRIZZLE } from "../../../core/database";
import type {
  ConsolidadoResumenItem,
  DecisionConsolidado,
  DetalleSesionConsolidado,
  HistorialVersionConsolidadoItem,
  MetricasConsolidado,
  MetricasConsolidadoGuardadas,
  SolicitudRevisionItem,
} from "../interfaces";
import type { ConsolidadoDocenteRepositoryDeps } from "./consolidado/deps";
import * as parte1 from "./consolidado/obtener-periodo";
import * as parte2 from "./consolidado/calcular-metricas";
import * as parte3 from "./consolidado/obtener-detalle-sesiones";

@Injectable()
export class ConsolidadoDocenteRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private dependencias(): ConsolidadoDocenteRepositoryDeps {
    return {
      db: this.db,
    };
  }

  async obtenerPeriodo(periodoId: string) {
    return parte1.obtenerPeriodo(this.dependencias(), periodoId);
  }

  async listarDocentesConSesionesEnPeriodo(
    fechaInicio: string,
    fechaFin: string,
    docenteId?: string,
  ) {
    return parte1.listarDocentesConSesionesEnPeriodo(
      this.dependencias(),
      fechaInicio,
      fechaFin,
      docenteId,
    );
  }

  async obtenerConsolidadosVigentesPeriodo(periodoId: string): Promise<ConsolidadoResumenItem[]> {
    return parte1.obtenerConsolidadosVigentesPeriodo(this.dependencias(), periodoId);
  }

  async obtenerConsolidadoVigenteDocente(docenteId: string, periodoId: string) {
    return parte1.obtenerConsolidadoVigenteDocente(this.dependencias(), docenteId, periodoId);
  }

  async obtenerConsolidadoPorId(consolidadoId: string) {
    return parte1.obtenerConsolidadoPorId(this.dependencias(), consolidadoId);
  }

  async calcularMetricasDocente(
    docenteId: string,
    fechaInicio: string,
    fechaFin: string,
  ): Promise<MetricasConsolidado> {
    return parte2.calcularMetricasDocente(this.dependencias(), docenteId, fechaInicio, fechaFin);
  }

  /** Compromisos pendientes (vigentes y no anulados) del docente en el bimestre. */
  async contarCompromisosPendientes(docenteId: string, periodoId: string): Promise<number> {
    return parte2.contarCompromisosPendientes(this.dependencias(), docenteId, periodoId);
  }

  /** Valor vigente de una variable de sistema, o null si no está cargada. */
  async valorVariable(codigo: string): Promise<string | null> {
    return parte2.valorVariable(this.dependencias(), codigo);
  }

  async crearConsolidado(
    datos: MetricasConsolidadoGuardadas & {
      docenteId: string;
      periodoId: string;
      generadoPorId: string;
    },
  ) {
    return parte2.crearConsolidado(this.dependencias(), datos);
  }

  async actualizarDecision(
    consolidadoId: string,
    decision: DecisionConsolidado,
    observacion?: string,
  ) {
    return parte2.actualizarDecision(this.dependencias(), consolidadoId, decision, observacion);
  }

  async reabrirConsolidado(consolidadoId: string) {
    return parte2.reabrirConsolidado(this.dependencias(), consolidadoId);
  }

  async cerrarConNuevaVersion(
    consolidadoAnteriorId: string,
    motivoCambio: string,
    metricasRecalculadas: MetricasConsolidadoGuardadas,
    generadoPorId: string,
  ) {
    return parte2.cerrarConNuevaVersion(
      this.dependencias(),
      consolidadoAnteriorId,
      motivoCambio,
      metricasRecalculadas,
      generadoPorId,
    );
  }

  async listarHistorialVersiones(
    docenteId: string,
    periodoId: string,
  ): Promise<HistorialVersionConsolidadoItem[]> {
    return parte2.listarHistorialVersiones(this.dependencias(), docenteId, periodoId);
  }

  async obtenerDetalleSesiones(
    docenteId: string,
    fechaInicio: string,
    fechaFin: string,
  ): Promise<DetalleSesionConsolidado[]> {
    return parte3.obtenerDetalleSesiones(this.dependencias(), docenteId, fechaInicio, fechaFin);
  }

  async crearSolicitudRevision(datos: {
    consolidadoId: string;
    docenteId: string;
    motivo: string;
    adjuntoUrl?: string;
  }): Promise<SolicitudRevisionItem> {
    return parte3.crearSolicitudRevision(this.dependencias(), datos);
  }

  async obtenerSolicitudPendiente(consolidadoId: string) {
    return parte3.obtenerSolicitudPendiente(this.dependencias(), consolidadoId);
  }

  async obtenerSolicitudPorId(solicitudId: string) {
    return parte3.obtenerSolicitudPorId(this.dependencias(), solicitudId);
  }

  async resolverSolicitud(
    solicitudId: string,
    accion: "aceptar" | "rechazar",
    respuesta: string,
    resueltoPorId: string,
  ) {
    return parte3.resolverSolicitud(
      this.dependencias(),
      solicitudId,
      accion,
      respuesta,
      resueltoPorId,
    );
  }

  async obtenerDocenteDePersona(personaId: string) {
    return parte3.obtenerDocenteDePersona(this.dependencias(), personaId);
  }

  async consolidadoCerradoBloqueante(docenteId: string, fecha: string): Promise<boolean> {
    return parte3.consolidadoCerradoBloqueante(this.dependencias(), docenteId, fecha);
  }
}
