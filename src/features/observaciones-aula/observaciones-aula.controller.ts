import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import {
  MENU_CONSOLIDADOS_DOCENTES,
  MENU_MI_SEGUIMIENTO,
  MENU_OBSERVACIONES_AULA,
} from "../../common/constants";
import { CurrentUser, MenuAccess } from "../../common/decorators";
import { nombreArchivoReporte } from "../../common/excel/reporte-excel.builder";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import {
  AgregarCompromisoDto,
  AnioQueryDto,
  CalificarDesempenoDto,
  CancelarObservacionDto,
  CerrarCompromisoObsDto,
  CerrarNotasDto,
  CerrarRetroalimentacionDto,
  CorregirCalificacionDto,
  CorregirCompromisoDto,
  EditarNotaDto,
  FiltroObservacionesQueryDto,
  IniciarObservacionDto,
  MatrizQueryDto,
  ProgramarObservacionDto,
  ReobservacionDto,
  RegistrarNotaDto,
  RegistrarReunionDto,
  ReprogramarObservacionDto,
  ResumenConsolidadoQueryDto,
} from "./dto";
import type { ActorObservacion } from "./interfaces";
import { ObservacionesEjecucionService } from "./observaciones-ejecucion.service";
import { ObservacionesProgramacionService } from "./observaciones-programacion.service";
import { ObservacionesReporteService } from "./observaciones-reporte.service";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const LIMITE_DURO_SUBIDA_BYTES = 20 * 1024 * 1024;

export function actorDe(usuario: AuthenticatedUser): ActorObservacion {
  return {
    id: usuario.id,
    roleId: usuario.roleId,
    role: usuario.role,
    personaId: usuario.personaId,
  };
}

/** Observaciones de aula (RF-023): cronograma, ficha de notas, calificación y retroalimentación. */
@ApiTags("Observaciones de aula")
@ApiBearerAuth()
@Controller("observaciones-aula")
export class ObservacionesAulaController {
  constructor(
    private readonly programacion: ObservacionesProgramacionService,
    private readonly ejecucion: ObservacionesEjecucionService,
    private readonly reportes: ObservacionesReporteService,
  ) {}

  // ---------------------------------------------------------------- rutas fijas (antes de :id)
  @Get("cronograma")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Cobertura por docente: realizadas, programadas y meta del año" })
  cronograma(@Query() query: AnioQueryDto) {
    return this.programacion.cronograma(query.anioAcademicoId);
  }

  @Get("seguimientos")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Seguimientos por revisar: compromisos pendientes cuya fecha llegó" })
  seguimientos() {
    return this.ejecucion.seguimientosPorRevisar();
  }

  @Get("reporte/matriz")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Matriz docente por desempeño (último nivel vigente) y cobertura" })
  matriz(@Query() query: MatrizQueryDto) {
    return this.reportes.matriz(query);
  }

  @Get("reporte/matriz/excel")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Exporta a Excel la matriz y la cobertura" })
  async matrizExcel(
    @Query() query: MatrizQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.reportes.matrizExcel(query, usuario.username);
    res.set({
      "Content-Type": XLSX,
      "Content-Disposition": `attachment; filename="${nombreArchivoReporte("observaciones-aula")}"`,
      "Content-Length": buffer.length,
    });
    return new StreamableFile(buffer);
  }

  @Get("resumen-consolidado")
  @MenuAccess(MENU_CONSOLIDADOS_DOCENTES, MENU_MI_SEGUIMIENTO)
  @ApiOperation({
    summary: "Resumen de solo lectura de la última observación del bimestre (RF-013)",
  })
  resumenConsolidado(
    @Query() query: ResumenConsolidadoQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.reportes.resumenParaConsolidado(query.docenteId, query.periodoId, actorDe(usuario));
  }

  @Get("historial/:docenteId")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Historial del docente con la evolución de cada desempeño" })
  historial(
    @Param("docenteId", ParseUUIDPipe) docenteId: string,
    @Query() query: AnioQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.reportes.historialDocente(docenteId, actorDe(usuario), query.anioAcademicoId);
  }

  @Patch("compromisos/:compromisoId/cerrar")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Marcar un compromiso como cumplido o no cumplido" })
  cerrarCompromiso(
    @Param("compromisoId", ParseUUIDPipe) compromisoId: string,
    @Body() dto: CerrarCompromisoObsDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ejecucion.cerrarCompromiso(compromisoId, dto, actorDe(usuario));
  }

  // ---------------------------------------------------------------- cronograma
  @Post()
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Programar una observación (avisa al docente)" })
  programar(@Body() dto: ProgramarObservacionDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.programacion.programar(dto, actorDe(usuario));
  }

  @Get()
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({
    summary: "Lista de observaciones (con «vencida» si siguen programadas tras su fecha)",
  })
  listar(@Query() query: FiltroObservacionesQueryDto) {
    return this.programacion.listar(query);
  }

  @Get(":id")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Detalle completo con notas, calificación, compromisos e historial" })
  detalle(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.ejecucion.detalle(id, actorDe(usuario));
  }

  @Patch(":id/reprogramar")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Reprogramar con motivo" })
  reprogramar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReprogramarObservacionDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.programacion.reprogramar(id, dto, actorDe(usuario));
  }

  @Patch(":id/cancelar")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Cancelar con motivo (queda en el historial)" })
  cancelar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CancelarObservacionDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.programacion.cancelar(id, dto, actorDe(usuario));
  }

  @Post(":id/reobservacion")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Programar una reobservación enlazada a una retroalimentada" })
  reobservacion(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReobservacionDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.programacion.programarReobservacion(id, dto, actorDe(usuario));
  }

  // ---------------------------------------------------------------- ficha de notas
  @Post(":id/iniciar")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Iniciar la observación y abrir la ficha de toma de notas" })
  iniciar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: IniciarObservacionDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ejecucion.iniciar(id, dto, actorDe(usuario));
  }

  @Post(":id/notas")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Registrar una conducta observable en un desempeño" })
  registrarNota(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RegistrarNotaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ejecucion.registrarNota(id, dto, actorDe(usuario));
  }

  @Patch(":id/notas/:notaId")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Editar una nota mientras la toma de notas esté abierta" })
  editarNota(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("notaId", ParseUUIDPipe) notaId: string,
    @Body() dto: EditarNotaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ejecucion.editarNota(id, notaId, dto, actorDe(usuario));
  }

  @Post(":id/cerrar-notas")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({
    summary: "Cerrar la toma de notas (409 si la duración es atípica y falta confirmar)",
  })
  cerrarNotas(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CerrarNotasDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ejecucion.cerrarNotas(id, dto, actorDe(usuario));
  }

  // ---------------------------------------------------------------- calificación
  @Get(":id/calificacion")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Ficha de calificación: notas y descripción de niveles por desempeño" })
  ficha(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.ejecucion.fichaCalificacion(id, actorDe(usuario));
  }

  @Put(":id/calificaciones/:desempeno")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Guardar nivel y fundamento de un desempeño (borrador)" })
  calificar(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("desempeno", ParseIntPipe) desempeno: number,
    @Body() dto: CalificarDesempenoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ejecucion.calificar(id, desempeno, dto, actorDe(usuario));
  }

  @Post(":id/cerrar-calificacion")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Cerrar la calificación (exige los 5 desempeños)" })
  cerrarCalificacion(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ejecucion.cerrarCalificacion(id, actorDe(usuario));
  }

  @Patch(":id/calificaciones/:desempeno/corregir")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Corregir una calificación cerrada (solo Director, con motivo)" })
  corregirCalificacion(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("desempeno", ParseIntPipe) desempeno: number,
    @Body() dto: CorregirCalificacionDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ejecucion.corregirCalificacion(id, desempeno, dto, actorDe(usuario));
  }

  // ---------------------------------------------------------------- retroalimentación
  @Put(":id/reunion")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Registrar la reunión de retroalimentación" })
  reunion(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RegistrarReunionDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ejecucion.registrarReunion(id, dto, actorDe(usuario));
  }

  @Post(":id/compromisos")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Agregar un compromiso de mejora" })
  agregarCompromiso(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AgregarCompromisoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ejecucion.agregarCompromiso(id, dto, actorDe(usuario));
  }

  @Patch(":id/compromisos/:compromisoId")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({
    summary: "Corregir un compromiso (con motivo y versión si ya está retroalimentada)",
  })
  corregirCompromiso(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("compromisoId", ParseUUIDPipe) compromisoId: string,
    @Body() dto: CorregirCompromisoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ejecucion.corregirCompromiso(id, compromisoId, dto, actorDe(usuario));
  }

  @Post(":id/cerrar-retroalimentacion")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Cerrar la retroalimentación: el docente ya puede ver su observación" })
  cerrarRetroalimentacion(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CerrarRetroalimentacionDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ejecucion.cerrarRetroalimentacion(id, dto, actorDe(usuario));
  }

  @Get(":id/protocolo/pdf")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @ApiOperation({ summary: "Protocolo de retroalimentación en PDF (queda en la bitácora)" })
  async protocolo(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.reportes.protocoloPdf(id, actorDe(usuario));
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="protocolo-retroalimentacion-${id.slice(0, 8)}.pdf"`,
      "Content-Length": buffer.length,
    });
    return new StreamableFile(buffer);
  }

  @Post(":id/archivo-firmado")
  @MenuAccess(MENU_OBSERVACIONES_AULA)
  @UseInterceptors(FileInterceptor("archivo", { limits: { fileSize: LIMITE_DURO_SUBIDA_BYTES } }))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Subir el escaneo del protocolo firmado (PDF, PNG o JPG, hasta 5 MB)" })
  subirArchivo(
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ejecucion.subirArchivoFirmado(id, archivo, actorDe(usuario));
  }
}
