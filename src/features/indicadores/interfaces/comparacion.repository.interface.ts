import type { Indicador } from "../constants";

export interface IComparacionRepository {
  obtenerMedicionesVigentesPorAnio(anioAcademicoId: string): Promise<
    Array<{
      periodoId: string;
      periodoNombre: string;
      numeroPeriodo: number;
      indicador: Indicador;
      porcentaje: number;
    }>
  >;
}
