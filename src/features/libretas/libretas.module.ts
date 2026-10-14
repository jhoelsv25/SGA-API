import { Module } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesModule } from "@/features/notificaciones/notificaciones.module";
import { LibretasController } from "./libretas.controller";
import { LibretasService } from "./libretas.service";
import { LibretasRepository } from "./repositories";
import { LibretaArchivoStore } from "./utils";

@Module({
  imports: [NotificacionesModule],
  controllers: [LibretasController],
  providers: [LibretasRepository, LibretaArchivoStore, LibretasService, AuditService],
  exports: [LibretasService],
})
export class LibretasModule {}
