import { Module } from "@nestjs/common";
import { CursosController } from "./cursos.controller";
import { CursosRepository } from "./repositories/cursos.repository";
import { CursosService } from "./cursos.service";

@Module({
  controllers: [CursosController],
  providers: [CursosRepository, CursosService],
  exports: [CursosService, CursosRepository],
})
export class CursosModule {}
