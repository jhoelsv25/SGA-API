import { Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EnviarNotificacionParams, INotificationDeliveryStrategy } from "../interfaces";
import { NotificacionesRepository } from "../repositories/notificaciones.repository";

/**
 * Estrategia para envío de notificaciones por Correo Electrónico.
 * Obtiene los datos de contacto del usuario y despacha el correo mediante
 * API transaccional (Resend/SMTP) o simulación estructurada institucional.
 */
@Injectable()
export class EmailNotificationStrategy implements INotificationDeliveryStrategy {
  readonly canal = "email";
  private readonly logger = new Logger(EmailNotificationStrategy.name);

  constructor(
    private readonly repository: NotificacionesRepository,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  async enviar(params: EnviarNotificacionParams): Promise<void> {
    const contacto = await this.repository.findDatosContactoUsuario(params.usuarioId);
    const destinoEmail = contacto?.correo;

    if (!destinoEmail) {
      this.logger.debug(
        `[Email Strategy] El usuario ${params.usuarioId} (${contacto?.nombreCompleto || "Desconocido"}) no tiene correo registrado. Omitiendo email.`,
      );
      return;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #7A1228; color: #ffffff; padding: 18px 24px;">
          <h2 style="margin: 0; font-size: 18px;">I.E. De Mujeres Nuestra Señora del Carmen</h2>
          <p style="margin: 4px 0 0; font-size: 12px; color: #fde68a;">Sistema de Gestión Académica (SGA)</p>
        </div>
        <div style="padding: 24px; color: #1e293b;">
          <h3 style="margin-top: 0; color: #7A1228;">${params.titulo}</h3>
          <p style="font-size: 14px; line-height: 1.6;">Estimado(a) <strong>${contacto.nombreCompleto}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; background-color: #f8fafc; padding: 14px; border-left: 4px solid #7A1228; border-radius: 4px;">
            ${params.mensaje}
          </p>
          ${
            params.enlaceUrl
              ? `<div style="margin-top: 20px;">
                   <a href="${params.enlaceUrl}" style="background-color: #7A1228; color: #ffffff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block;">
                     Ver en la plataforma
                   </a>
                 </div>`
              : ""
          }
          <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
            Este es un aviso automático institucional. No responda a este correo electrónico.
          </p>
        </div>
      </div>
    `;

    const resendApiKey =
      this.configService?.get<string>("RESEND_API_KEY") || process.env.RESEND_API_KEY;

    if (resendApiKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "SGA Colegio <notificaciones@colegio.edu.pe>",
            to: [destinoEmail],
            subject: params.titulo,
            html: htmlContent,
          }),
        });

        if (res.ok) {
          this.logger.log(`[Email Strategy] Correo enviado vía Resend a ${destinoEmail}`);
          return;
        }
      } catch (err) {
        this.logger.error(`Error enviando correo con Resend: ${(err as Error).message}`);
      }
    }

    this.logger.log(
      `[Email Strategy] Despacho preparado para ${contacto.nombreCompleto} <${destinoEmail}>: "${params.titulo}"`,
    );
  }
}
