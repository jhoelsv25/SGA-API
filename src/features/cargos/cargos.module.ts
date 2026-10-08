import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { CargosController } from "./cargos.controller";
import { CargosService } from "./cargos.service";
import { CargosRepository } from "./repositories";

@Module({
  controllers: [CargosController],
  providers: [CargosService, CargosRepository, AuditService],
  exports: [CargosService, CargosRepository],
})
export class CargosModule {}
