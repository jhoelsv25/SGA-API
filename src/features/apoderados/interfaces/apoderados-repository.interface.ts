import type {
  ApoderadoQueryDto,
  ApoderadoResponseDto,
  CreateApoderadoDto,
  CreateApoderadoResponseDto,
  EstudianteDelApoderadoResponseDto,
  PaginatedApoderadosResponseDto,
  UpdateApoderadoDto,
  VincularEstudianteApoderadoDto,
  VinculoFamiliarResponseDto,
} from "../dto";

export interface RegistrarApoderadoTransactionData {
  dto: CreateApoderadoDto;
  actorId: string;
  rolId: string;
  cargoId: string;
  contrasenaHash?: string;
  tempPassword?: string;
}

export interface IApoderadosRepository {
  findById(id: string): Promise<ApoderadoResponseDto | null>;
  findByPersonaId(personaId: string): Promise<ApoderadoResponseDto | null>;
  findByEstudianteId(estudianteId: string): Promise<ApoderadoResponseDto[]>;
  findEstudiantesByApoderadoPersonaId(
    apoderadoPersonaId: string,
  ): Promise<EstudianteDelApoderadoResponseDto[]>;
  findAll(query?: ApoderadoQueryDto): Promise<PaginatedApoderadosResponseDto>;
  create(data: RegistrarApoderadoTransactionData): Promise<CreateApoderadoResponseDto>;
  update(id: string, dto: UpdateApoderadoDto): Promise<ApoderadoResponseDto | null>;
  delete(id: string, actorId: string): Promise<boolean>;
  vincularEstudiante(dto: VincularEstudianteApoderadoDto): Promise<VinculoFamiliarResponseDto>;
  desvincularEstudiante(estudianteId: string, apoderadoId: string): Promise<boolean>;
  getVinculo(estudianteId: string, apoderadoId: string): Promise<VinculoFamiliarResponseDto | null>;
}
