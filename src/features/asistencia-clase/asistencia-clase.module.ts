import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { AnioEscolarModule } from "../anio-escolar/anio-escolar.module";
import { TurnosModule } from "../turnos/turnos.module";
import { AsistenciaClaseController } from "./asistencia-clase.controller";
import { AsistenciaClaseService } from "./asistencia-clase.service";
import { AsistenciaClaseRepository } from "./repositories";

@Module({
  imports: [TurnosModule, AnioEscolarModule],
  controllers: [AsistenciaClaseController],
  providers: [AsistenciaClaseService, AsistenciaClaseRepository, AuditService],
  exports: [AsistenciaClaseService],
})
export class AsistenciaClaseModule {}
