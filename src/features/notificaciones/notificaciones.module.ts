import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QUEUES } from "../../core/queues/queues.constants";
import { QueuesModule } from "../../core/queues/queues.module";
import { NotificacionesController } from "./notificaciones.controller";
import { NotificacionesService } from "./notificaciones.service";
import { NotificacionesRepository } from "./repositories";
import { EmailNotificationStrategy, InAppNotificationStrategy } from "./strategies";
import { NotificationsProcessor } from "./processors";

@Module({
  imports: [
    QueuesModule,
    BullModule.registerQueue({
      name: QUEUES.NOTIFICATIONS,
    }),
  ],
  controllers: [NotificacionesController],
  providers: [
    NotificacionesRepository,
    NotificacionesService,
    InAppNotificationStrategy,
    EmailNotificationStrategy,
    NotificationsProcessor,
  ],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
