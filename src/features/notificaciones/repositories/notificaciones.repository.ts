import { Inject, Injectable } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  notificaciones,
  personas,
  suscripcionesPush,
  usuarios,
} from "../../../core/database/schema";
import { decodeCursor, encodeCursor } from "../../../common/utils";
import type {
  DbNotificacionesProcedureExecutionResult,
  EnviarNotificacionParams,
  NotificacionCursorPayload,
} from "../interfaces";
import type { NotificacionQueryDto, PaginatedNotificacionesResponseDto } from "../dto";

@Injectable()
export class NotificacionesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async insertDirect(
    params: EnviarNotificacionParams,
  ): Promise<import("../interfaces").NotificacionItem> {
    const [inserted] = await this.db
      .insert(notificaciones)
      .values({
        usuarioId: params.usuarioId,
        titulo: params.titulo.trim(),
        mensaje: params.mensaje.trim(),
        tipo: params.tipo ?? "informacion",
        enlaceUrl: params.enlaceUrl?.trim() ?? null,
        comunicadoId: params.comunicadoId ?? null,
        sesionClaseId: params.sesionClaseId ?? null,
        leida: false,
      })
      .returning();

    return {
      id: inserted.id,
      usuarioId: inserted.usuarioId,
      titulo: inserted.titulo,
      mensaje: inserted.mensaje,
      tipo: inserted.tipo as import("../interfaces").TipoNotificacion,
      enlaceUrl: inserted.enlaceUrl,
      comunicadoId: inserted.comunicadoId,
      sesionClaseId: inserted.sesionClaseId,
      leida: inserted.leida,
      leidaEn: inserted.leidaEn ?? null,
      creadoEn: inserted.creadoEn,
    };
  }

  async findByUsuario(
    usuarioId: string,
    query?: NotificacionQueryDto,
  ): Promise<PaginatedNotificacionesResponseDto> {
    const limit = query?.limit && query.limit > 0 ? query.limit : 20;
    const decodedCursor = decodeCursor<NotificacionCursorPayload>(query?.cursor);

    const payload = {
      usuarioId,
      soloNoLeidas: Boolean(query?.soloNoLeidas),
      estado: query?.estado || null,
      tipo: query?.tipo || null,
      search: query?.search?.trim() || null,
      cursorCreadoEn: decodedCursor?.creadoEn || null,
      cursorId: decodedCursor?.id || null,
      limit,
    };

    const result = (await this.db.execute(sql`
      SELECT fn_consultar_notificaciones(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbNotificacionesProcedureExecutionResult;

    const jsonResult = result.rows?.[0]?.resultado ?? {};
    const data = (jsonResult.data ?? []).map((item) => ({
      id: item.id,
      usuarioId: item.usuarioId,
      titulo: item.titulo,
      mensaje: item.mensaje,
      tipo: item.tipo,
      enlaceUrl: item.enlaceUrl ?? null,
      comunicadoId: item.comunicadoId ?? null,
      sesionClaseId: item.sesionClaseId ?? null,
      leida: item.leida,
      leidaEn: item.leidaEn ?? null,
      creadoEn: item.creadoEn,
    }));
    const unreadCount = Number(jsonResult.unreadCount ?? 0);
    const hasMore = Boolean(jsonResult.hasMore);

    const nextCursor =
      hasMore && jsonResult.nextCursorId && jsonResult.nextCursorCreadoEn != null
        ? encodeCursor<NotificacionCursorPayload>({
            creadoEn: jsonResult.nextCursorCreadoEn,
            id: jsonResult.nextCursorId,
          })
        : null;

    return {
      data,
      unreadCount,
      nextCursor,
      hasMore,
      limit,
    };
  }

  async countUnread(usuarioId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(notificaciones)
      .where(and(eq(notificaciones.usuarioId, usuarioId), eq(notificaciones.leida, false)));

    return Number(row?.total ?? 0);
  }

  async markAsRead(id: string, usuarioId: string): Promise<boolean> {
    const [updated] = await this.db
      .update(notificaciones)
      .set({
        leida: true,
        leidaEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(notificaciones.id, id), eq(notificaciones.usuarioId, usuarioId)))
      .returning({ id: notificaciones.id });

    return Boolean(updated);
  }

  async markAllAsRead(usuarioId: string): Promise<number> {
    const updated = await this.db
      .update(notificaciones)
      .set({
        leida: true,
        leidaEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(notificaciones.usuarioId, usuarioId), eq(notificaciones.leida, false)))
      .returning({ id: notificaciones.id });

    return updated.length;
  }

  async delete(id: string, usuarioId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(notificaciones)
      .where(and(eq(notificaciones.id, id), eq(notificaciones.usuarioId, usuarioId)))
      .returning({ id: notificaciones.id });

    return deleted.length > 0;
  }

  async deleteAllRead(usuarioId: string): Promise<number> {
    const deleted = await this.db
      .delete(notificaciones)
      .where(and(eq(notificaciones.usuarioId, usuarioId), eq(notificaciones.leida, true)))
      .returning({ id: notificaciones.id });

    return deleted.length;
  }

  async guardarSuscripcionPush(datos: {
    usuarioId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    dispositivo?: string;
  }): Promise<void> {
    await this.db
      .insert(suscripcionesPush)
      .values({
        usuarioId: datos.usuarioId,
        endpoint: datos.endpoint,
        p256dh: datos.p256dh,
        auth: datos.auth,
        dispositivo: datos.dispositivo?.slice(0, 150) ?? null,
      })
      .onConflictDoUpdate({
        target: suscripcionesPush.endpoint,
        set: {
          usuarioId: datos.usuarioId,
          p256dh: datos.p256dh,
          auth: datos.auth,
          dispositivo: datos.dispositivo?.slice(0, 150) ?? null,
          actualizadoEn: sql`CURRENT_TIMESTAMP`,
        },
      });
  }

  async eliminarSuscripcionPush(endpoint: string): Promise<void> {
    await this.db.delete(suscripcionesPush).where(eq(suscripcionesPush.endpoint, endpoint));
  }

  async obtenerSuscripcionesPushDeUsuario(usuarioId: string): Promise<
    Array<{
      id: string;
      endpoint: string;
      p256dh: string;
      auth: string;
    }>
  > {
    return this.db
      .select({
        id: suscripcionesPush.id,
        endpoint: suscripcionesPush.endpoint,
        p256dh: suscripcionesPush.p256dh,
        auth: suscripcionesPush.auth,
      })
      .from(suscripcionesPush)
      .where(eq(suscripcionesPush.usuarioId, usuarioId));
  }

  async findDatosContactoUsuario(usuarioId: string): Promise<{
    usuarioId: string;
    nombreCompleto: string;
    correo: string | null;
    celular: string | null;
  } | null> {
    const rows = await this.db
      .select({
        usuarioId: usuarios.id,
        nombres: personas.nombres,
        apellidoPaterno: personas.apellidoPaterno,
        apellidoMaterno: personas.apellidoMaterno,
        correo: personas.correo,
        celular: personas.celular,
        telefono: personas.telefono,
      })
      .from(usuarios)
      .innerJoin(personas, eq(usuarios.personaId, personas.id))
      .where(eq(usuarios.id, usuarioId))
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];
    const nombreCompleto = [r.nombres, r.apellidoPaterno, r.apellidoMaterno]
      .filter(Boolean)
      .join(" ");

    return {
      usuarioId: r.usuarioId,
      nombreCompleto,
      correo: r.correo,
      celular: r.celular || r.telefono || null,
    };
  }
}
