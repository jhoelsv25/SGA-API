import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { AnioEscolarModule } from "../anio-escolar/anio-escolar.module";
import { DocentesModule } from "../docentes/docentes.module";
import { CargaAcademicaController } from "./carga-academica.controller";
import { CargaAcademicaRepository } from "./repositories";
import { CargaAcademicaService } from "./carga-academica.service";

@Module({
  imports: [DocentesModule, AnioEscolarModule],
  controllers: [CargaAcademicaController],
  providers: [CargaAcademicaService, CargaAcademicaRepository, AuditService],
  exports: [CargaAcademicaService, CargaAcademicaRepository],
})
export class CargaAcademicaModule {}
