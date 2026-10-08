import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AuditService } from "../../common/services/audit.service";
import { QueuesModule } from "../../core/queues/queues.module";
import { QUEUES } from "../../core/queues/queues.constants";
import { AniosAcademicosController } from "./anios.controller";
import { AniosAcademicosService } from "./anios.service";
import { ReaperturaProcessor } from "./processors/reapertura.processor";
import { AniosAcademicosRepository } from "./repositories";

@Module({
  imports: [QueuesModule, BullModule.registerQueue({ name: QUEUES.ANIO_ESCOLAR })],
  controllers: [AniosAcademicosController],
  providers: [AniosAcademicosService, AniosAcademicosRepository, ReaperturaProcessor, AuditService],
  exports: [AniosAcademicosService],
})
export class AnioEscolarModule {}
