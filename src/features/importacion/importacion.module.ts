import { InstitucionModule } from "../institucion/institucion.module";
import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AuditService } from "../../common/services/audit.service";
import { QUEUES } from "../../core/queues/queues.constants";
import { QueuesModule } from "../../core/queues/queues.module";
import { ApoderadosModule } from "../apoderados/apoderados.module";
import { DocentesModule } from "../docentes/docentes.module";
import { EstudiantesModule } from "../estudiantes/estudiantes.module";
import { MatriculasModule } from "../matriculas/matriculas.module";
import { PersonasModule } from "../personas/personas.module";
import { ImportacionController } from "./importacion.controller";
import { ImportacionProcessor } from "./processors/importacion.processor";
import { ImportacionService } from "./importacion.service";
import { ImportacionAcademicaRepository } from "./repositories";
import {
  ApoderadosImportService,
  CargaAcademicaImportService,
  DocentesImportService,
  EstudiantesImportService,
  FotosImportService,
  HorariosImportService,
  LoteTemporalImportService,
  MatriculasImportService,
  PersonasImportService,
  TrabajosImportService,
} from "./services";

@Module({
  imports: [
    PersonasModule,
    EstudiantesModule,
    DocentesModule,
    ApoderadosModule,
    MatriculasModule,
    QueuesModule,
    InstitucionModule,
    BullModule.registerQueue({ name: QUEUES.IMPORTACION }),
  ],
  controllers: [ImportacionController],
  providers: [
    LoteTemporalImportService,
    TrabajosImportService,
    ImportacionService,
    ImportacionProcessor,
    AuditService,
    ImportacionAcademicaRepository,
    PersonasImportService,
    EstudiantesImportService,
    DocentesImportService,
    ApoderadosImportService,
    FotosImportService,
    MatriculasImportService,
    CargaAcademicaImportService,
    HorariosImportService,
  ],
  exports: [
    ImportacionService,
    PersonasImportService,
    EstudiantesImportService,
    DocentesImportService,
    ApoderadosImportService,
    FotosImportService,
    MatriculasImportService,
    CargaAcademicaImportService,
    HorariosImportService,
  ],
})
export class ImportacionModule {}
