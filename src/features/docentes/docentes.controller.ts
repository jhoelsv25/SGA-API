import {
  Body,
  Controller,
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
import { DocentesService } from "./docentes.service";
import {
  CesarDocenteDto,
  CreateDocenteDto,
  CreateDocenteResponseDto,
  DocenteQueryDto,
  DocenteResponseDto,
  PaginatedDocentesResponseDto,
  UpdateDocenteDto,
} from "./dto";

@ApiTags("Comunidad - Docentes")
@ApiBearerAuth()
@Controller("docentes")
export class DocentesController {
  constructor(private readonly docentesService: DocentesService) {}

  @Get()
  @Roles("Administrador", "Director", "Subdirector", "Secretaria")
  @ApiOperation({
    summary: "Listar docentes con paginación por cursor y filtros (RF-007 V3)",
  })
  @ApiResponse({ status: 200, type: PaginatedDocentesResponseDto })
  async findAll(@Query() query: DocenteQueryDto): Promise<PaginatedDocentesResponseDto> {
    return this.docentesService.findAll(query);
  }

  @Get(":id")
  @Roles("Administrador", "Director", "Subdirector", "Secretaria")
  @ApiOperation({ summary: "Obtener detalle completo de un docente por ID" })
  @ApiResponse({ status: 200, type: DocenteResponseDto })
  @ApiResponse({ status: 404, description: "Docente no encontrado" })
  async findById(@Param("id", ParseUUIDPipe) id: string): Promise<DocenteResponseDto> {
    return this.docentesService.findById(id);
  }

  @Post()
  @Roles("Administrador")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Registrar docente con vinculación al padrón, cargo, cuenta y credencial de marcación (RF-007 V3)",
  })
  @ApiResponse({ status: 201, type: CreateDocenteResponseDto })
  @ApiResponse({ status: 400, description: "Datos inválidos" })
  @ApiResponse({ status: 409, description: "Código duplicado o persona ya docente" })
  async create(
    @Body() dto: CreateDocenteDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<CreateDocenteResponseDto> {
    return this.docentesService.create(dto, user.id, client.ip);
  }

  @Patch(":id")
  @Roles("Administrador")
  @ApiOperation({ summary: "Actualizar datos de la ficha docente" })
  @ApiResponse({ status: 200, type: DocenteResponseDto })
  @ApiResponse({ status: 400, description: "Fechas inválidas" })
  @ApiResponse({ status: 404, description: "Docente no encontrado" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocenteDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<DocenteResponseDto> {
    return this.docentesService.update(id, dto, user.id, client.ip);
  }

  @Post(":id/cesar")
  @Roles("Administrador")
  @ApiOperation({
    summary:
      "Registrar cese del docente, evaluando retiro de rol o desactivación de cuenta (RF-007 V3)",
  })
  @ApiResponse({ status: 200, description: "Docente cesado correctamente" })
  @ApiResponse({ status: 400, description: "Docente ya cesado o fecha inválida" })
  @ApiResponse({ status: 404, description: "Docente no encontrado" })
  async cesar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CesarDocenteDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<{ docente: DocenteResponseDto; message: string }> {
    return this.docentesService.cesar(id, dto, user.id, client.ip);
  }
}
