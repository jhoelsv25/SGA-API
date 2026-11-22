import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Put, Query } from "@nestjs/common";
import { HEADER_ANIO_ACADEMICO } from "../../common/anio-lectivo";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { MENU_ASISTENCIA_CLASE } from "../../common/constants";
import { ClientInfo, type ClientInfoData, CurrentUser, MenuAccess } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { AsistenciaClaseService } from "./asistencia-clase.service";
import {
  AsistenciaEstudianteResponseDto,
  AsistenciaSeccionResponseDto,
  ConsultaAsistenciaQueryDto,
  EstudianteVinculadoAsistenciaDto,
  GuardarAsistenciaDto,
  GuardarAsistenciaResponseDto,
  JustificarFaltaDto,
  ListaAsistenciaSesionResponseDto,
  SeccionConsultableDto,
} from "./dto";

@ApiTags("Asistencia en clase")
@ApiBearerAuth()
@Controller("asistencia-clase")
export class AsistenciaClaseController {
  constructor(private readonly service: AsistenciaClaseService) {}

  @Get("sesiones/:sesionId")
  @ApiOperation({ summary: "Lista de asistencia de una sesión (todos presentes por defecto)" })
  @ApiParam({ name: "sesionId", description: "UUID de la sesión de clase" })
  @ApiResponse({ status: 200, type: ListaAsistenciaSesionResponseDto })
  async listaDeSesion(
    @Param("sesionId", ParseUUIDPipe) sesionId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<ListaAsistenciaSesionResponseDto> {
    return this.service.listaDeSesion(sesionId, usuario);
  }

  @Put("sesiones/:sesionId")
  @MenuAccess(MENU_ASISTENCIA_CLASE)
  @ApiOperation({ summary: "Guardar o corregir la asistencia de una sesión (solo excepciones)" })
  @ApiParam({ name: "sesionId", description: "UUID de la sesión de clase" })
  @ApiResponse({ status: 200, type: GuardarAsistenciaResponseDto })
  async guardar(
    @Param("sesionId", ParseUUIDPipe) sesionId: string,
    @Body() dto: GuardarAsistenciaDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<GuardarAsistenciaResponseDto> {
    return this.service.guardar(sesionId, dto, usuario, clientInfo.ip);
  }

  @Patch(":id/justificar")
  @ApiOperation({ summary: "Justificar una falta (Secretaria o tutor de la sección)" })
  @ApiParam({ name: "id", description: "UUID del registro de asistencia" })
  async justificarFalta(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: JustificarFaltaDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<{ id: string; estado: string }> {
    return this.service.justificarFalta(id, dto, usuario, clientInfo.ip);
  }

  @Get("mis-estudiantes")
  @ApiOperation({ summary: "Estudiantes cuya asistencia puedo consultar (propio o hijos)" })
  @ApiResponse({ status: 200, type: [EstudianteVinculadoAsistenciaDto] })
  async misEstudiantes(
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<EstudianteVinculadoAsistenciaDto[]> {
    return this.service.misEstudiantes(usuario);
  }

  @Get("mis-secciones")
  @ApiHeader({
    name: HEADER_ANIO_ACADEMICO,
    required: false,
    description: "Año lectivo de trabajo. Si se omite, se opera con el año en curso.",
  })
  @ApiOperation({ summary: "Secciones cuya asistencia puedo consultar (tutor o directivos)" })
  @ApiResponse({ status: 200, type: [SeccionConsultableDto] })
  async misSecciones(@CurrentUser() usuario: AuthenticatedUser): Promise<SeccionConsultableDto[]> {
    return this.service.misSecciones(usuario);
  }

  @Get("estudiantes/:estudianteId")
  @ApiOperation({ summary: "Asistencia al colegio y por curso de un estudiante" })
  @ApiParam({ name: "estudianteId", description: "UUID del estudiante" })
  @ApiResponse({ status: 200, type: AsistenciaEstudianteResponseDto })
  async consultarEstudiante(
    @Param("estudianteId", ParseUUIDPipe) estudianteId: string,
    @Query() query: ConsultaAsistenciaQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<AsistenciaEstudianteResponseDto> {
    return this.service.consultarEstudiante(estudianteId, query, usuario);
  }

  @Get("secciones/:seccionId")
  @ApiOperation({ summary: "Asistencia de la sección completa (tutor y directivos)" })
  @ApiParam({ name: "seccionId", description: "UUID de la sección" })
  @ApiResponse({ status: 200, type: AsistenciaSeccionResponseDto })
  async consultarSeccion(
    @Param("seccionId", ParseUUIDPipe) seccionId: string,
    @Query() query: ConsultaAsistenciaQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<AsistenciaSeccionResponseDto> {
    return this.service.consultarSeccion(seccionId, query, usuario);
  }
}
