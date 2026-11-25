import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { HEADER_ANIO_ACADEMICO } from "../../../common/anio-lectivo";
import { CurrentUser } from "../../../common/decorators";
import { nombreArchivoReporte } from "../../../common/excel/reporte-excel.builder";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { InstitucionService } from "../../institucion/institucion.service";
import { LIMITE_DURO_SUBIDA_BYTES } from "../constants";
import {
  ActualizarTareaDto,
  CalificarDirectoDto,
  CalificarEntregaDto,
  CerrarTareaDto,
  CrearEntregaDto,
  CrearTareaDto,
  ListarTareasQueryDto,
  ProgresoIntentoDto,
  type EntregaResponse,
  type LibroNotasResponse,
  type TareaResponse,
} from "../dto";
import { AulaCalificacionesService, AulaEntregasService, AulaTareasService } from "../services";

const OPCIONES_SUBIDA = { limits: { fileSize: LIMITE_DURO_SUBIDA_BYTES } };

@ApiTags("Aula virtual - Tareas y calificaciones")
@ApiBearerAuth()
@ApiHeader({
  name: HEADER_ANIO_ACADEMICO,
  required: false,
  description: "Año lectivo de trabajo. Si se omite, se opera con el año en curso.",
})
@Controller("aula-virtual")
export class AulaTareasController {
  constructor(
    private readonly tareasSvc: AulaTareasService,
    private readonly entregasSvc: AulaEntregasService,
    private readonly calificacionesSvc: AulaCalificacionesService,
    private readonly institucionService: InstitucionService,
  ) {}

  @Get("cursos/:cursoSeccionId/tareas")
  @ApiOperation({ summary: "Listar tareas y evaluaciones del curso" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async listarTareas(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @Query() query: ListarTareasQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<TareaResponse[]> {
    return this.tareasSvc.listarTareas(usuario, cursoSeccionId, {
      periodoId: query.periodoId,
      estudianteId: query.estudianteId,
    });
  }

  @Post("cursos/:cursoSeccionId/tareas")
  @ApiOperation({ summary: "Crear una tarea o examen (docente)" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async crearTarea(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @Body() dto: CrearTareaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ mensaje: string; tarea: TareaResponse }> {
    return this.tareasSvc.crearTarea(usuario, cursoSeccionId, dto);
  }

  @Get("tareas/:id")
  @ApiOperation({ summary: "Obtener detalle de una tarea o evaluación" })
  @ApiParam({ name: "id", description: "UUID de la tarea" })
  async obtenerDetalleTarea(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("estudianteId") estudianteId: string | undefined,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<TareaResponse> {
    return this.tareasSvc.obtenerDetalleTarea(usuario, id, estudianteId);
  }

  @Patch("tareas/:id")
  @ApiOperation({ summary: "Actualizar una tarea o examen borrador (docente)" })
  @ApiParam({ name: "id", description: "UUID de la tarea" })
  async actualizarTarea(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ActualizarTareaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ mensaje: string; tarea: TareaResponse }> {
    return this.tareasSvc.actualizarTarea(usuario, id, dto);
  }

  @Post("tareas/:id/publicar")
  @ApiOperation({ summary: "Publicar una tarea o evaluación para que sea visible (docente)" })
  @ApiParam({ name: "id", description: "UUID de la tarea" })
  async publicarTarea(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ mensaje: string; tarea: TareaResponse }> {
    return this.tareasSvc.publicarTarea(usuario, id);
  }

  @Post("tareas/:id/cerrar")
  @ApiOperation({ summary: "Cerrar manualmente una tarea o evaluación (docente)" })
  @ApiParam({ name: "id", description: "UUID de la tarea" })
  async cerrarTarea(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CerrarTareaDto | undefined,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ mensaje: string; tarea: TareaResponse }> {
    return this.tareasSvc.cerrarTarea(usuario, id, dto);
  }

  @Delete("tareas/:id")
  @ApiOperation({ summary: "Eliminar una tarea o examen en borrador (docente)" })
  @ApiParam({ name: "id", description: "UUID de la tarea" })
  async eliminarTarea(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ mensaje: string }> {
    return this.tareasSvc.eliminarTarea(usuario, id);
  }

  @Post("tareas/:id/iniciar-intento")
  @ApiOperation({
    summary: "Iniciar un intento de cuestionario o examen con temporizador (estudiante)",
  })
  @ApiParam({ name: "id", description: "UUID de la tarea" })
  async iniciarIntentoExamen(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ mensaje: string; intento: EntregaResponse }> {
    return this.entregasSvc.iniciarIntentoExamen(usuario, id);
  }

  @Post("tareas/:id/progreso")
  @ApiOperation({ summary: "Guardar progreso temporal del intento en curso (estudiante)" })
  @ApiParam({ name: "id", description: "UUID de la tarea" })
  async guardarProgresoIntento(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ProgresoIntentoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ mensaje: string; entrega: EntregaResponse }> {
    return this.entregasSvc.guardarProgresoIntento(usuario, id, dto.respuestas);
  }

  @Post("tareas/:id/entregar")
  @UseInterceptors(FileInterceptor("archivo", OPCIONES_SUBIDA))
  @ApiConsumes("multipart/form-data", "application/json")
  @ApiOperation({ summary: "Entregar tarea o finalizar examen (estudiante)" })
  @ApiParam({ name: "id", description: "UUID de la tarea" })
  async entregarTarea(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CrearEntregaDto,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{
    mensaje: string;
    entrega: EntregaResponse;
    nota?: number;
    intentosRestantes?: number;
  }> {
    return this.entregasSvc.entregarTarea(usuario, id, dto, archivo);
  }

  @Get("tareas/:id/entregas")
  @ApiOperation({ summary: "Listar entregas de una tarea (docente)" })
  @ApiParam({ name: "id", description: "UUID de la tarea" })
  async listarEntregasDeTarea(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<EntregaResponse[]> {
    return this.entregasSvc.listarEntregasDeTarea(usuario, id);
  }

  @Patch("entregas/:entregaId/calificar")
  @ApiOperation({ summary: "Calificar o retroalimentar una entrega (docente)" })
  @ApiParam({ name: "entregaId", description: "UUID de la entrega" })
  async calificarEntrega(
    @Param("entregaId", ParseUUIDPipe) entregaId: string,
    @Body() dto: CalificarEntregaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ mensaje: string; entrega: EntregaResponse }> {
    return this.entregasSvc.calificarEntrega(usuario, entregaId, dto);
  }

  @Post("tareas/:id/calificar-directo")
  @ApiOperation({ summary: "Calificar directamente a un estudiante (entrega física o manual)" })
  @ApiParam({ name: "id", description: "UUID de la tarea" })
  async calificarDirecto(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CalificarDirectoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ mensaje: string; entrega: EntregaResponse }> {
    return this.entregasSvc.calificarDirecto(usuario, id, dto);
  }

  @Get("cursos/:cursoSeccionId/libro-notas")
  @ApiOperation({ summary: "Obtener libro de calificaciones del curso (docente)" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async obtenerLibroNotas(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @Query() query: ListarTareasQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<LibroNotasResponse> {
    return this.calificacionesSvc.obtenerLibroNotas(usuario, cursoSeccionId, query.periodoId);
  }

  @Get("cursos/:cursoSeccionId/libro-notas/excel")
  @ApiOperation({ summary: "Exportar libro de notas en formato Excel (.xlsx)" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async exportarExcelLibroNotas(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @Query() query: ListarTareasQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const institucion = await this.institucionService.get().catch(() => null);
    const buffer = await this.calificacionesSvc.exportarExcelLibroNotas(
      usuario,
      cursoSeccionId,
      query.periodoId,
      { institucion: institucion?.nombre ?? "SGA Colegio", generadoPor: usuario.username },
    );

    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivoReporte("libro-notas")}"`,
      "Content-Length": buffer.length,
    });

    return new StreamableFile(buffer);
  }

  @Get("mis-notas")
  @ApiOperation({ summary: "Consultar calificaciones propias (estudiante)" })
  async obtenerMisNotas(
    @Query() query: ListarTareasQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<Record<string, unknown>[]> {
    return this.calificacionesSvc.obtenerNotasEstudiante(
      usuario,
      usuario.personaId,
      query.periodoId,
    );
  }

  @Get("estudiantes/:estudianteId/notas")
  @ApiOperation({ summary: "Consultar calificaciones de un estudiante (docente o apoderado)" })
  @ApiParam({ name: "estudianteId", description: "UUID de la persona del estudiante" })
  async obtenerNotasEstudiante(
    @Param("estudianteId", ParseUUIDPipe) estudianteId: string,
    @Query() query: ListarTareasQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<Record<string, unknown>[]> {
    return this.calificacionesSvc.obtenerNotasEstudiante(usuario, estudianteId, query.periodoId);
  }
}
