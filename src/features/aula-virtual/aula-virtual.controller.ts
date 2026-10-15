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
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { HEADER_ANIO_ACADEMICO } from "../../common/anio-lectivo";
import { MENU_MATERIALES_BIMESTRE, MENU_SOLICITUDES_CAMBIO_FECHA } from "../../common/constants";
import { ClientInfo, type ClientInfoData, CurrentUser, MenuAccess } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { AulaVirtualService } from "./aula-virtual.service";
import { LIMITE_DURO_SUBIDA_BYTES } from "./constants";
import { ChatAulaGateway } from "./gateways/chat-aula.gateway";
import {
  ActualizarMaterialDto,
  ActualizarTareaDto,
  ActualizarUnidadDto,
  CalificarEntregaDto,
  ContenidoMaterialDto,
  CrearComentarioDto,
  CrearEntregaDto,
  CrearPublicacionDto,
  CrearTareaDto,
  CrearUnidadDto,
  EditarComentarioDto,
  EditarPublicacionDto,
  EnviarMensajeChatDto,
  FijarPublicacionDto,
  ListarTareasQueryDto,
  OcultarContenidoDto,
  PlanificarMaterialDto,
  ProgresoIntentoDto,
  PublicarMaterialExtraDto,
  RegistrarActividadDto,
  ResolverSolicitudDto,
  SeguimientoQueryDto,
  SolicitarCambioFechaDto,
  SolicitudesQueryDto,
  type AulaVirtualResponse,
  type CursoAulaResponse,
  type EntregaResponse,
  type LibroNotasResponse,
  type MutacionMaterialResponse,
  type SeguimientoResponse,
  type SolicitudCambioResponse,
  type TareaResponse,
} from "./dto";
import type {
  ActividadEstudianteMaterial,
  ActividadEstudianteTarea,
  ComentarioMuroFila,
  HistorialModeracionFila,
  MensajeChatFila,
  PublicacionMuroFila,
  UnidadFila,
} from "./interfaces";
import type { TipoModeracion } from "./constants";

const OPCIONES_SUBIDA = { limits: { fileSize: LIMITE_DURO_SUBIDA_BYTES } };

@ApiTags("Aula virtual - Unidades y materiales (RF-015)")
@ApiBearerAuth()
@ApiHeader({
  name: HEADER_ANIO_ACADEMICO,
  required: false,
  description: "Año lectivo de trabajo. Si se omite, se opera con el año en curso.",
})
@Controller("aula-virtual")
export class AulaVirtualController {
  constructor(
    private readonly service: AulaVirtualService,
    private readonly chatGateway: ChatAulaGateway,
  ) {}

  @Get("mis-cursos")
  @ApiOperation({ summary: "Cursos con aula virtual del usuario (docente o estudiante)" })
  async misCursos(@CurrentUser() usuario: AuthenticatedUser): Promise<CursoAulaResponse[]> {
    return this.service.misCursos(usuario);
  }

  @Get("seguimiento")
  @MenuAccess(MENU_MATERIALES_BIMESTRE)
  @ApiOperation({ summary: "Materiales del bimestre por docente y curso (Subdirector)" })
  async seguimiento(@Query() query: SeguimientoQueryDto): Promise<SeguimientoResponse> {
    return this.service.seguimiento(query.periodoId);
  }

  @Get("solicitudes-cambio-fecha")
  @ApiOperation({
    summary:
      "Solicitudes de cambio de fecha (pendientes para el Subdirector; propias para el docente)",
  })
  async solicitudes(
    @Query() query: SolicitudesQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<SolicitudCambioResponse[]> {
    return this.service.listarSolicitudes(usuario, query.estado);
  }

  @Patch("solicitudes-cambio-fecha/:id/aprobar")
  @MenuAccess(MENU_SOLICITUDES_CAMBIO_FECHA)
  @ApiOperation({ summary: "Aprobar una solicitud de cambio de fecha" })
  @ApiParam({ name: "id", description: "UUID de la solicitud" })
  async aprobar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ResolverSolicitudDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<{ mensaje: string }> {
    return this.service.aprobarSolicitud(id, dto, usuario, clientInfo.ip);
  }

  @Patch("solicitudes-cambio-fecha/:id/rechazar")
  @MenuAccess(MENU_SOLICITUDES_CAMBIO_FECHA)
  @ApiOperation({ summary: "Rechazar una solicitud de cambio de fecha (respuesta obligatoria)" })
  @ApiParam({ name: "id", description: "UUID de la solicitud" })
  async rechazar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ResolverSolicitudDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<{ mensaje: string }> {
    return this.service.rechazarSolicitud(id, dto, usuario, clientInfo.ip);
  }

  @Get("cursos/:cursoSeccionId")
  @ApiOperation({ summary: "Aula virtual de un curso: unidades y materiales" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async obtenerAula(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<AulaVirtualResponse> {
    return this.service.obtenerAula(cursoSeccionId, usuario);
  }

  @Post("cursos/:cursoSeccionId/unidades")
  @ApiOperation({ summary: "Crear una unidad del curso (docente asignado)" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async crearUnidad(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @Body() dto: CrearUnidadDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<UnidadFila> {
    return this.service.crearUnidad(cursoSeccionId, dto, usuario, clientInfo.ip);
  }

  @Patch("unidades/:unidadId")
  @ApiOperation({ summary: "Editar u ocultar una unidad" })
  @ApiParam({ name: "unidadId", description: "UUID de la unidad" })
  async actualizarUnidad(
    @Param("unidadId", ParseUUIDPipe) unidadId: string,
    @Body() dto: ActualizarUnidadDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<UnidadFila> {
    return this.service.actualizarUnidad(unidadId, dto, usuario, clientInfo.ip);
  }

  @Post("unidades/:unidadId/materiales/planificar")
  @ApiOperation({ summary: "Planificar un material con su fecha programada" })
  @ApiParam({ name: "unidadId", description: "UUID de la unidad" })
  @ApiResponse({ status: 201, description: "Material planificado" })
  async planificar(
    @Param("unidadId", ParseUUIDPipe) unidadId: string,
    @Body() dto: PlanificarMaterialDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MutacionMaterialResponse> {
    return this.service.planificarMaterial(unidadId, dto, usuario, clientInfo.ip);
  }

  @Post("unidades/:unidadId/materiales/extra")
  @UseInterceptors(FileInterceptor("archivo", OPCIONES_SUBIDA))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Publicar un material extra (no planificado, no cuenta en el IGM)" })
  @ApiParam({ name: "unidadId", description: "UUID de la unidad" })
  async publicarExtra(
    @Param("unidadId", ParseUUIDPipe) unidadId: string,
    @Body() dto: PublicarMaterialExtraDto,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MutacionMaterialResponse> {
    return this.service.publicarExtra(unidadId, dto, archivo, usuario, clientInfo.ip);
  }

  @Patch("materiales/:materialId")
  @ApiOperation({ summary: "Editar un material (la fecha solo mientras no esté congelada)" })
  @ApiParam({ name: "materialId", description: "UUID del material" })
  async actualizarMaterial(
    @Param("materialId", ParseUUIDPipe) materialId: string,
    @Body() dto: ActualizarMaterialDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MutacionMaterialResponse> {
    return this.service.actualizarMaterial(materialId, dto, usuario, clientInfo.ip);
  }

  @Post("materiales/:materialId/publicar")
  @UseInterceptors(FileInterceptor("archivo", OPCIONES_SUBIDA))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Publicar un material planificado (archivo o enlace)" })
  @ApiParam({ name: "materialId", description: "UUID del material" })
  async publicar(
    @Param("materialId", ParseUUIDPipe) materialId: string,
    @Body() dto: ContenidoMaterialDto,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MutacionMaterialResponse> {
    return this.service.publicarPlanificado(materialId, dto, archivo, usuario, clientInfo.ip);
  }

  @Post("materiales/:materialId/reemplazar")
  @UseInterceptors(FileInterceptor("archivo", OPCIONES_SUBIDA))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Reemplazar el archivo o enlace de un material publicado" })
  @ApiParam({ name: "materialId", description: "UUID del material" })
  async reemplazar(
    @Param("materialId", ParseUUIDPipe) materialId: string,
    @Body() dto: ContenidoMaterialDto,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MutacionMaterialResponse> {
    return this.service.reemplazarMaterial(materialId, dto, archivo, usuario, clientInfo.ip);
  }

  @Patch("materiales/:materialId/retirar")
  @ApiOperation({ summary: "Retirar un material publicado (vigencia 0, no se elimina)" })
  @ApiParam({ name: "materialId", description: "UUID del material" })
  async retirar(
    @Param("materialId", ParseUUIDPipe) materialId: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<{ mensaje: string }> {
    return this.service.retirarMaterial(materialId, usuario, clientInfo.ip);
  }

  @Post("materiales/:materialId/solicitudes-cambio-fecha")
  @ApiOperation({ summary: "Solicitar el cambio de fecha de un material con fecha congelada" })
  @ApiParam({ name: "materialId", description: "UUID del material" })
  async solicitarCambio(
    @Param("materialId", ParseUUIDPipe) materialId: string,
    @Body() dto: SolicitarCambioFechaDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<{ mensaje: string; id: string }> {
    return this.service.solicitarCambioFecha(materialId, dto, usuario, clientInfo.ip);
  }

  // ==========================================
  // RF-016: TAREAS, ENTREGAS Y EVALUACIÓN
  // ==========================================

  @Get("cursos/:cursoSeccionId/tareas")
  @ApiOperation({ summary: "Listar tareas y evaluaciones del curso" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async listarTareas(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @Query() query: ListarTareasQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<TareaResponse[]> {
    return this.service.listarTareas(usuario, cursoSeccionId, { periodoId: query.periodoId });
  }

  @Post("cursos/:cursoSeccionId/tareas")
  @ApiOperation({ summary: "Crear una tarea o examen (docente)" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async crearTarea(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @Body() dto: CrearTareaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ mensaje: string; tarea: TareaResponse }> {
    return this.service.crearTarea(usuario, cursoSeccionId, dto);
  }

  @Get("tareas/:id")
  @ApiOperation({ summary: "Obtener detalle de una tarea o evaluación" })
  @ApiParam({ name: "id", description: "UUID de la tarea" })
  async obtenerDetalleTarea(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<TareaResponse> {
    return this.service.obtenerDetalleTarea(usuario, id);
  }

  @Patch("tareas/:id")
  @ApiOperation({ summary: "Actualizar una tarea o examen borrador (docente)" })
  @ApiParam({ name: "id", description: "UUID de la tarea" })
  async actualizarTarea(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ActualizarTareaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ mensaje: string; tarea: TareaResponse }> {
    return this.service.actualizarTarea(usuario, id, dto);
  }

  @Post("tareas/:id/publicar")
  @ApiOperation({ summary: "Publicar una tarea o evaluación para que sea visible (docente)" })
  @ApiParam({ name: "id", description: "UUID de la tarea" })
  async publicarTarea(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ mensaje: string; tarea: TareaResponse }> {
    return this.service.publicarTarea(usuario, id);
  }

  @Post("tareas/:id/cerrar")
  @ApiOperation({ summary: "Cerrar manualmente una tarea o evaluación (docente)" })
  @ApiParam({ name: "id", description: "UUID de la tarea" })
  async cerrarTarea(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ mensaje: string; tarea: TareaResponse }> {
    return this.service.cerrarTarea(usuario, id);
  }

  @Delete("tareas/:id")
  @ApiOperation({ summary: "Eliminar una tarea o examen en borrador (docente)" })
  @ApiParam({ name: "id", description: "UUID de la tarea" })
  async eliminarTarea(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ mensaje: string }> {
    return this.service.eliminarTarea(usuario, id);
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
    return this.service.iniciarIntentoExamen(usuario, id);
  }

  @Post("tareas/:id/progreso")
  @ApiOperation({ summary: "Guardar progreso temporal del intento en curso (estudiante)" })
  @ApiParam({ name: "id", description: "UUID de la tarea" })
  async guardarProgresoIntento(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ProgresoIntentoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ mensaje: string; entrega: EntregaResponse }> {
    return this.service.guardarProgresoIntento(usuario, id, dto.respuestas);
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
    return this.service.entregarTarea(usuario, id, dto, archivo);
  }

  @Get("tareas/:id/entregas")
  @ApiOperation({ summary: "Listar entregas de una tarea (docente)" })
  @ApiParam({ name: "id", description: "UUID de la tarea" })
  async listarEntregasDeTarea(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<EntregaResponse[]> {
    return this.service.listarEntregasDeTarea(usuario, id);
  }

  @Patch("entregas/:entregaId/calificar")
  @ApiOperation({ summary: "Calificar o retroalimentar una entrega (docente)" })
  @ApiParam({ name: "entregaId", description: "UUID de la entrega" })
  async calificarEntrega(
    @Param("entregaId", ParseUUIDPipe) entregaId: string,
    @Body() dto: CalificarEntregaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ mensaje: string; entrega: EntregaResponse }> {
    return this.service.calificarEntrega(usuario, entregaId, dto);
  }

  @Get("cursos/:cursoSeccionId/libro-notas")
  @ApiOperation({ summary: "Obtener libro de calificaciones del curso (docente)" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async obtenerLibroNotas(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @Query() query: ListarTareasQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<LibroNotasResponse> {
    return this.service.obtenerLibroNotas(usuario, cursoSeccionId, query.periodoId);
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
    const buffer = await this.service.exportarExcelLibroNotas(
      usuario,
      cursoSeccionId,
      query.periodoId,
    );

    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="libro_notas_${cursoSeccionId}.xlsx"`,
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
    return this.service.obtenerNotasEstudiante(usuario, usuario.personaId, query.periodoId);
  }

  @Get("estudiantes/:estudianteId/notas")
  @ApiOperation({ summary: "Consultar calificaciones de un estudiante (docente o apoderado)" })
  @ApiParam({ name: "estudianteId", description: "UUID de la persona del estudiante" })
  async obtenerNotasEstudiante(
    @Param("estudianteId", ParseUUIDPipe) estudianteId: string,
    @Query() query: ListarTareasQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<Record<string, unknown>[]> {
    return this.service.obtenerNotasEstudiante(usuario, estudianteId, query.periodoId);
  }

  // ───────────────────────── RF-017: Interacción y Actividad ─────────────────────────

  // ── Muro ──

  @Get("cursos/:cursoSeccionId/muro")
  @ApiOperation({ summary: "Listar publicaciones del muro del curso (RF-017 HU1)" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async listarMuro(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<PublicacionMuroFila[]> {
    return this.service.listarPublicacionesMuro(cursoSeccionId, usuario);
  }

  @Post("cursos/:cursoSeccionId/muro")
  @UseInterceptors(FileInterceptor("archivo", OPCIONES_SUBIDA))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Publicar en el muro del curso (RF-017 HU1)" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async crearPublicacion(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @Body() dto: CrearPublicacionDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @UploadedFile() archivo?: Express.Multer.File,
    @ClientInfo() clientInfo?: ClientInfoData,
  ): Promise<PublicacionMuroFila> {
    return this.service.crearPublicacion(cursoSeccionId, dto, usuario, archivo, clientInfo?.ip);
  }

  @Patch("muro/publicaciones/:id")
  @UseInterceptors(FileInterceptor("archivo", OPCIONES_SUBIDA))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Editar una publicación dentro de los 15 minutos (RF-017 HU1)" })
  @ApiParam({ name: "id", description: "UUID de la publicación" })
  async editarPublicacion(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: EditarPublicacionDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @UploadedFile() archivo?: Express.Multer.File,
    @ClientInfo() clientInfo?: ClientInfoData,
  ): Promise<PublicacionMuroFila> {
    return this.service.editarPublicacion(id, dto, usuario, archivo, clientInfo?.ip);
  }

  @Patch("muro/publicaciones/:id/fijar")
  @ApiOperation({
    summary: "Fijar o desfijar publicación arriba del muro (solo docente) (RF-017 HU1)",
  })
  @ApiParam({ name: "id", description: "UUID de la publicación" })
  async fijarPublicacion(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: FijarPublicacionDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo?: ClientInfoData,
  ): Promise<PublicacionMuroFila> {
    return this.service.fijarPublicacion(id, dto, usuario, clientInfo?.ip);
  }

  // ── Comentarios ──

  @Get("muro/publicaciones/:id/comentarios")
  @ApiOperation({ summary: "Listar comentarios de una publicación (RF-017 HU1)" })
  @ApiParam({ name: "id", description: "UUID de la publicación" })
  async listarComentarios(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<ComentarioMuroFila[]> {
    return this.service.listarComentarios(id, usuario);
  }

  @Post("muro/publicaciones/:id/comentarios")
  @ApiOperation({ summary: "Comentar una publicación (RF-017 HU1)" })
  @ApiParam({ name: "id", description: "UUID de la publicación" })
  async crearComentario(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CrearComentarioDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo?: ClientInfoData,
  ): Promise<ComentarioMuroFila> {
    return this.service.crearComentario(id, dto, usuario, clientInfo?.ip);
  }

  @Patch("muro/comentarios/:id")
  @ApiOperation({ summary: "Editar un comentario dentro de los 15 minutos (RF-017 HU1)" })
  @ApiParam({ name: "id", description: "UUID del comentario" })
  async editarComentario(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: EditarComentarioDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo?: ClientInfoData,
  ): Promise<ComentarioMuroFila> {
    return this.service.editarComentario(id, dto, usuario, clientInfo?.ip);
  }

  // ── Chat Grupal ──

  @Get("cursos/:cursoSeccionId/chat")
  @ApiOperation({ summary: "Listar mensajes del chat grupal del curso (RF-017 HU2)" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async listarChat(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<MensajeChatFila[]> {
    return this.service.listarMensajesChat(cursoSeccionId, usuario);
  }

  @Post("cursos/:cursoSeccionId/chat")
  @UseInterceptors(FileInterceptor("archivo", OPCIONES_SUBIDA))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Enviar mensaje al chat grupal del curso (RF-017 HU2)" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async enviarMensajeChat(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @Body() dto: EnviarMensajeChatDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @UploadedFile() archivo?: Express.Multer.File,
  ): Promise<MensajeChatFila> {
    const mensaje = await this.service.enviarMensajeChat(cursoSeccionId, dto, usuario, archivo);
    this.chatGateway.emitirNuevoMensaje(cursoSeccionId, mensaje);
    return mensaje;
  }

  @Get("cursos/:cursoSeccionId/chat/no-leidos")
  @ApiOperation({ summary: "Contador de mensajes sin leer en el chat grupal (RF-017 HU2)" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async obtenerMensajesNoLeidosChat(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ noLeidos: number }> {
    return this.service.obtenerMensajesNoLeidosChat(cursoSeccionId, usuario);
  }

  @Post("cursos/:cursoSeccionId/chat/marcar-leido")
  @ApiOperation({ summary: "Marcar el chat grupal como leído (RF-017 HU2)" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async marcarChatLeido(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ ok: boolean }> {
    return this.service.marcarChatLeido(cursoSeccionId, usuario);
  }

  // ── Moderación ──

  @Post("moderacion/:tipo/:id/ocultar")
  @ApiOperation({
    summary: "Ocultar publicación, comentario o mensaje por moderación (docente) (RF-017 HU3)",
  })
  @ApiParam({ name: "tipo", enum: ["publicacion", "comentario", "chat"] })
  @ApiParam({ name: "id", description: "UUID del contenido a ocultar" })
  async ocultarContenido(
    @Param("tipo") tipo: TipoModeracion,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: OcultarContenidoDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo?: ClientInfoData,
  ): Promise<{ mensaje: string }> {
    const res = await this.service.ocultarContenido(tipo, id, dto, usuario, clientInfo?.ip);
    if (tipo === "chat") {
      this.chatGateway.emitirMensajeModerado(res.cursoSeccionId, id, false);
    }
    return { mensaje: res.mensaje };
  }

  @Post("moderacion/:tipo/:id/restaurar")
  @ApiOperation({
    summary: "Restaurar publicación, comentario o mensaje ocultado (docente) (RF-017 HU3)",
  })
  @ApiParam({ name: "tipo", enum: ["publicacion", "comentario", "chat"] })
  @ApiParam({ name: "id", description: "UUID del contenido a restaurar" })
  async restaurarContenido(
    @Param("tipo") tipo: TipoModeracion,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo?: ClientInfoData,
  ): Promise<{ mensaje: string }> {
    const res = await this.service.restaurarContenido(tipo, id, usuario, clientInfo?.ip);
    if (tipo === "chat") {
      this.chatGateway.emitirMensajeModerado(res.cursoSeccionId, id, true);
    }
    return { mensaje: res.mensaje };
  }

  @Get("cursos/:cursoSeccionId/moderacion")
  @ApiOperation({
    summary: "Historial de moderación del curso (docente y directivos) (RF-017 HU3)",
  })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async listarHistorialModeracion(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<HistorialModeracionFila[]> {
    return this.service.listarHistorialModeracion(cursoSeccionId, usuario);
  }

  // ── Actividad de Aula ──

  @Post("actividad")
  @ApiOperation({
    summary: "Registrar actividad automática de un estudiante en un material o tarea (RF-017 HU4)",
  })
  async registrarActividad(
    @Body() dto: RegistrarActividadDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ ok: boolean }> {
    return this.service.registrarActividad(dto, usuario);
  }

  @Get("materiales/:materialId/actividad")
  @ApiOperation({ summary: "Ver qué estudiantes revisaron o descargaron un material (RF-017 HU4)" })
  @ApiParam({ name: "materialId", description: "UUID del material" })
  async obtenerActividadMaterial(
    @Param("materialId", ParseUUIDPipe) materialId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<ActividadEstudianteMaterial[]> {
    return this.service.obtenerActividadMaterial(materialId, usuario);
  }

  @Get("tareas/:tareaId/actividad")
  @ApiOperation({ summary: "Ver qué estudiantes abrieron o completaron una tarea (RF-017 HU4)" })
  @ApiParam({ name: "tareaId", description: "UUID de la tarea" })
  async obtenerActividadTarea(
    @Param("tareaId", ParseUUIDPipe) tareaId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<ActividadEstudianteTarea[]> {
    return this.service.obtenerActividadTarea(tareaId, usuario);
  }
}
