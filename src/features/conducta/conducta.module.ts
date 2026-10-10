import { Module } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesModule } from "@/features/notificaciones/notificaciones.module";
import { ConductaRepository } from "./repositories/conducta.repository";
import { ConductaService } from "./services/conducta.service";
import { ConductaController } from "./controllers/conducta.controller";

@Module({
  imports: [NotificacionesModule],
  controllers: [ConductaController],
  providers: [ConductaRepository, ConductaService, AuditService],
  exports: [ConductaService, ConductaRepository],
})
export class ConductaModule {}
