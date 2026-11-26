import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { NotificacionesModule } from "../notificaciones/notificaciones.module";
import { AusenciasConsultaService } from "./services/ausencias-consulta.service";
import { AusenciasCorreccionService } from "./services/ausencias-correccion.service";
import { AusenciasDocenteController } from "./controllers/ausencias-docente.controller";
import { AusenciasDocenteService } from "./services/ausencias-docente.service";
import { AusenciasRegistroService } from "./services/ausencias-registro.service";
import { AusenciasDocenteRepository } from "./repositories";

@Module({
  imports: [NotificacionesModule],
  controllers: [AusenciasDocenteController],
  providers: [
    AusenciasDocenteRepository,
    AusenciasRegistroService,
    AusenciasCorreccionService,
    AusenciasConsultaService,
    AusenciasDocenteService,
    AuditService,
  ],
  exports: [AusenciasDocenteService, AusenciasDocenteRepository],
})
export class AusenciasDocenteModule {}
