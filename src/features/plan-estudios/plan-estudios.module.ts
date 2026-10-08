import { Module } from "@nestjs/common";
import { CursosModule } from "../cursos";
import { GradosModule } from "../grados";
import { PlanEstudiosController } from "./plan-estudios.controller";
import { PlanEstudiosRepository } from "./repositories/plan-estudios.repository";
import { PlanEstudiosService } from "./plan-estudios.service";

@Module({
  imports: [GradosModule, CursosModule],
  controllers: [PlanEstudiosController],
  providers: [PlanEstudiosRepository, PlanEstudiosService],
  exports: [PlanEstudiosService, PlanEstudiosRepository],
})
export class PlanEstudiosModule {}
