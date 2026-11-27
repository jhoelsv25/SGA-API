import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { MENU_AUSENCIAS_DOCENTES, MENU_MIS_AUSENCIAS } from "../../../common/constants";
import {
  ClientInfo,
  type ClientInfoData,
  CurrentUser,
  MenuAccess,
} from "../../../common/decorators";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { AusenciasDocenteService } from "../services/ausencias-docente.service";
import { FOTO_TAMANO_MAXIMO_BYTES } from "../constants";
import {
  AnularAusenciaDto,
  AusenciaResponseDto,
  CorregirAusenciaDto,
  FiltroAusenciasQueryDto,
  HistorialAusenciaResponseDto,
  MensajeAusenciaResponseDto,
  RegistrarAusenciaDto,
  RegistrarDescargoDto,
  ResumenAusenciasSupervisorResponseDto,
} from "../dto";

const OPCIONES_SUBIDA_FOTOS = { limits: { fileSize: FOTO_TAMANO_MAXIMO_BYTES } };

@ApiTags("Ausencias y supervisión docente")
@Controller("ausencias-docente")
export class AusenciasDocenteController {
  constructor(private readonly service: AusenciasDocenteService) {}

  // ==========================================
  // SUPERVISOR (Director, Subdirector, Admin)
  // ==========================================

  @Post()
  @ApiBearerAuth()
  @MenuAccess(MENU_AUSENCIAS_DOCENTES)
  @UseInterceptors(FilesInterceptor("fotos", 5, OPCIONES_SUBIDA_FOTOS))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Registrar una ausencia docente en una sesión de clase" })
  @ApiResponse({
    status: 201,
    description: "Ausencia registrada exitosamente",
    type: MensajeAusenciaResponseDto,
  })
  async registrar(
    @Body() dto: RegistrarAusenciaDto,
    @UploadedFiles() fotos: Express.Multer.File[] | undefined,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MensajeAusenciaResponseDto & { ausencia: AusenciaResponseDto }> {
    return this.service.registrar(dto, fotos, usuario.id, clientInfo.ip);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @MenuAccess(MENU_AUSENCIAS_DOCENTES)
  @UseInterceptors(FilesInterceptor("fotos", 5, OPCIONES_SUBIDA_FOTOS))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Corregir una ausencia dentro de las 24 horas" })
  @ApiResponse({
    status: 200,
    description: "Ausencia corregida exitosamente",
    type: AusenciaResponseDto,
  })
  async corregir(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CorregirAusenciaDto,
    @UploadedFiles() fotos: Express.Multer.File[] | undefined,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<AusenciaResponseDto> {
    return this.service.corregir(id, dto, fotos, usuario.id, clientInfo.ip);
  }

  @Patch(":id/anular")
  @ApiBearerAuth()
  @MenuAccess(MENU_AUSENCIAS_DOCENTES)
  @ApiOperation({ summary: "Anular una ausencia indicando el motivo" })
  @ApiResponse({
    status: 200,
    description: "Ausencia anulada exitosamente",
    type: AusenciaResponseDto,
  })
  async anular(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AnularAusenciaDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<AusenciaResponseDto> {
    return this.service.anular(id, dto, usuario.id, clientInfo.ip);
  }

  @Get(":id/historial")
  @ApiBearerAuth()
  @MenuAccess(MENU_AUSENCIAS_DOCENTES)
  @ApiOperation({ summary: "Historial completo de versiones de una ausencia" })
  @ApiResponse({
    status: 200,
    description: "Historial de versiones de la ausencia",
    type: HistorialAusenciaResponseDto,
  })
  async obtenerHistorial(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<HistorialAusenciaResponseDto> {
    return this.service.obtenerHistorial(id);
  }

  @Get()
  @ApiBearerAuth()
  @MenuAccess(MENU_AUSENCIAS_DOCENTES)
  @ApiOperation({
    summary: "Listado de ausencias para supervisores con filtros e indicadores",
  })
  @ApiResponse({
    status: 200,
    description: "Resumen de ausencias consultadas",
    type: ResumenAusenciasSupervisorResponseDto,
  })
  async listarSupervisor(
    @Query() query: FiltroAusenciasQueryDto,
  ): Promise<ResumenAusenciasSupervisorResponseDto> {
    return this.service.listarSupervisor(query);
  }

  // ==========================================
  // DOCENTE (Mis ausencias y descargo)
  // ==========================================

  @Get("mis-ausencias")
  @ApiBearerAuth()
  @MenuAccess(MENU_MIS_AUSENCIAS)
  @ApiOperation({ summary: "Listado de mis ausencias vigentes" })
  @ApiResponse({
    status: 200,
    description: "Listado de ausencias vigentes del docente autenticado",
    type: [AusenciaResponseDto],
  })
  async misAusencias(@CurrentUser() usuario: AuthenticatedUser): Promise<AusenciaResponseDto[]> {
    return this.service.misAusencias(usuario.personaId);
  }

  @Get("mis-ausencias/:id")
  @ApiBearerAuth()
  @MenuAccess(MENU_MIS_AUSENCIAS)
  @ApiOperation({ summary: "Detalle de una ausencia del docente autenticado" })
  @ApiResponse({
    status: 200,
    description: "Detalle de la ausencia del docente",
    type: AusenciaResponseDto,
  })
  async obtenerDetalleDocente(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<AusenciaResponseDto> {
    return this.service.obtenerDetalleDocente(id, usuario.personaId);
  }

  @Post("mis-ausencias/:id/descargo")
  @ApiBearerAuth()
  @MenuAccess(MENU_MIS_AUSENCIAS)
  @ApiOperation({ summary: "Presentar descargo a una ausencia dentro del plazo" })
  @ApiResponse({
    status: 200,
    description: "Descargo registrado exitosamente",
    type: MensajeAusenciaResponseDto,
  })
  async presentarDescargo(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RegistrarDescargoDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MensajeAusenciaResponseDto> {
    return this.service.presentarDescargo(id, dto, usuario.personaId, usuario.id, clientInfo.ip);
  }
}
