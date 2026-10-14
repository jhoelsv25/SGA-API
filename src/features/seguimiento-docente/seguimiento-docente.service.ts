import { Injectable, Optional } from "@nestjs/common";
import { AnioLectivoCls } from "../../common/anio-lectivo";
import { AuditService } from "../../common/services/audit.service";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import {
  ConsolidadoDetalleResponseDto,
  FiltroReporteBimestreQueryDto,
  MensajeConsolidadoResponseDto,
  RegistrarDecisionDto,
  ReporteBimestreResponseDto,
} from "./dto";
import { SeguimientoDocenteRepository } from "./repositories";
import {
  ConsolidadoBloqueoService,
  ConsolidadoGeneracionService,
  SeguimientoExportacionService,
  SolicitudesRevisionService,
} from "./services";

@Injectable()
export class SeguimientoDocenteService {
  private readonly generacionService: ConsolidadoGeneracionService;

  constructor(
    private readonly repository: SeguimientoDocenteRepository,
    private readonly bloqueoService: ConsolidadoBloqueoService,
    @Optional()
    private readonly solicitudesService: SolicitudesRevisionService | undefined,
    @Optional()
    private readonly exportacionService: SeguimientoExportacionService | undefined,
    private readonly notificacionesService: NotificacionesService,
    private readonly auditService: AuditService,
    private readonly anioLectivoCls: AnioLectivoCls,
    @Optional()
    generacionService?: ConsolidadoGeneracionService,
  ) {
    this.generacionService =
      generacionService ??
      new ConsolidadoGeneracionService(
        this.repository,
        this.notificacionesService,
        this.auditService,
        this.anioLectivoCls,
      );
  }

  /**
   * HU1: Generar el consolidado masivo para todos los docentes con sesiones en el bimestre.
   * Traza: CP-RF013-01, CP-RF013-03.
   */
  async generarTodos(
    periodoId: string,
    actorId: string,
    rol: string,
    ip?: string,
  ): Promise<MensajeConsolidadoResponseDto> {
    return this.generacionService.generarTodos(periodoId, actorId, rol, ip);
  }

  /**
   * HU1: Generar el consolidado individual para un docente específico.
   * Traza: CP-RF013-02, CP-RF013-03, CP-RF013-04 (Escenario individual del RF).
   */
  async generarUno(
    periodoId: string,
    docenteId: string,
    actorId: string,
    rol: string,
    ip?: string,
  ): Promise<ConsolidadoDetalleResponseDto> {
    return this.generacionService.generarUno(periodoId, docenteId, actorId, rol, ip);
  }

  /**
   * HU4: Obtener el reporte consolidado de todos los docentes del bimestre (ordenable).
   * Traza: CP-RF013-19.
   */
  async obtenerReporteBimestre(
    periodoId: string,
    query?: FiltroReporteBimestreQueryDto,
  ): Promise<ReporteBimestreResponseDto> {
    return this.generacionService.obtenerReporteBimestre(periodoId, query);
  }

  /**
   * HU1, HU4: Obtener el detalle completo del consolidado con sus sesiones y ausencias.
   * Traza: CP-RF013-02, CP-RF013-05, CP-RF013-20.
   */
  async obtenerDetalle(
    id: string,
    usuario: AuthenticatedUser,
  ): Promise<ConsolidadoDetalleResponseDto> {
    return this.generacionService.obtenerDetalle(id, usuario);
  }

  /**
   * HU1: Registrar o actualizar la decisión y observación autónoma del Director.
   * Traza: CP-RF013-05.
   */
  async registrarDecision(
    id: string,
    dto: RegistrarDecisionDto,
    actorId: string,
    rol: string,
    ip?: string,
  ): Promise<ConsolidadoDetalleResponseDto> {
    return this.generacionService.registrarDecision(id, dto, actorId, rol, ip);
  }
}
