import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { AnioEscolarModule } from "../anio-escolar";
import { DocentesModule } from "../docentes/docentes.module";
import { SeccionesModule } from "../secciones/secciones.module";
import { VariablesSistemaModule } from "../variables-sistema/variables-sistema.module";
import { HorariosController } from "./horarios.controller";
import {
  HorariosBloquesRepository,
  HorariosConsultaRepository,
  HorariosJornadaRepository,
  HorariosRepository,
} from "./repositories";
import {
  HorariosBloquesService,
  HorariosConsultaService,
  HorariosPdfService,
  HorariosPlanificacionService,
} from "./services";
import { HorariosService } from "./horarios.service";

@Module({
  imports: [SeccionesModule, DocentesModule, AnioEscolarModule, VariablesSistemaModule],
  controllers: [HorariosController],
  providers: [
    HorariosBloquesRepository,
    HorariosConsultaRepository,
    HorariosJornadaRepository,
    HorariosRepository,
    HorariosConsultaService,
    HorariosPdfService,
    HorariosPlanificacionService,
    HorariosBloquesService,
    HorariosService,
    AuditService,
  ],
  exports: [
    HorariosService,
    HorariosRepository,
    HorariosConsultaService,
    HorariosPdfService,
    HorariosPlanificacionService,
    HorariosBloquesService,
  ],
})
export class HorariosModule {}
