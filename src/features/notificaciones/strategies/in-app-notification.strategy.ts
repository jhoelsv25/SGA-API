import { Injectable, Logger } from "@nestjs/common";
import { NotificacionesRepository } from "../repositories";
import type { EnviarNotificacionParams, INotificationDeliveryStrategy } from "../interfaces";

@Injectable()
export class InAppNotificationStrategy implements INotificationDeliveryStrategy {
  readonly canal = "in_app";
  private readonly logger = new Logger(InAppNotificationStrategy.name);

  constructor(private readonly repository: NotificacionesRepository) {}

  async enviar(params: EnviarNotificacionParams): Promise<void> {
    await this.repository.insertDirect(params);
    this.logger.debug(
      `Notificación in-app persistida para usuario ${params.usuarioId} [${params.tipo || "informacion"}]`,
    );
  }
}
