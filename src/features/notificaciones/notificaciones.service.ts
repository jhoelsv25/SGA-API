import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import { Queue } from "bullmq";
import { QUEUES } from "../../core/queues/queues.constants";
import { NotificacionesRepository } from "./repositories";

import type { EnviarNotificacionParams } from "./interfaces";
import type { NotificacionQueryDto, PaginatedNotificacionesResponseDto } from "./dto";

import { ConfigService } from "@nestjs/config";
import type { SuscribirPushDto, DesuscribirPushDto } from "./dto";

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    private readonly repository: NotificacionesRepository,
    @Optional()
    private readonly configService?: ConfigService,
    @Optional()
    @InjectQueue(QUEUES.NOTIFICATIONS)
    private readonly notificationsQueue?: Queue<EnviarNotificacionParams>,
    @Optional()
    private readonly emitter?: import("./services").NotificacionesRealtimeEmitter,
    @Optional()
    private readonly pushStrategy?: import("./strategies").PushNotificationStrategy,
    @Optional()
    private readonly emailStrategy?: import("./strategies").EmailNotificationStrategy,
    @Optional()
    private readonly webhookStrategy?: import("./strategies").WebhookNotificationStrategy,
  ) {}

  /**
   * Método público y transversal para que cualquier módulo del sistema
   * (matrículas, asistencias, horarios, libretas, tareas) emita notificaciones
   * encoladas en BullMQ con fallback automático a inserción directa.
   */
  async enviar(params: EnviarNotificacionParams): Promise<void> {
    if (this.notificationsQueue) {
      try {
        await this.notificationsQueue.add("enviar-notificacion", params, {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        });
        return;
      } catch (queueError) {
        this.logger.warn(
          `No se pudo encolar notificación en BullMQ (${(queueError as Error).message}), despachando directamente...`,
        );
      }
    }

    // Fallback directo a base de datos si Redis no está disponible
    try {
      const inserted = await this.repository.insertDirect(params);
      if (this.emitter) {
        this.emitter.emit(inserted);
      }
      if (this.pushStrategy) {
        this.pushStrategy.enviar(params).catch((err) => {
          this.logger.warn(`Error en envío directo de Web Push: ${(err as Error).message}`);
        });
      }
      if (this.emailStrategy && params.canales?.includes("email")) {
        this.emailStrategy.enviar(params).catch((err) => {
          this.logger.warn(`Error en envío directo de Email: ${(err as Error).message}`);
        });
      }
      if (this.webhookStrategy && params.canales?.includes("webhook")) {
        this.webhookStrategy.enviar(params).catch((err) => {
          this.logger.warn(`Error en envío directo de Webhook: ${(err as Error).message}`);
        });
      }
    } catch (insertError) {
      this.logger.error(
        `Error al persistir notificación directamente: ${(insertError as Error).message}`,
        (insertError as Error).stack,
      );
    }
  }

  /**
   * Consulta la bandeja personal del usuario actual (solo sus notificaciones)
   */
  async obtenerBandeja(
    usuarioId: string,
    query?: NotificacionQueryDto,
  ): Promise<PaginatedNotificacionesResponseDto> {
    return this.repository.findByUsuario(usuarioId, query);
  }

  /**
   * Obtiene el conteo de notificaciones no leídas para la campana en tiempo real
   */
  async obtenerConteoNoLeidas(usuarioId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.repository.countUnread(usuarioId);
    return { unreadCount };
  }

  /**
   * Marca una notificación específica como leída (al abrirla)
   */
  async marcarComoLeida(id: string, usuarioId: string): Promise<{ message: string; id: string }> {
    const updated = await this.repository.markAsRead(id, usuarioId);
    if (!updated) {
      throw new NotFoundException("Notificación no encontrada o no pertenece al usuario.");
    }
    return { message: "Notificación marcada como leída.", id };
  }

  /**
   * Marca todas las notificaciones pendientes como leídas
   */
  async marcarTodasComoLeidas(
    usuarioId: string,
  ): Promise<{ message: string; actualizadas: number }> {
    const actualizadas = await this.repository.markAllAsRead(usuarioId);
    return {
      message: "Todas las notificaciones han sido marcadas como leídas.",
      actualizadas,
    };
  }

  /**
   * Elimina una notificación específica del usuario
   */
  async eliminar(id: string, usuarioId: string): Promise<{ message: string; id: string }> {
    const deleted = await this.repository.delete(id, usuarioId);
    if (!deleted) {
      throw new NotFoundException("Notificación no encontrada o no pertenece al usuario.");
    }
    return { message: "Notificación eliminada correctamente.", id };
  }

  /**
   * Elimina todas las notificaciones que ya han sido leídas
   */
  async eliminarTodasLeidas(usuarioId: string): Promise<{ message: string; eliminadas: number }> {
    const eliminadas = await this.repository.deleteAllRead(usuarioId);
    return {
      message: "Todas las notificaciones leídas han sido eliminadas.",
      eliminadas,
    };
  }

  getVapidPublicKey(): { publicKey: string } {
    const publicKey =
      this.configService?.get<string>("VAPID_PUBLIC_KEY") || process.env.VAPID_PUBLIC_KEY || "";
    return { publicKey };
  }

  async suscribirPush(usuarioId: string, dto: SuscribirPushDto): Promise<{ message: string }> {
    await this.repository.guardarSuscripcionPush({
      usuarioId,
      endpoint: dto.endpoint,
      p256dh: dto.keys.p256dh,
      auth: dto.keys.auth,
      dispositivo: dto.dispositivo,
    });
    return { message: "Dispositivo suscrito exitosamente a notificaciones push." };
  }

  async desuscribirPush(dto: DesuscribirPushDto): Promise<{ message: string }> {
    await this.repository.eliminarSuscripcionPush(dto.endpoint);
    return { message: "Dispositivo desuscrito de notificaciones push." };
  }
}
