import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { QUEUES } from "../../core/queues/queues.constants";
import { QueuesModule } from "../../core/queues/queues.module";
import { AnioEscolarModule } from "../anio-escolar/anio-escolar.module";
import { AuthModule } from "../auth/auth.module";
import { NotificacionesModule } from "../notificaciones/notificaciones.module";
import { AulaVirtualController } from "./aula-virtual.controller";
import { AulaVirtualService } from "./aula-virtual.service";
import { ChatAulaGateway } from "./gateways/chat-aula.gateway";
import { RecordatorioTareasProcessor } from "./processors";
import { AulaVirtualRepository } from "./repositories";

@Module({
  imports: [
    QueuesModule,
    BullModule.registerQueue({ name: QUEUES.AULA_VIRTUAL }),
    AnioEscolarModule,
    AuthModule,
    NotificacionesModule,
  ],
  controllers: [AulaVirtualController],
  providers: [
    AulaVirtualService,
    AulaVirtualRepository,
    RecordatorioTareasProcessor,
    AuditService,
    ChatAulaGateway,
  ],
  exports: [AulaVirtualService, ChatAulaGateway],
})
export class AulaVirtualModule {}
