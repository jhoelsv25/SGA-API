import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { VariablesSistemaRepository } from "./repositories";
import { VariablesSistemaController } from "./variables-sistema.controller";
import { VariablesSistemaService } from "./variables-sistema.service";

@Module({
  controllers: [VariablesSistemaController],
  providers: [VariablesSistemaService, VariablesSistemaRepository, AuditService],
  exports: [VariablesSistemaService, VariablesSistemaRepository],
})
export class VariablesSistemaModule {}
