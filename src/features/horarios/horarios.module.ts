import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { AnioEscolarModule } from "../anio-escolar";
import { DocentesModule } from "../docentes/docentes.module";
import { SeccionesModule } from "../secciones/secciones.module";
import { VariablesSistemaModule } from "../variables-sistema/variables-sistema.module";
import { HorariosController } from "./horarios.controller";
import { HorariosRepository } from "./repositories";
import { HorariosService } from "./horarios.service";

@Module({
  imports: [SeccionesModule, DocentesModule, AnioEscolarModule, VariablesSistemaModule],
  controllers: [HorariosController],
  providers: [HorariosRepository, HorariosService, AuditService],
  exports: [HorariosService, HorariosRepository],
})
export class HorariosModule {}
