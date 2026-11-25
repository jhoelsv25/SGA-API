import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import {
  DashboardAdminRepository,
  DashboardDirectivoRepository,
  DashboardDocenteRepository,
  DashboardEstudianteRepository,
  DashboardReferenciaRepository,
  DashboardRepository,
  DashboardSecretariaRepository,
} from "./repositories";

@Module({
  controllers: [DashboardController],
  providers: [
    DashboardReferenciaRepository,
    DashboardDirectivoRepository,
    DashboardDocenteRepository,
    DashboardEstudianteRepository,
    DashboardAdminRepository,
    DashboardSecretariaRepository,
    DashboardRepository,
    DashboardService,
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
