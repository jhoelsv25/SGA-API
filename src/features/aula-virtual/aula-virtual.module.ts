import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { AnioEscolarModule } from "../anio-escolar/anio-escolar.module";
import { NotificacionesModule } from "../notificaciones/notificaciones.module";
import { AulaVirtualController } from "./aula-virtual.controller";
import { AulaVirtualService } from "./aula-virtual.service";
import { AulaVirtualRepository } from "./repositories";

@Module({
  imports: [AnioEscolarModule, NotificacionesModule],
  controllers: [AulaVirtualController],
  providers: [AulaVirtualService, AulaVirtualRepository, AuditService],
  exports: [AulaVirtualService],
})
export class AulaVirtualModule {}
