import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { QUEUES } from "../../core/queues/queues.constants";
import { QueuesModule } from "../../core/queues/queues.module";
import { AnioEscolarModule } from "../anio-escolar/anio-escolar.module";
import { AuthModule } from "../auth/auth.module";
import { InstitucionModule } from "../institucion/institucion.module";
import { NotificacionesModule } from "../notificaciones/notificaciones.module";
import { AulaVirtualController } from "./aula-virtual.controller";
import { AulaVirtualService } from "./aula-virtual.service";
import { AulaInteraccionController, AulaTareasController } from "./controllers";
import { ChatAulaGateway } from "./gateways/chat-aula.gateway";
import { RecordatorioTareasProcessor } from "./processors";
import {
  AulaAccesoRepository,
  AulaActividadRepository,
  AulaEntregasRepository,
  AulaInteraccionRepository,
  AulaMaterialesRepository,
  AulaTareasRepository,
  AulaVirtualRepository,
} from "./repositories";
import {
  AulaActividadService,
  AulaCalificacionesService,
  AulaContextoHelper,
  AulaEntregasService,
  AulaInteraccionService,
  AulaMaterialesService,
  AulaRecordatoriosService,
  AulaSolicitudesService,
  AulaTareasService,
  AulaUnidadesService,
} from "./services";

@Module({
  imports: [
    QueuesModule,
    BullModule.registerQueue({ name: QUEUES.AULA_VIRTUAL }),
    AnioEscolarModule,
    AuthModule,
    NotificacionesModule,
    InstitucionModule,
  ],
  controllers: [AulaVirtualController, AulaTareasController, AulaInteraccionController],
  providers: [
    AulaAccesoRepository,
    AulaMaterialesRepository,
    AulaTareasRepository,
    AulaEntregasRepository,
    AulaInteraccionRepository,
    AulaActividadRepository,
    AulaVirtualRepository,
    AulaContextoHelper,
    AulaUnidadesService,
    AulaMaterialesService,
    AulaSolicitudesService,
    AulaTareasService,
    AulaEntregasService,
    AulaCalificacionesService,
    AulaRecordatoriosService,
    AulaInteraccionService,
    AulaActividadService,
    AulaVirtualService,
    RecordatorioTareasProcessor,
    AuditService,
    ChatAulaGateway,
  ],
  exports: [
    AulaVirtualService,
    AulaUnidadesService,
    AulaMaterialesService,
    AulaSolicitudesService,
    AulaTareasService,
    AulaEntregasService,
    AulaCalificacionesService,
    AulaRecordatoriosService,
    AulaInteraccionService,
    AulaActividadService,
    ChatAulaGateway,
  ],
})
export class AulaVirtualModule {}
