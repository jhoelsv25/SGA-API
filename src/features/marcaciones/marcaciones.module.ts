import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { AnioEscolarModule } from "../anio-escolar/anio-escolar.module";
import { CalendarioModule } from "../calendario/calendario.module";
import { EquiposModule } from "../equipos/equipos.module";
import { NotificacionesModule } from "../notificaciones/notificaciones.module";
import { TurnosModule } from "../turnos/turnos.module";
import { VariablesSistemaModule } from "../variables-sistema/variables-sistema.module";
import { MarcacionesBiometricasProcesador } from "./marcaciones-biometricas.procesador";
import { MarcacionesBiometricasService } from "./marcaciones-biometricas.service";
import { ControlDiarioService } from "./control-diario.service";
import { ControlDiarioRepository } from "./repositories/control-diario.repository";
import { MarcacionesController } from "./marcaciones.controller";
import { MarcacionesService } from "./marcaciones.service";
import { MarcacionesBiometricasRepository, MarcacionesRepository } from "./repositories";

@Module({
  imports: [
    EquiposModule,
    TurnosModule,
    CalendarioModule,
    AnioEscolarModule,
    NotificacionesModule,
    VariablesSistemaModule,
  ],
  controllers: [MarcacionesController],
  providers: [
    MarcacionesService,
    ControlDiarioService,
    ControlDiarioRepository,
    MarcacionesRepository,
    MarcacionesBiometricasRepository,
    MarcacionesBiometricasService,
    MarcacionesBiometricasProcesador,
    AuditService,
  ],
  exports: [MarcacionesService, MarcacionesRepository],
})
export class MarcacionesModule {}
