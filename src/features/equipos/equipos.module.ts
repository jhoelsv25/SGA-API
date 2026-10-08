import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { EquiposController } from "./equipos.controller";
import { EquiposRepository } from "./repositories/equipos.repository";
import { EquiposService } from "./equipos.service";

@Module({
  controllers: [EquiposController],
  providers: [EquiposService, EquiposRepository, AuditService],
  exports: [EquiposService, EquiposRepository],
})
export class EquiposModule {}
