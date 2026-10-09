import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { HEADER_ANIO_ACADEMICO } from "../../common/anio-lectivo";
import { MENU_HORARIOS } from "../../common/constants";
import { ClientInfo, type ClientInfoData, CurrentUser, MenuAccess } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import {
  BloqueMutacionResponseDto,
  CreateBloqueHorarioDto,
  ListarPorSeccionResponseDto,
  UpdateBloqueHorarioDto,
} from "./dto";
import { HorariosService } from "./horarios.service";

@ApiTags("Horarios")
@ApiBearerAuth()
@ApiHeader({
  name: HEADER_ANIO_ACADEMICO,
  required: false,
  description: "Año lectivo de trabajo. Si se omite, se opera con el año en curso.",
})
@Controller("horarios")
export class HorariosController {
  constructor(private readonly service: HorariosService) {}

  @Post("seccion/:seccionId/bloques")
  @MenuAccess(MENU_HORARIOS)
  @ApiOperation({ summary: "Crear un nuevo bloque de horario para una sección" })
  @ApiParam({ name: "seccionId", description: "UUID de la sección escolar" })
  @ApiResponse({
    status: 201,
    description: "Bloque registrado exitosamente",
    type: BloqueMutacionResponseDto,
  })
  async crearBloque(
    @Param("seccionId", ParseUUIDPipe) seccionId: string,
    @Body() dto: CreateBloqueHorarioDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<BloqueMutacionResponseDto> {
    return this.service.crearBloque(seccionId, dto, usuario.id, clientInfo.ip);
  }

  @Patch("bloques/:id")
  @MenuAccess(MENU_HORARIOS)
  @ApiOperation({ summary: "Actualizar un bloque de horario existente" })
  @ApiParam({ name: "id", description: "UUID del bloque de horario a modificar" })
  @ApiResponse({
    status: 200,
    description: "Bloque actualizado exitosamente",
    type: BloqueMutacionResponseDto,
  })
  async actualizarBloque(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateBloqueHorarioDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<BloqueMutacionResponseDto> {
    return this.service.actualizarBloque(id, dto, usuario.id, clientInfo.ip);
  }

  @Delete("bloques/:id")
  @MenuAccess(MENU_HORARIOS)
  @ApiOperation({ summary: "Eliminar un bloque de horario" })
  @ApiParam({ name: "id", description: "UUID del bloque de horario a eliminar" })
  @ApiResponse({
    status: 200,
    description: "Bloque eliminado exitosamente",
  })
  async eliminarBloque(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<void> {
    return this.service.eliminarBloque(id, usuario.id, clientInfo.ip);
  }

  @Get("seccion/:seccionId")
  @ApiOperation({
    summary: "Listar bloques de horario de una sección con resumen de horas vs plan",
  })
  @ApiParam({ name: "seccionId", description: "UUID de la sección escolar" })
  @ApiResponse({
    status: 200,
    description: "Listado de bloques de la sección y resumen de horas",
    type: ListarPorSeccionResponseDto,
  })
  async listarPorSeccion(
    @Param("seccionId", ParseUUIDPipe) seccionId: string,
  ): Promise<ListarPorSeccionResponseDto> {
    return this.service.listarPorSeccion(seccionId);
  }
}
