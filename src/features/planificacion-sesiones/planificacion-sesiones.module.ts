import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { InstitucionModule } from "../institucion/institucion.module";
import { NotificacionesModule } from "../notificaciones/notificaciones.module";
import { CatalogoCurricularController } from "./controllers/catalogo-curricular.controller";
import { CatalogoCurricularService } from "./services/catalogo-curricular.service";
import { PlanificacionSesionesController } from "./controllers/planificacion-sesiones.controller";
import { PlanificacionSesionesService } from "./services/planificacion-sesiones.service";
import { PlanificacionSesionesRepository } from "./repositories";
import { SupervisionPlanificacionController } from "./controllers/supervision-planificacion.controller";
import { SupervisionPlanificacionService } from "./services/supervision-planificacion.service";

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
