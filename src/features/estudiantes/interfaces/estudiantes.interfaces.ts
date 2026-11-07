import type {
  CreateEstudianteDto,
  CreateEstudianteResponseDto,
  EstudianteQueryDto,
  EstudianteResponseDto,
  PaginatedEstudiantesResponseDto,
  UpdateEstudianteDto,
} from "../dto";

export interface EstudianteCursorPayload {
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  id: string;
}

export interface EstudianteProcedureResultJson {
  data?: EstudianteResponseDto[];
  hasMore?: boolean;
  nextCursorPaterno?: string | null;
  nextCursorMaterno?: string | null;
  nextCursorNombres?: string | null;
  nextCursorId?: string | null;
  limit?: number;
}

export interface DbEstudiantesProcedureExecutionResult {
  rows?: Array<{
    resultado?: EstudianteProcedureResultJson;
  }>;
}

export interface RegistrarEstudianteTransactionData {
  dto: CreateEstudianteDto;
  actorId: string;
  cargoId: string;
  rolId: string;
  pinPlano: string;
  pinHash: string;
  codigoCredencial: string;
  tempPassword?: string | null;
  contrasenaHash?: string;
}

export interface IEstudiantesRepository {
  findAll(query?: EstudianteQueryDto): Promise<PaginatedEstudiantesResponseDto>;
  findById(id: string): Promise<EstudianteResponseDto | null>;
  findByPersonaId(personaId: string): Promise<EstudianteResponseDto | null>;
  findByCodigo(codigo: string): Promise<EstudianteResponseDto | null>;
  create(data: RegistrarEstudianteTransactionData): Promise<CreateEstudianteResponseDto>;
  update(id: string, dto: UpdateEstudianteDto): Promise<EstudianteResponseDto | null>;
  delete(id: string, actorId: string): Promise<boolean>;
  contarMatriculasActivas(estudianteId: string): Promise<number>;
  cambiarEstado(id: string, estado: "activo" | "retirado"): Promise<EstudianteResponseDto | null>;
}
