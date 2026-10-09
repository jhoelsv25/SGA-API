export interface ApoderadoCursorPayload {
  apellidoPaterno: string;
  apellidoMaterno?: string;
  nombres: string;
  id: string;
}

export interface DbApoderadosProcedureExecutionResult {
  rows?: Array<{
    resultado: {
      data?: import("../dto").ApoderadoResponseDto[];
      hasMore?: boolean;
      nextCursorPaterno?: string | null;
      nextCursorMaterno?: string | null;
      nextCursorNombres?: string | null;
      nextCursorId?: string | null;
      limit?: number;
    };
  }>;
}
