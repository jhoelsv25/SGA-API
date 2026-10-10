import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import { Queue } from "bullmq";
import { QUEUES } from "../../core/queues/queues.constants";
import { NotificacionesRepository } from "./repositories";

import type { EnviarNotificacionParams } from "./interfaces";
import type { NotificacionQueryDto, PaginatedNotificacionesResponseDto } from "./dto";

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    private readonly repository: NotificacionesRepository,
    @Optional()
    @InjectQueue(QUEUES.NOTIFICATIONS)
    private readonly notificationsQueue?: Queue<EnviarNotificacionParams>,
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
      await this.repository.insertDirect(params);
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
}
