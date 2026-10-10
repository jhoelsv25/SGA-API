<<<<<<< HEAD
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { HEADER_ANIO_ACADEMICO } from "../../common/anio-lectivo";
import { MENU_SECCIONES } from "../../common/constants";
import { ClientInfo, type ClientInfoData, CurrentUser, MenuAccess } from "../../common/decorators";
=======
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
>>>>>>> ab15606 (feat(api): implementar RF-009 matriculas, retiro, traslado y base de secciones)
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { CreateSeccionDto, SeccionQueryDto, SeccionResponseDto, UpdateSeccionDto } from "./dto";
import { SeccionesService } from "./secciones.service";

<<<<<<< HEAD
@ApiTags("Secciones")
@ApiBearerAuth()
@ApiHeader({
  name: HEADER_ANIO_ACADEMICO,
  required: false,
  description: "Año lectivo de trabajo. Si se omite, se opera con el año en curso.",
})
@Controller("secciones")
export class SeccionesController {
  constructor(private readonly service: SeccionesService) {}

  @Post()
  @MenuAccess(MENU_SECCIONES)
  @ApiOperation({ summary: "Crear una nueva sección con su carga académica automática" })
  @ApiResponse({
    status: 201,
    description: "Sección creada exitosamente",
    type: SeccionResponseDto,
  })
  async create(
    @Body() dto: CreateSeccionDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<SeccionResponseDto> {
    return this.service.create(dto, usuario.id, clientInfo.ip);
  }

  @Patch(":id")
  @MenuAccess(MENU_SECCIONES)
  @ApiOperation({ summary: "Modificar datos de una sección existente" })
  @ApiParam({ name: "id", description: "UUID de la sección a modificar" })
  @ApiResponse({
    status: 200,
    description: "Sección actualizada",
    type: SeccionResponseDto,
  })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateSeccionDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<SeccionResponseDto> {
    return this.service.update(id, dto, usuario.id, clientInfo.ip);
  }

  @Patch(":id/cerrar")
  @MenuAccess(MENU_SECCIONES)
  @ApiOperation({ summary: "Cerrar una sección sin estudiantes matriculados" })
  @ApiParam({ name: "id", description: "UUID de la sección a cerrar" })
  @ApiResponse({
    status: 200,
    description: "Sección cerrada",
    type: SeccionResponseDto,
  })
  async cerrar(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<SeccionResponseDto> {
    return this.service.cerrar(id, usuario.id, clientInfo.ip);
  }

  @Get()
  @ApiOperation({ summary: "Listar las secciones del año lectivo" })
  @ApiResponse({
    status: 200,
    description: "Listado de secciones",
    type: [SeccionResponseDto],
  })
  async findAll(@Query() query: SeccionQueryDto): Promise<SeccionResponseDto[]> {
    return this.service.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener detalle de una sección por su UUID" })
  @ApiParam({ name: "id", description: "UUID de la sección" })
  @ApiResponse({
    status: 200,
    description: "Detalle de la sección",
    type: SeccionResponseDto,
  })
  async findById(@Param("id", ParseUUIDPipe) id: string): Promise<SeccionResponseDto> {
    return this.service.findById(id);
=======
@ApiTags("Organización - Secciones y Vacantes")
@ApiBearerAuth()
@Controller("secciones")
export class SeccionesController {
  constructor(private readonly seccionesService: SeccionesService) {}

  @Get()
  @ApiOperation({ summary: "Listar secciones con conteo de matriculados y vacantes disponibles" })
  @ApiResponse({ status: 200, type: [SeccionResponseDto] })
  async findAll(@Query() query: SeccionQueryDto): Promise<SeccionResponseDto[]> {
    return this.seccionesService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener detalle de una sección" })
  @ApiResponse({ status: 200, type: SeccionResponseDto })
  async findById(@Param("id", ParseUUIDPipe) id: string): Promise<SeccionResponseDto> {
    return this.seccionesService.findById(id);
  }

  @Post()
  @Roles("Administrador")
  @ApiOperation({ summary: "Crear una nueva sección para un grado y año escolar" })
  @ApiResponse({ status: 201, type: SeccionResponseDto })
  async create(
    @Body() dto: CreateSeccionDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<SeccionResponseDto> {
    return this.seccionesService.create(dto, user.id, client.ip);
  }

  @Put(":id")
  @Roles("Administrador")
  @ApiOperation({ summary: "Actualizar datos, vacantes o estado de una sección" })
  @ApiResponse({ status: 200, type: SeccionResponseDto })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateSeccionDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<SeccionResponseDto> {
    return this.seccionesService.update(id, dto, user.id, client.ip);
>>>>>>> ab15606 (feat(api): implementar RF-009 matriculas, retiro, traslado y base de secciones)
  }
}
