import { MenuAlternativo } from "../../common/decorators/menu-alternativo.decorator";
import { MENU_MATRICULAS } from "../../common/constants/menu-rutas.constants";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import {
  CambiarSeccionDto,
  CrearMatriculaDto,
  EgresarSeccionDto,
  EgresarSeccionResultadoDto,
  MatriculaCreatedResponseDto,
  MatriculaMasivaDto,
  MatriculaMasivaResultadoDto,
  MatricularLoteDto,
  MatriculaQueryDto,
  MatriculaResponseDto,
  PaginatedMatriculasResponseDto,
  PreviewEgresoDto,
  PreviewEgresoResultadoDto,
  PreviewPromocionDto,
  PreviewPromocionResultadoDto,
  ResumenPromocionQueryDto,
  ResumenPromocionResultadoDto,
  RetirarMatriculaDto,
  TrasladarMatriculaDto,
} from "./dto";

import { MatriculasService } from "./matriculas.service";
import { PromocionService } from "./services";

@ApiTags("Matrícula - Matrícula, Retiro y Traslado")
@ApiBearerAuth()
@MenuAlternativo(MENU_MATRICULAS)
@Controller("matriculas")
export class MatriculasController {
  constructor(
    private readonly matriculasService: MatriculasService,
    private readonly promocionService: PromocionService,
  ) {}

  @Get()
  @Roles("Administrador", "Secretaria", "Director", "Subdirector", "Docente")
  @ApiOperation({ summary: "Listar matrículas con paginación por cursor y filtros avanzados" })
  @ApiResponse({ status: 200, type: PaginatedMatriculasResponseDto })
  async findAll(@Query() query: MatriculaQueryDto): Promise<PaginatedMatriculasResponseDto> {
    return this.matriculasService.findAll(query);
  }

  @Get("resumen")
  @Roles("Administrador", "Secretaria", "Director", "Subdirector", "Docente")
  @ApiOperation({
    summary: "Resumen de totales de matrícula y vacantes respetando los filtros activos",
  })
  async obtenerResumen(@Query() query: MatriculaQueryDto) {
    return this.matriculasService.obtenerResumen(query);
  }

  @Get("promocion/resumen")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({
    summary: "Resumen persistido del avance de promoción y egreso por sección del año cerrado",
  })
  @ApiResponse({ status: 200, type: ResumenPromocionResultadoDto })
  async resumenPromocion(
    @Query() query: ResumenPromocionQueryDto,
  ): Promise<ResumenPromocionResultadoDto> {
    return this.promocionService.obtenerResumenPromocion(query);
  }

  @Get("promocion/preview")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({
    summary: "Vista previa de estudiantes elegibles para promoción masiva entre secciones",
  })
  @ApiResponse({ status: 200, type: PreviewPromocionResultadoDto })
  async previewPromocion(
    @Query() query: PreviewPromocionDto,
  ): Promise<PreviewPromocionResultadoDto> {
    return this.promocionService.previewPromocion(query);
  }

  @Get("promocion/egreso-preview")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({
    summary: "Vista previa de estudiantes de 5.° grado listos para egresar",
  })
  @ApiResponse({ status: 200, type: PreviewEgresoResultadoDto })
  async previewEgreso(@Query() query: PreviewEgresoDto): Promise<PreviewEgresoResultadoDto> {
    return this.promocionService.previewEgreso(query);
  }

  @Post("promocion/egresar-seccion")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({
    summary: "Marcar como egresados a los estudiantes culminados de una sección de 5.° grado",
  })
  @ApiResponse({ status: 201, type: EgresarSeccionResultadoDto })
  async egresarSeccion(
    @Body() dto: EgresarSeccionDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<EgresarSeccionResultadoDto> {
    return this.promocionService.egresarSeccion(dto, user.id, client.ip);
  }

  @Get(":id")
  @Roles("Administrador", "Secretaria", "Director", "Subdirector")
  @ApiOperation({ summary: "Obtener detalle completo de una matrícula" })
  @ApiResponse({ status: 200, type: MatriculaResponseDto })
  async findById(@Param("id", ParseUUIDPipe) id: string): Promise<MatriculaResponseDto> {
    return this.matriculasService.findById(id);
  }

  @Get(":id/constancia")
  @Roles("Administrador", "Secretaria", "Director", "Subdirector")
  @ApiOperation({ summary: "Descargar Constancia Oficial de Matrícula en PDF" })
  @ApiResponse({ status: 200, description: "Buffer del archivo PDF" })
  async descargarConstancia(
    @Param("id", ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.matriculasService.generarConstanciaPdf(id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="constancia-matricula-${id}.pdf"`);
    res.setHeader("Content-Length", buffer.length);
    res.end(buffer);
  }

  @Post()
  @Roles("Administrador", "Secretaria")
  @ApiOperation({ summary: "Matricular individualmente a un estudiante" })
  @ApiResponse({ status: 201, type: MatriculaCreatedResponseDto })
  async matricular(
    @Body() dto: CrearMatriculaDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<MatriculaCreatedResponseDto> {
    return this.matriculasService.matricular(dto, user.id, client.ip);
  }

  @Post("masiva")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({ summary: "Matrícula masiva de continuadores respetando vacantes" })
  @ApiResponse({ status: 201, type: MatriculaMasivaResultadoDto })
  async matricularMasivamente(
    @Body() dto: MatriculaMasivaDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<MatriculaMasivaResultadoDto> {
    return this.matriculasService.matricularMasivamente(dto, user.id, client.ip);
  }

  @Post("lote")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({ summary: "Matrícula en lote de estudiantes del padrón en una sección" })
  @ApiResponse({ status: 201, type: MatriculaMasivaResultadoDto })
  async matricularLote(
    @Body() dto: MatricularLoteDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<MatriculaMasivaResultadoDto> {
    return this.matriculasService.matricularLote(dto, user.id, client.ip);
  }

  @Post(":id/retirar")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({
    summary: "Registrar retiro del estudiante y desactivar credenciales",
  })
  @ApiResponse({ status: 200, type: MatriculaResponseDto })
  async retirar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RetirarMatriculaDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<MatriculaResponseDto> {
    return this.matriculasService.retirar(id, dto, user.id, client.ip);
  }

  @Post(":id/trasladar")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({
    summary: "Registrar traslado a otro colegio y desactivar credenciales",
  })
  @ApiResponse({ status: 200, type: MatriculaResponseDto })
  async trasladar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: TrasladarMatriculaDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<MatriculaResponseDto> {
    return this.matriculasService.trasladar(id, dto, user.id, client.ip);
  }

  @Put(":id/cambiar-seccion")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({ summary: "Cambiar de sección dentro del mismo grado" })
  @ApiResponse({ status: 200, type: MatriculaResponseDto })
  async cambiarSeccion(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CambiarSeccionDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<MatriculaResponseDto> {
    return this.matriculasService.cambiarSeccion(id, dto, user.id, client.ip);
  }

  @Delete(":id")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({
    summary: "Anular matrícula registrada por error si aún no tiene actividad",
  })
  @ApiResponse({ status: 200 })
  async anular(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<{ message: string }> {
    return this.matriculasService.anular(id, user.id, client.ip);
  }
}
