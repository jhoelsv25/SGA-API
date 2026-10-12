import type {
  CreatePersonaDto,
  FichasPersonaDto,
  HistorialCorreccionCriticaDto,
  PaginatedPersonasResponseDto,
  PersonaQueryDto,
  PersonaResponseDto,
} from "../dto";

export interface PersonaCursorPayload {
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  id: string;
}

export interface PersonaProcedureResultJson {
  data?: PersonaResponseDto[];
  hasMore?: boolean;
  nextCursorPaterno?: string | null;
  nextCursorMaterno?: string | null;
  nextCursorNombres?: string | null;
  nextCursorId?: string | null;
  limit?: number;
}

export interface DbPersonasProcedureExecutionResult {
  rows?: Array<{
    resultado?: PersonaProcedureResultJson;
  }>;
}

export interface DbSinglePersonaProcedureResult {
  rows?: Array<{
    resultado?: PersonaResponseDto;
  }>;
}

export interface IPersonasRepository {
  findAll(query?: PersonaQueryDto): Promise<PaginatedPersonasResponseDto>;
  findById(id: string): Promise<PersonaResponseDto | null>;
  findByDocumento(
    tipoDocumento: string,
    numeroDocumento: string,
    excludeId?: string,
  ): Promise<PersonaResponseDto | null>;
  findByCorreo(correo: string, excludeId?: string): Promise<PersonaResponseDto | null>;
  search(query: PersonaQueryDto): Promise<PersonaResponseDto[]>;
  create(dto: CreatePersonaDto): Promise<PersonaResponseDto>;
  update(id: string, dto: Partial<CreatePersonaDto>): Promise<PersonaResponseDto | null>;
  softDelete(id: string): Promise<boolean>;
  hasActiveRelations(id: string): Promise<{ hasRelations: boolean; details: FichasPersonaDto }>;
  findHistorialCritico(personaId: string): Promise<HistorialCorreccionCriticaDto[]>;
  findCargoVigente(personaId: string): Promise<{ id: string; cargoId: string } | null>;
  changeCargo(
    personaId: string,
    nuevoCargoId: string,
    fechaInicio: string,
    actorId: string,
  ): Promise<void>;
}
