import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators";
import type { AuthenticatedUser } from "@/features/auth/interfaces";
import { ComunicadosService } from "../services/comunicados.service";
import {
  AvanceLecturaResponseDto,
  ComunicadoQueryDto,
  CrearComunicadoDto,
  PaginatedComunicadosResponseDto,
} from "../dto";

@ApiTags("Comunicación - Comunicados Institucionales")
@ApiBearerAuth()
@Controller("comunicados")
export class ComunicadosController {
  constructor(private readonly comunicadosService: ComunicadosService) {}

  @Get()
  @ApiOperation({
    summary: "Listar comunicados con filtros y paginación por cursor",
  })
  @ApiResponse({ status: 200, type: PaginatedComunicadosResponseDto })
  async listar(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ComunicadoQueryDto,
  ): Promise<PaginatedComunicadosResponseDto> {
    const userContext = {
      id: user.id,
      rol: user.role,
    };
    return this.comunicadosService.listar(userContext, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Redactar un comunicado institucional (borrador o publicación directa)",
  })
  @ApiResponse({ status: 201, description: "Comunicado creado o publicado con éxito" })
  async crear(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CrearComunicadoDto,
    @Ip() ip?: string,
  ): Promise<{ id: string; message: string }> {
    const userContext = {
      id: user.id,
      rol: user.role,
    };
    return this.comunicadosService.crear(dto, userContext, ip);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Obtener detalle de un comunicado y registrar automáticamente la lectura",
  })
  @ApiResponse({ status: 200, description: "Detalle del comunicado" })
  async obtenerPorId(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const userContext = {
      id: user.id,
      rol: user.role,
    };
    return this.comunicadosService.obtenerPorId(id, userContext);
  }

  @Post(":id/publicar")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Publicar un comunicado en estado borrador y despachar notificaciones",
  })
  @ApiResponse({ status: 200, description: "Comunicado publicado y notificaciones encoladas" })
  async publicar(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Ip() ip?: string,
  ): Promise<{ id: string; message: string }> {
    const userContext = {
      id: user.id,
      rol: user.role,
    };
    return this.comunicadosService.publicar(id, userContext, ip);
  }

  @Post(":id/archivar")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Archivar un comunicado publicado",
  })
  @ApiResponse({ status: 200, description: "Comunicado archivado" })
  async archivar(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Ip() ip?: string,
  ): Promise<{ id: string; message: string }> {
    const userContext = {
      id: user.id,
      rol: user.role,
    };
    return this.comunicadosService.archivar(id, userContext, ip);
  }

  @Get(":id/avance")
  @ApiOperation({
    summary: "Consultar el avance de lectura y lista de destinatarios",
  })
  @ApiResponse({ status: 200, type: AvanceLecturaResponseDto })
  async obtenerAvanceLectura(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AvanceLecturaResponseDto> {
    const userContext = {
      id: user.id,
      rol: user.role,
    };
    return this.comunicadosService.obtenerAvanceLectura(id, userContext);
  }
}
