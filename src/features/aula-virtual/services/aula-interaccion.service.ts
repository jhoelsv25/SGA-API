import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { AnioLectivoCls } from "../../../common/anio-lectivo";
import { AuditService } from "../../../common/services/audit.service";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { NotificacionesService } from "../../notificaciones/notificaciones.service";
import { CARPETA_INTERACCION, MENSAJES_INTERACCION, type TipoModeracion } from "../constants";
import type {
  CrearComentarioDto,
  CrearPublicacionDto,
  EditarComentarioDto,
  EditarPublicacionDto,
  EnviarMensajeChatDto,
  FijarPublicacionDto,
  OcultarContenidoDto,
} from "../dto";
import type {
  ComentarioMuroFila,
  CursoAula,
  HistorialModeracionFila,
  MensajeChatFila,
  PublicacionMuroFila,
} from "../interfaces";
import { AulaVirtualRepository } from "../repositories";
import {
  estaDentroDePlazoEdicion,
  validarFormatoAdjuntoInteraccion,
  validarMotivoOcultamiento,
  validarTamanoAdjunto,
  validarTextoOAdjunto,
} from "../utils";
import { AulaContextoHelper } from "./aula-contexto.helper";

/**
 * Servicio de dominio para el muro del curso, comentarios,
 * chat grupal en tiempo real y moderación docente (RF-017).
 */
@Injectable()
export class AulaInteraccionService {
  private readonly ctx: AulaContextoHelper;

  constructor(
    private readonly repository: AulaVirtualRepository,
    aniosService: AniosAcademicosService,
    anioLectivoCls: AnioLectivoCls,
    private readonly notificaciones: NotificacionesService,
    auditService: AuditService,
    @Optional() contexto?: AulaContextoHelper,
  ) {
    this.ctx =
      contexto ?? new AulaContextoHelper(repository, aniosService, anioLectivoCls, auditService);
  }

  async listarPublicacionesMuro(
    cursoSeccionId: string,
    usuario: AuthenticatedUser,
  ): Promise<PublicacionMuroFila[]> {
    const curso = await this.ctx.requerirCurso(cursoSeccionId);
    await this.ctx.verificarParticipante(curso, usuario, true);
    return this.repository.listarPublicacionesMuro(cursoSeccionId, false);
  }

  async crearPublicacion(
    cursoSeccionId: string,
    dto: CrearPublicacionDto,
    usuario: AuthenticatedUser,
    archivo?: Express.Multer.File,
    ip?: string,
  ): Promise<PublicacionMuroFila> {
    const curso = await this.ctx.requerirCurso(cursoSeccionId);
    await this.ctx.verificarParticipante(curso, usuario);
    await this.ctx.verificarAnioAbierto(cursoSeccionId);

    const adjuntoUrl = await this.guardarAdjuntoInteraccion(archivo, dto.enlaceAdjunto);
    const validacionTexto = validarTextoOAdjunto(dto.contenido, Boolean(adjuntoUrl));
    if (!validacionTexto.valido) throw new BadRequestException(validacionTexto.mensaje);

    const pub = await this.repository.crearPublicacion({
      cursoSeccionId,
      autorId: usuario.id,
      contenido: dto.contenido?.trim() || "",
      adjuntoUrl,
      fijada: false,
    });

    await this.avisarPublicacionMuro(curso, usuario.id, pub);
    await this.ctx.auditar(
      "crear",
      "publicaciones_aula",
      pub.id,
      usuario.id,
      null,
      { contenido: pub.contenido, adjuntoUrl },
      ip,
    );
    return pub;
  }

  async editarPublicacion(
    id: string,
    dto: EditarPublicacionDto,
    usuario: AuthenticatedUser,
    archivo?: Express.Multer.File,
    ip?: string,
  ): Promise<PublicacionMuroFila> {
    const pub = await this.repository.obtenerPublicacion(id);
    if (!pub) throw new NotFoundException(MENSAJES_INTERACCION.PUBLICACION_NO_ENCONTRADA);

    await this.ctx.verificarAnioAbierto(pub.cursoSeccionId);
    if (pub.autorId !== usuario.id)
      throw new ForbiddenException(MENSAJES_INTERACCION.SOLO_AUTOR_EDITA);
    if (!estaDentroDePlazoEdicion(pub.creadoEn)) {
      throw new BadRequestException(MENSAJES_INTERACCION.EDICION_FUERA_DE_PLAZO);
    }

    let adjuntoUrl = pub.adjuntoUrl;
    if (archivo || dto.enlaceAdjunto !== undefined) {
      adjuntoUrl = await this.guardarAdjuntoInteraccion(archivo, dto.enlaceAdjunto);
    }

    const nuevoContenido = dto.contenido !== undefined ? dto.contenido.trim() : pub.contenido;
    const validacionTexto = validarTextoOAdjunto(nuevoContenido, Boolean(adjuntoUrl));
    if (!validacionTexto.valido) throw new BadRequestException(validacionTexto.mensaje);

    const pubEditada = await this.repository.actualizarPublicacion(id, {
      contenido: nuevoContenido,
      adjuntoUrl,
    });

    await this.ctx.auditar(
      "actualizar",
      "publicaciones_aula",
      id,
      usuario.id,
      { contenido: pub.contenido, adjuntoUrl: pub.adjuntoUrl },
      { contenido: pubEditada.contenido, adjuntoUrl: pubEditada.adjuntoUrl },
      ip,
    );
    return pubEditada;
  }

  async fijarPublicacion(
    id: string,
    dto: FijarPublicacionDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<PublicacionMuroFila> {
    const pub = await this.repository.obtenerPublicacion(id);
    if (!pub) throw new NotFoundException(MENSAJES_INTERACCION.PUBLICACION_NO_ENCONTRADA);

    const curso = await this.ctx.requerirCurso(pub.cursoSeccionId);
    if (!(await this.ctx.esDocenteDelCurso(curso, usuario))) {
      throw new ForbiddenException(MENSAJES_INTERACCION.SOLO_DOCENTE_FIJA);
    }

    const pubActualizada = await this.repository.fijarPublicacion(id, dto.fijada);
    await this.ctx.auditar(
      "actualizar",
      "publicaciones_aula",
      id,
      usuario.id,
      { fijada: pub.fijada },
      { fijada: dto.fijada },
      ip,
    );
    return pubActualizada;
  }

  async listarComentarios(
    publicacionId: string,
    usuario: AuthenticatedUser,
  ): Promise<ComentarioMuroFila[]> {
    const pub = await this.repository.obtenerPublicacion(publicacionId);
    if (!pub) throw new NotFoundException(MENSAJES_INTERACCION.PUBLICACION_NO_ENCONTRADA);

    const curso = await this.ctx.requerirCurso(pub.cursoSeccionId);
    await this.ctx.verificarParticipante(curso, usuario, true);
    return this.repository.listarComentarios(publicacionId, false);
  }

  async crearComentario(
    publicacionId: string,
    dto: CrearComentarioDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<ComentarioMuroFila> {
    const pub = await this.repository.obtenerPublicacion(publicacionId);
    if (!pub) throw new NotFoundException(MENSAJES_INTERACCION.PUBLICACION_NO_ENCONTRADA);

    const curso = await this.ctx.requerirCurso(pub.cursoSeccionId);
    await this.ctx.verificarParticipante(curso, usuario);
    await this.ctx.verificarAnioAbierto(pub.cursoSeccionId);

    const validacionTexto = validarTextoOAdjunto(dto.contenido, false);
    if (!validacionTexto.valido) throw new BadRequestException(validacionTexto.mensaje);

    const comentario = await this.repository.crearComentario({
      publicacionId,
      autorId: usuario.id,
      contenido: dto.contenido.trim(),
    });

    await this.ctx.auditar(
      "crear",
      "comentarios_publicacion",
      comentario.id,
      usuario.id,
      null,
      { contenido: comentario.contenido },
      ip,
    );
    return comentario;
  }

  async editarComentario(
    id: string,
    dto: EditarComentarioDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<ComentarioMuroFila> {
    const com = await this.repository.obtenerComentario(id);
    if (!com) throw new NotFoundException(MENSAJES_INTERACCION.COMENTARIO_NO_ENCONTRADO);

    const pub = await this.repository.obtenerPublicacion(com.publicacionId);
    if (pub) await this.ctx.verificarAnioAbierto(pub.cursoSeccionId);

    if (com.autorId !== usuario.id)
      throw new ForbiddenException(MENSAJES_INTERACCION.SOLO_AUTOR_EDITA);
    if (!estaDentroDePlazoEdicion(com.creadoEn)) {
      throw new BadRequestException(MENSAJES_INTERACCION.EDICION_FUERA_DE_PLAZO);
    }

    const validacionTexto = validarTextoOAdjunto(dto.contenido, false);
    if (!validacionTexto.valido) throw new BadRequestException(validacionTexto.mensaje);

    const comEditado = await this.repository.actualizarComentario(id, {
      contenido: dto.contenido.trim(),
    });
    await this.ctx.auditar(
      "actualizar",
      "comentarios_publicacion",
      id,
      usuario.id,
      { contenido: com.contenido },
      { contenido: comEditado.contenido },
      ip,
    );
    return comEditado;
  }

  async listarMensajesChat(
    cursoSeccionId: string,
    usuario: AuthenticatedUser,
  ): Promise<MensajeChatFila[]> {
    const curso = await this.ctx.requerirCurso(cursoSeccionId);
    await this.ctx.verificarParticipante(curso, usuario, true);
    const mensajes = await this.repository.listarMensajesChat(cursoSeccionId, false);
    await this.repository.actualizarUltimaLecturaChat(cursoSeccionId, usuario.id);
    return mensajes;
  }

  async enviarMensajeChat(
    cursoSeccionId: string,
    dto: EnviarMensajeChatDto,
    usuario: AuthenticatedUser,
    archivo?: Express.Multer.File,
  ): Promise<MensajeChatFila> {
    const curso = await this.ctx.requerirCurso(cursoSeccionId);
    await this.ctx.verificarParticipante(curso, usuario, true);
    await this.ctx.verificarAnioAbierto(cursoSeccionId);

    const adjuntoUrl = await this.guardarAdjuntoInteraccion(archivo, dto.enlaceAdjunto);
    const validacionTexto = validarTextoOAdjunto(dto.mensaje, Boolean(adjuntoUrl));
    if (!validacionTexto.valido) throw new BadRequestException(validacionTexto.mensaje);

    const msg = await this.repository.enviarMensajeChat({
      cursoSeccionId,
      emisorId: usuario.id,
      contenido: dto.mensaje?.trim() || "",
      adjuntoUrl,
    });
    await this.repository.actualizarUltimaLecturaChat(cursoSeccionId, usuario.id);
    return msg;
  }

  async obtenerMensajesNoLeidosChat(
    cursoSeccionId: string,
    usuario: AuthenticatedUser,
  ): Promise<{ noLeidos: number }> {
    const curso = await this.ctx.requerirCurso(cursoSeccionId);
    await this.ctx.verificarParticipante(curso, usuario, true);
    return {
      noLeidos: await this.repository.contarMensajesNoLeidosChat(cursoSeccionId, usuario.id),
    };
  }

  async marcarChatLeido(
    cursoSeccionId: string,
    usuario: AuthenticatedUser,
  ): Promise<{ ok: boolean }> {
    const curso = await this.ctx.requerirCurso(cursoSeccionId);
    await this.ctx.verificarParticipante(curso, usuario, true);
    await this.repository.actualizarUltimaLecturaChat(cursoSeccionId, usuario.id);
    return { ok: true };
  }

  async ocultarContenido(
    tipo: TipoModeracion,
    id: string,
    dto: OcultarContenidoDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<{ mensaje: string; cursoSeccionId: string }> {
    const validacionMotivo = validarMotivoOcultamiento(dto.motivo);
    if (!validacionMotivo.valido) throw new BadRequestException(validacionMotivo.mensaje);

    const { cursoSeccionId, tabla } = await this.resolverObjetivoModeracion(tipo, id, usuario);
    await this.repository.ocultarContenido(tipo, id, usuario.id, dto.motivo.trim());
    await this.ctx.auditar(
      "eliminar",
      tabla,
      id,
      usuario.id,
      { vigente: true },
      { vigente: false, motivo: dto.motivo.trim() },
      ip,
    );
    return { mensaje: MENSAJES_INTERACCION.CONTENIDO_OCULTADO, cursoSeccionId };
  }

  async restaurarContenido(
    tipo: TipoModeracion,
    id: string,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<{ mensaje: string; cursoSeccionId: string }> {
    const { cursoSeccionId, tabla } = await this.resolverObjetivoModeracion(tipo, id, usuario);
    await this.repository.restaurarContenido(tipo, id);
    await this.ctx.auditar(
      "actualizar",
      tabla,
      id,
      usuario.id,
      { vigente: false },
      { vigente: true },
      ip,
    );
    return { mensaje: MENSAJES_INTERACCION.CONTENIDO_RESTAURADO, cursoSeccionId };
  }

  async listarHistorialModeracion(
    cursoSeccionId: string,
    usuario: AuthenticatedUser,
  ): Promise<HistorialModeracionFila[]> {
    const curso = await this.ctx.requerirCurso(cursoSeccionId);
    const esDocente = await this.ctx.esDocenteDelCurso(curso, usuario);
    const esDirectivo = this.ctx.esRolDeSeguimiento(usuario);
    if (!esDocente && !esDirectivo) throw new ForbiddenException(MENSAJES_INTERACCION.SIN_ACCESO);
    return this.repository.listarHistorialModeracion(cursoSeccionId);
  }

  private async resolverObjetivoModeracion(
    tipo: TipoModeracion,
    id: string,
    usuario: AuthenticatedUser,
  ): Promise<{ cursoSeccionId: string; tabla: string }> {
    let cursoSeccionId: string;
    let tabla: string;

    if (tipo === "publicacion") {
      const p = await this.repository.obtenerPublicacion(id);
      if (!p) throw new NotFoundException(MENSAJES_INTERACCION.PUBLICACION_NO_ENCONTRADA);
      cursoSeccionId = p.cursoSeccionId;
      tabla = "publicaciones_aula";
    } else if (tipo === "comentario") {
      const c = await this.repository.obtenerComentario(id);
      if (!c) throw new NotFoundException(MENSAJES_INTERACCION.COMENTARIO_NO_ENCONTRADO);
      const p = await this.repository.obtenerPublicacion(c.publicacionId);
      if (!p) throw new NotFoundException(MENSAJES_INTERACCION.PUBLICACION_NO_ENCONTRADA);
      cursoSeccionId = p.cursoSeccionId;
      tabla = "comentarios_publicacion";
    } else {
      const m = await this.repository.obtenerMensajeChat(id);
      if (!m) throw new NotFoundException(MENSAJES_INTERACCION.MENSAJE_NO_ENCONTRADO);
      cursoSeccionId = m.cursoSeccionId;
      tabla = "mensajes_chat";
    }

    const curso = await this.ctx.requerirCurso(cursoSeccionId);
    if (!(await this.ctx.esDocenteDelCurso(curso, usuario))) {
      throw new ForbiddenException(MENSAJES_INTERACCION.SOLO_DOCENTE_MODERA);
    }

    return { cursoSeccionId, tabla };
  }

  private async guardarAdjuntoInteraccion(
    archivo?: Express.Multer.File,
    enlace?: string,
  ): Promise<string | null> {
    if (archivo) {
      const validacion = validarTamanoAdjunto(archivo.size);
      if (!validacion.valido) throw new BadRequestException(validacion.mensaje);
      const valFormato = validarFormatoAdjuntoInteraccion(archivo.originalname);
      if (!valFormato.valido) throw new BadRequestException(valFormato.mensaje);
      const guardado = await this.ctx.guardarArchivoLocal(CARPETA_INTERACCION, archivo, true);
      return guardado.url;
    }
    if (enlace && enlace.trim().length > 0) return enlace.trim();
    return null;
  }

  private async avisarPublicacionMuro(
    curso: CursoAula,
    autorUsuarioId: string,
    publicacion: PublicacionMuroFila,
  ): Promise<void> {
    const estudianteUsuarioIds = await this.repository.usuariosEstudiantesDeSeccion(
      curso.seccionId,
      curso.anioAcademicoId,
    );
    const docenteUsuarioId = await this.repository.obtenerDocenteUsuarioId(curso.id);

    const todosDestinatarios = new Set<string>();
    for (const id of estudianteUsuarioIds) {
      if (id && id !== autorUsuarioId) todosDestinatarios.add(id);
    }
    if (docenteUsuarioId && docenteUsuarioId !== autorUsuarioId) {
      todosDestinatarios.add(docenteUsuarioId);
    }

    const preview = publicacion.contenido
      ? publicacion.contenido.slice(0, 80)
      : "Nuevo archivo adjunto";
    await Promise.all(
      Array.from(todosDestinatarios).map((usuarioId) =>
        this.notificaciones.enviar({
          usuarioId,
          titulo: `Nueva publicación en ${curso.cursoNombre}`,
          mensaje: preview,
          tipo: "informacion",
          enlaceUrl: `/admin/aula-virtual/${curso.id}?tab=muro`,
        }),
      ),
    );
  }
}
