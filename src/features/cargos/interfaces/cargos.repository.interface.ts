import { CargoResponseDto } from "../dto";

export interface CargoData {
  nombre: string;
  descripcion?: string | null;
}

export interface ICargosRepository {
  findAll(soloVigentes: boolean): Promise<CargoResponseDto[]>;
  findById(id: string): Promise<CargoResponseDto | null>;
  findByName(nombre: string): Promise<{ id: string } | null>;
  create(data: CargoData, rolesSugeridosIds: string[]): Promise<string>;
  update(id: string, data: Partial<CargoData>, rolesSugeridosIds?: string[]): Promise<void>;
  setVigente(id: string, vigente: boolean): Promise<void>;
  countPersonasVigentes(id: string): Promise<number>;
  /** Cuántos de los IDs corresponden a roles existentes y activos. */
  countRolesActivos(ids: string[]): Promise<number>;
}
