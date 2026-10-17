import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as webpush from "web-push";
import { NotificacionesRepository } from "../repositories";
import type {
  CanalNotificacion,
  EnviarNotificacionParams,
  INotificationDeliveryStrategy,
} from "../interfaces";

@Injectable()
export class PushNotificationStrategy implements INotificationDeliveryStrategy {
  readonly canal: CanalNotificacion = "push";
  private readonly logger = new Logger(PushNotificationStrategy.name);
  private vapidConfigurado: boolean = false;

  constructor(
    private readonly repository: NotificacionesRepository,
    private readonly configService: ConfigService,
  ) {
    const publicKey = this.configService.get<string>("VAPID_PUBLIC_KEY");
    const privateKey = this.configService.get<string>("VAPID_PRIVATE_KEY");
    const subject =
      this.configService.get<string>("VAPID_SUBJECT") || "mailto:soporte@carmelinas.edu.pe";

    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.vapidConfigurado = true;
        this.logger.log("Web Push (VAPID) configurado correctamente.");
      } catch (err) {
        this.logger.error(`Error al configurar VAPID en Web Push: ${(err as Error).message}`);
      }
    } else {
      this.logger.warn("VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY no están configuradas en .env.");
    }
  }

  async enviar(params: EnviarNotificacionParams): Promise<void> {
    if (!this.vapidConfigurado) return;

    const suscripciones = await this.repository.obtenerSuscripcionesPushDeUsuario(params.usuarioId);
    if (!suscripciones.length) return;

    const payload = JSON.stringify({
      title: params.titulo,
      body: params.mensaje,
      icon: "/assets/icons/icon-192x192.png",
      badge: "/assets/icons/icon-72x72.png",
      url: params.enlaceUrl || "/admin/notificaciones",
      tag: params.tipo || "sga-general",
      data: {
        url: params.enlaceUrl || "/admin/notificaciones",
      },
    });

    await Promise.all(
      suscripciones.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload,
            {
              TTL: 86400, // 24 horas
            },
          );
        } catch (error: unknown) {
          const status = (error as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            this.logger.debug(
              `Suscripción push caducada para endpoint ${sub.endpoint.slice(0, 30)}... Eliminando.`,
            );
            await this.repository.eliminarSuscripcionPush(sub.endpoint);
          } else {
            this.logger.warn(
              `Fallo al enviar Web Push a usuario ${params.usuarioId}: ${(error as Error).message}`,
            );
          }
        }
      }),
    );
  }
}
