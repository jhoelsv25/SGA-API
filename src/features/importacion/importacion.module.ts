import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AuditService } from "../../common/services/audit.service";
import { QUEUES } from "../../core/queues/queues.constants";
import { QueuesModule } from "../../core/queues/queues.module";
import { ApoderadosModule } from "../apoderados/apoderados.module";
import { DocentesModule } from "../docentes/docentes.module";
import { EstudiantesModule } from "../estudiantes/estudiantes.module";
import { PersonasModule } from "../personas/personas.module";
import { ImportacionController } from "./importacion.controller";
import { ImportacionProcessor } from "./processors/importacion.processor";
import { ImportacionService } from "./importacion.service";
import {
  ApoderadosImportService,
  DocentesImportService,
  EstudiantesImportService,
  PersonasImportService,
} from "./services";

@Module({
  imports: [
    PersonasModule,
    EstudiantesModule,
    DocentesModule,
    ApoderadosModule,
    QueuesModule,
    BullModule.registerQueue({ name: QUEUES.IMPORTACION }),
  ],
  controllers: [ImportacionController],
  providers: [
    ImportacionService,
    ImportacionProcessor,
    AuditService,
    PersonasImportService,
    EstudiantesImportService,
    DocentesImportService,
    ApoderadosImportService,
  ],
  exports: [
    ImportacionService,
    PersonasImportService,
    EstudiantesImportService,
    DocentesImportService,
    ApoderadosImportService,
  ],
})
export class ImportacionModule {}
