import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { PersonasModule } from "../personas/personas.module";
import { AccesosController } from "./accesos.controller";
import { AccesosService } from "./accesos.service";
import { CredencialesController } from "./credenciales.controller";
import { CredencialesService } from "./credenciales.service";
import { AccesosRepository, CredencialesRepository } from "./repositories";

@Module({
  imports: [PersonasModule],
  controllers: [CredencialesController, AccesosController],
  providers: [
    CredencialesService,
    CredencialesRepository,
    AccesosService,
    AccesosRepository,
    AuditService,
  ],
  exports: [CredencialesService, CredencialesRepository],
})
export class CredencialesModule {}
