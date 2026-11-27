import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { CalendarioModule } from "../calendario/calendario.module";
import { InstitucionModule } from "../institucion/institucion.module";
import { MarcacionesModule } from "../marcaciones/marcaciones.module";
import { TurnosModule } from "../turnos/turnos.module";
import { VariablesSistemaModule } from "../variables-sistema/variables-sistema.module";
import { AsistenciaUgelController } from "./asistencia-ugel.controller";
import { AsistenciaUgelService } from "./asistencia-ugel.service";
import { AsistenciaUgelRepository } from "./repositories/asistencia-ugel.repository";

@Module({
  imports: [
    MarcacionesModule,
    TurnosModule,
    CalendarioModule,
    InstitucionModule,
    VariablesSistemaModule,
  ],
  controllers: [AsistenciaUgelController],
  providers: [AsistenciaUgelService, AsistenciaUgelRepository, AuditService],
})
export class AsistenciaUgelModule {}
