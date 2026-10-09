import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { HEADER_ANIO_ACADEMICO } from "../../common/anio-lectivo";
import { MENU_HORARIOS } from "../../common/constants";
import { ClientInfo, type ClientInfoData, CurrentUser, MenuAccess } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { MENSAJES_HORARIOS, REGEX_HORA_HH_MM } from "./constants";
import {
  BloqueMutacionResponseDto,
  CopiarHorarioResponseDto,
  CreateBloqueHorarioDto,
  GrillaPropuestaResponseDto,
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

  @Get("seccion/:seccionId/grilla")
  @ApiOperation({
    summary: "Proponer la grilla semanal de horario para una sección",
  })
  @ApiParam({ name: "seccionId", description: "UUID de la sección escolar" })
  @ApiQuery({
    name: "horaEntrada",
    required: false,
    description: "Hora de entrada en formato HH:mm (opcional)",
  })
  @ApiResponse({
    status: 200,
    description: "Grilla propuesta con bloques de clase y recesos",
    type: GrillaPropuestaResponseDto,
  })
  async proponerGrilla(
    @Param("seccionId", ParseUUIDPipe) seccionId: string,
    @Query("horaEntrada") horaEntrada?: string,
  ): Promise<GrillaPropuestaResponseDto> {
    if (horaEntrada && !REGEX_HORA_HH_MM.test(horaEntrada)) {
      throw new BadRequestException(MENSAJES_HORARIOS.FORMATO_HORA_INVALIDO);
    }
    return this.service.proponerGrilla(seccionId, horaEntrada);
  }

  @Post("seccion/:destinoId/copiar-de/:origenId")
  @MenuAccess(MENU_HORARIOS)
  @ApiOperation({
    summary: "Copiar el horario de una sección a otra del mismo grado",
  })
  @ApiParam({ name: "destinoId", description: "UUID de la sección destino" })
  @ApiParam({ name: "origenId", description: "UUID de la sección origen" })
  @ApiResponse({
    status: 201,
    description: "Horario copiado exitosamente con detalle de posibles conflictos",
    type: CopiarHorarioResponseDto,
  })
  async copiar(
    @Param("origenId", ParseUUIDPipe) origenId: string,
    @Param("destinoId", ParseUUIDPipe) destinoId: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<CopiarHorarioResponseDto> {
    return this.service.copiar(origenId, destinoId, usuario.id, clientInfo.ip);
  }
}
