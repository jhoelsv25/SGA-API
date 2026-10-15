import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import {
  MENU_CONSOLIDADO_BIMESTRE,
  MENU_MI_SEGUIMIENTO,
  MENU_SOLICITUDES_REVISION,
} from "../../common/constants";
import { ClientInfo, type ClientInfoData, CurrentUser, MenuAccess } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { OPCIONES_SUBIDA_ADJUNTO_SOLICITUD } from "./constants";
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
import { SeguimientoDocenteService } from "./seguimiento-docente.service";
import {
  ConsolidadoBloqueoService,
  SeguimientoExportacionService,
  SolicitudesRevisionService,
} from "./services";

@ApiTags("Consolidado y seguimiento docente")
@Controller("seguimiento-docente")
export class SeguimientoDocenteController {
  constructor(
    private readonly service: SeguimientoDocenteService,
    private readonly bloqueoService: ConsolidadoBloqueoService,
    private readonly solicitudesService: SolicitudesRevisionService,
    private readonly exportacionService: SeguimientoExportacionService,
  ) {}

  // ========================================================
  // 1. SUPERVISIÓN Y REPORTES DIRECTIVOS (Director / Subdirector)
  // ========================================================

  @Post("periodos/:periodoId/generar-todos")
  @ApiBearerAuth()
  @MenuAccess(MENU_CONSOLIDADO_BIMESTRE)
  @ApiOperation({ summary: "Generar consolidado para todos los docentes del bimestre (HU1)" })
  @ApiResponse({ status: 201, type: MensajeConsolidadoResponseDto })
  async generarTodos(
    @Param("periodoId", ParseUUIDPipe) periodoId: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MensajeConsolidadoResponseDto> {
    return this.service.generarTodos(periodoId, usuario.id, usuario.role, clientInfo.ip);
  }

  @Post("periodos/:periodoId/docentes/:docenteId/generar")
  @ApiBearerAuth()
  @MenuAccess(MENU_CONSOLIDADO_BIMESTRE)
  @ApiOperation({ summary: "Generar consolidado para un docente específico (HU1)" })
  @ApiResponse({ status: 201, type: ConsolidadoDetalleResponseDto })
  async generarUno(
    @Param("periodoId", ParseUUIDPipe) periodoId: string,
    @Param("docenteId", ParseUUIDPipe) docenteId: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<ConsolidadoDetalleResponseDto> {
    return this.service.generarUno(periodoId, docenteId, usuario.id, usuario.role, clientInfo.ip);
  }

  @Get("periodos/:periodoId/reporte")
  @ApiBearerAuth()
  @MenuAccess(MENU_CONSOLIDADO_BIMESTRE)
  @ApiOperation({ summary: "Reporte consolidado de todos los docentes del bimestre (HU4)" })
  @ApiResponse({ status: 200, type: ReporteBimestreResponseDto })
  async obtenerReporteBimestre(
    @Param("periodoId", ParseUUIDPipe) periodoId: string,
    @Query() query: FiltroReporteBimestreQueryDto,
  ): Promise<ReporteBimestreResponseDto> {
    return this.service.obtenerReporteBimestre(periodoId, query);
  }

  @Get("periodos/:periodoId/exportar")
  @ApiBearerAuth()
  @MenuAccess(MENU_CONSOLIDADO_BIMESTRE)
  @ApiOperation({ summary: "Exportar reporte consolidado a Excel (HU4)" })
  async exportarReporteExcel(
    @Param("periodoId", ParseUUIDPipe) periodoId: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, nombreArchivo } = await this.exportacionService.exportarReporteExcel(
      periodoId,
      usuario.id,
      clientInfo.ip,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);
    res.send(buffer);
  }

  @Get(":id/ficha")
  @ApiBearerAuth()
  @MenuAccess(MENU_CONSOLIDADO_BIMESTRE, MENU_MI_SEGUIMIENTO)
  @ApiOperation({ summary: "Descargar ficha de seguimiento docente en PDF (HU4)" })
  async descargarFichaPdf(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, nombreArchivo } = await this.exportacionService.generarFichaPdf(id, usuario);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${nombreArchivo}"`);
    res.send(buffer);
  }

  @Get(":id/historial")
  @ApiBearerAuth()
  @MenuAccess(MENU_CONSOLIDADO_BIMESTRE)
  @ApiOperation({ summary: "Historial completo de versiones del consolidado (HU2)" })
  @ApiResponse({ status: 200, type: HistorialConsolidadoResponseDto })
  async obtenerHistorial(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<HistorialConsolidadoResponseDto> {
    return this.service.obtenerHistorial(id);
  }

  @Patch(":id/decision")
  @ApiBearerAuth()
  @MenuAccess(MENU_CONSOLIDADO_BIMESTRE)
  @ApiOperation({ summary: "Registrar decisión y observación del Director (HU1)" })
  @ApiResponse({ status: 200, type: ConsolidadoDetalleResponseDto })
  async registrarDecision(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RegistrarDecisionDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<ConsolidadoDetalleResponseDto> {
    return this.service.registrarDecision(id, dto, usuario.id, usuario.role, clientInfo.ip);
  }

  @Post(":id/reabrir")
  @ApiBearerAuth()
  @MenuAccess(MENU_CONSOLIDADO_BIMESTRE)
  @ApiOperation({ summary: "Reabrir un consolidado cerrado (HU2)" })
  @ApiResponse({ status: 200, type: MensajeConsolidadoResponseDto })
  async reabrir(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MensajeConsolidadoResponseDto & { consolidado: ConsolidadoResumenDto }> {
    return this.service.reabrir(id, usuario.id, usuario.role, clientInfo.ip);
  }

  @Post(":id/cerrar")
  @ApiBearerAuth()
  @MenuAccess(MENU_CONSOLIDADO_BIMESTRE)
  @ApiOperation({ summary: "Volver a cerrar consolidado con nueva versión recalculada (HU2)" })
  @ApiResponse({ status: 200, type: MensajeConsolidadoResponseDto })
  async cerrar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CerrarConsolidadoDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MensajeConsolidadoResponseDto & { consolidado: ConsolidadoResumenDto }> {
    return this.service.cerrar(id, dto, usuario.id, usuario.role, clientInfo.ip);
  }

  @Get(":id")
  @ApiBearerAuth()
  @MenuAccess(MENU_CONSOLIDADO_BIMESTRE, MENU_MI_SEGUIMIENTO)
  @ApiOperation({ summary: "Detalle completo de un consolidado (HU1, HU4)" })
  @ApiResponse({ status: 200, type: ConsolidadoDetalleResponseDto })
  async obtenerDetalle(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<ConsolidadoDetalleResponseDto> {
    return this.service.obtenerDetalle(id, usuario);
  }

  // ========================================================
  // 2. SOLICITUDES DE REVISIÓN (Director)
  // ========================================================

  @Get("solicitudes")
  @ApiBearerAuth()
  @MenuAccess(MENU_SOLICITUDES_REVISION)
  @ApiOperation({ summary: "Listar solicitudes de revisión para el Director (HU3)" })
  @ApiResponse({ status: 200, type: [SolicitudRevisionResponseDto] })
  async listarSolicitudes(
    @Query() query: FiltroSolicitudesQueryDto,
  ): Promise<SolicitudRevisionResponseDto[]> {
    return this.solicitudesService.listar(query);
  }

  @Patch("solicitudes/:id/aceptar")
  @ApiBearerAuth()
  @MenuAccess(MENU_SOLICITUDES_REVISION)
  @ApiOperation({ summary: "Aceptar solicitud de revisión y reabrir consolidado (HU3)" })
  @ApiResponse({ status: 200, type: SolicitudRevisionResponseDto })
  async aceptarSolicitud(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ResolverSolicitudDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<SolicitudRevisionResponseDto> {
    return this.solicitudesService.aceptar(id, dto, usuario.id, usuario.role, clientInfo.ip);
  }

  @Patch("solicitudes/:id/rechazar")
  @ApiBearerAuth()
  @MenuAccess(MENU_SOLICITUDES_REVISION)
  @ApiOperation({ summary: "Rechazar solicitud de revisión con respuesta obligatoria (HU3)" })
  @ApiResponse({ status: 200, type: SolicitudRevisionResponseDto })
  async rechazarSolicitud(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RechazarSolicitudDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<SolicitudRevisionResponseDto> {
    return this.solicitudesService.rechazar(id, dto, usuario.id, usuario.role, clientInfo.ip);
  }

  // ========================================================
  // 3. MI SEGUIMIENTO DOCENTE (Docente autenticado)
  // ========================================================

  @Get("mi-seguimiento/periodos/:periodoId")
  @ApiBearerAuth()
  @MenuAccess(MENU_MI_SEGUIMIENTO)
  @ApiOperation({ summary: "Ver mi consolidado vigente en el bimestre (HU3)" })
  @ApiResponse({ status: 200, type: MiConsolidadoResponseDto })
  async miConsolidado(
    @Param("periodoId", ParseUUIDPipe) periodoId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<MiConsolidadoResponseDto> {
    return this.service.miConsolidado(periodoId, usuario.personaId);
  }

  @Post("mis-solicitudes")
  @ApiBearerAuth()
  @MenuAccess(MENU_MI_SEGUIMIENTO)
  @UseInterceptors(FileInterceptor("adjunto", OPCIONES_SUBIDA_ADJUNTO_SOLICITUD))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Enviar solicitud de revisión para mi consolidado (HU3)" })
  @ApiResponse({ status: 201, type: MensajeConsolidadoResponseDto })
  async crearSolicitud(
    @Body() dto: CrearSolicitudRevisionDto,
    @UploadedFile() adjunto: Express.Multer.File | undefined,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MensajeConsolidadoResponseDto & { solicitud: SolicitudRevisionResponseDto }> {
    return this.solicitudesService.crear(
      dto,
      adjunto,
      usuario.personaId,
      usuario.id,
      clientInfo.ip,
    );
  }
}
