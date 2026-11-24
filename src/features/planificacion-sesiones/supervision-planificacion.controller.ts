import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { MENU_SESIONES_HOY } from "../../common/constants";
import { CurrentUser, MenuAccess } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import {
  ComentarioPlanificacionDto,
  HistorialSupervisionQueryDto,
  SupervisionQueryDto,
  VerificacionAulaDto,
} from "./dto";
import { actorDe } from "./planificacion-sesiones.controller";
import { SupervisionPlanificacionService } from "./supervision-planificacion.service";

/** Supervisión: ver, comentar y registrar horas reales; sin ninguna ruta de edición (RF-024 HU6). */
@ApiTags("Supervisión de planificaciones")
@ApiBearerAuth()
@Controller("supervision-planificaciones")
@MenuAccess(MENU_SESIONES_HOY)
export class SupervisionPlanificacionController {
  constructor(private readonly service: SupervisionPlanificacionService) {}

  @Get()
  @ApiOperation({ summary: "Sesiones del día con su planificación («Sin planificación» si falta)" })
  panel(@Query() query: SupervisionQueryDto) {
    return this.service.panel(query.fecha);
  }

  @Get("historial")
  @ApiOperation({ summary: "Planificaciones de cualquier día o docente, en solo lectura" })
  historial(@Query() query: HistorialSupervisionQueryDto) {
    return this.service.historial(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Una planificación en solo lectura" })
  detalle(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.detalle(id);
  }

  @Post(":id/comentarios")
  @ApiOperation({ summary: "Dejar un comentario al docente" })
  comentar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ComentarioPlanificacionDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.comentar(id, dto.texto, actorDe(usuario));
  }

  @Put("sesiones/:sesionId/horas-reales")
  @ApiOperation({ summary: "Registrar las horas reales en el aula (o «no estuvo en el aula»)" })
  horasReales(
    @Param("sesionId", ParseUUIDPipe) sesionId: string,
    @Body() dto: VerificacionAulaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.registrarHorasReales(sesionId, dto, actorDe(usuario));
  }
}
