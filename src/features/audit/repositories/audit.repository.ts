import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, gte, ilike, isNull, lte, type SQL } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { bitacoraAuditoria, usuarios } from "../../../core/database/schema";
import {
  AuditRecord,
  FindAuditFilters,
  IAuditRepository,
} from "../interfaces/audit.repository.interface";

@Injectable()
export class AuditRepository implements IAuditRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAll(filters: FindAuditFilters): Promise<{ data: AuditRecord[]; total: number }> {
    const conditions: SQL[] = [
      gte(bitacoraAuditoria.registradoEn, filters.startDate),
      lte(bitacoraAuditoria.registradoEn, filters.endDate),
    ];

    if (filters.usuario && filters.usuario.trim() !== "") {
      const trimmedUser = filters.usuario.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trimmedUser,
      );

      if (trimmedUser.toLowerCase() === "sistema") {
        conditions.push(isNull(bitacoraAuditoria.usuarioId));
      } else if (isUuid) {
        conditions.push(eq(bitacoraAuditoria.usuarioId, trimmedUser));
      } else {
        conditions.push(ilike(usuarios.nombreUsuario, `%${trimmedUser}%`));
      }
    }

    if (filters.accion && filters.accion.trim() !== "") {
      conditions.push(eq(bitacoraAuditoria.accion, filters.accion.trim()));
    }

    if (filters.entidad && filters.entidad.trim() !== "") {
      conditions.push(ilike(bitacoraAuditoria.tabla, `%${filters.entidad.trim()}%`));
    }

    const whereClause = and(...conditions);

    const [totalResult] = await this.db
      .select({ totalCount: count() })
      .from(bitacoraAuditoria)
      .leftJoin(usuarios, eq(bitacoraAuditoria.usuarioId, usuarios.id))
      .where(whereClause);

    const total = Number(totalResult?.totalCount ?? 0);

    const rows = await this.db
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
      .where(whereClause)
      .orderBy(desc(bitacoraAuditoria.registradoEn), desc(bitacoraAuditoria.id))
      .limit(filters.limit)
      .offset(filters.offset);

    const data: AuditRecord[] = rows.map((r) => ({
      ...r,
      valorAnterior: r.valorAnterior as Record<string, unknown> | null,
      valorNuevo: r.valorNuevo as Record<string, unknown> | null,
    }));

    return {
      data,
      total,
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
