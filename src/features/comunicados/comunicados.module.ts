import { Module } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesModule } from "@/features/notificaciones/notificaciones.module";
import { ComunicadosRepository } from "./repositories/comunicados.repository";
import { ComunicadosService } from "./services/comunicados.service";
import { ComunicadosController } from "./controllers/comunicados.controller";

@Module({
  imports: [NotificacionesModule],
  controllers: [ComunicadosController],
  providers: [ComunicadosRepository, ComunicadosService, AuditService],
  exports: [ComunicadosService, ComunicadosRepository],
})
export class ComunicadosModule {}
