import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { AnioEscolarModule } from "../anio-escolar/anio-escolar.module";
import { AuthModule } from "../auth/auth.module";
import { NotificacionesModule } from "../notificaciones/notificaciones.module";
import { AulaVirtualController } from "./aula-virtual.controller";
import { AulaVirtualService } from "./aula-virtual.service";
import { ChatAulaGateway } from "./gateways/chat-aula.gateway";
import { AulaVirtualRepository } from "./repositories";

@Module({
  imports: [AnioEscolarModule, AuthModule, NotificacionesModule],
  controllers: [AulaVirtualController],
  providers: [AulaVirtualService, AulaVirtualRepository, AuditService, ChatAulaGateway],
  exports: [AulaVirtualService, ChatAulaGateway],
})
export class AulaVirtualModule {}
