import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { EquiposController } from "./equipos.controller";
import { EquiposRepository } from "./repositories/equipos.repository";
import { EquiposService } from "./equipos.service";
import { SolicitudesKioskoRepository } from "./repositories/solicitudes-kiosko.repository";
import { SolicitudesKioskoController } from "./solicitudes-kiosko.controller";
import { SolicitudesKioskoService } from "./solicitudes-kiosko.service";

@Module({
  controllers: [EquiposController, SolicitudesKioskoController],
  providers: [
    EquiposService,
    EquiposRepository,
    SolicitudesKioskoService,
    SolicitudesKioskoRepository,
    AuditService,
  ],
  exports: [EquiposService, EquiposRepository],
})
export class EquiposModule {}
