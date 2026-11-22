import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { QUEUES } from "../../core/queues/queues.constants";
import { AnioEscolarModule } from "../anio-escolar/anio-escolar.module";
import { ApoderadosModule } from "../apoderados/apoderados.module";
import { AsistenciaClaseModule } from "../asistencia-clase/asistencia-clase.module";
import { DocentesModule } from "../docentes/docentes.module";
import { EstudiantesModule } from "../estudiantes/estudiantes.module";
import { InstitucionModule } from "../institucion/institucion.module";
import { LibretasModule } from "../libretas/libretas.module";
import { MarcacionesModule } from "../marcaciones/marcaciones.module";
import { MatriculasModule } from "../matriculas/matriculas.module";
import { PersonasModule } from "../personas/personas.module";
import { SeccionesModule } from "../secciones/secciones.module";
import { UsersModule } from "../users/users.module";
import { ExportacionController } from "./exportacion.controller";
import { ExportacionService } from "./exportacion.service";
import { ReportesProcessor } from "./processors/reportes.processor";
import { ReportesColaService } from "./services";

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.REPORTS }),
    AnioEscolarModule,
    PersonasModule,
    EstudiantesModule,
    DocentesModule,
    ApoderadosModule,
    UsersModule,
    InstitucionModule,
    MatriculasModule,
    MarcacionesModule,
    LibretasModule,
    AsistenciaClaseModule,
    SeccionesModule,
  ],
  controllers: [ExportacionController],
  providers: [ExportacionService, ReportesColaService, ReportesProcessor, AuditService],
})
export class ExportacionModule {}
