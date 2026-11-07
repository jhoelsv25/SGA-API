import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { MENU_INDICADORES, MENU_MIS_INDICADORES } from "@/common/constants/menu-rutas.constants";
import { ClientInfo, type ClientInfoData, CurrentUser, MenuAccess } from "@/common/decorators";
import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import { IndicadoresService } from "./indicadores.service";
import {
  CerrarMedicionDto,
  ComparacionBimestreResponseDto,
  ExportarIndicadoresQueryDto,
  FiltroIndicadoresQueryDto,
  HistorialMedicionResponseDto,
  MedicionBimestreResponseDto,
  MensajeIndicadoresResponseDto,
  MisIndicadoresDocenteResponseDto,
  NuevaVersionMedicionDto,
  PanelGeneralResponseDto,
  PretestResponseDto,
  RegistrarPretestDto,
  TableroIndicadoresResponseDto,
} from "./dto";
import type { Indicador } from "./constants";

@ApiTags("Indicadores de la Tesis y Panel")
@ApiBearerAuth()
@Controller("indicadores")
export class IndicadoresController {
  constructor(private readonly service: IndicadoresService) {}

  // =========================================================================
  // 1. TABLERO DE INDICADORES (Director, Subdirector, Administrador)
  // =========================================================================

  @Get("tablero")
  @MenuAccess(MENU_INDICADORES)
  @ApiOperation({ summary: "Consultar tablero general con CSP, ISA e IGM con filtros (HU1)" })
  @ApiResponse({ status: 200, type: TableroIndicadoresResponseDto })
  async obtenerTablero(
    @Query() query: FiltroIndicadoresQueryDto,
  ): Promise<TableroIndicadoresResponseDto> {
    return this.service.obtenerTablero(query);
  }

  // =========================================================================
  // 2. MIS INDICADORES (Docente con alcance propio)
  // =========================================================================

  @Get("mis-indicadores")
  @MenuAccess(MENU_MIS_INDICADORES)
  @ApiOperation({ summary: "Consultar mis indicadores propios (CSP e IGM) por curso (HU1)" })
  @ApiResponse({ status: 200, type: MisIndicadoresDocenteResponseDto })
  async obtenerMisIndicadores(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query("periodoId") periodoId?: string,
  ): Promise<MisIndicadoresDocenteResponseDto> {
    return this.service.obtenerMisIndicadores(usuario.personaId, periodoId);
  }

  // =========================================================================
  // 3. PRETEST MANUAL (Director / Administrador)
  // =========================================================================

  @Post("pretest")
  @MenuAccess(MENU_INDICADORES)
  @ApiOperation({
    summary: "Registrar pretest manual de un indicador con fuente obligatoria (HU2)",
  })
  @ApiResponse({ status: 201, type: MensajeIndicadoresResponseDto })
  async registrarPretest(
    @Body() dto: RegistrarPretestDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MensajeIndicadoresResponseDto & { pretest: PretestResponseDto }> {
    return this.service.registrarPretest(dto, usuario.id, usuario.role, clientInfo.ip);
  }

  @Get("pretest")
  @MenuAccess(MENU_INDICADORES)
  @ApiOperation({ summary: "Listar todos los pretests registrados históricamente (HU2)" })
  @ApiResponse({ status: 200, type: [PretestResponseDto] })
  async listarPretests(): Promise<PretestResponseDto[]> {
    return this.service.listarPretests();
  }

  @Get("pretest/:indicador/vigente")
  @MenuAccess(MENU_INDICADORES)
  @ApiOperation({ summary: "Obtener el pretest vigente de un indicador (HU2)" })
  @ApiResponse({ status: 200, type: PretestResponseDto })
  async obtenerPretestVigente(
    @Param("indicador") indicador: Indicador,
  ): Promise<PretestResponseDto | null> {
    return this.service.obtenerPretestVigente(indicador);
  }

  // =========================================================================
  // 4. MEDICIONES CONGELADAS DE BIMESTRE (Director / Administrador)
  // =========================================================================

  @Post("mediciones/cerrar")
  @MenuAccess(MENU_INDICADORES)
  @ApiOperation({ summary: "Cerrar medición de un bimestre y congelar postest (HU2)" })
  @ApiResponse({ status: 201, type: MensajeIndicadoresResponseDto })
  async cerrarMedicion(
    @Body() dto: CerrarMedicionDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MensajeIndicadoresResponseDto & { medicion: MedicionBimestreResponseDto }> {
    return this.service.cerrarMedicion(dto, usuario.id, usuario.role, clientInfo.ip);
  }

  @Post("mediciones/:id/nueva-version")
  @MenuAccess(MENU_INDICADORES)
  @ApiOperation({
    summary: "Crear nueva versión de la medición cerrada con motivo obligatorio (HU2)",
  })
  @ApiResponse({ status: 201, type: MensajeIndicadoresResponseDto })
  async nuevaVersionMedicion(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: NuevaVersionMedicionDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MensajeIndicadoresResponseDto & { medicion: MedicionBimestreResponseDto }> {
    return this.service.crearNuevaVersionMedicion(id, dto, usuario.id, usuario.role, clientInfo.ip);
  }

  @Get("mediciones/periodo/:periodoId")
  @MenuAccess(MENU_INDICADORES)
  @ApiOperation({ summary: "Consultar la medición congelada vigente de un período (HU2)" })
  @ApiResponse({ status: 200, type: MedicionBimestreResponseDto })
  async obtenerMedicionPeriodo(
    @Param("periodoId", ParseUUIDPipe) periodoId: string,
  ): Promise<MedicionBimestreResponseDto | null> {
    return this.service.obtenerMedicionPeriodo(periodoId);
  }

  @Get("mediciones/periodo/:periodoId/historial")
  @MenuAccess(MENU_INDICADORES)
  @ApiOperation({ summary: "Consultar historial de versiones de la medición de un período (HU2)" })
  @ApiResponse({ status: 200, type: HistorialMedicionResponseDto })
  async obtenerHistorialMediciones(
    @Param("periodoId", ParseUUIDPipe) periodoId: string,
  ): Promise<HistorialMedicionResponseDto> {
    return this.service.obtenerHistorialMediciones(periodoId);
  }

  // =========================================================================
  // 5. COMPARACIÓN PRETEST VS POSTEST (Director, Subdirector, Administrador)
  // =========================================================================

  @Get("comparacion/periodo/:periodoId")
  @MenuAccess(MENU_INDICADORES)
  @ApiOperation({ summary: "Comparación pretest vs postest con variación en pp y evolución (HU2)" })
  @ApiResponse({ status: 200, type: ComparacionBimestreResponseDto })
  async obtenerComparacion(
    @Param("periodoId", ParseUUIDPipe) periodoId: string,
  ): Promise<ComparacionBimestreResponseDto> {
    return this.service.obtenerComparacion(periodoId);
  }

  // =========================================================================
  // 6. PANEL GENERAL (Director, Subdirector, Administrador)
  // =========================================================================

  @Get("panel")
  @MenuAccess(MENU_INDICADORES)
  @ApiOperation({
    summary: "Panel general con asistencia, tardanzas, sesiones y libretas del día (HU4)",
  })
  @ApiResponse({ status: 200, type: PanelGeneralResponseDto })
  async obtenerPanel(): Promise<PanelGeneralResponseDto> {
    return this.service.obtenerPanel();
  }

  // =========================================================================
  // 7. EXPORTACIÓN DE EVIDENCIA (Director, Subdirector, Administrador)
  // =========================================================================

  @Get("exportar/excel")
  @MenuAccess(MENU_INDICADORES)
  @ApiOperation({ summary: "Exportar evidencia en datos crudos a hoja de cálculo Excel (HU3)" })
  async exportarExcel(
    @Query() query: ExportarIndicadoresQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, nombreArchivo } = await this.service.exportarExcel(
      query,
      usuario.id,
      usuario.username,
      clientInfo.ip,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);
    res.send(buffer);
  }

  @Get("exportar/pdf")
  @MenuAccess(MENU_INDICADORES)
  @ApiOperation({
    summary: "Exportar informe formal de indicadores en PDF con gráfico de barras (HU3)",
  })
  async exportarPdf(
    @Query() query: ExportarIndicadoresQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, nombreArchivo } = await this.service.exportarPdf(
      query,
      usuario.id,
      usuario.username,
      clientInfo.ip,
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${nombreArchivo}"`);
    res.send(buffer);
  }
}
