import { Module } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { IndicadoresController } from "./indicadores.controller";
import { IndicadoresService } from "./indicadores.service";
import {
  ComparacionRepository,
  IndicadoresApoyoRepository,
  IndicadoresCalculoRepository,
  MedicionRepository,
  PanelRepository,
  PretestRepository,
} from "./repositories";
import {
  ComparacionService,
  ExportacionService,
  IndicadoresApoyoService,
  IndicadoresCalculoService,
  MedicionService,
  PanelService,
  PretestService,
} from "./services";

@Module({
  controllers: [IndicadoresController],
  providers: [
    // Repositorios
    IndicadoresCalculoRepository,
    IndicadoresApoyoRepository,
    PretestRepository,
    ComparacionRepository,
    MedicionRepository,
    PanelRepository,
    // Subservicios especializados
    IndicadoresCalculoService,
    PretestService,
    ComparacionService,
    MedicionService,
    PanelService,
    ExportacionService,
    IndicadoresApoyoService,
    // Fachada principal
    IndicadoresService,
    // Auditoría asíncrona
    AuditService,
  ],
  exports: [
    IndicadoresService,
    IndicadoresCalculoService,
    PretestService,
    ComparacionService,
    MedicionService,
    PanelService,
    ExportacionService,
    IndicadoresCalculoRepository,
    PretestRepository,
    ComparacionRepository,
    MedicionRepository,
    PanelRepository,
  ],
})
export class IndicadoresModule {}
