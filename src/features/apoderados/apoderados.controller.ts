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
import { ApoderadosService } from "./apoderados.service";
import {
  ApoderadoQueryDto,
  ApoderadoResponseDto,
  CreateApoderadoDto,
  CreateApoderadoResponseDto,
  EstudianteDelApoderadoResponseDto,
  PaginatedApoderadosResponseDto,
  UpdateApoderadoDto,
  VincularEstudianteApoderadoDto,
  VinculoFamiliarResponseDto,
} from "./dto";

@ApiTags("Comunidad - Apoderados")
@ApiBearerAuth()
@Controller("apoderados")
export class ApoderadosController {
  constructor(private readonly apoderadosService: ApoderadosService) {}

  @Get()
  @Roles("Administrador", "Director", "Subdirector", "Secretaria")
  @ApiOperation({
    summary: "Listar apoderados con paginación por cursor y filtros",
  })
  @ApiResponse({ status: 200, type: PaginatedApoderadosResponseDto })
  async findAll(@Query() query: ApoderadoQueryDto): Promise<PaginatedApoderadosResponseDto> {
    return this.apoderadosService.findAll(query);
  }

  @Get("mis-estudiantes")
  @Roles("Apoderado")
  @ApiOperation({
    summary: "Listar los estudiantes vinculados al apoderado autenticado",
  })
  @ApiResponse({ status: 200, type: [EstudianteDelApoderadoResponseDto] })
  async misEstudiantes(
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<EstudianteDelApoderadoResponseDto[]> {
    return this.apoderadosService.findMisEstudiantes(usuario.personaId);
  }

  @Get("estudiante/:estudianteId")
  @Roles("Administrador", "Director", "Subdirector", "Secretaria", "Docente")
  @ApiOperation({ summary: "Listar apoderados vinculados a un estudiante específico" })
  @ApiResponse({ status: 200, type: [ApoderadoResponseDto] })
  async findByEstudianteId(
    @Param("estudianteId", ParseUUIDPipe) estudianteId: string,
  ): Promise<ApoderadoResponseDto[]> {
    return this.apoderadosService.findByEstudianteId(estudianteId);
  }

  @Get(":id")
  @Roles("Administrador", "Director", "Subdirector", "Secretaria")
  @ApiOperation({ summary: "Obtener detalle completo de un apoderado por ID" })
  @ApiResponse({ status: 200, type: ApoderadoResponseDto })
  @ApiResponse({ status: 404, description: "Apoderado no encontrado" })
  async findById(@Param("id", ParseUUIDPipe) id: string): Promise<ApoderadoResponseDto> {
    return this.apoderadosService.findById(id);
  }

  @Post()
  @Roles("Administrador", "Secretaria")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Registrar apoderado con vinculación al padrón, cargo, cuenta y vínculo escolar opcional",
  })
  @ApiResponse({ status: 201, type: CreateApoderadoResponseDto })
  @ApiResponse({ status: 409, description: "La persona ya cuenta con ficha de apoderado" })
  async create(
    @Body() dto: CreateApoderadoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<CreateApoderadoResponseDto> {
    return this.apoderadosService.create(dto, user.id, clientInfo.ip);
  }

  @Patch(":id")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({ summary: "Actualizar datos laborales o de instrucción del apoderado" })
  @ApiResponse({ status: 200, type: ApoderadoResponseDto })
  @ApiResponse({ status: 404, description: "Apoderado no encontrado" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateApoderadoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<ApoderadoResponseDto> {
    return this.apoderadosService.update(id, dto, user.id, clientInfo.ip);
  }

  @Delete(":id")
  @Roles("Administrador")
  @ApiOperation({ summary: "Dar de baja una ficha de apoderado (soft delete)" })
  @ApiResponse({ status: 200, description: "Apoderado eliminado correctamente" })
  @ApiResponse({ status: 404, description: "Apoderado no encontrado" })
  async delete(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<{ message: string }> {
    return this.apoderadosService.delete(id, user.id, clientInfo.ip);
  }

  @Post("vincular")
  @Roles("Administrador", "Secretaria")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Vincular o actualizar parentesco entre un estudiante y apoderado" })
  @ApiResponse({ status: 200, type: VinculoFamiliarResponseDto })
  async vincular(
    @Body() dto: VincularEstudianteApoderadoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<VinculoFamiliarResponseDto> {
    return this.apoderadosService.vincularEstudiante(dto, user.id, clientInfo.ip);
  }

  @Delete("desvincular/:estudianteId/:apoderadoId")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({ summary: "Desvincular a un apoderado de un estudiante" })
  @ApiResponse({ status: 200, description: "Vínculo familiar retirado correctamente" })
  @ApiResponse({ status: 404, description: "Vínculo no encontrado" })
  async desvincular(
    @Param("estudianteId", ParseUUIDPipe) estudianteId: string,
    @Param("apoderadoId", ParseUUIDPipe) apoderadoId: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<{ message: string }> {
    return this.apoderadosService.desvincularEstudiante(
      estudianteId,
      apoderadoId,
      user.id,
      clientInfo.ip,
    );
  }
}
