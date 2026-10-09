import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { CargosModule } from "../cargos/cargos.module";
import { PersonasModule } from "../personas/personas.module";
import { RolesModule } from "../roles/roles.module";
import { ApoderadosController } from "./apoderados.controller";
import { ApoderadosService } from "./apoderados.service";
import { ApoderadosRepository } from "./repositories/apoderados.repository";

@Module({
  imports: [PersonasModule, CargosModule, RolesModule],
  controllers: [ApoderadosController],
  providers: [ApoderadosService, ApoderadosRepository, AuditService],
  exports: [ApoderadosService, ApoderadosRepository],
})
export class ApoderadosModule {}
