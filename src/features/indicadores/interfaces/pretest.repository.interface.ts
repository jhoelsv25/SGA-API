import type { Indicador } from "../constants";

export interface PretestFila {
  id: string;
  indicador: Indicador;
  periodoDescrito: string;
  fechaInicio: string;
  fechaFin: string;
  numerador: number;
  denominador: number;
  porcentaje: number;
  fuente: string;
  vigente: boolean;
  registradoPorId: string;
  registradoPorNombre?: string;
  creadoEn: string;
}

export interface IPretestRepository {
  crearPretest(datos: {
    indicador: Indicador;
    periodoDescrito: string;
    fechaInicio: string;
    fechaFin: string;
    numerador: number;
    denominador: number;
    porcentaje: number;
    fuente: string;
    registradoPorId: string;
  }): Promise<PretestFila>;
  invalidarPretestVigenteAnterior(indicador: Indicador): Promise<void>;
  obtenerPretestVigente(indicador: Indicador): Promise<PretestFila | null>;
  listarTodosPretests(): Promise<PretestFila[]>;
}
