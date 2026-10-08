import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../../common/decorators";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import {
  AddCursoPlanDto,
  PlanEstudioItemDto,
  PlanEstudioResponseDto,
  UpdateHorasPlanDto,
} from "../dto";
import { PlanEstudiosService } from "../services";

@ApiTags("Plan de Estudios")
@ApiBearerAuth()
@Controller("plan-estudios")
export class PlanEstudiosController {
  constructor(private readonly service: PlanEstudiosService) {}

  @Get(":gradoId")
  @Roles("Administrador", "Director", "Coordinador", "Secretaria", "Docente")
  @ApiOperation({ summary: "Obtener el plan de estudios y total de horas semanales de un grado" })
  @ApiParam({ name: "gradoId", description: "UUID del grado" })
  @ApiResponse({
    status: 200,
    description: "Estructura del plan de estudios con asignaturas y total de horas",
    type: PlanEstudioResponseDto,
  })
  async getPlanByGrado(@Param("gradoId") gradoId: string): Promise<PlanEstudioResponseDto> {
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
    @Param("gradoId") gradoId: string,
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
    @Param("id") id: string,
    @Body() dto: UpdateHorasPlanDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<PlanEstudioItemDto> {
    return this.service.updateHoras(id, dto, user.id, clientInfo.ip);
  }

  @Delete(":id")
  @Roles("Administrador")
  @ApiOperation({
    summary: "Quitar un curso del plan de estudios si no tiene carga académica en el grado",
  })
  @ApiParam({ name: "id", description: "UUID del registro de plan de estudios" })
  @ApiResponse({
    status: 200,
    description: "Curso retirado del plan exitosamente",
  })
  async removeCurso(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<{ success: boolean; message: string }> {
    return this.service.removeCurso(id, user.id, clientInfo.ip);
  }

  @Post(":gradoId/copiar-de/:origenGradoId")
  @Roles("Administrador")
  @ApiOperation({ summary: "Copiar la estructura completa del plan de estudios desde otro grado" })
  @ApiParam({ name: "gradoId", description: "UUID del grado de destino" })
  @ApiParam({ name: "origenGradoId", description: "UUID del grado de origen" })
  @ApiResponse({
    status: 201,
    description: "Plan de estudios copiado exitosamente",
  })
  async copyPlan(
    @Param("gradoId") gradoId: string,
    @Param("origenGradoId") origenGradoId: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<{
    mensaje: string;
    totalHoras: number;
    cursos: PlanEstudioItemDto[];
  }> {
    return this.service.copyPlan(origenGradoId, gradoId, user.id, clientInfo.ip);
  }
}
