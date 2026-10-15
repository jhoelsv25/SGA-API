import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { NotificacionesModule } from "../notificaciones/notificaciones.module";
import { SeguimientoDocenteController } from "./seguimiento-docente.controller";
import { SeguimientoDocenteRepository } from "./repositories";
import {
  ConsolidadoBloqueoService,
  ConsolidadoGeneracionService,
  ConsolidadoVersionadoService,
  SeguimientoExportacionService,
  SolicitudesRevisionService,
} from "./services";
import { SeguimientoDocenteService } from "./seguimiento-docente.service";

@Module({
  imports: [NotificacionesModule],
  controllers: [SeguimientoDocenteController],
  providers: [
    SeguimientoDocenteRepository,
    ConsolidadoBloqueoService,
    ConsolidadoGeneracionService,
    ConsolidadoVersionadoService,
    SolicitudesRevisionService,
    SeguimientoExportacionService,
    SeguimientoDocenteService,
    AuditService,
  ],
  exports: [
    SeguimientoDocenteRepository,
    ConsolidadoBloqueoService,
    ConsolidadoGeneracionService,
    ConsolidadoVersionadoService,
    SolicitudesRevisionService,
    SeguimientoExportacionService,
    SeguimientoDocenteService,
  ],
})
export class SeguimientoDocenteModule {}
