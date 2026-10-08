import { Module } from "@nestjs/common";
import { GradosController } from "./grados.controller";
import { GradosRepository } from "./repositories/grados.repository";
import { GradosService } from "./grados.service";

@Module({
  controllers: [GradosController],
  providers: [GradosRepository, GradosService],
  exports: [GradosService, GradosRepository],
})
export class GradosModule {}
