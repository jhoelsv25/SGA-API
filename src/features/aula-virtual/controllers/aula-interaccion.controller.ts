import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { HEADER_ANIO_ACADEMICO } from "../../../common/anio-lectivo";
import { ClientInfo, type ClientInfoData, CurrentUser } from "../../../common/decorators";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { LIMITE_DURO_SUBIDA_BYTES, type TipoModeracion } from "../constants";
import {
  CrearComentarioDto,
  CrearPublicacionDto,
  EditarComentarioDto,
  EditarPublicacionDto,
  EnviarMensajeChatDto,
  FijarPublicacionDto,
  OcultarContenidoDto,
  RegistrarActividadDto,
} from "../dto";
import { ChatAulaGateway } from "../gateways/chat-aula.gateway";
import type {
  ActividadEstudianteMaterial,
  ActividadEstudianteTarea,
  ComentarioMuroFila,
  HistorialModeracionFila,
  MensajeChatFila,
  PublicacionMuroFila,
} from "../interfaces";
import { AulaActividadService, AulaInteraccionService } from "../services";

const OPCIONES_SUBIDA = { limits: { fileSize: LIMITE_DURO_SUBIDA_BYTES } };

@ApiTags("Aula virtual - Interacción y actividad")
@ApiBearerAuth()
@ApiHeader({
  name: HEADER_ANIO_ACADEMICO,
  required: false,
  description: "Año lectivo de trabajo. Si se omite, se opera con el año en curso.",
})
@Controller("aula-virtual")
export class AulaInteraccionController {
  constructor(
    private readonly interaccionSvc: AulaInteraccionService,
    private readonly actividadSvc: AulaActividadService,
    private readonly chatGateway: ChatAulaGateway,
  ) {}

  @Get("cursos/:cursoSeccionId/muro")
  @ApiOperation({ summary: "Listar publicaciones del muro del curso" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async listarMuro(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<PublicacionMuroFila[]> {
    return this.interaccionSvc.listarPublicacionesMuro(cursoSeccionId, usuario);
  }

  @Post("cursos/:cursoSeccionId/muro")
  @UseInterceptors(FileInterceptor("archivo", OPCIONES_SUBIDA))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Publicar en el muro del curso" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async crearPublicacion(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @Body() dto: CrearPublicacionDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @UploadedFile() archivo?: Express.Multer.File,
    @ClientInfo() clientInfo?: ClientInfoData,
  ): Promise<PublicacionMuroFila> {
    return this.interaccionSvc.crearPublicacion(
      cursoSeccionId,
      dto,
      usuario,
      archivo,
      clientInfo?.ip,
    );
  }

  @Patch("muro/publicaciones/:id")
  @UseInterceptors(FileInterceptor("archivo", OPCIONES_SUBIDA))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Editar una publicación dentro de los 15 minutos" })
  @ApiParam({ name: "id", description: "UUID de la publicación" })
  async editarPublicacion(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: EditarPublicacionDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @UploadedFile() archivo?: Express.Multer.File,
    @ClientInfo() clientInfo?: ClientInfoData,
  ): Promise<PublicacionMuroFila> {
    return this.interaccionSvc.editarPublicacion(id, dto, usuario, archivo, clientInfo?.ip);
  }

  @Patch("muro/publicaciones/:id/fijar")
  @ApiOperation({ summary: "Fijar o desfijar publicación arriba del muro (solo docente)" })
  @ApiParam({ name: "id", description: "UUID de la publicación" })
  async fijarPublicacion(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: FijarPublicacionDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo?: ClientInfoData,
  ): Promise<PublicacionMuroFila> {
    return this.interaccionSvc.fijarPublicacion(id, dto, usuario, clientInfo?.ip);
  }

  @Get("muro/publicaciones/:id/comentarios")
  @ApiOperation({ summary: "Listar comentarios de una publicación" })
  @ApiParam({ name: "id", description: "UUID de la publicación" })
  async listarComentarios(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<ComentarioMuroFila[]> {
    return this.interaccionSvc.listarComentarios(id, usuario);
  }

  @Post("muro/publicaciones/:id/comentarios")
  @ApiOperation({ summary: "Comentar una publicación" })
  @ApiParam({ name: "id", description: "UUID de la publicación" })
  async crearComentario(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CrearComentarioDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo?: ClientInfoData,
  ): Promise<ComentarioMuroFila> {
    return this.interaccionSvc.crearComentario(id, dto, usuario, clientInfo?.ip);
  }

  @Patch("muro/comentarios/:id")
  @ApiOperation({ summary: "Editar un comentario dentro de los 15 minutos" })
  @ApiParam({ name: "id", description: "UUID del comentario" })
  async editarComentario(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: EditarComentarioDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo?: ClientInfoData,
  ): Promise<ComentarioMuroFila> {
    return this.interaccionSvc.editarComentario(id, dto, usuario, clientInfo?.ip);
  }

  @Get("cursos/:cursoSeccionId/chat")
  @ApiOperation({ summary: "Listar mensajes del chat grupal del curso" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async listarChat(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<MensajeChatFila[]> {
    return this.interaccionSvc.listarMensajesChat(cursoSeccionId, usuario);
  }

  @Post("cursos/:cursoSeccionId/chat")
  @UseInterceptors(FileInterceptor("archivo", OPCIONES_SUBIDA))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Enviar mensaje al chat grupal del curso" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async enviarMensajeChat(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @Body() dto: EnviarMensajeChatDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @UploadedFile() archivo?: Express.Multer.File,
  ): Promise<MensajeChatFila> {
    const mensaje = await this.interaccionSvc.enviarMensajeChat(
      cursoSeccionId,
      dto,
      usuario,
      archivo,
    );
    this.chatGateway.emitirNuevoMensaje(cursoSeccionId, mensaje);
    return mensaje;
  }

  @Get("cursos/:cursoSeccionId/chat/no-leidos")
  @ApiOperation({ summary: "Contador de mensajes sin leer en el chat grupal" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async obtenerMensajesNoLeidosChat(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ noLeidos: number }> {
    return this.interaccionSvc.obtenerMensajesNoLeidosChat(cursoSeccionId, usuario);
  }

  @Post("cursos/:cursoSeccionId/chat/marcar-leido")
  @ApiOperation({ summary: "Marcar el chat grupal como leído" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async marcarChatLeido(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ ok: boolean }> {
    return this.interaccionSvc.marcarChatLeido(cursoSeccionId, usuario);
  }

  @Post("moderacion/:tipo/:id/ocultar")
  @ApiOperation({ summary: "Ocultar publicación, comentario o mensaje por moderación (docente)" })
  @ApiParam({ name: "tipo", enum: ["publicacion", "comentario", "chat"] })
  @ApiParam({ name: "id", description: "UUID del contenido a ocultar" })
  async ocultarContenido(
    @Param("tipo") tipo: TipoModeracion,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: OcultarContenidoDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo?: ClientInfoData,
  ): Promise<{ mensaje: string }> {
    const res = await this.interaccionSvc.ocultarContenido(tipo, id, dto, usuario, clientInfo?.ip);
    if (tipo === "chat") this.chatGateway.emitirMensajeModerado(res.cursoSeccionId, id, false);
    return { mensaje: res.mensaje };
  }

  @Post("moderacion/:tipo/:id/restaurar")
  @ApiOperation({ summary: "Restaurar publicación, comentario o mensaje ocultado (docente)" })
  @ApiParam({ name: "tipo", enum: ["publicacion", "comentario", "chat"] })
  @ApiParam({ name: "id", description: "UUID del contenido a restaurar" })
  async restaurarContenido(
    @Param("tipo") tipo: TipoModeracion,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo?: ClientInfoData,
  ): Promise<{ mensaje: string }> {
    const res = await this.interaccionSvc.restaurarContenido(tipo, id, usuario, clientInfo?.ip);
    if (tipo === "chat") this.chatGateway.emitirMensajeModerado(res.cursoSeccionId, id, true);
    return { mensaje: res.mensaje };
  }

  @Get("cursos/:cursoSeccionId/moderacion")
  @ApiOperation({ summary: "Historial de moderación del curso (docente y directivos)" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async listarHistorialModeracion(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<HistorialModeracionFila[]> {
    return this.interaccionSvc.listarHistorialModeracion(cursoSeccionId, usuario);
  }

  @Post("actividad")
  @ApiOperation({
    summary: "Registrar actividad automática de un estudiante en un material o tarea",
  })
  async registrarActividad(
    @Body() dto: RegistrarActividadDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ ok: boolean }> {
    return this.actividadSvc.registrarActividad(dto, usuario);
  }

  @Get("materiales/:materialId/actividad")
  @ApiOperation({ summary: "Ver qué estudiantes revisaron o descargaron un material" })
  @ApiParam({ name: "materialId", description: "UUID del material" })
  async obtenerActividadMaterial(
    @Param("materialId", ParseUUIDPipe) materialId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<ActividadEstudianteMaterial[]> {
    return this.actividadSvc.obtenerActividadMaterial(materialId, usuario);
  }

  @Get("tareas/:tareaId/actividad")
  @ApiOperation({ summary: "Ver qué estudiantes abrieron o completaron una tarea" })
  @ApiParam({ name: "tareaId", description: "UUID de la tarea" })
  async obtenerActividadTarea(
    @Param("tareaId", ParseUUIDPipe) tareaId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<ActividadEstudianteTarea[]> {
    return this.actividadSvc.obtenerActividadTarea(tareaId, usuario);
  }
}
