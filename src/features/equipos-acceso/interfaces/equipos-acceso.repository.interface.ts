import { EstadoEquipoAcceso } from "../constants";
import { EquipoAccesoResponseDto } from "../dto";

export interface ResolucionEquipoAcceso {
  estado: EstadoEquipoAcceso;
  resueltoPor: string;
  motivo: string | null;
  vigenteHasta: string | null;
}

export interface IEquiposAccesoRepository {
  findAll(estado?: EstadoEquipoAcceso): Promise<EquipoAccesoResponseDto[]>;
  findById(id: string): Promise<EquipoAccesoResponseDto | null>;
  resolver(id: string, resolucion: ResolucionEquipoAcceso): Promise<EquipoAccesoResponseDto>;
}
