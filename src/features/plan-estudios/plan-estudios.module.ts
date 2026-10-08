import { Module } from "@nestjs/common";
import { CursosController, GradosController, PlanEstudiosController } from "./controllers";
import { CursosRepository, GradosRepository, PlanEstudiosRepository } from "./repositories";
import { CursosService, GradosService, PlanEstudiosService } from "./services";

@Module({
  controllers: [GradosController, CursosController, PlanEstudiosController],
  providers: [
    GradosRepository,
    CursosRepository,
    PlanEstudiosRepository,
    GradosService,
    CursosService,
    PlanEstudiosService,
  ],
  exports: [
    GradosService,
    CursosService,
    PlanEstudiosService,
    GradosRepository,
    CursosRepository,
    PlanEstudiosRepository,
  ],
})
export class PlanEstudiosModule {}
