import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { CreateCursoDto, CursoResponseDto, FilterCursoDto, UpdateCursoDto } from "./dto";
import { CursosService } from "./cursos.service";

@ApiTags("Cursos")
@ApiBearerAuth()
@Controller("cursos")
export class CursosController {
  constructor(private readonly service: CursosService) {}

  @Get()
  @Roles("Administrador", "Director", "Coordinador", "Secretaria", "Docente")
  @ApiOperation({ summary: "Listar catálogo de cursos (con filtros de estado, área y búsqueda)" })
  @ApiResponse({
    status: 200,
    description: "Catálogo de cursos",
    type: [CursoResponseDto],
  })
  async findAll(@Query() filter: FilterCursoDto): Promise<CursoResponseDto[]> {
    return this.service.findAll(filter);
  }

  @Get(":id")
  @Roles("Administrador", "Director", "Coordinador", "Secretaria", "Docente")
  @ApiOperation({ summary: "Obtener detalle de un curso por ID" })
  @ApiParam({ name: "id", description: "UUID del curso" })
  @ApiResponse({
    status: 200,
    description: "Detalle del curso",
    type: CursoResponseDto,
  })
  async findById(@Param("id") id: string): Promise<CursoResponseDto> {
    return this.service.findById(id);
  }

  @Post()
  @Roles("Administrador")
  @ApiOperation({ summary: "Registrar una nueva asignatura en el catálogo (Solo Administrador)" })
  @ApiResponse({
    status: 201,
    description: "Curso registrado exitosamente",
    type: CursoResponseDto,
  })
  async create(
    @Body() dto: CreateCursoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<CursoResponseDto> {
    return this.service.create(dto, user.id, clientInfo.ip);
  }

  @Patch(":id")
  @Roles("Administrador")
  @ApiOperation({ summary: "Modificar datos de un curso (Solo Administrador)" })
  @ApiParam({ name: "id", description: "UUID del curso" })
  @ApiResponse({
    status: 200,
    description: "Curso modificado exitosamente",
    type: CursoResponseDto,
  })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateCursoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<CursoResponseDto> {
    return this.service.update(id, dto, user.id, clientInfo.ip);
  }

  @Patch(":id/desactivar")
  @Roles("Administrador")
  @ApiOperation({
    summary: "Desactivar un curso del catálogo si no está en uso (Solo Administrador)",
  })
  @ApiParam({ name: "id", description: "UUID del curso" })
  @ApiResponse({
    status: 200,
    description: "Curso desactivado correctamente",
    type: CursoResponseDto,
  })
  async deactivate(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<CursoResponseDto> {
    return this.service.deactivate(id, user.id, clientInfo.ip);
  }

  @Patch(":id/reactivar")
  @Roles("Administrador")
  @ApiOperation({ summary: "Reactivar un curso inactivo en el catálogo (Solo Administrador)" })
  @ApiParam({ name: "id", description: "UUID del curso" })
  @ApiResponse({
    status: 200,
    description: "Curso reactivado exitosamente",
    type: CursoResponseDto,
  })
  async reactivate(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<CursoResponseDto> {
    return this.service.reactivate(id, user.id, clientInfo.ip);
  }
}
