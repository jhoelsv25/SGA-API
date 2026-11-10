import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { MENU_OBSERVACIONES_AULA } from "../../common/constants";
import { CurrentUser, MenuAccess, Roles } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { ROL_ADMINISTRADOR } from "./constants";
import { CrearInstrumentoDto } from "./dto";
import { InstrumentoObservacionService } from "./instrumento-observacion.service";
import { actorDe } from "./observaciones-aula.controller";

/** Versiones del instrumento de observación (RF-023, HU8). Las altas son del Administrador. */
@ApiTags("Instrumento de observación")
@ApiBearerAuth()
@Controller("instrumentos-observacion")
export class InstrumentosObservacionController {
  constructor(private readonly service: InstrumentoObservacionService) {}

  @Get()
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Versiones del instrumento" })
  listar() {
    return this.service.listar();
  }

  @Get("vigente")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Versión vigente para observaciones nuevas" })
  vigente() {
    return this.service.vigente();
  }

  @Post()
  @Roles(ROL_ADMINISTRADOR)
  @ApiOperation({ summary: "Cargar una versión nueva (solo completa puede ser vigente)" })
  crear(@Body() dto: CrearInstrumentoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.crear(dto, actorDe(usuario));
  }

  @Patch(":id/vigente")
  @Roles(ROL_ADMINISTRADOR)
  @ApiOperation({ summary: "Marcar una versión completa como la vigente" })
  marcarVigente(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.marcarVigente(id, actorDe(usuario));
  }
}
