import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { AnioEscolarModule } from "../anio-escolar/anio-escolar.module";
import { CalendarioModule } from "../calendario/calendario.module";
import { EquiposModule } from "../equipos/equipos.module";
import { TurnosModule } from "../turnos/turnos.module";
import { MarcacionesBiometricasProcesador } from "./marcaciones-biometricas.procesador";
import { MarcacionesBiometricasService } from "./marcaciones-biometricas.service";
import { MarcacionesController } from "./marcaciones.controller";
import { MarcacionesService } from "./marcaciones.service";
import { MarcacionesBiometricasRepository, MarcacionesRepository } from "./repositories";

@Module({
  imports: [EquiposModule, TurnosModule, CalendarioModule, AnioEscolarModule],
  controllers: [MarcacionesController],
  providers: [
    MarcacionesService,
    MarcacionesRepository,
    MarcacionesBiometricasRepository,
    MarcacionesBiometricasService,
    MarcacionesBiometricasProcesador,
    AuditService,
  ],
  exports: [MarcacionesService, MarcacionesRepository],
})
export class MarcacionesModule {}
