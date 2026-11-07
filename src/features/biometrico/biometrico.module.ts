import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { EquiposModule } from "../equipos/equipos.module";
import { MarcacionesModule } from "../marcaciones/marcaciones.module";
import { TurnosModule } from "../turnos/turnos.module";
import { VariablesSistemaModule } from "../variables-sistema/variables-sistema.module";
import { BiometricoController } from "./biometrico.controller";
import { BiometricoService } from "./biometrico.service";
import { BiometricoRepository } from "./repositories";

@Module({
  imports: [EquiposModule, MarcacionesModule, TurnosModule, VariablesSistemaModule],
  controllers: [BiometricoController],
  providers: [BiometricoService, BiometricoRepository, AuditService],
  exports: [BiometricoService],
})
export class BiometricoModule {}
