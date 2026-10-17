import type { Indicador } from "../constants";

export interface MedicionFila {
  id: string;
  periodoId: string;
  periodoNombre: string;
  version: number;
  vigente: boolean;
  motivoCambio: string | null;
  cerradaPorId: string;
  cerradaPorNombre?: string;
  cerradaEn: string;
  indicadores: Array<{
    indicador: Indicador;
    numerador: number;
    denominador: number;
    porcentaje: number;
    desglose: Record<string, unknown>;
  }>;
}

export interface IMedicionRepository {
  obtenerMedicionVigentePorPeriodo(periodoId: string): Promise<MedicionFila | null>;
  obtenerHistorialPorPeriodo(periodoId: string): Promise<MedicionFila[]>;
  guardarMedicionCongelada(datos: {
    periodoId: string;
    version: number;
    motivoCambio?: string | null;
    cerradaPorId: string;
    indicadores: Array<{
      indicador: Indicador;
      numerador: number;
      denominador: number;
      porcentaje: number;
      desglose: Record<string, unknown>;
    }>;
  }): Promise<MedicionFila>;
  invalidarVersionVigente(periodoId: string): Promise<void>;
  obtenerPeriodoPorId(periodoId: string): Promise<{
    id: string;
    nombre: string;
    estado: string;
    fechaInicio: string;
    fechaFin: string;
  } | null>;
}
