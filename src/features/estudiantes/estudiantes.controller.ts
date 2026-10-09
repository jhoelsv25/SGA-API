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
import { EstudiantesService } from "./estudiantes.service";
import {
  CreateEstudianteDto,
  CreateEstudianteResponseDto,
  EstudianteQueryDto,
  EstudianteResponseDto,
  PaginatedEstudiantesResponseDto,
  UpdateEstudianteDto,
} from "./dto";

@ApiTags("Comunidad - Estudiantes")
@ApiBearerAuth()
@Controller("estudiantes")
export class EstudiantesController {
  constructor(private readonly estudiantesService: EstudiantesService) {}

  @Get()
  @Roles("Administrador", "Director", "Subdirector", "Secretaria")
  @ApiOperation({
    summary: "Listar estudiantes con paginación por cursor y filtros (RF-007 V3)",
  })
  @ApiResponse({ status: 200, type: PaginatedEstudiantesResponseDto })
  async findAll(@Query() query: EstudianteQueryDto): Promise<PaginatedEstudiantesResponseDto> {
    return this.estudiantesService.findAll(query);
  }

  @Get(":id")
  @Roles("Administrador", "Director", "Subdirector", "Secretaria")
  @ApiOperation({ summary: "Obtener detalle completo de un estudiante por ID" })
  @ApiResponse({ status: 200, type: EstudianteResponseDto })
  @ApiResponse({ status: 404, description: "Estudiante no encontrado" })
  async findById(@Param("id", ParseUUIDPipe) id: string): Promise<EstudianteResponseDto> {
    return this.estudiantesService.findById(id);
  }

  @Post()
  @Roles("Administrador", "Secretaria")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Registrar estudiante con vinculación al padrón, cargo, cuenta y credencial de marcación (RF-007 V3)",
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
}
