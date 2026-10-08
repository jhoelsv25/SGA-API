import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { InstitucionController } from "./institucion.controller";
import { InstitucionRepository } from "./repositories/institucion.repository";
import { InstitucionService } from "./institucion.service";

@Module({
  controllers: [InstitucionController],
  providers: [InstitucionService, InstitucionRepository, AuditService],
  exports: [InstitucionService, InstitucionRepository],
})
export class InstitucionModule {}
