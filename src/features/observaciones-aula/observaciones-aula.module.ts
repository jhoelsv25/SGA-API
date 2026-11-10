import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { QUEUES } from "../../core/queues/queues.constants";
import { QueuesModule } from "../../core/queues/queues.module";
import { InstitucionModule } from "../institucion/institucion.module";
import { NotificacionesModule } from "../notificaciones/notificaciones.module";
import { InstrumentoObservacionService } from "./instrumento-observacion.service";
import { InstrumentosObservacionController } from "./instrumentos-observacion.controller";
import { MisObservacionesController } from "./mis-observaciones.controller";
import { MisObservacionesService } from "./mis-observaciones.service";
import { ObservacionesAulaController } from "./observaciones-aula.controller";
import { ObservacionesComunService } from "./observaciones-comun.service";
import { ObservacionesEjecucionService } from "./observaciones-ejecucion.service";
import { ObservacionesProgramacionService } from "./observaciones-programacion.service";
import { ObservacionesReporteService } from "./observaciones-reporte.service";
import { ObservacionesAulaProcessor } from "./processors";
import { ObservacionesAulaRepository } from "./repositories";

@Module({
  imports: [
    QueuesModule,
    BullModule.registerQueue({ name: QUEUES.OBSERVACIONES_AULA }),
    NotificacionesModule,
    InstitucionModule,
  ],
  controllers: [
    ObservacionesAulaController,
    MisObservacionesController,
    InstrumentosObservacionController,
  ],
  providers: [
    ObservacionesAulaRepository,
    ObservacionesComunService,
    ObservacionesProgramacionService,
    ObservacionesEjecucionService,
    ObservacionesReporteService,
    MisObservacionesService,
    InstrumentoObservacionService,
    ObservacionesAulaProcessor,
    AuditService,
  ],
  exports: [ObservacionesReporteService],
})
export class ObservacionesAulaModule {}
