import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { PersonasModule } from "../personas/personas.module";
import { CredencialesController } from "./credenciales.controller";
import { CredencialesService } from "./credenciales.service";
import { CredencialesRepository } from "./repositories";

@Module({
  imports: [PersonasModule],
  controllers: [CredencialesController],
  providers: [CredencialesService, CredencialesRepository, AuditService],
  exports: [CredencialesService, CredencialesRepository],
})
export class CredencialesModule {}
