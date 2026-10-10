import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { type Job } from "bullmq";
import { QUEUES } from "../../../core/queues/queues.constants";
import type { EnviarNotificacionParams } from "../interfaces";

import { EmailNotificationStrategy, InAppNotificationStrategy } from "../strategies";

@Processor(QUEUES.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly inAppStrategy: InAppNotificationStrategy,
    private readonly emailStrategy: EmailNotificationStrategy,
  ) {
    super();
  }

  async process(job: Job<EnviarNotificacionParams>): Promise<void> {
    const params = job.data;
    const canales = params.canales && params.canales.length > 0 ? params.canales : ["in_app"];

    this.logger.debug(
      `Procesando job BullMQ ${job.id} de notificación para usuario ${params.usuarioId} en canales: ${canales.join(", ")}`,
    );

    for (const canal of canales) {
      try {
        if (canal === "in_app") {
          await this.inAppStrategy.enviar(params);
        } else if (canal === "email") {
          await this.emailStrategy.enviar(params);
        }
      } catch (error) {
        this.logger.error(
          `Error en canal ${canal} para notificación (${job.id}): ${(error as Error).message}`,
          (error as Error).stack,
        );
      }
    }
  }
}
