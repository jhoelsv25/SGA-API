import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  bitacoraAuditoria,
  personaCargos,
  personas,
  usuarios,
} from "../../../core/database/schema";
import { decodeCursor, encodeCursor } from "../../../common/utils";
import type {
  CampoModificadoDto,
  CreatePersonaDto,
  FichasPersonaDto,
  HistorialCorreccionCriticaDto,
  PaginatedPersonasResponseDto,
  PersonaQueryDto,
  PersonaResponseDto,
} from "../dto";
import type {
  DbPersonasProcedureExecutionResult,
  DbSinglePersonaProcedureResult,
  IPersonasRepository,
  PersonaCursorPayload,
} from "../interfaces";

@Injectable()
export class PersonasRepository implements IPersonasRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAll(query?: PersonaQueryDto): Promise<PaginatedPersonasResponseDto> {
    const limit = query?.limit && query.limit > 0 ? query.limit : 10;
    const decodedCursor = decodeCursor<PersonaCursorPayload>(query?.cursor);

    const payload = {
      search: query?.search?.trim() || null,
      tipoDocumento: query?.tipoDocumento || null,
      esProvisional: query?.esProvisional ?? null,
      cursorPaterno: decodedCursor?.apellidoPaterno ?? null,
      cursorMaterno: decodedCursor?.apellidoMaterno ?? null,
      cursorNombres: decodedCursor?.nombres ?? null,
      cursorId: decodedCursor?.id ?? null,
      limit,
    };

    const result = (await this.db.execute(sql`
      SELECT fn_consultar_personas(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbPersonasProcedureExecutionResult;

    const jsonResult = result.rows?.[0]?.resultado ?? {};
    const data = jsonResult.data ?? [];
    const hasMore = Boolean(jsonResult.hasMore);

    const nextCursor =
      hasMore && jsonResult.nextCursorId && jsonResult.nextCursorPaterno != null
        ? encodeCursor<PersonaCursorPayload>({
            apellidoPaterno: jsonResult.nextCursorPaterno,
            apellidoMaterno: jsonResult.nextCursorMaterno ?? "",
            nombres: jsonResult.nextCursorNombres ?? "",
            id: jsonResult.nextCursorId,
          })
        : null;

    return {
      data,
      nextCursor,
      hasMore,
      limit,
    };
  }

  async findById(id: string): Promise<PersonaResponseDto | null> {
    const payload = { id, limit: 1 };
    const result = (await this.db.execute(sql`
      SELECT fn_consultar_personas(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbPersonasProcedureExecutionResult;

    const data = result.rows?.[0]?.resultado?.data ?? [];
    return data[0] ?? null;
  }

  async findByDocumento(
    tipoDocumento: string,
    numeroDocumento: string,
    excludeId?: string,
  ): Promise<PersonaResponseDto | null> {
    const payload = {
      tipoDocumento,
      numeroDocumento: numeroDocumento.trim(),
      limit: 1,
    };

    const result = (await this.db.execute(sql`
      SELECT fn_consultar_personas(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbPersonasProcedureExecutionResult;

    const data = result.rows?.[0]?.resultado?.data ?? [];
    const found = data[0] ?? null;
    if (found && excludeId && found.id === excludeId) {
      return null;
    }
    return found;
  }

  async findByCorreo(correo: string, excludeId?: string): Promise<PersonaResponseDto | null> {
    const conditions = [ilike(personas.correo, correo.trim()), isNull(personas.eliminadoEn)];

    if (excludeId) {
      conditions.push(sql`${personas.id} <> ${excludeId}`);
    }

    const [row] = await this.db
      .select({ id: personas.id })
      .from(personas)
      .where(and(...conditions));
    if (!row) return null;
    return this.findById(row.id);
  }

  async search(queryDto: PersonaQueryDto): Promise<PersonaResponseDto[]> {
    const term = queryDto.search?.trim();
    if (!term) return [];

    const payload = {
      search: term,
      tipoDocumento: queryDto.tipoDocumento || null,
      limit: queryDto.limit || 10,
    };

    const result = (await this.db.execute(sql`
      SELECT fn_consultar_personas(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbPersonasProcedureExecutionResult;

    return result.rows?.[0]?.resultado?.data ?? [];
  }

  async create(dto: CreatePersonaDto): Promise<PersonaResponseDto> {
    const payload = {
      tipoDocumento: dto.tipoDocumento,
      numeroDocumento: dto.numeroDocumento.trim(),
      nombres: dto.nombres.trim(),
      apellidoPaterno: dto.apellidoPaterno.trim(),
      apellidoMaterno: dto.apellidoMaterno?.trim() || null,
      sexo: dto.sexo,
      fechaNacimiento: dto.fechaNacimiento || null,
      direccion: dto.direccion?.trim() || null,
      distrito: dto.distrito?.trim() || null,
      telefono: dto.telefono?.trim() || null,
      celular: dto.celular?.trim() || null,
      correo: dto.correo?.trim() || null,
      fotoUrl: dto.fotoUrl?.trim() || null,
    };

    const result = (await this.db.execute(sql`
      SELECT fn_crear_persona(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbSinglePersonaProcedureResult;

    return result.rows?.[0]?.resultado as PersonaResponseDto;
  }

  async update(id: string, dto: Partial<CreatePersonaDto>): Promise<PersonaResponseDto | null> {
    const payload: Record<string, unknown> = { id };

    if (dto.tipoDocumento !== undefined) payload.tipoDocumento = dto.tipoDocumento;
    if (dto.numeroDocumento !== undefined) payload.numeroDocumento = dto.numeroDocumento.trim();
    if (dto.nombres !== undefined) payload.nombres = dto.nombres.trim();
    if (dto.apellidoPaterno !== undefined) payload.apellidoPaterno = dto.apellidoPaterno.trim();
    if (dto.apellidoMaterno !== undefined)
      payload.apellidoMaterno = dto.apellidoMaterno?.trim() || null;
    if (dto.sexo !== undefined) payload.sexo = dto.sexo;
    if (dto.fechaNacimiento !== undefined) payload.fechaNacimiento = dto.fechaNacimiento || null;
    if (dto.direccion !== undefined) payload.direccion = dto.direccion?.trim() || null;
    if (dto.distrito !== undefined) payload.distrito = dto.distrito?.trim() || null;
    if (dto.telefono !== undefined) payload.telefono = dto.telefono?.trim() || null;
    if (dto.celular !== undefined) payload.celular = dto.celular?.trim() || null;
    if (dto.correo !== undefined) payload.correo = dto.correo?.trim() || null;
    if (dto.fotoUrl !== undefined) payload.fotoUrl = dto.fotoUrl?.trim() || null;

    const result = (await this.db.execute(sql`
      SELECT fn_actualizar_persona(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbSinglePersonaProcedureResult;

    return result.rows?.[0]?.resultado ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const [result] = await this.db
      .update(personas)
      .set({ eliminadoEn: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(personas.id, id), isNull(personas.eliminadoEn)))
      .returning({ id: personas.id });

    return Boolean(result);
  }

  async hasActiveRelations(
    id: string,
  ): Promise<{ hasRelations: boolean; details: FichasPersonaDto }> {
    const persona = await this.findById(id);
    const details = persona?.fichas ?? {
      esDocente: false,
      esEstudiante: false,
      esApoderado: false,
      tieneUsuario: false,
    };

    const hasRelations =
      details.esDocente || details.esEstudiante || details.esApoderado || details.tieneUsuario;

    return {
      hasRelations,
      details,
    };
  }

  async findHistorialCritico(personaId: string): Promise<HistorialCorreccionCriticaDto[]> {
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
      .where(
        and(
          eq(bitacoraAuditoria.tabla, "personas"),
          eq(bitacoraAuditoria.registroId, personaId),
          eq(bitacoraAuditoria.accion, "actualizar"),
        ),
      )
      .orderBy(desc(bitacoraAuditoria.registradoEn))
      .limit(50);

    return rows.map((r) => {
      const valorAnt: Record<string, unknown> =
        r.valorAnterior && typeof r.valorAnterior === "object"
          ? (r.valorAnterior as Record<string, unknown>)
          : {};
      const valorNue: Record<string, unknown> =
        r.valorNuevo && typeof r.valorNuevo === "object"
          ? (r.valorNuevo as Record<string, unknown>)
          : {};

      const rawMotivo = valorNue.motivo;
      const motivo =
        typeof rawMotivo === "string" && rawMotivo.trim().length > 0
          ? rawMotivo.trim()
          : "Corrección registrada";

      const camposModificados: CampoModificadoDto[] = [];
      for (const [key, valNuevo] of Object.entries(valorNue)) {
        if (key === "motivo") continue;
        const valAnterior = valorAnt[key];
        if (valNuevo !== valAnterior) {
          camposModificados.push({
            campo: key,
            valorAnterior: valAnterior ?? null,
            valorNuevo: valNuevo ?? null,
          });
        }
      }

      return {
        id: r.id,
        fechaHora: r.registradoEn
          ? new Date(r.registradoEn).toISOString()
          : new Date().toISOString(),
        usuarioNombre: r.usuarioNombre ?? null,
        motivo,
        camposModificados,
        direccionIp: r.direccionIp ?? null,
      };
    });
  }

  async findCargoVigente(personaId: string): Promise<{ id: string; cargoId: string } | null> {
    const [row] = await this.db
      .select({ id: personaCargos.id, cargoId: personaCargos.cargoId })
      .from(personaCargos)
      .where(and(eq(personaCargos.personaId, personaId), eq(personaCargos.vigente, true)))
      .limit(1);
    return row ?? null;
  }

  async changeCargo(
    personaId: string,
    nuevoCargoId: string,
    fechaInicio: string,
    actorId: string,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(personaCargos)
        .set({
          vigente: false,
          // GREATEST evita violar el CHECK fecha_fin >= fecha_inicio cuando el
          // cargo anterior empezó el mismo día (fechaInicio - 1 día quedaría antes).
          fechaFin: sql`GREATEST(${personaCargos.fechaInicio}, ${fechaInicio}::date - interval '1 day')`,
        })
        .where(and(eq(personaCargos.personaId, personaId), eq(personaCargos.vigente, true)));

      await tx.insert(personaCargos).values({
        personaId,
        cargoId: nuevoCargoId,
        fechaInicio,
        esPrincipal: true,
        registradoPorId: actorId,
      });
    });
  }

  async obtenerResumen(query?: PersonaQueryDto): Promise<{
    total: number;
    conFicha: number;
    conCuenta: number;
    provisionales: number;
  }> {
    const tipoDoc = query?.tipoDocumento?.trim() || null;
    const search = query?.search?.trim() || null;
    const pattern = search ? `%${search}%` : null;
    const esProvisional = query?.esProvisional ?? null;

    const result = (await this.db.execute(sql`
      WITH base AS (
        SELECT
          p.id,
          (
            EXISTS (SELECT 1 FROM docentes d WHERE d.persona_id = p.id AND d.eliminado_en IS NULL)
            OR EXISTS (SELECT 1 FROM estudiantes e WHERE e.persona_id = p.id AND e.eliminado_en IS NULL)
            OR EXISTS (SELECT 1 FROM apoderados a WHERE a.persona_id = p.id AND a.eliminado_en IS NULL)
          ) AS tiene_ficha,
          EXISTS (SELECT 1 FROM usuarios u WHERE u.persona_id = p.id AND u.eliminado_en IS NULL) AS tiene_usuario
        FROM personas p
        WHERE p.eliminado_en IS NULL
          AND (${tipoDoc}::text IS NULL OR p.tipo_documento = ${tipoDoc})
          AND (
            ${pattern}::text IS NULL
            OR p.numero_documento ILIKE ${pattern}
            OR p.nombres ILIKE ${pattern}
            OR p.apellido_paterno ILIKE ${pattern}
            OR p.apellido_materno ILIKE ${pattern}
          )
      ),
      clasificadas AS (
        SELECT
          tiene_ficha,
          tiene_usuario,
          NOT (tiene_ficha OR tiene_usuario) AS es_provisional
        FROM base
      )
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE tiene_ficha)::int AS con_ficha,
        COUNT(*) FILTER (WHERE tiene_usuario)::int AS con_cuenta,
        COUNT(*) FILTER (WHERE es_provisional)::int AS provisionales
      FROM clasificadas
      WHERE (${esProvisional}::boolean IS NULL OR es_provisional = ${esProvisional})
    `)) as unknown as {
      rows?: Array<{
        total?: number;
        con_ficha?: number;
        con_cuenta?: number;
        provisionales?: number;
      }>;
    };

    const row = result.rows?.[0];
    return {
      total: Number(row?.total ?? 0),
      conFicha: Number(row?.con_ficha ?? 0),
      conCuenta: Number(row?.con_cuenta ?? 0),
      provisionales: Number(row?.provisionales ?? 0),
    };
  }
}
