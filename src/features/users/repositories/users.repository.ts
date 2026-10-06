import { Inject, Injectable } from "@nestjs/common";
import { and, count, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { personas, roles, sesiones, usuarios } from "../../../core/database/schema";
import { PaginatedUsersResponseDto, UserResponseDto } from "../dto/user-response.dto";
import { UserQueryDto } from "../dto/user-query.dto";
import {
  CreateUserData,
  IUsersRepository,
  UpdateUserData,
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
    const conditions = [isNull(usuarios.eliminadoEn)];

    if (query.rolId) {
      conditions.push(eq(usuarios.rolId, query.rolId));
    }

    if (query.estado) {
      conditions.push(eq(usuarios.estado, query.estado));
    }

    if (query.search && query.search.trim() !== "") {
      const pattern = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(usuarios.nombreUsuario, pattern),
          ilike(personas.nombres, pattern),
          ilike(personas.apellidoPaterno, pattern),
          ilike(personas.apellidoMaterno, pattern),
        )!,
      );
    }

    const whereClause = and(...conditions);

    // Total count
    const [countResult] = await this.db
      .select({ count: count(usuarios.id) })
      .from(usuarios)
      .innerJoin(personas, eq(usuarios.personaId, personas.id))
      .where(whereClause);

    const total = Number(countResult?.count ?? 0);
    const limit = query.limit ?? 10;
    const page = query.page ?? 1;
    const offset = (page - 1) * limit;

    // Ordered by apellidos: apellidoPaterno, apellidoMaterno, nombres
    const rows = await this.db
      .select({
        usuario: usuarios,
        persona: personas,
        rol: roles,
      })
      .from(usuarios)
      .innerJoin(personas, eq(usuarios.personaId, personas.id))
      .innerJoin(roles, eq(usuarios.rolId, roles.id))
      .where(whereClause)
      .orderBy(personas.apellidoPaterno, personas.apellidoMaterno, personas.nombres)
      .limit(limit)
      .offset(offset);

    const data = rows.map((r) => this.mapUserResult(r));
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: totalPages === 0 ? 1 : totalPages,
    };
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
