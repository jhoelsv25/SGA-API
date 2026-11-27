import { MenuAlternativo } from "../../common/decorators/menu-alternativo.decorator";
import { MENU_ESTUDIANTES } from "../../common/constants/menu-rutas.constants";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { DarBajaFichaActualDto } from "../personas/dto/baja-ficha.dto";
import { EstudiantesService } from "./estudiantes.service";
import {
  CreateEstudianteDto,
  CreateEstudianteResponseDto,
  EstudianteQueryDto,
  EstudianteResponseDto,
  OcrDocumentoEstudianteResponseDto,
  PaginatedEstudiantesResponseDto,
  UpdateEstudianteDto,
} from "./dto";

@ApiTags("Comunidad - Estudiantes")
@ApiBearerAuth()
@MenuAlternativo(MENU_ESTUDIANTES)
@Controller("estudiantes")
export class EstudiantesController {
  constructor(private readonly estudiantesService: EstudiantesService) {}

  @Get()
  @Roles("Administrador", "Director", "Subdirector", "Secretaria")
  @ApiOperation({
    summary: "Listar estudiantes con paginación por cursor y filtros",
  })
  @ApiResponse({ status: 200, type: PaginatedEstudiantesResponseDto })
  async findAll(@Query() query: EstudianteQueryDto): Promise<PaginatedEstudiantesResponseDto> {
    return this.estudiantesService.findAll(query);
  }

  @Get("resumen")
  @Roles("Administrador", "Director", "Subdirector", "Secretaria")
  @ApiOperation({
    summary: "Resumen de totales del padrón de estudiantes por estado",
  })
  async obtenerResumen(@Query() query: EstudianteQueryDto) {
    return this.estudiantesService.obtenerResumen(query);
  }

  @Get(":id")
  @Roles("Administrador", "Director", "Subdirector", "Secretaria")
  @ApiOperation({ summary: "Obtener detalle completo de un estudiante por ID" })
  @ApiResponse({ status: 200, type: EstudianteResponseDto })
  @ApiResponse({ status: 404, description: "Estudiante no encontrado" })
  async findById(@Param("id", ParseUUIDPipe) id: string): Promise<EstudianteResponseDto> {
    return this.estudiantesService.findById(id);
  }

  @Post("ocr-documento")
  @Roles("Administrador", "Secretaria")
  @HttpCode(HttpStatus.OK)
  @Throttle({ long: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor("archivo", { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Extraer datos de DNI o ficha de estudiante desde imagen/PDF usando OCR",
  })
  @ApiResponse({ status: 200, type: OcrDocumentoEstudianteResponseDto })
  async leerDocumentoOcr(
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<OcrDocumentoEstudianteResponseDto> {
    return this.estudiantesService.extraerDatosDocumentoOcr(archivo, user.id, client.ip);
  }

  @Post()
  @Roles("Administrador", "Secretaria")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Registrar estudiante con vinculación al padrón, cargo, cuenta y credencial de marcación",
  })
  @ApiResponse({ status: 201, type: CreateEstudianteResponseDto })
  @ApiResponse({ status: 400, description: "Datos inválidos" })
  @ApiResponse({ status: 409, description: "Código SIAGIE duplicado o persona ya estudiante" })
  async create(
    @Body() dto: CreateEstudianteDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<CreateEstudianteResponseDto> {
    return this.estudiantesService.create(dto, user.id, client.ip);
  }

  @Patch(":id")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({ summary: "Actualizar datos de la ficha médica o escolar del estudiante" })
  @ApiResponse({ status: 200, type: EstudianteResponseDto })
  @ApiResponse({ status: 400, description: "Datos inválidos" })
  @ApiResponse({ status: 404, description: "Estudiante no encontrado" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateEstudianteDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<EstudianteResponseDto> {
    return this.estudiantesService.update(id, dto, user.id, client.ip);
  }

  @Delete(":id")
  @Roles("Administrador")
  @ApiOperation({ summary: "Eliminar lógicamente la ficha del estudiante" })
  @ApiResponse({ status: 200, description: "Estudiante eliminado correctamente" })
  @ApiResponse({ status: 404, description: "Estudiante no encontrado" })
  async delete(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<{ message: string }> {
    return this.estudiantesService.delete(id, user.id, client.ip);
  }

  @Post(":id/baja")
  @HttpCode(HttpStatus.OK)
  @Roles("Administrador", "Secretaria")
  @ApiOperation({
    summary: "Dar de baja la ficha del estudiante (retirado). Se bloquea si tiene matrícula activa",
  })
  @ApiResponse({ status: 200, description: "Ficha dada de baja" })
  @ApiResponse({ status: 404, description: "Estudiante no encontrado" })
  @ApiResponse({ status: 409, description: "Tiene una matrícula activa (FICHA_CON_DEPENDENCIAS)" })
  async darDeBaja(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DarBajaFichaActualDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<{ estudiante: EstudianteResponseDto; message: string }> {
    return this.estudiantesService.darDeBaja(id, dto, user.id, client.ip);
  }

  @Post(":id/reactivar")
  @HttpCode(HttpStatus.OK)
  @Roles("Administrador", "Secretaria")
  @ApiOperation({
    summary: "Reactivar un estudiante retirado o trasladado (sin ficha de docente vigente)",
  })
  @ApiResponse({ status: 200, description: "Ficha reactivada" })
  @ApiResponse({ status: 404, description: "Estudiante no encontrado" })
  @ApiResponse({ status: 409, description: "La persona tiene una ficha de docente vigente" })
  async reactivar(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<{ estudiante: EstudianteResponseDto; message: string }> {
    return this.estudiantesService.reactivar(id, user.id, client.ip);
  }
}
