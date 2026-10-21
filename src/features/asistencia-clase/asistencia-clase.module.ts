import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { AnioEscolarModule } from "../anio-escolar/anio-escolar.module";
import { NotificacionesModule } from "../notificaciones/notificaciones.module";
import { VariablesSistemaModule } from "../variables-sistema/variables-sistema.module";
import { AsistenciaClaseController } from "./asistencia-clase.controller";
import { AsistenciaClaseService } from "./asistencia-clase.service";
import { AsistenciaClaseRepository } from "./repositories";
import { TurnosModule } from "../turnos";

@Module({
  imports: [TurnosModule, AnioEscolarModule, NotificacionesModule, VariablesSistemaModule],
  controllers: [AsistenciaClaseController],
  providers: [AsistenciaClaseService, AsistenciaClaseRepository, AuditService],
  exports: [AsistenciaClaseService],
})
export class AsistenciaClaseModule {}
