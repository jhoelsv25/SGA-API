import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { GradosController } from "./grados.controller";
import { GradosRepository } from "./repositories/grados.repository";
import { GradosService } from "./grados.service";

@Module({
  controllers: [GradosController],
  providers: [GradosRepository, GradosService, AuditService],
  exports: [GradosService, GradosRepository],
})
export class GradosModule {}
