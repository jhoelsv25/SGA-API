export interface FindAuditFilters {
  startDate: string;
  endDate: string;
  usuario?: string;
  accion?: string;
  entidad?: string;
  cursorFecha?: string | null;
  cursorId?: number | null;
  limit: number;
}

export interface AuditRecord {
  id: number;
  usuarioId: string | null;
  usuarioNombre: string | null;
  accion: string;
  tabla: string;
  registroId: string | null;
  valorAnterior: Record<string, unknown> | null;
  valorNuevo: Record<string, unknown> | null;
  direccionIp: string | null;
  registradoEn: string;
}

export interface FindAuditResult {
  data: AuditRecord[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface AuditProcedureResultJson {
  data?: AuditRecord[];
  hasMore?: boolean;
  nextCursorFecha?: string | null;
  nextCursorId?: number | null;
}

export interface DbProcedureExecutionResult {
  rows?: Array<{
    resultado?: AuditProcedureResultJson;
  }>;
}

export interface IAuditRepository {
  findAll(filters: FindAuditFilters): Promise<FindAuditResult>;
  findById(id: number): Promise<AuditRecord | null>;
}
