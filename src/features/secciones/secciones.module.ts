import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { AnioEscolarModule } from "../anio-escolar/anio-escolar.module";
import { DocentesModule } from "../docentes/docentes.module";
import { GradosModule } from "../grados/grados.module";
import { SeccionesController } from "./secciones.controller";
import { SeccionesRepository } from "./repositories";
import { SeccionesService } from "./secciones.service";

@Module({
  imports: [GradosModule, DocentesModule, AnioEscolarModule],
  controllers: [SeccionesController],
  providers: [SeccionesService, SeccionesRepository, AuditService],
  exports: [SeccionesService, SeccionesRepository],
})
export class SeccionesModule {}
