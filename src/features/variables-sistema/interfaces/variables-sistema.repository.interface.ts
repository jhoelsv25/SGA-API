import { VariableSistemaResponseDto } from "../dto";

export interface IVariablesSistemaRepository {
  findVigentes(modulo?: string): Promise<VariableSistemaResponseDto[]>;
  findByCodigoVigente(codigo: string): Promise<VariableSistemaResponseDto | null>;
  findHistorialByCodigo(codigo: string): Promise<VariableSistemaResponseDto[]>;
  findPesosNotaVigentes(): Promise<VariableSistemaResponseDto[]>;
  crearNuevaVersion(params: {
    variableActualId: number;
    codigo: string;
    descripcion: string;
    modulo: string;
    tipo: string;
    valor: string;
    unidad: string | null;
    valorMinimo: number | null;
    valorMaximo: number | null;
    editable: boolean;
    cargaEnAplicacion: boolean;
    motivoCambio: string;
    actualizadoPorId: string;
  }): Promise<VariableSistemaResponseDto>;
}
