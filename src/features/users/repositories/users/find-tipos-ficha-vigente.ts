import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  apoderados,
  docentes,
  estudiantes,
  personas,
  roles,
  sesiones,
  usuarioRoles,
  usuarios,
} from "../../../../core/database/schema";
import {
  PaginatedUsersResponseDto,
  UserPersonaDto,
  UserResponseDto,
} from "../../dto/user-response.dto";
import { UserQueryDto } from "../../dto/user-query.dto";
import { UserRoleAssignmentDto } from "../../dto/user-role.dto";
import { TipoFichaDeRol } from "../../constants";
import { ESTADOS_FICHA_VIGENTE } from "../../../personas/utils/ficha-academica.util";
import { decodeCursor, encodeCursor } from "../../../../common/utils";
import {
  DbUserProcedureExecutionResult,
  UpdateUserData,
  UserCursorPayload,
} from "../../interfaces/users.repository.interface";
import type { UsersRepositoryDeps, UsersRepositoryCalls } from "./deps";

export async function findTiposFichaVigente(
  deps: UsersRepositoryDeps,
  personaId: string,
): Promise<TipoFichaDeRol[]> {
  const [docente, estudiante, apoderado] = await Promise.all([
    deps.db
      .select({ id: docentes.id })
      .from(docentes)
      .where(
        and(
          eq(docentes.personaId, personaId),
          isNull(docentes.eliminadoEn),
          inArray(docentes.estado, [...ESTADOS_FICHA_VIGENTE.docente]),
        ),
      )
      .limit(1),
    deps.db
      .select({ id: estudiantes.id })
      .from(estudiantes)
      .where(
        and(
          eq(estudiantes.personaId, personaId),
          isNull(estudiantes.eliminadoEn),
          inArray(estudiantes.estado, [...ESTADOS_FICHA_VIGENTE.estudiante]),
        ),
      )
      .limit(1),
    deps.db
      .select({ id: apoderados.id })
      .from(apoderados)
      .where(and(eq(apoderados.personaId, personaId), isNull(apoderados.eliminadoEn)))
      .limit(1),
  ]);

  const tipos: TipoFichaDeRol[] = [];
  if (docente.length > 0) tipos.push("docente");
  if (estudiante.length > 0) tipos.push("estudiante");
  if (apoderado.length > 0) tipos.push("apoderado");
  return tipos;
}

export async function findRoles(
  deps: UsersRepositoryDeps,
  userId: string,
  includeRetired: boolean,
): Promise<UserRoleAssignmentDto[]> {
  const asignador = alias(usuarios, "asignador");
  const retirador = alias(usuarios, "retirador");

  const conditions = [eq(usuarioRoles.usuarioId, userId)];
  if (!includeRetired) conditions.push(eq(usuarioRoles.vigente, true));

  const rows = await deps.db
    .select({
      id: usuarioRoles.id,
      rolId: usuarioRoles.rolId,
      rolNombre: roles.nombre,
      esPrincipal: usuarioRoles.esPrincipal,
      vigente: usuarioRoles.vigente,
      asignadoEn: usuarioRoles.asignadoEn,
      asignadoPor: asignador.nombreUsuario,
      retiradoEn: usuarioRoles.retiradoEn,
      retiradoPor: retirador.nombreUsuario,
    })
    .from(usuarioRoles)
    .innerJoin(roles, eq(usuarioRoles.rolId, roles.id))
    .leftJoin(asignador, eq(usuarioRoles.asignadoPorId, asignador.id))
    .leftJoin(retirador, eq(usuarioRoles.retiradoPorId, retirador.id))
    .where(and(...conditions))
    .orderBy(
      desc(usuarioRoles.vigente),
      desc(usuarioRoles.esPrincipal),
      desc(usuarioRoles.asignadoEn),
    );

  return rows;
}

export async function addRole(
  deps: UsersRepositoryDeps,
  userId: string,
  rolId: string,
  actorId: string,
): Promise<void> {
  await deps.db.insert(usuarioRoles).values({
    usuarioId: userId,
    rolId,
    esPrincipal: false,
    asignadoPorId: actorId,
  });
}

export async function setPrincipalRole(
  deps: UsersRepositoryDeps,
  userId: string,
  rolId: string,
): Promise<void> {
  await deps.db.transaction(async (tx) => {
    await tx
      .update(usuarioRoles)
      .set({ esPrincipal: false })
      .where(
        and(
          eq(usuarioRoles.usuarioId, userId),
          eq(usuarioRoles.vigente, true),
          eq(usuarioRoles.esPrincipal, true),
        ),
      );
    await tx
      .update(usuarioRoles)
      .set({ esPrincipal: true })
      .where(
        and(
          eq(usuarioRoles.usuarioId, userId),
          eq(usuarioRoles.rolId, rolId),
          eq(usuarioRoles.vigente, true),
        ),
      );
    // usuarios.rol_id sigue al rol principal (compatibilidad con la V1)
    await tx
      .update(usuarios)
      .set({ rolId, actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(usuarios.id, userId));
  });
}

export async function retireRole(
  deps: UsersRepositoryDeps,
  userId: string,
  rolId: string,
  actorId: string,
): Promise<void> {
  await deps.db
    .update(usuarioRoles)
    .set({
      vigente: false,
      esPrincipal: false,
      retiradoPorId: actorId,
      retiradoEn: sql`CURRENT_TIMESTAMP`,
    })
    .where(
      and(
        eq(usuarioRoles.usuarioId, userId),
        eq(usuarioRoles.rolId, rolId),
        eq(usuarioRoles.vigente, true),
      ),
    );
}

export async function update(
  deps: UsersRepositoryDeps,
  calls: UsersRepositoryCalls,
  id: string,
  data: UpdateUserData,
): Promise<UserResponseDto> {
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

  await deps.db.update(usuarios).set(updateValues).where(eq(usuarios.id, id));

  return (await calls.findUserById(id))!;
}

export async function findUsers(
  deps: UsersRepositoryDeps,
  query: UserQueryDto,
): Promise<PaginatedUsersResponseDto> {
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

  const result = (await deps.db.execute(sql`
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
      data.length === 0 ? "No se encontraron usuarios para los filtros seleccionados." : undefined,
  };
}

export async function findEligiblePersonas(
  deps: UsersRepositoryDeps,
  search?: string,
): Promise<UserPersonaDto[]> {
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

  const rows = await deps.db
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

export async function closeAllUserSessions(
  deps: UsersRepositoryDeps,
  userId: string,
): Promise<void> {
  await deps.db
    .update(sesiones)
    .set({
      cerradaEn: sql`CURRENT_TIMESTAMP`,
    })
    .where(and(eq(sesiones.usuarioId, userId), isNull(sesiones.cerradaEn)));
}
