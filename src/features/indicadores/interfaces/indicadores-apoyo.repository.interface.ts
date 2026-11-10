import type {
  AusenciaApoyo,
  JustificacionApoyo,
  SesionApoyo,
} from "../utils/indicadores-apoyo.util";
import type { PeriodoResumen } from "./indicadores-calculo.repository.interface";

export interface FiltrosApoyo {
  anioAcademicoId: string;
  desde: string;
  hasta: string;
  docenteId?: string;
  cursoId?: string;
  seccionId?: string;
}

export interface IIndicadoresApoyoRepository {
  listarPeriodos(anioAcademicoId: string): Promise<PeriodoResumen[]>;
  sesiones(filtros: FiltrosApoyo): Promise<SesionApoyo[]>;
  /** Solo la versión vigente de cada ausencia y sin las anuladas (RF-012). */
  ausencias(filtros: FiltrosApoyo): Promise<AusenciaApoyo[]>;
  justificaciones(filtros: FiltrosApoyo): Promise<JustificacionApoyo[]>;
  diasSinClases(desde: string, hasta: string): Promise<string[]>;
  avisoDiasJustificacion(): Promise<number | null>;
}
