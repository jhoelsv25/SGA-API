import { Injectable, Logger, Optional } from "@nestjs/common";
import { NotificacionesRepository } from "../repositories";
import { NotificacionesRealtimeEmitter } from "../services";
import type { EnviarNotificacionParams, INotificationDeliveryStrategy } from "../interfaces";

@Injectable()
export class InAppNotificationStrategy implements INotificationDeliveryStrategy {
  readonly canal = "in_app";
  private readonly logger = new Logger(InAppNotificationStrategy.name);

  constructor(
    private readonly repository: NotificacionesRepository,
    @Optional() private readonly emitter?: NotificacionesRealtimeEmitter,
  ) {}

  async enviar(params: EnviarNotificacionParams): Promise<void> {
    const inserted = await this.repository.insertDirect(params);
    if (this.emitter) {
      this.emitter.emit(inserted);
    }
    this.logger.debug(
      `Notificación in-app persistida para usuario ${params.usuarioId} [${params.tipo || "informacion"}]`,
    );
  }
}
