import { CreateEquipoDto, EquipoResponseDto, UpdateEquipoDto } from "../dto";

export interface IEquiposRepository {
  findAll(): Promise<EquipoResponseDto[]>;
  findById(id: string): Promise<EquipoResponseDto | null>;
  findByName(nombre: string): Promise<EquipoResponseDto | null>;
  findByTokenHash(tokenHash: string): Promise<EquipoResponseDto | null>;
  create(dto: CreateEquipoDto): Promise<EquipoResponseDto>;
  update(id: string, dto: UpdateEquipoDto): Promise<EquipoResponseDto>;
  toggleActivo(id: string, activo: boolean): Promise<EquipoResponseDto>;
  authorize(
    id: string,
    tokenHash: string,
    usuarioId: string,
    ip?: string,
  ): Promise<EquipoResponseDto>;
  updateLastAccess(id: string, ip?: string): Promise<void>;
}
