import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  MENU_CATALOGO_CURRICULAR,
  MENU_PLANIFICACION_SESIONES,
  MENU_SESIONES_HOY,
} from "../../common/constants";
import { CurrentUser, MenuAccess } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { CatalogoCurricularService } from "./catalogo-curricular.service";
import { TIPOS_OPCION_CATALOGO, type TipoOpcionCatalogo } from "./constants";
import {
  CompetenciasQueryDto,
  CrearDesempenoDto,
  DesempenosQueryDto,
  EditarDesempenoDto,
} from "./dto";
import { actorDe } from "./planificacion-sesiones.controller";

/** Catálogo curricular (RF-024, HU1). La lectura la usa el editor; los ajustes, la dirección. */
@ApiTags("Catálogo curricular")
@ApiBearerAuth()
@Controller("catalogo-curricular")
export class CatalogoCurricularController {
  constructor(private readonly service: CatalogoCurricularService) {}

  @Get("areas")
  @MenuAccess(MENU_PLANIFICACION_SESIONES, MENU_CATALOGO_CURRICULAR, MENU_SESIONES_HOY)
  @ApiOperation({ summary: "Áreas curriculares" })
  areas() {
    return this.service.areas();
  }

  @Get("competencias")
  @MenuAccess(MENU_PLANIFICACION_SESIONES, MENU_CATALOGO_CURRICULAR, MENU_SESIONES_HOY)
  @ApiOperation({ summary: "Competencias con sus capacidades (filtro opcional por área)" })
  competencias(@Query() query: CompetenciasQueryDto) {
    return this.service.competencias(query.area);
  }

  @Get("competencias/:id/desempenos")
  @MenuAccess(MENU_PLANIFICACION_SESIONES, MENU_CATALOGO_CURRICULAR, MENU_SESIONES_HOY)
  @ApiOperation({ summary: "Desempeños de una competencia, por grado (1 a 5)" })
  desempenos(@Param("id", ParseUUIDPipe) id: string, @Query() query: DesempenosQueryDto) {
    return this.service.desempenos(id, query.grado);
  }

  @Get("enfoques")
  @MenuAccess(MENU_PLANIFICACION_SESIONES, MENU_CATALOGO_CURRICULAR, MENU_SESIONES_HOY)
  @ApiOperation({ summary: "Enfoques transversales con sus valores y acciones observables" })
  enfoques() {
    return this.service.enfoques();
  }

  @Get("opciones")
  @MenuAccess(MENU_PLANIFICACION_SESIONES, MENU_CATALOGO_CURRICULAR, MENU_SESIONES_HOY)
  @ApiOperation({
    summary: "Listas del modelo de sesión (niveles de logro, instrumentos, momentos…)",
  })
  opciones(@Query("tipo") tipo?: string) {
    const valido: TipoOpcionCatalogo | undefined = TIPOS_OPCION_CATALOGO.find((t) => t === tipo);
    return this.service.opciones(valido);
  }

  @Post("desempenos")
  @MenuAccess(MENU_CATALOGO_CURRICULAR)
  @ApiOperation({ summary: "Agregar un desempeño al catálogo" })
  crearDesempeno(@Body() dto: CrearDesempenoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.crearDesempeno(dto, actorDe(usuario));
  }

  @Patch("desempenos/:id")
  @MenuAccess(MENU_CATALOGO_CURRICULAR)
  @ApiOperation({ summary: "Corregir el texto de un desempeño (no altera lo ya planificado)" })
  editarDesempeno(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: EditarDesempenoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.editarDesempeno(id, dto.texto, actorDe(usuario));
  }
}
