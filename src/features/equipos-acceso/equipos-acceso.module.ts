import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { EquiposAccesoController } from "./equipos-acceso.controller";
import { EquiposAccesoService } from "./equipos-acceso.service";
import { EquiposAccesoRepository } from "./repositories/equipos-acceso.repository";

@Module({
  controllers: [EquiposAccesoController],
  providers: [EquiposAccesoService, EquiposAccesoRepository, AuditService],
  exports: [EquiposAccesoService],
})
export class EquiposAccesoModule {}
