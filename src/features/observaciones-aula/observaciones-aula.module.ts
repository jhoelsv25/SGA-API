import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { QUEUES } from "../../core/queues/queues.constants";
import { QueuesModule } from "../../core/queues/queues.module";
import { InstitucionModule } from "../institucion/institucion.module";
import { NotificacionesModule } from "../notificaciones/notificaciones.module";
import { InstrumentosObservacionController, MisObservacionesController } from "./controllers";
import { ObservacionesAulaController } from "./observaciones-aula.controller";
import { ObservacionesAulaProcessor } from "./processors";
import {
  ObservacionesAulaRepository,
  ObservacionesBaseRepository,
  ObservacionesCatalogoRepository,
  ObservacionesEvaluacionRepository,
} from "./repositories";
import {
  InstrumentoObservacionService,
  MisObservacionesService,
  ObservacionesComunService,
  ObservacionesEjecucionService,
  ObservacionesNotasService,
  ObservacionesProgramacionService,
  ObservacionesReporteService,
  ObservacionesRetroalimentacionService,
} from "./services";

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
    ObservacionesBaseRepository,
    ObservacionesEvaluacionRepository,
    ObservacionesCatalogoRepository,
    ObservacionesAulaRepository,
    ObservacionesComunService,
    ObservacionesProgramacionService,
    ObservacionesNotasService,
    ObservacionesRetroalimentacionService,
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
