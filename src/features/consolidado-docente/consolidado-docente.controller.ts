import { nombreArchivoReporte } from "../../common/excel/reporte-excel.builder";
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { MENU_CONSOLIDADOS_DOCENTES, MENU_MI_SEGUIMIENTO } from "@/common/constants";
import { CurrentUser, MenuAccess } from "@/common/decorators";
import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import { ConsolidadoDocenteService } from "./consolidado-docente.service";
import {
  ActualizarDecisionDto,
  CerrarConsolidadoDto,
  ConsolidadoQueryDto,
  GenerarConsolidadoDto,
  ResolverSolicitudRevisionDto,
  SolicitarRevisionDto,
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

@ApiTags("Consolidados Docentes")
@ApiBearerAuth()
@Controller("consolidados-docente")
export class ConsolidadoDocenteController {
  constructor(private readonly service: ConsolidadoDocenteService) {}

  @Post("generar")
  @MenuAccess(MENU_CONSOLIDADOS_DOCENTES)
  generar(@Body() dto: GenerarConsolidadoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.generarConsolidados(dto, actorDe(usuario));
  }

  @Get()
  @MenuAccess(MENU_CONSOLIDADOS_DOCENTES)
  listar(@Query() dto: ConsolidadoQueryDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.listarConsolidadosPeriodo(dto, actorDe(usuario));
  }

  @Get("exportar/excel")
  @MenuAccess(MENU_CONSOLIDADOS_DOCENTES)
  async exportarExcel(
    @Query("periodoId", ParseUUIDPipe) periodoId: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.service.exportarExcel(periodoId, actorDe(usuario), usuario.username);
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivoReporte("consolidado-docente")}"`,
      "Content-Length": buffer.length,
    });
    return new StreamableFile(buffer);
  }

  @Get("mi-seguimiento")
  @MenuAccess(MENU_MI_SEGUIMIENTO)
  miSeguimiento(
    @Query("periodoId", ParseUUIDPipe) periodoId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.obtenerMiSeguimiento(periodoId, actorDe(usuario));
  }

  @Get(":id")
  obtenerPorId(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.obtenerDetalle(id, actorDe(usuario));
  }

  @Get(":id/historial")
  @MenuAccess(MENU_CONSOLIDADOS_DOCENTES)
  historial(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.historialVersiones(id, actorDe(usuario));
  }

  @Get(":id/ficha-pdf")
  async descargarFicha(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.service.descargarFichaPdf(id, actorDe(usuario));
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ficha-seguimiento-${id}.pdf"`,
      "Content-Length": buffer.length,
    });
    return new StreamableFile(buffer);
  }

  @Patch(":id/decision")
  @MenuAccess(MENU_CONSOLIDADOS_DOCENTES)
  registrarDecision(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ActualizarDecisionDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.registrarDecision(id, dto, actorDe(usuario));
  }

  @Post(":id/reabrir")
  @MenuAccess(MENU_CONSOLIDADOS_DOCENTES)
  reabrir(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.reabrirConsolidado(id, actorDe(usuario));
  }

  @Post(":id/cerrar")
  @MenuAccess(MENU_CONSOLIDADOS_DOCENTES)
  cerrar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CerrarConsolidadoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.cerrarConsolidado(id, dto, actorDe(usuario));
  }

  @Post(":id/solicitudes")
  @MenuAccess(MENU_MI_SEGUIMIENTO)
  solicitarRevision(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SolicitarRevisionDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.solicitarRevision(id, dto, actorDe(usuario));
  }

  @Patch("solicitudes/:solicitudId/resolver")
  @MenuAccess(MENU_CONSOLIDADOS_DOCENTES)
  resolverSolicitud(
    @Param("solicitudId", ParseUUIDPipe) solicitudId: string,
    @Body() dto: ResolverSolicitudRevisionDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.resolverSolicitud(solicitudId, dto, actorDe(usuario));
  }
}
