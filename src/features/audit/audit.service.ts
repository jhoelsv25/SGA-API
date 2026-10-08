import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { decodeCursor } from "../../common/utils";
import {
  AuditDetailResponseDto,
  AuditDiffFieldDto,
  AuditLogItemDto,
  PaginatedAuditResponseDto,
} from "./dto/audit-response.dto";
import { QueryAuditDto } from "./dto/query-audit.dto";
import { AuditRecord } from "./interfaces/audit.repository.interface";
import { AuditRepository } from "./repositories/audit.repository";

const SENSITIVE_KEYS = new Set([
  "contrasena",
  "contrasenahash",
  "password",
  "passwordhash",
  "token",
  "tokenhash",
  "clave",
  "secret",
]);

function sanitizeRecord(obj: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!obj || typeof obj !== "object") return null;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = "[PROTEGIDO]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizeRecord(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function toIsoTimestamp(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  const trimmed = String(value).trim();
  if (trimmed.endsWith("Z") || trimmed.includes("+") || /-\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed).toISOString();
  }
  return new Date(`${trimmed.replace(" ", "T")}Z`).toISOString();
}

function computeDifferences(
  accion: string,
  valorAnterior: Record<string, unknown> | null,
  valorNuevo: Record<string, unknown> | null,
): AuditDiffFieldDto[] {
  const diffs: AuditDiffFieldDto[] = [];
  const sanitizedPrev = sanitizeRecord(valorAnterior) ?? {};
  const sanitizedNext = sanitizeRecord(valorNuevo) ?? {};

  if (accion === "crear") {
    for (const [campo, val] of Object.entries(sanitizedNext)) {
      diffs.push({
        campo,
        valorAnterior: null,
        valorNuevo: val,
      });
    }
    return diffs;
  }

  if (accion === "eliminar") {
    for (const [campo, val] of Object.entries(sanitizedPrev)) {
      diffs.push({
        campo,
        valorAnterior: val,
        valorNuevo: null,
      });
    }
    return diffs;
  }

  const allKeys = new Set([...Object.keys(sanitizedPrev), ...Object.keys(sanitizedNext)]);
  for (const campo of allKeys) {
    diffs.push({
      campo,
      valorAnterior: sanitizedPrev[campo] ?? null,
      valorNuevo: sanitizedNext[campo] ?? null,
    });
  }

  return diffs;
}

function parseDateInput(dateStr: string): Date {
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(trimmed);
}

function formatSqlTimestamp(date: Date, isEndOfDay: boolean): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const time = isEndOfDay ? "23:59:59" : "00:00:00";
  return `${year}-${month}-${day} ${time}`;
}

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async findAll(query: QueryAuditDto = {}): Promise<PaginatedAuditResponseDto> {
    const limit = Number(query.limit) > 0 ? Number(query.limit) : 50;

    let startDate: Date;
    let endDate: Date;

    if (!query.fechaInicio && !query.fechaFin) {
      // Por defecto: últimos 7 días
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);
    } else {
      if (query.fechaInicio && !query.fechaFin) {
        startDate = parseDateInput(query.fechaInicio);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);
      } else if (!query.fechaInicio && query.fechaFin) {
        endDate = parseDateInput(query.fechaFin);
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 7);
      } else {
        startDate = parseDateInput(query.fechaInicio!);
        endDate = parseDateInput(query.fechaFin!);
      }

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestException("Formato de fecha inválido.");
      }

      // Validar: fecha final no puede ser anterior a la fecha inicial
      if (endDate < startDate) {
        throw new BadRequestException("La fecha final no puede ser anterior a la fecha inicial.");
      }

      // Validar rango máximo de 31 días (comparando días del calendario)
      const startMs = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endMs = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));

      if (diffDays > 31) {
        throw new BadRequestException("El rango de consulta no puede superar los 31 días.");
      }
    }

    const startDateStr = formatSqlTimestamp(startDate, false);
    const endDateStr = formatSqlTimestamp(endDate, true);

    let cursorFecha: string | null = null;
    let cursorId: number | null = null;

    if (query.cursor) {
      const decoded = decodeCursor<{ registradoEn: string; id: number }>(query.cursor);
      if (decoded && decoded.registradoEn && typeof decoded.id === "number") {
        cursorFecha = decoded.registradoEn;
        cursorId = decoded.id;
      }
    }

    const result = await this.auditRepository.findAll({
      startDate: startDateStr,
      endDate: endDateStr,
      usuario: query.usuario,
      accion: query.accion,
      entidad: query.entidad,
      cursorFecha,
      cursorId,
      limit,
    });

    const data: AuditLogItemDto[] = result.data.map((record) => this.mapToItemDto(record));

    return {
      data,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      limit,
      mensaje:
        data.length === 0
          ? "No hay registros de auditoría para los filtros seleccionados."
          : undefined,
    };
  }

  async findById(id: number): Promise<AuditDetailResponseDto> {
    const record = await this.auditRepository.findById(id);

    if (!record) {
      throw new NotFoundException("Registro de auditoría no encontrado.");
    }

    const valorAnterior = sanitizeRecord(record.valorAnterior);
    const valorNuevo = sanitizeRecord(record.valorNuevo);
    const diferencias = computeDifferences(record.accion, valorAnterior, valorNuevo);

    return {
      id: record.id,
      registradoEn: toIsoTimestamp(record.registradoEn),
      usuarioId: record.usuarioId,
      usuario: record.usuarioNombre ?? (record.usuarioId ? "Usuario no encontrado" : "Sistema"),
      accion: record.accion,
      entidad: record.tabla,
      registroId: record.registroId,
      direccionIp: record.direccionIp,
      valorAnterior,
      valorNuevo,
      diferencias,
    };
  }

  private mapToItemDto(record: AuditRecord): AuditLogItemDto {
    return {
      id: record.id,
      registradoEn: toIsoTimestamp(record.registradoEn),
      usuarioId: record.usuarioId,
      usuario: record.usuarioNombre ?? (record.usuarioId ? "Usuario no encontrado" : "Sistema"),
      accion: record.accion,
      entidad: record.tabla,
      registroId: record.registroId,
      direccionIp: record.direccionIp,
    };
  }
}
