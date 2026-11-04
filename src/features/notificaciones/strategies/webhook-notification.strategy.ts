import { Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EnviarNotificacionParams, INotificationDeliveryStrategy } from "../interfaces";
import { NotificacionesRepository } from "../repositories/notificaciones.repository";

/**
 * Estrategia para envío de notificaciones mediante Webhook externo (WhatsApp / SMS / Gateway).
 * Envía un payload estandarizado para que cualquier pasarela (Evolution API, UltraMsg, Twilio)
 * entregue la alerta directamente al celular del apoderado o personal.
 */
@Injectable()
export class WebhookNotificationStrategy implements INotificationDeliveryStrategy {
  readonly canal = "webhook";
  private readonly logger = new Logger(WebhookNotificationStrategy.name);

  constructor(
    private readonly repository: NotificacionesRepository,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  async enviar(params: EnviarNotificacionParams): Promise<void> {
    const contacto = await this.repository.findDatosContactoUsuario(params.usuarioId);

    const webhookUrl =
      this.configService?.get<string>("WEBHOOK_NOTIFICACIONES_URL") ||
      process.env.WEBHOOK_NOTIFICACIONES_URL;

    const payload = {
      evento: "notificacion.alerta",
      usuarioId: params.usuarioId,
      destinatario: {
        nombre: contacto?.nombreCompleto || "Usuario",
        celular: contacto?.celular || null,
        correo: contacto?.correo || null,
      },
      titulo: params.titulo,
      mensaje: params.mensaje,
      tipo: params.tipo ?? "alerta",
      enlaceUrl: params.enlaceUrl ?? null,
      fecha: new Date().toISOString(),
    };

    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "SGA-Colegio-Notifier/1.0",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          this.logger.warn(
            `[Webhook Strategy] Gateway respondió con status ${response.status} para usuario ${params.usuarioId}`,
          );
        } else {
          this.logger.log(
            `[Webhook Strategy] Alerta despachada exitosamente a gateway ${webhookUrl} para ${contacto?.celular || "sin teléfono"}`,
          );
        }
      } catch (err) {
        this.logger.error(
          `[Webhook Strategy] Error al despachar a webhook externo: ${(err as Error).message}`,
        );
      }
    } else {
      this.logger.log(
        `[Webhook Strategy] (Simulación / Webhook no configurado) Despacho para ${contacto?.nombreCompleto || params.usuarioId} (${contacto?.celular || "Sin celular"}): "${params.titulo} - ${params.mensaje}"`,
      );
    }
  }
}
