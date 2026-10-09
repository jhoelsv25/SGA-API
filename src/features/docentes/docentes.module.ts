import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { CargosModule } from "../cargos/cargos.module";
import { PersonasModule } from "../personas/personas.module";
import { RolesModule } from "../roles/roles.module";
import { DocentesController } from "./docentes.controller";
import { DocentesService } from "./docentes.service";
import { DocentesRepository } from "./repositories/docentes.repository";

@Module({
  imports: [PersonasModule, CargosModule, RolesModule],
  controllers: [DocentesController],
  providers: [DocentesService, DocentesRepository, AuditService],
  exports: [DocentesService, DocentesRepository],
})
export class DocentesModule {}
