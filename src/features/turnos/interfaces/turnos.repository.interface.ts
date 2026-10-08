import { CreateTurnoDto, TurnoResponseDto, UpdateTurnoDto } from "../dto";

export interface ITurnosRepository {
  findAll(): Promise<TurnoResponseDto[]>;
  findById(id: string): Promise<TurnoResponseDto | null>;
  findByAplicaA(aplicaA: string): Promise<TurnoResponseDto | null>;
  create(dto: CreateTurnoDto): Promise<TurnoResponseDto>;
  update(id: string, dto: UpdateTurnoDto): Promise<TurnoResponseDto>;
  toggleActivo(id: string, activo: boolean): Promise<TurnoResponseDto>;
}
