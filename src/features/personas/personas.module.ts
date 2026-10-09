import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { PersonasController } from "./personas.controller";
import { PersonasService } from "./personas.service";
import { PersonasRepository } from "./repositories";

@Module({
  controllers: [PersonasController],
  providers: [PersonasService, PersonasRepository, AuditService],
  exports: [PersonasService, PersonasRepository],
})
export class PersonasModule {}
