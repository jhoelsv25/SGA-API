import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AuditService } from "../../common/services/audit.service";
import { QueuesModule } from "../../core/queues/queues.module";
import { QUEUES } from "../../core/queues/queues.constants";
import { AniosAcademicosController } from "./anios.controller";
import { AniosAcademicosService } from "./anios.service";
import { CalendarioController } from "./calendario.controller";
import { CalendarioService } from "./calendario.service";
import { ReaperturaProcessor } from "./processors/reapertura.processor";
import { AniosAcademicosRepository, CalendarioRepository } from "./repositories";

@Module({
  imports: [QueuesModule, BullModule.registerQueue({ name: QUEUES.ANIO_ESCOLAR })],
  controllers: [AniosAcademicosController, CalendarioController],
  providers: [
    AniosAcademicosService,
    AniosAcademicosRepository,
    CalendarioService,
    CalendarioRepository,
    ReaperturaProcessor,
    AuditService,
  ],
  exports: [AniosAcademicosService, CalendarioService],
})
export class AnioEscolarModule {}
