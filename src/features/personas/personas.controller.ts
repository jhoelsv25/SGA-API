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
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import {
  CreatePersonaDto,
  HistorialCorreccionCriticaDto,
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
@Controller("personas")
export class PersonasController {
  constructor(private readonly personasService: PersonasService) {}

  @Get()
  @ApiOperation({
    summary: "Listar personas del padrón único con paginación por cursor y filtros (RF-007)",
  })
  @ApiResponse({ status: 200, type: PaginatedPersonasResponseDto })
  async findAll(@Query() query: PersonaQueryDto): Promise<PaginatedPersonasResponseDto> {
    return this.personasService.findAll(query);
  }

  @Get("buscar")
  @ApiOperation({
    summary:
      "Búsqueda preventiva de personas por documento o nombre antes de crear una ficha (RF-007 V3)",
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
    summary: "Consultar historial de correcciones de datos críticos de una persona (RF-007 HU6)",
    description:
      "Retorna la bitácora de modificaciones realizadas a los datos protegidos con motivo, autor y fecha.",
  })
  @ApiResponse({ status: 200, type: [HistorialCorreccionCriticaDto] })
  async findHistorialCritico(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<HistorialCorreccionCriticaDto[]> {
    return this.personasService.findHistorialCritico(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Registrar una persona (provisional o en padrón único) (RF-007 V3)",
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
      "Actualizar datos de una persona. Si es crítica y no provisional, exige rol Administrador y motivo (RF-007 V3)",
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
