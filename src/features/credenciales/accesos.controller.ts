import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { AccesosService } from "./accesos.service";
import { ROLES_ACCESOS } from "./constants";
import { BuscarAccesosDto } from "./dto";

@ApiTags("Comunidad - Accesos y credenciales (RF-007)")
@ApiBearerAuth()
@Roles(...ROLES_ACCESOS)
@Controller("accesos")
export class AccesosController {
  constructor(private readonly service: AccesosService) {}

  @Get("personas")
  @ApiOperation({ summary: "Buscar personas de cualquier grupo por DNI o nombre" })
  buscar(@Query() query: BuscarAccesosDto) {
    return this.service.buscar(query.q);
  }

  @Get("personas/:personaId")
  @ApiOperation({ summary: "Accesos de una persona: PIN, carné, código biométrico y cuenta web" })
  detalle(@Param("personaId", ParseUUIDPipe) personaId: string) {
    return this.service.detalle(personaId);
  }
}
