import { Inject, Injectable } from "@nestjs/common";
import { and, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { personas, roles, sesiones, usuarioRoles, usuarios } from "../../../core/database/schema";
import {
  PaginatedUsersResponseDto,
  UserPersonaDto,
  UserResponseDto,
} from "../dto/user-response.dto";
import { UserQueryDto } from "../dto/user-query.dto";
import { decodeCursor, encodeCursor } from "../../../common/utils";
import {
  CreateUserData,
  DbUserProcedureExecutionResult,
  IUsersRepository,
  UpdateUserData,
  UserCursorPayload,
} from "../interfaces/users.repository.interface";

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private mapUserResult(row: {
    usuario: typeof usuarios.$inferSelect;
    persona: typeof personas.$inferSelect;
    rol: typeof roles.$inferSelect;
  }): UserResponseDto {
    return {
      id: row.usuario.id,
      nombreUsuario: row.usuario.nombreUsuario,
      estado: row.usuario.estado as "activo" | "bloqueado" | "inactivo",
      debeCambiarContrasena: row.usuario.debeCambiarContrasena,
      intentosFallidos: row.usuario.intentosFallidos,
      ultimoAcceso: row.usuario.ultimoAcceso,
      creadoEn: row.usuario.creadoEn,
      actualizadoEn: row.usuario.actualizadoEn,
      persona: {
        id: row.persona.id,
        tipoDocumento: row.persona.tipoDocumento,
        numeroDocumento: row.persona.numeroDocumento,
        nombres: row.persona.nombres,
        apellidoPaterno: row.persona.apellidoPaterno,
        apellidoMaterno: row.persona.apellidoMaterno,
        correo: row.persona.correo,
        fotoUrl: row.persona.fotoUrl,
      },
      rol: {
        id: row.rol.id,
        nombre: row.rol.nombre,
        esSistema: row.rol.esSistema,
      },
    };
  }

  async findUserById(id: string): Promise<UserResponseDto | null> {
    const [result] = await this.db
      .select({
        usuario: usuarios,
        persona: personas,
        rol: roles,
      })
      .from(usuarios)
      .innerJoin(personas, eq(usuarios.personaId, personas.id))
      .innerJoin(roles, eq(usuarios.rolId, roles.id))
      .where(and(eq(usuarios.id, id), isNull(usuarios.eliminadoEn)))
      .limit(1);

    return result ? this.mapUserResult(result) : null;
  }

  async findUserByPersonaId(personaId: string): Promise<UserResponseDto | null> {
    const [result] = await this.db
      .select({
        usuario: usuarios,
        persona: personas,
        rol: roles,
      })
      .from(usuarios)
      .innerJoin(personas, eq(usuarios.personaId, personas.id))
      .innerJoin(roles, eq(usuarios.rolId, roles.id))
      .where(and(eq(usuarios.personaId, personaId), isNull(usuarios.eliminadoEn)))
      .limit(1);

    return result ? this.mapUserResult(result) : null;
  }

  async findUserByUsername(username: string): Promise<UserResponseDto | null> {
    const [result] = await this.db
      .select({
        usuario: usuarios,
        persona: personas,
        rol: roles,
      })
      .from(usuarios)
      .innerJoin(personas, eq(usuarios.personaId, personas.id))
      .innerJoin(roles, eq(usuarios.rolId, roles.id))
      .where(and(ilike(usuarios.nombreUsuario, username.trim()), isNull(usuarios.eliminadoEn)))
      .limit(1);

    return result ? this.mapUserResult(result) : null;
  }

  async create(data: CreateUserData): Promise<UserResponseDto> {
    const [created] = await this.db
      .insert(usuarios)
      .values({
        personaId: data.personaId,
        rolId: data.rolId,
        nombreUsuario: data.nombreUsuario.trim(),
        contrasenaHash: data.contrasenaHash,
        debeCambiarContrasena: true,
        estado: "activo",
        intentosFallidos: 0,
      })
      .returning();

    return (await this.findUserById(created.id))!;
  }

  async syncPrincipalProfile(userId: string, rolId: string, actorId: string | null): Promise<void> {
    await this.db.transaction(async (tx) => {
      // 1. Retirar el perfil principal anterior si es otro (historial: vigente false)
      await tx
        .update(usuarioRoles)
        .set({
          esPrincipal: false,
          vigente: false,
          retiradoPorId: actorId ?? userId,
          retiradoEn: sql`CURRENT_TIMESTAMP`,
        })
        .where(
          and(
            eq(usuarioRoles.usuarioId, userId),
            eq(usuarioRoles.vigente, true),
            eq(usuarioRoles.esPrincipal, true),
            sql`${usuarioRoles.rolId} <> ${rolId}`,
          ),
        );

      // 2. Marcar como principal el perfil si ya estaba asignado, o asignarlo
      const [vigente] = await tx
        .select({ id: usuarioRoles.id })
        .from(usuarioRoles)
        .where(
          and(
            eq(usuarioRoles.usuarioId, userId),
            eq(usuarioRoles.rolId, rolId),
            eq(usuarioRoles.vigente, true),
          ),
        )
        .limit(1);

      if (vigente) {
        await tx
          .update(usuarioRoles)
          .set({ esPrincipal: true })
          .where(eq(usuarioRoles.id, vigente.id));
      } else {
        await tx.insert(usuarioRoles).values({
          usuarioId: userId,
          rolId,
          esPrincipal: true,
          asignadoPorId: actorId,
        });
      }
    });
  }

  async update(id: string, data: UpdateUserData): Promise<UserResponseDto> {
    const updateValues: Record<string, unknown> = {
      actualizadoEn: sql`CURRENT_TIMESTAMP`,
    };

    if (data.rolId !== undefined) {
      updateValues.rolId = data.rolId;
    }
    if (data.nombreUsuario !== undefined) {
      updateValues.nombreUsuario = data.nombreUsuario.trim();
    }
    if (data.contrasenaHash !== undefined) {
      updateValues.contrasenaHash = data.contrasenaHash;
    }
    if (data.estado !== undefined) {
      updateValues.estado = data.estado;
    }
    if (data.intentosFallidos !== undefined) {
      updateValues.intentosFallidos = data.intentosFallidos;
    }
    if (data.debeCambiarContrasena !== undefined) {
      updateValues.debeCambiarContrasena = data.debeCambiarContrasena;
    }

    await this.db.update(usuarios).set(updateValues).where(eq(usuarios.id, id));

    return (await this.findUserById(id))!;
  }

  async findUsers(query: UserQueryDto): Promise<PaginatedUsersResponseDto> {
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const decodedCursor = decodeCursor<UserCursorPayload>(query.cursor);

    const payload = {
      rolId: query.rolId ?? null,
      estado: query.estado ?? null,
      search: query.search?.trim() || null,
      cursorPaterno: decodedCursor?.apellidoPaterno ?? null,
      cursorMaterno: decodedCursor?.apellidoMaterno ?? null,
      cursorNombres: decodedCursor?.nombres ?? null,
      cursorId: decodedCursor?.id ?? null,
      limit,
    };

    const result = (await this.db.execute(sql`
      SELECT fn_consultar_usuarios(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbUserProcedureExecutionResult;

    const jsonResult = result.rows?.[0]?.resultado ?? {};
    const data = jsonResult.data ?? [];
    const hasMore = Boolean(jsonResult.hasMore);

    const nextCursor =
      hasMore && jsonResult.nextCursorId && jsonResult.nextCursorPaterno != null
        ? encodeCursor<UserCursorPayload>({
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
      mensaje:
        data.length === 0
          ? "No se encontraron usuarios para los filtros seleccionados."
          : undefined,
    };
  }

  async findEligiblePersonas(search?: string): Promise<UserPersonaDto[]> {
    const conditions = [isNull(personas.eliminadoEn), isNull(usuarios.id)];

    if (search && search.trim() !== "") {
      const pattern = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(personas.numeroDocumento, pattern),
          ilike(personas.nombres, pattern),
          ilike(personas.apellidoPaterno, pattern),
          ilike(personas.apellidoMaterno, pattern),
        )!,
      );
    }

    const rows = await this.db
      .select({
        id: personas.id,
        tipoDocumento: personas.tipoDocumento,
        numeroDocumento: personas.numeroDocumento,
        nombres: personas.nombres,
        apellidoPaterno: personas.apellidoPaterno,
        apellidoMaterno: personas.apellidoMaterno,
        correo: personas.correo,
        fotoUrl: personas.fotoUrl,
      })
      .from(personas)
      .leftJoin(usuarios, and(eq(personas.id, usuarios.personaId), isNull(usuarios.eliminadoEn)))
      .where(and(...conditions))
      .orderBy(personas.apellidoPaterno, personas.apellidoMaterno, personas.nombres)
      .limit(30);

    return rows;
  }

  async closeAllUserSessions(userId: string): Promise<void> {
    await this.db
      .update(sesiones)
      .set({
        cerradaEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(sesiones.usuarioId, userId), isNull(sesiones.cerradaEn)));
  }
}
