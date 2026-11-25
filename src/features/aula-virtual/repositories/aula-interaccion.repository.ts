import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  chatLecturas,
  comentariosPublicacion,
  mensajesChat,
  personas,
  publicacionesAula,
  usuarios,
} from "../../../core/database/schema";
import type { TipoModeracion } from "../constants";
import type {
  ComentarioMuroFila,
  HistorialModeracionFila,
  MensajeChatFila,
  PublicacionMuroFila,
} from "../interfaces";
import { nombreSql, ROL_AUTOR_SQL } from "./aula-shared.helper";

/**
 * Repositorio especializado en el muro del curso, comentarios, chat en tiempo real,
 * control de lectura y moderación de contenidos (RF-017).
 */
@Injectable()
export class AulaInteraccionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private consultaPublicaciones(conteoSoloVigentes: boolean) {
    const comentariosCountSql = sql<number>`(
      SELECT COUNT(*)::int FROM comentarios_publicacion cp
      WHERE cp.publicacion_id = ${publicacionesAula.id}
      ${conteoSoloVigentes ? sql`AND cp.vigente = true` : sql``}
    )`;

    return this.db
      .select({
        id: publicacionesAula.id,
        cursoSeccionId: publicacionesAula.cursoSeccionId,
        autorId: publicacionesAula.autorId,
        autorNombre: nombreSql(personas),
        autorRol: ROL_AUTOR_SQL,
        contenido: publicacionesAula.contenido,
        adjuntoUrl: publicacionesAula.adjuntoUrl,
        fijada: publicacionesAula.fijada,
        vigente: publicacionesAula.vigente,
        creadoEn: sql<string>`${publicacionesAula.creadoEn}::text`,
        actualizadoEn: sql<string>`${publicacionesAula.actualizadoEn}::text`,
        ocultadoPorId: publicacionesAula.ocultadoPorId,
        ocultadoEn: sql<string>`${publicacionesAula.ocultadoEn}::text`,
        motivoOcultamiento: publicacionesAula.motivoOcultamiento,
        comentariosCount: comentariosCountSql,
      })
      .from(publicacionesAula)
      .innerJoin(usuarios, eq(usuarios.id, publicacionesAula.autorId))
      .innerJoin(personas, eq(personas.id, usuarios.personaId));
  }

  async listarPublicacionesMuro(
    cursoSeccionId: string,
    verOcultos: boolean,
  ): Promise<PublicacionMuroFila[]> {
    const condiciones = [eq(publicacionesAula.cursoSeccionId, cursoSeccionId)];
    if (!verOcultos) {
      condiciones.push(eq(publicacionesAula.vigente, true));
    }

    return this.consultaPublicaciones(!verOcultos)
      .where(and(...condiciones))
      .orderBy(desc(publicacionesAula.fijada), desc(publicacionesAula.creadoEn));
  }

  async obtenerPublicacion(id: string): Promise<PublicacionMuroFila | null> {
    const [fila] = await this.consultaPublicaciones(true)
      .where(eq(publicacionesAula.id, id))
      .limit(1);
    return fila ?? null;
  }

  async crearPublicacion(datos: {
    cursoSeccionId: string;
    autorId: string;
    contenido?: string | null;
    adjuntoUrl?: string | null;
    fijada?: boolean;
  }): Promise<PublicacionMuroFila> {
    const [insertada] = await this.db
      .insert(publicacionesAula)
      .values({
        cursoSeccionId: datos.cursoSeccionId,
        autorId: datos.autorId,
        contenido: datos.contenido ?? "",
        adjuntoUrl: datos.adjuntoUrl ?? null,
        fijada: datos.fijada ?? false,
        vigente: true,
      })
      .returning({ id: publicacionesAula.id });

    const pub = await this.obtenerPublicacion(insertada.id);
    if (!pub) throw new Error("Error al recuperar la publicación creada.");
    return pub;
  }

  async actualizarPublicacion(
    id: string,
    datos: {
      contenido?: string | null;
      adjuntoUrl?: string | null;
    },
  ): Promise<PublicacionMuroFila> {
    const valores: Record<string, unknown> = {
      actualizadoEn: sql`CURRENT_TIMESTAMP`,
    };
    if (datos.contenido !== undefined) valores.contenido = datos.contenido ?? "";
    if (datos.adjuntoUrl !== undefined) valores.adjuntoUrl = datos.adjuntoUrl;

    await this.db.update(publicacionesAula).set(valores).where(eq(publicacionesAula.id, id));

    const pub = await this.obtenerPublicacion(id);
    if (!pub) throw new Error("Publicación no encontrada tras actualización.");
    return pub;
  }

  async fijarPublicacion(id: string, fijada: boolean): Promise<PublicacionMuroFila> {
    await this.db
      .update(publicacionesAula)
      .set({ fijada, actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(publicacionesAula.id, id));

    const pub = await this.obtenerPublicacion(id);
    if (!pub) throw new Error("Publicación no encontrada tras fijar.");
    return pub;
  }

  private consultaComentarios() {
    return this.db
      .select({
        id: comentariosPublicacion.id,
        publicacionId: comentariosPublicacion.publicacionId,
        autorId: comentariosPublicacion.autorId,
        autorNombre: nombreSql(personas),
        autorRol: ROL_AUTOR_SQL,
        contenido: comentariosPublicacion.contenido,
        vigente: comentariosPublicacion.vigente,
        creadoEn: sql<string>`${comentariosPublicacion.creadoEn}::text`,
        actualizadoEn: sql<string>`${comentariosPublicacion.actualizadoEn}::text`,
        ocultadoPorId: comentariosPublicacion.ocultadoPorId,
        ocultadoEn: sql<string>`${comentariosPublicacion.ocultadoEn}::text`,
        motivoOcultamiento: comentariosPublicacion.motivoOcultamiento,
      })
      .from(comentariosPublicacion)
      .innerJoin(usuarios, eq(usuarios.id, comentariosPublicacion.autorId))
      .innerJoin(personas, eq(personas.id, usuarios.personaId));
  }

  async listarComentarios(
    publicacionId: string,
    verOcultos: boolean,
  ): Promise<ComentarioMuroFila[]> {
    const condiciones = [eq(comentariosPublicacion.publicacionId, publicacionId)];
    if (!verOcultos) {
      condiciones.push(eq(comentariosPublicacion.vigente, true));
    }

    return this.consultaComentarios()
      .where(and(...condiciones))
      .orderBy(asc(comentariosPublicacion.creadoEn));
  }

  async obtenerComentario(id: string): Promise<ComentarioMuroFila | null> {
    const [fila] = await this.consultaComentarios()
      .where(eq(comentariosPublicacion.id, id))
      .limit(1);
    return fila ?? null;
  }

  async crearComentario(datos: {
    publicacionId: string;
    autorId: string;
    contenido: string;
  }): Promise<ComentarioMuroFila> {
    const [insertado] = await this.db
      .insert(comentariosPublicacion)
      .values({
        publicacionId: datos.publicacionId,
        autorId: datos.autorId,
        contenido: datos.contenido,
        vigente: true,
      })
      .returning({ id: comentariosPublicacion.id });

    const com = await this.obtenerComentario(insertado.id);
    if (!com) throw new Error("Error al recuperar comentario creado.");
    return com;
  }

  async actualizarComentario(
    id: string,
    datos: { contenido: string },
  ): Promise<ComentarioMuroFila> {
    await this.db
      .update(comentariosPublicacion)
      .set({
        contenido: datos.contenido,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(comentariosPublicacion.id, id));

    const com = await this.obtenerComentario(id);
    if (!com) throw new Error("Comentario no encontrado tras actualización.");
    return com;
  }

  private consultaMensajesChat() {
    return this.db
      .select({
        id: mensajesChat.id,
        cursoSeccionId: mensajesChat.cursoSeccionId,
        emisorId: mensajesChat.emisorId,
        emisorNombre: nombreSql(personas),
        emisorRol: ROL_AUTOR_SQL,
        contenido: mensajesChat.contenido,
        adjuntoUrl: mensajesChat.adjuntoUrl,
        vigente: mensajesChat.vigente,
        enviadoEn: sql<string>`${mensajesChat.enviadoEn}::text`,
        actualizadoEn: sql<string>`${mensajesChat.actualizadoEn}::text`,
        ocultadoPorId: mensajesChat.ocultadoPorId,
        ocultadoEn: sql<string>`${mensajesChat.ocultadoEn}::text`,
        motivoOcultamiento: mensajesChat.motivoOcultamiento,
      })
      .from(mensajesChat)
      .innerJoin(usuarios, eq(usuarios.id, mensajesChat.emisorId))
      .innerJoin(personas, eq(personas.id, usuarios.personaId));
  }

  async listarMensajesChat(
    cursoSeccionId: string,
    verOcultos: boolean,
    limite: number = 100,
  ): Promise<MensajeChatFila[]> {
    const condiciones = [
      eq(mensajesChat.cursoSeccionId, cursoSeccionId),
      isNull(mensajesChat.eliminadoEn),
    ];
    if (!verOcultos) {
      condiciones.push(eq(mensajesChat.vigente, true));
    }

    return this.consultaMensajesChat()
      .where(and(...condiciones))
      .orderBy(asc(mensajesChat.enviadoEn))
      .limit(limite);
  }

  async obtenerMensajeChat(id: string): Promise<MensajeChatFila | null> {
    const [fila] = await this.consultaMensajesChat().where(eq(mensajesChat.id, id)).limit(1);
    return fila ?? null;
  }

  async enviarMensajeChat(datos: {
    cursoSeccionId: string;
    emisorId: string;
    contenido: string;
    adjuntoUrl?: string | null;
  }): Promise<MensajeChatFila> {
    const [insertado] = await this.db
      .insert(mensajesChat)
      .values({
        cursoSeccionId: datos.cursoSeccionId,
        emisorId: datos.emisorId,
        receptorId: null, // Sin mensajes privados (CP-RF017-10)
        contenido: datos.contenido,
        adjuntoUrl: datos.adjuntoUrl ?? null,
        vigente: true,
      })
      .returning({ id: mensajesChat.id });

    const msg = await this.obtenerMensajeChat(insertado.id);
    if (!msg) throw new Error("Error al recuperar el mensaje de chat creado.");
    return msg;
  }

  async actualizarUltimaLecturaChat(
    cursoSeccionId: string,
    usuarioId: string,
    fecha: Date = new Date(),
  ): Promise<void> {
    const fechaSql = fecha.toISOString();
    await this.db
      .insert(chatLecturas)
      .values({
        cursoSeccionId,
        usuarioId,
        ultimoLeidoEn: fechaSql,
      })
      .onConflictDoUpdate({
        target: [chatLecturas.cursoSeccionId, chatLecturas.usuarioId],
        set: {
          ultimoLeidoEn: fechaSql,
        },
      });
  }

  async contarMensajesNoLeidosChat(cursoSeccionId: string, usuarioId: string): Promise<number> {
    const [lectura] = await this.db
      .select({ ultimoLeidoEn: chatLecturas.ultimoLeidoEn })
      .from(chatLecturas)
      .where(
        and(eq(chatLecturas.cursoSeccionId, cursoSeccionId), eq(chatLecturas.usuarioId, usuarioId)),
      )
      .limit(1);

    const condiciones = [
      eq(mensajesChat.cursoSeccionId, cursoSeccionId),
      eq(mensajesChat.vigente, true),
      isNull(mensajesChat.eliminadoEn),
      sql`${mensajesChat.emisorId} <> ${usuarioId}`,
    ];

    if (lectura?.ultimoLeidoEn) {
      condiciones.push(sql`${mensajesChat.enviadoEn} > ${lectura.ultimoLeidoEn}`);
    }

    const [resultado] = await this.db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(mensajesChat)
      .where(and(...condiciones));

    return resultado?.total ?? 0;
  }

  async ocultarContenido(
    tipo: TipoModeracion,
    id: string,
    ocultadoPorId: string,
    motivo: string,
  ): Promise<void> {
    const valores = {
      vigente: false,
      ocultadoPorId,
      ocultadoEn: sql`CURRENT_TIMESTAMP`,
      motivoOcultamiento: motivo,
    };

    if (tipo === "publicacion") {
      await this.db.update(publicacionesAula).set(valores).where(eq(publicacionesAula.id, id));
    } else if (tipo === "comentario") {
      await this.db
        .update(comentariosPublicacion)
        .set(valores)
        .where(eq(comentariosPublicacion.id, id));
    } else {
      await this.db.update(mensajesChat).set(valores).where(eq(mensajesChat.id, id));
    }
  }

  async restaurarContenido(tipo: TipoModeracion, id: string): Promise<void> {
    const valores = {
      vigente: true,
      ocultadoPorId: null,
      ocultadoEn: null,
      motivoOcultamiento: null,
    };

    if (tipo === "publicacion") {
      await this.db.update(publicacionesAula).set(valores).where(eq(publicacionesAula.id, id));
    } else if (tipo === "comentario") {
      await this.db
        .update(comentariosPublicacion)
        .set(valores)
        .where(eq(comentariosPublicacion.id, id));
    } else {
      await this.db.update(mensajesChat).set(valores).where(eq(mensajesChat.id, id));
    }
  }

  async listarHistorialModeracion(cursoSeccionId: string): Promise<HistorialModeracionFila[]> {
    const ocultadoPorNombreSql = sql<string>`TRIM(p_oc.apellido_paterno || ' ' || COALESCE(p_oc.apellido_materno, '') || ', ' || p_oc.nombres)`;

    const [pubs, coms, chats] = await Promise.all([
      this.db
        .select({
          id: publicacionesAula.id,
          tipo: sql<TipoModeracion>`'publicacion'`,
          cursoSeccionId: publicacionesAula.cursoSeccionId,
          contenido: publicacionesAula.contenido,
          adjuntoUrl: publicacionesAula.adjuntoUrl,
          autorNombre: nombreSql(personas),
          ocultadoPorNombre: ocultadoPorNombreSql,
          ocultadoEn: sql<string>`${publicacionesAula.ocultadoEn}::text`,
          motivoOcultamiento: sql<string>`COALESCE(${publicacionesAula.motivoOcultamiento}, '')`,
        })
        .from(publicacionesAula)
        .innerJoin(usuarios, eq(usuarios.id, publicacionesAula.autorId))
        .innerJoin(personas, eq(personas.id, usuarios.personaId))
        .innerJoin(sql`usuarios u_oc`, sql`u_oc.id = ${publicacionesAula.ocultadoPorId}`)
        .innerJoin(sql`personas p_oc`, sql`p_oc.id = u_oc.persona_id`)
        .where(
          and(
            eq(publicacionesAula.cursoSeccionId, cursoSeccionId),
            eq(publicacionesAula.vigente, false),
          ),
        ),
      this.db
        .select({
          id: comentariosPublicacion.id,
          tipo: sql<TipoModeracion>`'comentario'`,
          cursoSeccionId: publicacionesAula.cursoSeccionId,
          contenido: comentariosPublicacion.contenido,
          adjuntoUrl: sql<string | null>`NULL`,
          autorNombre: nombreSql(personas),
          ocultadoPorNombre: ocultadoPorNombreSql,
          ocultadoEn: sql<string>`${comentariosPublicacion.ocultadoEn}::text`,
          motivoOcultamiento: sql<string>`COALESCE(${comentariosPublicacion.motivoOcultamiento}, '')`,
        })
        .from(comentariosPublicacion)
        .innerJoin(
          publicacionesAula,
          eq(publicacionesAula.id, comentariosPublicacion.publicacionId),
        )
        .innerJoin(usuarios, eq(usuarios.id, comentariosPublicacion.autorId))
        .innerJoin(personas, eq(personas.id, usuarios.personaId))
        .innerJoin(sql`usuarios u_oc`, sql`u_oc.id = ${comentariosPublicacion.ocultadoPorId}`)
        .innerJoin(sql`personas p_oc`, sql`p_oc.id = u_oc.persona_id`)
        .where(
          and(
            eq(publicacionesAula.cursoSeccionId, cursoSeccionId),
            eq(comentariosPublicacion.vigente, false),
          ),
        ),
      this.db
        .select({
          id: mensajesChat.id,
          tipo: sql<TipoModeracion>`'chat'`,
          cursoSeccionId: mensajesChat.cursoSeccionId,
          contenido: mensajesChat.contenido,
          adjuntoUrl: mensajesChat.adjuntoUrl,
          autorNombre: nombreSql(personas),
          ocultadoPorNombre: ocultadoPorNombreSql,
          ocultadoEn: sql<string>`${mensajesChat.ocultadoEn}::text`,
          motivoOcultamiento: sql<string>`COALESCE(${mensajesChat.motivoOcultamiento}, '')`,
        })
        .from(mensajesChat)
        .innerJoin(usuarios, eq(usuarios.id, mensajesChat.emisorId))
        .innerJoin(personas, eq(personas.id, usuarios.personaId))
        .innerJoin(sql`usuarios u_oc`, sql`u_oc.id = ${mensajesChat.ocultadoPorId}`)
        .innerJoin(sql`personas p_oc`, sql`p_oc.id = u_oc.persona_id`)
        .where(
          and(eq(mensajesChat.cursoSeccionId, cursoSeccionId), eq(mensajesChat.vigente, false)),
        ),
    ]);

    const combinado: HistorialModeracionFila[] = [...pubs, ...coms, ...chats];
    combinado.sort((a, b) => (b.ocultadoEn > a.ocultadoEn ? 1 : -1));
    return combinado;
  }
}
