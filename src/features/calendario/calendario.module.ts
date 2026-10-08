import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { AnioEscolarModule } from "../anio-escolar/anio-escolar.module";
import { CalendarioController } from "./calendario.controller";
import { CalendarioService } from "./calendario.service";
import { CalendarioRepository } from "./repositories";

@Module({
  imports: [AnioEscolarModule],
  controllers: [CalendarioController],
  providers: [CalendarioService, CalendarioRepository, AuditService],
  exports: [CalendarioService],
})
export class CalendarioModule {}
