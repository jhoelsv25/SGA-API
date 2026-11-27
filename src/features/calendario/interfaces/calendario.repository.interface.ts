import { TipoEvento } from "../constants";
import { EventoCalendarioResponseDto } from "../dto";

export interface EventoPersistido extends EventoCalendarioResponseDto {
  creadoPorId: string | null;
}

export interface GuardarEventoData {
  anioAcademicoId: string;
  titulo: string;
  descripcion: string | null;
  tipo: TipoEvento;
  fechaInicio: string;
  fechaFin: string;
  suspendeClases: boolean;
  personalLabora: boolean;
  creadoPorId: string | null;
}

export interface SesionesAfectadas {
  eliminadas: number;
  firmadas: number;
}

export interface ICalendarioRepository {
  listarEnRango(anioAcademicoId: string, desde: string, hasta: string): Promise<EventoPersistido[]>;
  findById(id: string): Promise<EventoPersistido | null>;
  create(data: GuardarEventoData): Promise<EventoPersistido>;
  update(
    id: string,
    data: Partial<Omit<GuardarEventoData, "creadoPorId" | "anioAcademicoId">>,
  ): Promise<EventoPersistido>;
  remove(id: string): Promise<void>;
  eliminarSesionesPendientes(desde: string, hasta: string): Promise<SesionesAfectadas>;
  suspendeClasesEn(fecha: string): Promise<boolean>;
}
