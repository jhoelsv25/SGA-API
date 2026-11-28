import { MenuAlternativo } from "../../common/decorators/menu-alternativo.decorator";
import { MENU_PERSONAS } from "../../common/constants/menu-rutas.constants";
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
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import {
  CargoAsignadoResponseDto,
  ChangeCargoDto,
  CreatePersonaDto,
  HistorialCorreccionCriticaDto,
  OcrDocumentoPersonaResponseDto,
  PaginatedPersonasResponseDto,
  PersonaQueryDto,
  PersonaResponseDto,
  SearchPersonaResultDto,
  UpdatePersonaDto,
} from "./dto";
import { PersonasService } from "./personas.service";

@ApiTags("Comunidad - Personas")
@ApiBearerAuth()
@Roles("Administrador", "Secretaria")
@MenuAlternativo(MENU_PERSONAS)
@Controller("personas")
export class PersonasController {
  constructor(private readonly personasService: PersonasService) {}

  @Get()
  @ApiOperation({
    summary: "Listar personas del padrón único con paginación por cursor y filtros",
  })
  @ApiResponse({ status: 200, type: PaginatedPersonasResponseDto })
  async findAll(@Query() query: PersonaQueryDto): Promise<PaginatedPersonasResponseDto> {
    return this.personasService.findAll(query);
  }

  @Get("resumen")
  @ApiOperation({
    summary: "Resumen de totales del padrón único de personas",
  })
  async obtenerResumen(@Query() query: PersonaQueryDto) {
    return this.personasService.obtenerResumen(query);
  }

  @Get("buscar")
  @ApiOperation({
    summary: "Búsqueda preventiva de personas por documento o nombre antes de crear una ficha",
  })
  @ApiResponse({ status: 200, type: SearchPersonaResultDto })
  async search(@Query() query: PersonaQueryDto): Promise<SearchPersonaResultDto> {
    return this.personasService.search(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener detalle de una persona por ID" })
  @ApiResponse({ status: 200, type: PersonaResponseDto })
  @ApiResponse({ status: 404, description: "Persona no encontrada" })
  async findById(@Param("id", ParseUUIDPipe) id: string): Promise<PersonaResponseDto> {
    return this.personasService.findById(id);
  }

  @Get(":id/historial-critico")
  @ApiOperation({
    summary: "Consultar historial de correcciones de datos críticos de una persona",
    description:
      "Retorna la bitácora de modificaciones realizadas a los datos protegidos con motivo, autor y fecha.",
  })
  @ApiResponse({ status: 200, type: [HistorialCorreccionCriticaDto] })
  async findHistorialCritico(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<HistorialCorreccionCriticaDto[]> {
    return this.personasService.findHistorialCritico(id);
  }

  @Post("ocr-documento")
  @HttpCode(HttpStatus.OK)
  @Throttle({ long: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor("archivo", { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Extraer datos de DNI o documento de identidad desde imagen/PDF usando OCR",
  })
  @ApiResponse({ status: 200, type: OcrDocumentoPersonaResponseDto })
  async leerDocumentoOcr(
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<OcrDocumentoPersonaResponseDto> {
    return this.personasService.extraerDatosDocumentoOcr(archivo, user.id, client.ip);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Registrar una persona (provisional o en padrón único)",
  })
  @ApiResponse({ status: 201, type: PersonaResponseDto })
  @ApiResponse({ status: 400, description: "Datos inválidos o fecha futura" })
  @ApiResponse({ status: 409, description: "Documento o correo duplicado" })
  async create(
    @Body() dto: CreatePersonaDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<PersonaResponseDto> {
    return this.personasService.create(dto, user.id, client.ip);
  }

  @Patch(":id")
  @ApiOperation({
    summary:
      "Actualizar datos de una persona. Si es crítica y no provisional, exige rol Administrador y motivo",
  })
  @ApiResponse({ status: 200, type: PersonaResponseDto })
  @ApiResponse({ status: 400, description: "Motivo requerido si se editan datos críticos" })
  @ApiResponse({ status: 403, description: "Rol no autorizado para corregir datos críticos" })
  @ApiResponse({ status: 404, description: "Persona no encontrada" })
  @ApiResponse({ status: 409, description: "Documento o correo duplicado" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePersonaDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<PersonaResponseDto> {
    return this.personasService.update(id, dto, user, client.ip);
  }

  @Patch(":id/cargo")
  @ApiOperation({
    summary:
      "Cambiar el cargo vigente de una persona: el cargo anterior termina y queda en el historial",
  })
  @ApiResponse({ status: 200, type: CargoAsignadoResponseDto })
  @ApiResponse({ status: 404, description: "Persona o cargo no encontrado" })
  @ApiResponse({ status: 409, description: "La persona ya tiene vigente ese cargo" })
  async changeCargo(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ChangeCargoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<CargoAsignadoResponseDto> {
    return this.personasService.changeCargo(id, dto.cargoId, dto.fechaInicio, user.id, client.ip);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Eliminar persona provisional (sin fichas, sin cuentas ni relaciones activas)",
  })
  @ApiResponse({ status: 200, description: "Persona eliminada" })
  @ApiResponse({ status: 404, description: "Persona no encontrada" })
  @ApiResponse({
    status: 409,
    description: "No se puede eliminar una persona con fichas o cuenta asociadas",
  })
  async delete(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<{ success: boolean; message: string }> {
    return this.personasService.delete(id, user.id, client.ip);
  }
}
