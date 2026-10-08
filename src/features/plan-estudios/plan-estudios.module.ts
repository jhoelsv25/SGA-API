import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { CursosModule } from "../cursos";
import { GradosModule } from "../grados";
import { PlanEstudiosController } from "./plan-estudios.controller";
import { PlanEstudiosRepository } from "./repositories/plan-estudios.repository";
import { PlanEstudiosService } from "./plan-estudios.service";

@Module({
  imports: [GradosModule, CursosModule],
  controllers: [PlanEstudiosController],
  providers: [PlanEstudiosRepository, PlanEstudiosService, AuditService],
  exports: [PlanEstudiosService, PlanEstudiosRepository],
})
export class PlanEstudiosModule {}
