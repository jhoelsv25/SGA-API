import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { NotificacionesModule } from "../notificaciones/notificaciones.module";
import { LibretasModule } from "../libretas/libretas.module";
import { MatriculasRepository } from "./repositories";
import { MatriculaMasivaService, MatriculaOperacionesService, PromocionService } from "./services";
import { MatriculasController } from "./matriculas.controller";
import { MatriculasService } from "./matriculas.service";

@Module({
  imports: [NotificacionesModule, LibretasModule],
  controllers: [MatriculasController],
  providers: [
    MatriculasService,
    MatriculaOperacionesService,
    MatriculaMasivaService,
    PromocionService,
    MatriculasRepository,
    AuditService,
  ],
  exports: [MatriculasService, MatriculasRepository, PromocionService],
})
export class MatriculasModule {}
