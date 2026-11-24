import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { MENU_PLANIFICACION_SESIONES } from "../../common/constants";
import { CurrentUser, MenuAccess } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { ahoraEnColegio } from "../marcaciones/utils/marcacion-reglas.util";
import {
  CopiarPlanificacionDto,
  GuardarPlanificacionDto,
  HistorialQueryDto,
  SemanaQueryDto,
} from "./dto";
import type { ActorPlanificacion } from "./interfaces";
import { PlanificacionSesionesService } from "./planificacion-sesiones.service";

export function actorDe(usuario: AuthenticatedUser): ActorPlanificacion {
  return {
    id: usuario.id,
    roleId: usuario.roleId,
    role: usuario.role,
    personaId: usuario.personaId,
  };
}

/** Planificación de la sesión de aprendizaje: solo el docente la crea y edita (RF-024). */
@ApiTags("Planificación de sesiones")
@ApiBearerAuth()
@Controller("planificacion-sesiones")
@MenuAccess(MENU_PLANIFICACION_SESIONES)
export class PlanificacionSesionesController {
  constructor(private readonly service: PlanificacionSesionesService) {}

  @Get("semana")
  @ApiOperation({ summary: "Mis bloques de lunes a viernes con el estado de su planificación" })
  semana(@Query() query: SemanaQueryDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.semana(actorDe(usuario), query.fecha ?? ahoraEnColegio().fecha);
  }

  @Get("historial")
  @ApiOperation({ summary: "Todas mis planificaciones, pasadas y futuras, en un rango de fechas" })
  historial(@Query() query: HistorialQueryDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.historial(actorDe(usuario), query);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Una planificación propia con sus competencias, momentos y comentarios",
  })
  obtener(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.obtener(id, actorDe(usuario));
  }

  @Put()
  @ApiOperation({ summary: "Crear o actualizar la planificación de un bloque (queda en borrador)" })
  guardar(@Body() dto: GuardarPlanificacionDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.guardar(dto, actorDe(usuario));
  }

  @Post(":id/lista")
  @ApiOperation({ summary: "Marcarla lista (valida contenido y tiempos)" })
  marcarLista(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.marcarLista(id, actorDe(usuario));
  }

  @Post(":id/copiar")
  @ApiOperation({ summary: "Copiar a otros bloques del mismo grado y área o a otra fecha" })
  copiar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CopiarPlanificacionDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.copiar(id, dto, actorDe(usuario));
  }

  @Get(":id/documento")
  @ApiOperation({ summary: "Vista previa del documento con el modelo estándar" })
  documento(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.documento(id, actorDe(usuario));
  }

  @Get(":id/documento.pdf")
  @ApiOperation({ summary: "Descargar la sesión en PDF" })
  async documentoPdf(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pdf = await this.service.documentoPdf(id, actorDe(usuario));
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="sesion-${id}.pdf"`,
    });
    return new StreamableFile(pdf);
  }

  @Get(":id/documento.docx")
  @ApiOperation({ summary: "Descargar la sesión en Word (.docx) con el modelo del colegio" })
  async documentoDocx(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const docx = await this.service.documentoDocx(id, actorDe(usuario));
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="sesion-${id}.docx"`,
    });
    return new StreamableFile(docx);
  }
}
