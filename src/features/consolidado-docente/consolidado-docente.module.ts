import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { QUEUES } from "@/core/queues/queues.constants";
import { QueuesModule } from "@/core/queues/queues.module";
import { InstitucionModule } from "@/features/institucion/institucion.module";
import { NotificacionesModule } from "@/features/notificaciones/notificaciones.module";
import { CompromisosConsolidadoController } from "./compromisos-consolidado.controller";
import { CompromisosConsolidadoService } from "./compromisos-consolidado.service";
import { ConsolidadoDocenteController } from "./consolidado-docente.controller";
import { ConsolidadoDocenteService } from "./consolidado-docente.service";
import { ConsolidadoDocenteProcessor } from "./processors";
import {
  CompromisosConsolidadoRepository,
  ConsolidadoDocenteRepository,
  SeguimientoReportesRepository,
} from "./repositories";
import { SeguimientoReportesController } from "./seguimiento-reportes.controller";
import { SeguimientoReportesService } from "./seguimiento-reportes.service";

@Module({
  imports: [
    QueuesModule,
    BullModule.registerQueue({ name: QUEUES.CONSOLIDADO_DOCENTE }),
    NotificacionesModule,
    InstitucionModule,
  ],
  controllers: [
    CompromisosConsolidadoController,
    ConsolidadoDocenteController,
    SeguimientoReportesController,
  ],
  providers: [
    ConsolidadoDocenteRepository,
    CompromisosConsolidadoRepository,
    SeguimientoReportesRepository,
    ConsolidadoDocenteService,
    SeguimientoReportesService,
    CompromisosConsolidadoService,
    ConsolidadoDocenteProcessor,
    AuditService,
  ],
  exports: [ConsolidadoDocenteService],
})
export class ConsolidadoDocenteModule {}
