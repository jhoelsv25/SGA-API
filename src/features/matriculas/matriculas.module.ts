import { Module } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { MatriculasRepository } from "./repositories";
import { MatriculaMasivaService, MatriculaOperacionesService } from "./services";
import { MatriculasController } from "./matriculas.controller";
import { MatriculasService } from "./matriculas.service";

@Module({
  controllers: [MatriculasController],
  providers: [
    MatriculasService,
    MatriculaOperacionesService,
    MatriculaMasivaService,
    MatriculasRepository,
    AuditService,
  ],
  exports: [MatriculasService, MatriculasRepository],
})
export class MatriculasModule {}
