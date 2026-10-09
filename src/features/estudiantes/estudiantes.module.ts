import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { CargosModule } from "../cargos/cargos.module";
import { PersonasModule } from "../personas/personas.module";
import { RolesModule } from "../roles/roles.module";
import { EstudiantesController } from "./estudiantes.controller";
import { EstudiantesService } from "./estudiantes.service";
import { EstudiantesRepository } from "./repositories/estudiantes.repository";

@Module({
  imports: [PersonasModule, CargosModule, RolesModule],
  controllers: [EstudiantesController],
  providers: [EstudiantesService, EstudiantesRepository, AuditService],
  exports: [EstudiantesService, EstudiantesRepository],
})
export class EstudiantesModule {}
