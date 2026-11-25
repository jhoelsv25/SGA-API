import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { MENU_MIS_OBSERVACIONES } from "../../../common/constants";
import { CurrentUser, MenuAccess } from "../../../common/decorators";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { ComentarioDocenteDto } from "../dto";
import { MisObservacionesService } from "../services";
import { actorDe } from "./observaciones-actor.helper";

/** «Mis observaciones» del docente (RF-023, HU6). */
@ApiTags("Mis observaciones")
@ApiBearerAuth()
@Controller("mis-observaciones")
@MenuAccess(MENU_MIS_OBSERVACIONES)
export class MisObservacionesController {
  constructor(private readonly service: MisObservacionesService) {}

  @Get()
  @ApiOperation({ summary: "Próximas observaciones y retroalimentadas con niveles y compromisos" })
  listar(@CurrentUser() usuario: AuthenticatedUser) {
    return this.service.listar(actorDe(usuario));
  }

  @Get(":id")
  @ApiOperation({ summary: "Una observación propia; solo visible tras la retroalimentación" })
  detalle(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.detalle(id, actorDe(usuario));
  }

  @Post(":id/enterado")
  @ApiOperation({ summary: "Registrar el enterado con fecha" })
  enterado(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.enterado(id, actorDe(usuario));
  }

  @Post(":id/comentario")
  @ApiOperation({ summary: "Dejar un comentario (una sola vez y dentro del plazo)" })
  comentar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ComentarioDocenteDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.comentar(id, dto, actorDe(usuario));
  }
}
