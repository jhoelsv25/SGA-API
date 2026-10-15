import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { QUEUES } from "../../core/queues/queues.constants";
import { QueuesModule } from "../../core/queues/queues.module";
import { AnioEscolarModule } from "../anio-escolar/anio-escolar.module";
import { CalendarioModule } from "../calendario/calendario.module";
import { EquiposModule } from "../equipos/equipos.module";
import { MarcacionesModule } from "../marcaciones/marcaciones.module";
import { SeguimientoDocenteModule } from "../seguimiento-docente/seguimiento-docente.module";
import { SesionesClaseProcessor } from "./processors";
import { SesionesClaseRepository } from "./repositories";
import { SesionesClaseController } from "./sesiones-clase.controller";
import { SesionesClaseService } from "./sesiones-clase.service";

@Module({
  imports: [
    QueuesModule,
    BullModule.registerQueue({ name: QUEUES.SESIONES_CLASE }),
    EquiposModule,
    MarcacionesModule,
    AnioEscolarModule,
    CalendarioModule,
    SeguimientoDocenteModule,
  ],
  controllers: [SesionesClaseController],
  providers: [SesionesClaseService, SesionesClaseRepository, SesionesClaseProcessor, AuditService],
  exports: [SesionesClaseService],
})
export class SesionesClaseModule {}
