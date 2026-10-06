export interface FindAuditFilters {
  startDate: string;
  endDate: string;
  usuario?: string;
  accion?: string;
  entidad?: string;
  offset: number;
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

export interface IAuditRepository {
  findAll(filters: FindAuditFilters): Promise<{ data: AuditRecord[]; total: number }>;
  findById(id: number): Promise<AuditRecord | null>;
}
