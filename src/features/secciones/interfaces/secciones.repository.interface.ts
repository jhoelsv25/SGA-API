import type { SeccionQueryDto, SeccionResponseDto } from "../dto";

export interface CreateSeccionData {
  anioAcademicoId: string;
  gradoId: string;
  nombre: string;
  aula?: string | null;
  vacantes: number;
  tutorId?: string | null;
}

export interface UpdateSeccionData {
  nombre?: string;
  aula?: string | null;
  vacantes?: number;
  tutorId?: string | null;
}

export interface ISeccionesRepository {
  findById(id: string): Promise<SeccionResponseDto | null>;
  findAll(anioId: string, filtros?: SeccionQueryDto): Promise<SeccionResponseDto[]>;
  findPorNombre(
    anioId: string,
    gradoId: string,
    nombre: string,
    exceptoId?: string,
  ): Promise<SeccionResponseDto | null>;
  tutorOcupado(anioId: string, docenteId: string, exceptoSeccionId?: string): Promise<boolean>;
  contarMatriculadosVigentes(seccionId: string): Promise<number>;
  createConCarga(data: CreateSeccionData): Promise<SeccionResponseDto>;
  update(id: string, data: UpdateSeccionData): Promise<SeccionResponseDto>;
  cerrar(id: string): Promise<SeccionResponseDto>;
}
