import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { NotificacionesModule } from "../notificaciones/notificaciones.module";
import { SeguimientoDocenteRepository } from "./repositories";
import {
  ConsolidadoBloqueoService,
  ConsolidadoGeneracionService,
  SeguimientoExportacionService,
  SolicitudesRevisionService,
} from "./services";
import { SeguimientoDocenteService } from "./seguimiento-docente.service";

@Module({
  imports: [NotificacionesModule],
  providers: [
    SeguimientoDocenteRepository,
    ConsolidadoBloqueoService,
    ConsolidadoGeneracionService,
    SolicitudesRevisionService,
    SeguimientoExportacionService,
    SeguimientoDocenteService,
    AuditService,
  ],
  exports: [
    SeguimientoDocenteRepository,
    ConsolidadoBloqueoService,
    ConsolidadoGeneracionService,
    SeguimientoDocenteService,
  ],
})
export class SeguimientoDocenteModule {}
