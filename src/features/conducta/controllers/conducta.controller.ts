import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators";
import type { AuthenticatedUser } from "@/features/auth/interfaces";
import { ConductaService } from "../services/conducta.service";
import {
  ActualizarIncidenciaDto,
  AnularIncidenciaDto,
  CrearIncidenciaDto,
  CrearObservacionDto,
  QueryIncidenciasDto,
  QueryObservacionesDto,
} from "../dto";

@ApiTags("Convivencia - Conducta y Observaciones del Estudiante")
@ApiBearerAuth()
@Controller("conducta")
export class ConductaController {
  constructor(private readonly conductaService: ConductaService) {}

  @Post("incidencias")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Registrar incidencia de conducta (mérito o falta)",
  })
  @ApiResponse({ status: 201, description: "Incidencia registrada exitosamente." })
  async registrarIncidencia(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CrearIncidenciaDto,
    @Ip() ip?: string,
  ) {
    const userContext = {
      id: user.id,
      rol: user.role,
    };
    return this.conductaService.registrarIncidencia(dto, userContext, ip);
  }

  @Get("incidencias")
  @ApiOperation({
    summary: "Listar incidencias de conducta con filtros y paginación por cursor",
  })
  async listarIncidencias(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryIncidenciasDto,
  ) {
    const userContext = {
      id: user.id,
      rol: user.role,
    };
    return this.conductaService.listarIncidencias(query, userContext);
  }

  @Patch("incidencias/:id")
  @ApiOperation({
    summary: "Corregir incidencia dentro del plazo de 24 horas",
  })
  async corregirIncidencia(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ActualizarIncidenciaDto,
    @Ip() ip?: string,
  ) {
    const userContext = {
      id: user.id,
      rol: user.role,
    };
    return this.conductaService.corregirIncidencia(id, dto, userContext, ip);
  }

  @Post("incidencias/:id/anular")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Anular una incidencia con motivo obligatorio",
  })
  async anularIncidencia(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AnularIncidenciaDto,
    @Ip() ip?: string,
  ) {
    const userContext = {
      id: user.id,
      rol: user.role,
    };
    return this.conductaService.anularIncidencia(id, dto, userContext, ip);
  }

  @Post("observaciones")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Registrar observación tutorial o psicopedagógica",
  })
  @ApiResponse({ status: 201, description: "Observación registrada exitosamente." })
  async registrarObservacion(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CrearObservacionDto,
    @Ip() ip?: string,
  ) {
    const userContext = {
      id: user.id,
      rol: user.role,
    };
    return this.conductaService.registrarObservacion(dto, userContext, ip);
  }

  @Get("observaciones")
  @ApiOperation({
    summary: "Listar observaciones de estudiantes con filtros y paginación por cursor",
  })
  async listarObservaciones(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryObservacionesDto,
  ) {
    const userContext = {
      id: user.id,
      rol: user.role,
    };
    return this.conductaService.listarObservaciones(query, userContext);
  }

  @Get("observaciones/:id")
  @ApiOperation({
    summary: "Obtener detalle de observación con filtro de confidencialidad",
  })
  async obtenerObservacionPorId(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const userContext = {
      id: user.id,
      rol: user.role,
    };
    return this.conductaService.obtenerObservacionPorId(id, userContext);
  }

  @Get("resumen/estudiante/:matriculaId")
  @ApiOperation({
    summary: "Obtener resumen y desglose de conducta por bimestre del estudiante",
  })
  async obtenerResumenConducta(
    @CurrentUser() user: AuthenticatedUser,
    @Param("matriculaId", ParseUUIDPipe) matriculaId: string,
  ) {
    const userContext = {
      id: user.id,
      rol: user.role,
    };
    return this.conductaService.obtenerResumenConducta(matriculaId, userContext);
  }
}
