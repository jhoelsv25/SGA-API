import { Inject, Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { encodeCursor } from "../../../common/utils";
import { Database, DRIZZLE } from "../../../core/database";
import { bitacoraAuditoria, usuarios } from "../../../core/database/schema";
import { MODULE_TABLES_MAP } from "../constants/audit.constants";
import {
  AuditRecord,
  DbProcedureExecutionResult,
  FindAuditFilters,
  FindAuditResult,
  IAuditRepository,
} from "../interfaces/audit.repository.interface";
import { formatRecordTimestamp } from "../utils/audit-date.util";

@Injectable()
export class AuditRepository implements IAuditRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAll(filters: FindAuditFilters): Promise<FindAuditResult> {
    let tablas: string[] | null = null;
    let entidadFiltro: string | null = null;

    if (filters.entidad && filters.entidad.trim() !== "") {
      const trimmed = filters.entidad.trim().toLowerCase();
      const mappedTables = MODULE_TABLES_MAP[trimmed];
      if (mappedTables && mappedTables.length > 0) {
        tablas = mappedTables;
      } else {
        entidadFiltro = trimmed;
      }
    }

    const payload = {
      fechaInicio: filters.startDate,
      fechaFin: filters.endDate,
      usuario: filters.usuario?.trim() || null,
      accion: filters.accion?.trim() || null,
      tablas,
      entidad: entidadFiltro,
      cursorFecha: filters.cursorFecha ?? null,
      cursorId: filters.cursorId ?? null,
      limit: filters.limit,
    };

    const result = (await this.db.execute(sql`
      SELECT fn_consultar_bitacora_auditoria(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbProcedureExecutionResult;

    const jsonResult = result.rows?.[0]?.resultado ?? {};

    const data: AuditRecord[] = (jsonResult.data ?? []).map((r) => ({
      id: Number(r.id),
      usuarioId: r.usuarioId ?? null,
      usuarioNombre: r.usuarioNombre ?? null,
      accion: r.accion,
      tabla: r.tabla,
      registroId: r.registroId ?? null,
      valorAnterior: r.valorAnterior ?? null,
      valorNuevo: r.valorNuevo ?? null,
      direccionIp: r.direccionIp ?? null,
      registradoEn: formatRecordTimestamp(r.registradoEn),
    }));

    const hasMore = Boolean(jsonResult.hasMore);
    const nextCursor =
      hasMore && jsonResult.nextCursorFecha && jsonResult.nextCursorId != null
        ? encodeCursor({
            registradoEn: jsonResult.nextCursorFecha,
            id: Number(jsonResult.nextCursorId),
          })
        : null;

    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  async findById(id: number): Promise<AuditRecord | null> {
    const [row] = await this.db
      .select({
        id: bitacoraAuditoria.id,
        usuarioId: bitacoraAuditoria.usuarioId,
        usuarioNombre: usuarios.nombreUsuario,
        accion: bitacoraAuditoria.accion,
        tabla: bitacoraAuditoria.tabla,
        registroId: bitacoraAuditoria.registroId,
        valorAnterior: bitacoraAuditoria.valorAnterior,
        valorNuevo: bitacoraAuditoria.valorNuevo,
        direccionIp: bitacoraAuditoria.direccionIp,
        registradoEn: bitacoraAuditoria.registradoEn,
      })
      .from(bitacoraAuditoria)
      .leftJoin(usuarios, eq(bitacoraAuditoria.usuarioId, usuarios.id))
      .where(eq(bitacoraAuditoria.id, id))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      ...row,
      valorAnterior: row.valorAnterior as Record<string, unknown> | null,
      valorNuevo: row.valorNuevo as Record<string, unknown> | null,
    };
  }
}
