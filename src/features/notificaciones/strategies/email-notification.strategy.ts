import { Injectable, Logger } from "@nestjs/common";
import type { EnviarNotificacionParams, INotificationDeliveryStrategy } from "../interfaces";

/**
 * Estrategia extensible para envío de notificaciones por Correo Electrónico.
 * Diseñada para conectarse a un servicio SMTP/SES/SendGrid cuando se configure.
 */
@Injectable()
export class EmailNotificationStrategy implements INotificationDeliveryStrategy {
  readonly canal = "email";
  private readonly logger = new Logger(EmailNotificationStrategy.name);

  async enviar(params: EnviarNotificacionParams): Promise<void> {
    // Listo para enganchar con Nodemailer / Amazon SES / Resend
    this.logger.log(
      `[Email Strategy] Despachando correo para usuario ${params.usuarioId}: "${params.titulo}"`,
    );
    await Promise.resolve();
  }
}
