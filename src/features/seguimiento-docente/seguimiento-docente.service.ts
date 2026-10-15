import { Injectable } from "@nestjs/common";
import { AnioLectivoCls } from "../../common/anio-lectivo";
import { AuditService } from "../../common/services/audit.service";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import {
  CerrarConsolidadoDto,
  ConsolidadoDetalleResponseDto,
  ConsolidadoResumenDto,
  CrearSolicitudRevisionDto,
  FiltroReporteBimestreQueryDto,
  FiltroSolicitudesQueryDto,
  HistorialConsolidadoResponseDto,
  MensajeConsolidadoResponseDto,
  MiConsolidadoResponseDto,
  RechazarSolicitudDto,
  RegistrarDecisionDto,
  ReporteBimestreResponseDto,
  ResolverSolicitudDto,
  SolicitudRevisionResponseDto,
} from "./dto";
import { SeguimientoDocenteRepository } from "./repositories";
import {
  ConsolidadoBloqueoService,
  ConsolidadoGeneracionService,
  ConsolidadoVersionadoService,
  SeguimientoExportacionService,
  SolicitudesRevisionService,
} from "./services";

@Injectable()
export class SeguimientoDocenteService {
  private readonly generacionService: ConsolidadoGeneracionService;
  private readonly versionadoService: ConsolidadoVersionadoService;

  constructor(
    private readonly repository: SeguimientoDocenteRepository,
    private readonly bloqueoService: ConsolidadoBloqueoService,
    private readonly solicitudesService: SolicitudesRevisionService,
    private readonly exportacionService: SeguimientoExportacionService,
    private readonly notificacionesService: NotificacionesService,
    private readonly auditService: AuditService,
    private readonly anioLectivoCls: AnioLectivoCls,
  ) {
    this.generacionService = new ConsolidadoGeneracionService(
      this.repository,
      this.notificacionesService,
      this.auditService,
      this.anioLectivoCls,
    );
    this.versionadoService = new ConsolidadoVersionadoService(
      this.repository,
      this.notificacionesService,
      this.auditService,
    );
  }

  // ========================================================
  // HU1: GENERACIÓN Y DECISIÓN DIRECTIVA
  // ========================================================

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
   * El docente solo ve lo suyo («No tiene acceso al consolidado de otro docente.»); el Subdirector solo consulta.
   * Traza: CP-RF013-02, CP-RF013-05, CP-RF013-20.
   */
  async obtenerDetalle(
    id: string,
    usuario: AuthenticatedUser,
  ): Promise<ConsolidadoDetalleResponseDto> {
    const rolNormalizado = (usuario.role || "").toLowerCase();
    const usuarioAjustado: AuthenticatedUser =
      rolNormalizado === "docente" && usuario.role !== "docente"
        ? { ...usuario, role: "docente" }
        : usuario;
    return this.generacionService.obtenerDetalle(id, usuarioAjustado);
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

  // ========================================================
  // HU2: REAPERTURA Y VERSIONADO
  // ========================================================

  /**
   * HU2: Reabrir un consolidado cerrado para permitir correcciones de sesiones o ausencias.
   * Traza: CP-RF013-07.
   */
  async reabrir(
    id: string,
    actorId: string,
    rol: string,
    ip?: string,
  ): Promise<MensajeConsolidadoResponseDto & { consolidado: ConsolidadoResumenDto }> {
    const resultado = await this.versionadoService.reabrir(id, actorId, rol, ip);
    await this.completarNombresConsolidado(resultado.consolidado);
    return resultado;
  }

  /**
   * HU2: Volver a cerrar un consolidado reabierto creando una versión nueva e invalidando la anterior.
   * Traza: CP-RF013-08, CP-RF013-09.
   */
  async cerrar(
    id: string,
    dto: CerrarConsolidadoDto,
    actorId: string,
    rol: string,
    ip?: string,
  ): Promise<MensajeConsolidadoResponseDto & { consolidado: ConsolidadoResumenDto }> {
    const resultado = await this.versionadoService.cerrar(id, dto, actorId, rol, ip);
    await this.completarNombresConsolidado(resultado.consolidado);
    return resultado;
  }

  /**
   * HU2: Consultar el historial completo de versiones de un consolidado (Director / Subdirector).
   * Traza: CP-RF013-10.
   */
  async obtenerHistorial(id: string): Promise<HistorialConsolidadoResponseDto> {
    return this.versionadoService.obtenerHistorial(id);
  }

  // ========================================================
  // HU3: MI CONSOLIDADO Y SOLICITUDES DE REVISIÓN
  // ========================================================

  /**
   * HU3: Consultar el consolidado vigente del docente autenticado en el bimestre (sin historial).
   * Traza: CP-RF013-11, CP-RF013-20.
   */
  async miConsolidado(periodoId: string, personaId: string): Promise<MiConsolidadoResponseDto> {
    return this.solicitudesService.miConsolidado(periodoId, personaId);
  }

  /**
   * HU3: El docente registra una solicitud de revisión sobre su consolidado (adjunto opcional).
   * Traza: CP-RF013-12, CP-RF013-13, CP-RF013-14.
   */
  async crearSolicitud(
    dto: CrearSolicitudRevisionDto,
    adjunto: Express.Multer.File | undefined,
    personaId: string,
    actorId: string,
    ip?: string,
  ): Promise<MensajeConsolidadoResponseDto & { solicitud: SolicitudRevisionResponseDto }> {
    return this.solicitudesService.crear(dto, adjunto, personaId, actorId, ip);
  }

  /**
   * HU3: Listar solicitudes de revisión para el Director (con filtros de período y estado).
   */
  async listarSolicitudes(
    query: FiltroSolicitudesQueryDto,
  ): Promise<SolicitudRevisionResponseDto[]> {
    return this.solicitudesService.listar(query);
  }

  /**
   * HU3: El Director acepta la solicitud de revisión, reabriendo automáticamente el consolidado.
   * Traza: CP-RF013-15.
   */
  async aceptarSolicitud(
    id: string,
    dto: ResolverSolicitudDto,
    actorId: string,
    rol: string,
    ip?: string,
  ): Promise<SolicitudRevisionResponseDto> {
    return this.solicitudesService.aceptar(id, dto, actorId, rol, ip);
  }

  /**
   * HU3: El Director rechaza la solicitud de revisión con respuesta obligatoria.
   * Traza: CP-RF013-16, CP-RF013-17.
   */
  async rechazarSolicitud(
    id: string,
    dto: RechazarSolicitudDto,
    actorId: string,
    rol: string,
    ip?: string,
  ): Promise<SolicitudRevisionResponseDto> {
    return this.solicitudesService.rechazar(id, dto, actorId, rol, ip);
  }

  // ========================================================
  // HU4: FICHA PDF Y REPORTE EXCEL
  // ========================================================

  /**
   * HU4: Generar ficha de seguimiento docente oficial en PDF con sesiones, ausencias, fotos y firmas.
   * Traza: CP-RF013-18.
   */
  async generarFichaPdf(
    consolidadoId: string,
    usuario: AuthenticatedUser,
  ): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    return this.exportacionService.generarFichaPdf(consolidadoId, usuario);
  }

  /**
   * HU4: Exportar reporte consolidado de todos los docentes del bimestre a hoja de cálculo Excel.
   * Traza: CP-RF013-19.
   */
  async exportarReporteExcel(
    periodoId: string,
    actorId?: string,
    ip?: string,
  ): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    return this.exportacionService.exportarReporteExcel(periodoId, actorId, ip);
  }

  // ========================================================
  // BLOQUEO TRANSVERSAL
  // ========================================================

  /**
   * Verifica si el consolidado vigente de un docente en un período está cerrado.
   * Traza: CP-RF013-06.
   */
  async asegurarNoCerrado(docenteId: string, periodoId: string): Promise<void> {
    return this.bloqueoService.asegurarNoCerrado(docenteId, periodoId);
  }

  /**
   * Variante para cuando solo se dispone de la fecha y el docenteId.
   * Traza: CP-RF013-06.
   */
  async asegurarNoCerradoPorFecha(docenteId: string, fecha: string): Promise<void> {
    return this.bloqueoService.asegurarNoCerradoPorFecha(docenteId, fecha);
  }

  // ========================================================
  // RESOLUCIÓN DE NOMBRES EN RESPUESTAS
  // ========================================================

  /**
   * Completa los nombres generadoPorNombre y reabiertoPorNombre desde el repositorio
   * cuando no vienen provistos por el cálculo preliminar.
   */
  private async completarNombresConsolidado(consolidado: ConsolidadoResumenDto): Promise<void> {
    if (this.repository && typeof this.repository.buscarConsolidadoConDetalle === "function") {
      try {
        const detalle = await this.repository.buscarConsolidadoConDetalle(consolidado.id);
        if (detalle) {
          if (detalle.generadoPorNombre) {
            consolidado.generadoPorNombre = detalle.generadoPorNombre;
          }
          if (detalle.reabiertoPorNombre !== undefined) {
            consolidado.reabiertoPorNombre = detalle.reabiertoPorNombre;
          }
        }
      } catch {
        // En caso de mock en pruebas que no implemente buscarConsolidadoConDetalle
      }
    }
  }
}
