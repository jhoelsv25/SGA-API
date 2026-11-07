import type {
  CreateDocenteDto,
  CreateDocenteResponseDto,
  DocenteQueryDto,
  DocenteResponseDto,
  PaginatedDocentesResponseDto,
  UpdateDocenteDto,
} from "../dto";

export interface DocenteCursorPayload {
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  id: string;
}

export interface DocenteProcedureResultJson {
  data?: DocenteResponseDto[];
  hasMore?: boolean;
  nextCursorPaterno?: string | null;
  nextCursorMaterno?: string | null;
  nextCursorNombres?: string | null;
  nextCursorId?: string | null;
  limit?: number;
}

export interface DbDocentesProcedureExecutionResult {
  rows?: Array<{
    resultado?: DocenteProcedureResultJson;
  }>;
}

export interface RegistrarDocenteTransactionData {
  dto: CreateDocenteDto;
  actorId: string;
  cargoId: string;
  rolId: string;
  pinPlano: string;
  pinHash: string;
  codigoCredencial: string;
  tempPassword?: string | null;
  contrasenaHash?: string;
}

export interface IDocentesRepository {
  findAll(query?: DocenteQueryDto): Promise<PaginatedDocentesResponseDto>;
  findById(id: string): Promise<DocenteResponseDto | null>;
  findByPersonaId(personaId: string): Promise<DocenteResponseDto | null>;
  findByCodigo(codigo: string): Promise<DocenteResponseDto | null>;
  create(data: RegistrarDocenteTransactionData): Promise<CreateDocenteResponseDto>;
  update(id: string, dto: UpdateDocenteDto): Promise<DocenteResponseDto | null>;
  cesar(
    id: string,
    fechaCese: string,
    actorId: string,
  ): Promise<{
    docente: DocenteResponseDto;
    mantuvoCuentaActiva: boolean;
  } | null>;
  contarCargaVigente(docenteId: string): Promise<number>;
  reactivar(id: string): Promise<DocenteResponseDto | null>;
}
