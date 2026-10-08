import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { CursosController } from "./cursos.controller";
import { CursosRepository } from "./repositories/cursos.repository";
import { CursosService } from "./cursos.service";

@Module({
  controllers: [CursosController],
  providers: [CursosRepository, CursosService, AuditService],
  exports: [CursosService, CursosRepository],
})
export class CursosModule {}
