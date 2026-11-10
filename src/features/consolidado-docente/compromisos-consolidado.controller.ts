import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { MENU_CONSOLIDADOS_DOCENTES, MENU_MI_SEGUIMIENTO } from "@/common/constants";
import { CurrentUser, MenuAccess } from "@/common/decorators";
import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import { CompromisosConsolidadoService } from "./compromisos-consolidado.service";
import {
  AnularCompromisoDto,
  CerrarCompromisoDto,
  ListarCompromisosQueryDto,
  RegistrarCompromisoDto,
  ReprogramarCompromisoDto,
} from "./dto";
import type { ActorConsolidado } from "./interfaces";

function actorDe(usuario: AuthenticatedUser): ActorConsolidado {
  return {
    id: usuario.id,
    roleId: usuario.roleId,
    role: usuario.role,
    personaId: usuario.personaId,
  };
}

/** Compromisos de mejora del consolidado (RF-013 V2, HU5). */
@ApiTags("Compromisos de consolidado")
@ApiBearerAuth()
@Controller("compromisos-consolidado")
export class CompromisosConsolidadoController {
  constructor(private readonly service: CompromisosConsolidadoService) {}

  @Post()
  @MenuAccess(MENU_CONSOLIDADOS_DOCENTES)
  @ApiOperation({ summary: "Registrar un compromiso de mejora sobre un consolidado" })
  registrar(@Body() dto: RegistrarCompromisoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.registrar(dto, actorDe(usuario));
  }

  @Get()
  @MenuAccess(MENU_CONSOLIDADOS_DOCENTES, MENU_MI_SEGUIMIENTO)
  @ApiOperation({ summary: "Compromisos vigentes del docente en el bimestre del consolidado" })
  listar(@Query() query: ListarCompromisosQueryDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.listar(query.consolidadoId, actorDe(usuario));
  }

  @Get(":compromisoId")
  @MenuAccess(MENU_CONSOLIDADOS_DOCENTES, MENU_MI_SEGUIMIENTO)
  @ApiOperation({
    summary: "Detalle del compromiso; el historial de versiones no lo ve el docente",
  })
  detalle(
    @Param("compromisoId", ParseUUIDPipe) compromisoId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.detalle(compromisoId, actorDe(usuario));
  }

  @Patch(":compromisoId/cerrar")
  @MenuAccess(MENU_CONSOLIDADOS_DOCENTES)
  @ApiOperation({ summary: "Cerrar el compromiso como cumplido o no cumplido" })
  cerrar(
    @Param("compromisoId", ParseUUIDPipe) compromisoId: string,
    @Body() dto: CerrarCompromisoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.cerrar(compromisoId, dto, actorDe(usuario));
  }

  @Patch(":compromisoId/reprogramar")
  @MenuAccess(MENU_CONSOLIDADOS_DOCENTES)
  @ApiOperation({
    summary: "Cambiar la fecha de revisión o la descripción (crea una versión nueva)",
  })
  reprogramar(
    @Param("compromisoId", ParseUUIDPipe) compromisoId: string,
    @Body() dto: ReprogramarCompromisoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.reprogramar(compromisoId, dto, actorDe(usuario));
  }

  @Patch(":compromisoId/anular")
  @MenuAccess(MENU_CONSOLIDADOS_DOCENTES)
  @ApiOperation({ summary: "Anular el compromiso con motivo (no se elimina)" })
  anular(
    @Param("compromisoId", ParseUUIDPipe) compromisoId: string,
    @Body() dto: AnularCompromisoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.anular(compromisoId, dto, actorDe(usuario));
  }

  @Post(":compromisoId/enterado")
  @MenuAccess(MENU_MI_SEGUIMIENTO)
  @ApiOperation({ summary: "El docente confirma que está enterado (acuse con fecha y hora)" })
  enterado(
    @Param("compromisoId", ParseUUIDPipe) compromisoId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.marcarEnterado(compromisoId, actorDe(usuario));
  }
}
