import { Module } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { InstitucionModule } from "@/features/institucion/institucion.module";
import { NotificacionesModule } from "@/features/notificaciones/notificaciones.module";
import { ConsolidadoDocenteController } from "./consolidado-docente.controller";
import { ConsolidadoDocenteRepository } from "./repositories";
import { ConsolidadoDocenteService } from "./consolidado-docente.service";

@Module({
  imports: [NotificacionesModule, InstitucionModule],
  controllers: [ConsolidadoDocenteController],
  providers: [ConsolidadoDocenteRepository, ConsolidadoDocenteService, AuditService],
  exports: [ConsolidadoDocenteService],
})
export class ConsolidadoDocenteModule {}
