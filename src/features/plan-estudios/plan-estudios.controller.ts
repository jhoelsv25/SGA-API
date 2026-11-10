import { MenuAlternativo } from "../../common/decorators/menu-alternativo.decorator";
import { MENU_CURRICULO } from "../../common/constants/menu-rutas.constants";
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import {
  AddCursoPlanDto,
  PlanEstudioItemDto,
  PlanEstudioResponseDto,
  UpdateHorasPlanDto,
} from "./dto";
import { PlanEstudiosService } from "./plan-estudios.service";

@ApiTags("Plan de Estudios")
@ApiBearerAuth()
@MenuAlternativo(MENU_CURRICULO)
@Controller("plan-estudios")
export class PlanEstudiosController {
  constructor(private readonly service: PlanEstudiosService) {}

  @Get(":gradoId")
  @Roles("Administrador", "Director", "Coordinador", "Subdirector", "Secretaria", "Docente")
  @ApiOperation({ summary: "Obtener el plan de estudios y total de horas semanales de un grado" })
  @ApiParam({ name: "gradoId", description: "UUID del grado" })
  @ApiResponse({
    status: 200,
    description: "Estructura del plan de estudios con asignaturas y total de horas",
    type: PlanEstudioResponseDto,
  })
  async getPlanByGrado(
    @Param("gradoId", ParseUUIDPipe) gradoId: string,
  ): Promise<PlanEstudioResponseDto> {
    return this.service.getPlanByGrado(gradoId);
  }

  @Post(":gradoId")
  @Roles("Administrador")
  @ApiOperation({ summary: "Agregar una asignatura con horas semanales al plan del grado" })
  @ApiParam({ name: "gradoId", description: "UUID del grado" })
  @ApiResponse({
    status: 201,
    description: "Asignatura agregada al plan de estudios",
    type: PlanEstudioItemDto,
  })
  async addCurso(
    @Param("gradoId", ParseUUIDPipe) gradoId: string,
    @Body() dto: AddCursoPlanDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<PlanEstudioItemDto> {
    return this.service.addCurso(gradoId, dto, user.id, clientInfo.ip);
  }

  @Patch(":id/horas")
  @Roles("Administrador")
  @ApiOperation({ summary: "Actualizar las horas semanales de una asignatura en el plan" })
  @ApiParam({ name: "id", description: "UUID del registro de plan de estudios" })
  @ApiResponse({
    status: 200,
    description: "Horas semanales actualizadas",
    type: PlanEstudioItemDto,
  })
  async updateHoras(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateHorasPlanDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<PlanEstudioItemDto> {
    return this.service.updateHoras(id, dto, user.id, clientInfo.ip);
  }

  @Delete(":id")
  @Roles("Administrador")
  @ApiOperation({
    summary:
      "Quitar una asignatura del plan si no tiene carga académica en el grado (Solo Administrador)",
  })
  @ApiParam({ name: "id", description: "UUID del registro de plan de estudios" })
  @ApiResponse({
    status: 200,
    description: "Asignatura quitada del plan de estudios",
  })
  async removeCurso(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<{ success: boolean; message: string }> {
    return this.service.removeCurso(id, user.id, clientInfo.ip);
  }

  @Post(":destinoGradoId/copiar-de/:origenGradoId")
  @Roles("Administrador")
  @ApiOperation({ summary: "Copiar el plan de estudios de un grado origen a un grado destino" })
  @ApiParam({ name: "destinoGradoId", description: "UUID del grado que recibirá las asignaturas" })
  @ApiParam({ name: "origenGradoId", description: "UUID del grado fuente a copiar" })
  @ApiResponse({
    status: 201,
    description: "Plan copiado exitosamente",
  })
  async copyPlan(
    @Param("destinoGradoId", ParseUUIDPipe) destinoGradoId: string,
    @Param("origenGradoId", ParseUUIDPipe) origenGradoId: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<{
    mensaje: string;
    totalHoras: number;
    cursos: PlanEstudioItemDto[];
  }> {
    return this.service.copyPlan(origenGradoId, destinoGradoId, user.id, clientInfo.ip);
  }
}
