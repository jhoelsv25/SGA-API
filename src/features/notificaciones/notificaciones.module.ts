import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QUEUES } from "../../core/queues/queues.constants";
import { QueuesModule } from "../../core/queues/queues.module";
import { NotificacionesController } from "./notificaciones.controller";
import { NotificacionesService } from "./notificaciones.service";
import { NotificacionesRealtimeEmitter } from "./services";
import { NotificacionesRepository } from "./repositories";
import {
  EmailNotificationStrategy,
  InAppNotificationStrategy,
  PushNotificationStrategy,
} from "./strategies";
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
    NotificacionesRealtimeEmitter,
    NotificacionesService,
    InAppNotificationStrategy,
    EmailNotificationStrategy,
    PushNotificationStrategy,
    NotificationsProcessor,
  ],
  exports: [NotificacionesService, NotificacionesRealtimeEmitter],
})
export class NotificacionesModule {}
