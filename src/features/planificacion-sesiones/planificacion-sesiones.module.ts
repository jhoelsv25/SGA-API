import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { InstitucionModule } from "../institucion/institucion.module";
import { NotificacionesModule } from "../notificaciones/notificaciones.module";
import { CatalogoCurricularController } from "./catalogo-curricular.controller";
import { CatalogoCurricularService } from "./catalogo-curricular.service";
import { PlanificacionSesionesController } from "./planificacion-sesiones.controller";
import { PlanificacionSesionesService } from "./planificacion-sesiones.service";
import { PlanificacionSesionesRepository } from "./repositories";
import { SupervisionPlanificacionController } from "./supervision-planificacion.controller";
import { SupervisionPlanificacionService } from "./supervision-planificacion.service";

@Module({
  imports: [NotificacionesModule, InstitucionModule],
  controllers: [
    CatalogoCurricularController,
    PlanificacionSesionesController,
    SupervisionPlanificacionController,
  ],
  providers: [
    PlanificacionSesionesRepository,
    CatalogoCurricularService,
    PlanificacionSesionesService,
    SupervisionPlanificacionService,
    AuditService,
  ],
  exports: [PlanificacionSesionesService],
})
export class PlanificacionSesionesModule {}
