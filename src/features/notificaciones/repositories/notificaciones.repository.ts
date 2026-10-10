import { Inject, Injectable } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { notificaciones } from "../../../core/database/schema";
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
}
