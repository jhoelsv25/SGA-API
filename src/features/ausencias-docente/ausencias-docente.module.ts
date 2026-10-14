import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { NotificacionesModule } from "../notificaciones/notificaciones.module";
import { AusenciasConsultaService } from "./ausencias-consulta.service";
import { AusenciasCorreccionService } from "./ausencias-correccion.service";
import { AusenciasDocenteController } from "./ausencias-docente.controller";
import { AusenciasDocenteService } from "./ausencias-docente.service";
import { AusenciasRegistroService } from "./ausencias-registro.service";
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
