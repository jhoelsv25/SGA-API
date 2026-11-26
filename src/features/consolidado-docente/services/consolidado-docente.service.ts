import { Injectable } from "@nestjs/common";
import { AuditService } from "../../../common/services/audit.service";
import { InstitucionService } from "../../institucion/institucion.service";
import { NotificacionesService } from "../../notificaciones/notificaciones.service";
import type {
  ActualizarDecisionDto,
  CerrarConsolidadoDto,
  ConsolidadoQueryDto,
  GenerarConsolidadoDto,
  ResolverSolicitudRevisionDto,
  SolicitarRevisionDto,
} from "../dto";
import type { ActorConsolidado, ConsolidadoResumenItem } from "../interfaces";
import { ConsolidadoDocenteRepository } from "../repositories";
import type {
  ConsolidadoDocenteServiceDeps,
  ConsolidadoDocenteServiceCalls,
} from "./consolidado/deps";
import * as parte1 from "./consolidado/exigir-acceso";
import * as parte2 from "./consolidado/obtener-detalle";
import * as parte3 from "./consolidado/resolver-solicitud";

@Injectable()
export class ConsolidadoDocenteService {
  constructor(
    private readonly repository: ConsolidadoDocenteRepository,
    private readonly auditService: AuditService,
    private readonly notificacionesService: NotificacionesService,
    private readonly institucionService: InstitucionService,
  ) {}

  private dependencias(): ConsolidadoDocenteServiceDeps {
    return {
      repository: this.repository,
      auditService: this.auditService,
      notificacionesService: this.notificacionesService,
      institucionService: this.institucionService,
    };
  }

  private llamadas(): ConsolidadoDocenteServiceCalls {
    return {
      exigirDirectorOAdmin: (actor) => this.exigirDirectorOAdmin(actor),
      exigirAccesoGeneral: (actor) => this.exigirAccesoGeneral(actor),
      minutosHoraPedagogica: () => this.minutosHoraPedagogica(),
    };
  }

  private exigirDirectorOAdmin(actor: ActorConsolidado) {
    return parte1.exigirDirectorOAdmin(actor);
  }

  private exigirAccesoGeneral(actor: ActorConsolidado) {
    return parte1.exigirAccesoGeneral(actor);
  }

  /** Duración de la hora pedagógica; un cambio solo afecta a los consolidados que se generen después. */
  private async minutosHoraPedagogica(): Promise<number> {
    return parte1.minutosHoraPedagogica(this.dependencias());
  }

  async generarConsolidados(dto: GenerarConsolidadoDto, actor: ActorConsolidado) {
    return parte1.generarConsolidados(this.dependencias(), this.llamadas(), dto, actor);
  }

  async listarConsolidadosPeriodo(
    dto: ConsolidadoQueryDto,
    actor: ActorConsolidado,
  ): Promise<ConsolidadoResumenItem[]> {
    return parte1.listarConsolidadosPeriodo(this.dependencias(), this.llamadas(), dto, actor);
  }

  async obtenerDetalle(consolidadoId: string, actor: ActorConsolidado) {
    return parte2.obtenerDetalle(this.dependencias(), consolidadoId, actor);
  }

  async obtenerMiSeguimiento(periodoId: string, actor: ActorConsolidado) {
    return parte2.obtenerMiSeguimiento(this.dependencias(), periodoId, actor);
  }

  async registrarDecision(
    consolidadoId: string,
    dto: ActualizarDecisionDto,
    actor: ActorConsolidado,
  ) {
    return parte2.registrarDecision(
      this.dependencias(),
      this.llamadas(),
      consolidadoId,
      dto,
      actor,
    );
  }

  async reabrirConsolidado(consolidadoId: string, actor: ActorConsolidado) {
    return parte2.reabrirConsolidado(this.dependencias(), this.llamadas(), consolidadoId, actor);
  }

  async cerrarConsolidado(
    consolidadoId: string,
    dto: CerrarConsolidadoDto,
    actor: ActorConsolidado,
  ) {
    return parte2.cerrarConsolidado(
      this.dependencias(),
      this.llamadas(),
      consolidadoId,
      dto,
      actor,
    );
  }

  async historialVersiones(consolidadoId: string, actor: ActorConsolidado) {
    return parte2.historialVersiones(this.dependencias(), this.llamadas(), consolidadoId, actor);
  }

  async solicitarRevision(
    consolidadoId: string,
    dto: SolicitarRevisionDto,
    actor: ActorConsolidado,
  ) {
    return parte2.solicitarRevision(this.dependencias(), consolidadoId, dto, actor);
  }

  async resolverSolicitud(
    solicitudId: string,
    dto: ResolverSolicitudRevisionDto,
    actor: ActorConsolidado,
  ) {
    return parte3.resolverSolicitud(this.dependencias(), this.llamadas(), solicitudId, dto, actor);
  }

  async exportarExcel(periodoId: string, actor: ActorConsolidado, generadoPor: string) {
    return parte3.exportarExcel(
      this.dependencias(),
      this.llamadas(),
      periodoId,
      actor,
      generadoPor,
    );
  }

  async descargarFichaPdf(consolidadoId: string, actor: ActorConsolidado) {
    return parte3.descargarFichaPdf(this.dependencias(), consolidadoId, actor);
  }

  /**
   * Validador público invocado por Sesiones (RF-011) y Ausencias (RF-012)
   * para bloquear modificaciones si el consolidado está cerrado (CP-RF013-06).
   */
  async validarModificacionPermitida(docenteId: string, fecha: string) {
    return parte3.validarModificacionPermitida(this.dependencias(), docenteId, fecha);
  }
}
