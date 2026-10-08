import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { TurnosRepository } from "./repositories/turnos.repository";
import { TurnosController } from "./turnos.controller";
import { TurnosService } from "./turnos.service";

@Module({
  controllers: [TurnosController],
  providers: [TurnosService, TurnosRepository, AuditService],
  exports: [TurnosService, TurnosRepository],
})
export class TurnosModule {}
