import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Database, DRIZZLE } from "../../../core/database";
import {
  apoderados,
  cargoRolesSugeridos,
  cargos,
  docentes,
  estudiantes,
  personaCargos,
  personas,
  roles,
  sesiones,
  usuarioRoles,
  usuarios,
} from "../../../core/database/schema";
import {
  PaginatedUsersResponseDto,
  UserPersonaDto,
  UserResponseDto,
} from "../dto/user-response.dto";
import { UserQueryDto } from "../dto/user-query.dto";
import { UserRoleAssignmentDto } from "../dto/user-role.dto";
import { TipoFichaDeRol } from "../constants";
import { ESTADOS_FICHA_VIGENTE } from "../../personas/utils/ficha-academica.util";
import { decodeCursor, encodeCursor } from "../../../common/utils";
import {
  DbUserProcedureExecutionResult,
  IUsersRepository,
  PersonaBasica,
  RegistrarCuentaData,
  UpdateUserData,
  UserCursorPayload,
} from "../interfaces/users.repository.interface";

/** RF-002 V3: cargos que no son de personal; ceden ante un cargo de personal. */
const CARGOS_NO_PERSONAL = ["Estudiante", "Apoderado(a)"];

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

  async findPersonaById(id: string): Promise<PersonaBasica | null> {
    const [row] = await this.db
      .select({ id: personas.id, numeroDocumento: personas.numeroDocumento })
      .from(personas)
      .where(and(eq(personas.id, id), isNull(personas.eliminadoEn)))
      .limit(1);

    return row ?? null;
  }

  async findPersonaByDocumento(
    tipoDocumento: string,
    numeroDocumento: string,
  ): Promise<PersonaBasica | null> {
    const [row] = await this.db
      .select({ id: personas.id, numeroDocumento: personas.numeroDocumento })
      .from(personas)
      .where(
        and(
          eq(personas.tipoDocumento, tipoDocumento),
          eq(personas.numeroDocumento, numeroDocumento.trim()),
          isNull(personas.eliminadoEn),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  async existeCorreo(correo: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: personas.id })
      .from(personas)
      .where(and(ilike(personas.correo, correo.trim()), isNull(personas.eliminadoEn)))
      .limit(1);

    return Boolean(row);
  }

  async isCargoVigente(cargoId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: cargos.id })
      .from(cargos)
      .where(and(eq(cargos.id, cargoId), eq(cargos.vigente, true)))
      .limit(1);

    return Boolean(row);
  }

  async findRolesSugeridosActivos(cargoId: string): Promise<string[]> {
    const rows = await this.db
      .select({ rolId: cargoRolesSugeridos.rolId })
      .from(cargoRolesSugeridos)
      .innerJoin(roles, eq(cargoRolesSugeridos.rolId, roles.id))
      .where(and(eq(cargoRolesSugeridos.cargoId, cargoId), eq(roles.activo, true)))
      .orderBy(roles.nombre);

    return rows.map((r) => r.rolId);
  }

  async registrarCuenta(data: RegistrarCuentaData): Promise<string> {
    return this.db.transaction(async (tx) => {
      // 1. Persona: la del padrón o una nueva
      let personaId = data.personaId;
      if (!personaId) {
        const p = data.nuevaPersona!;
        const [creada] = await tx
          .insert(personas)
          .values({
            tipoDocumento: p.tipoDocumento,
            numeroDocumento: p.numeroDocumento.trim(),
            nombres: p.nombres.trim(),
            apellidoPaterno: p.apellidoPaterno.trim(),
            apellidoMaterno: p.apellidoMaterno?.trim() || null,
            sexo: p.sexo,
            correo: p.correo?.trim() || null,
            celular: p.celular?.trim() || null,
          })
          .returning({ id: personas.id });
        personaId = creada.id;
      }

      // 2. Cargo: uno solo vigente. Se conserva el que tenga, salvo que sea
      //    Estudiante o Apoderado(a) y el nuevo sea un cargo de personal.
      const [actual] = await tx
        .select({ id: personaCargos.id, cargoId: personaCargos.cargoId, nombre: cargos.nombre })
        .from(personaCargos)
        .innerJoin(cargos, eq(personaCargos.cargoId, cargos.id))
        .where(and(eq(personaCargos.personaId, personaId), eq(personaCargos.vigente, true)))
        .limit(1);

      const [nuevo] = await tx
        .select({ nombre: cargos.nombre })
        .from(cargos)
        .where(eq(cargos.id, data.cargoId))
        .limit(1);

      const reemplazar =
        actual &&
        actual.cargoId !== data.cargoId &&
        CARGOS_NO_PERSONAL.includes(actual.nombre) &&
        !CARGOS_NO_PERSONAL.includes(nuevo.nombre);

      if (reemplazar) {
        await tx
          .update(personaCargos)
          .set({
            vigente: false,
            esPrincipal: false,
            fechaFin: sql`GREATEST(${personaCargos.fechaInicio}, CURRENT_DATE)`,
          })
          .where(eq(personaCargos.id, actual.id));
      }

      if (!actual || reemplazar) {
        await tx.insert(personaCargos).values({
          personaId,
          cargoId: data.cargoId,
          fechaInicio: sql`CURRENT_DATE`,
          esPrincipal: true,
          registradoPorId: data.actorId,
        });
      }

      // 3. Cuenta: se reutiliza la vigente o se crea con el primer rol como principal
      let usuarioId = data.usuarioExistenteId;
      if (!usuarioId) {
        const [creado] = await tx
          .insert(usuarios)
          .values({
            personaId,
            rolId: data.rolIds[0],
            nombreUsuario: data.nombreUsuario!.trim(),
            contrasenaHash: data.contrasenaHash!,
            debeCambiarContrasena: true,
            estado: "activo",
            intentosFallidos: 0,
          })
          .returning({ id: usuarios.id });
        usuarioId = creado.id;
      }

      // 4. Roles: solo se agregan los que la cuenta aún no tiene vigentes
      const rolesVigentes = await tx
        .select({ rolId: usuarioRoles.rolId })
        .from(usuarioRoles)
        .where(and(eq(usuarioRoles.usuarioId, usuarioId), eq(usuarioRoles.vigente, true)));
      const yaTiene = new Set(rolesVigentes.map((r) => r.rolId));

      const nuevos = data.rolIds.filter((rolId) => !yaTiene.has(rolId));
      if (nuevos.length > 0) {
        await tx.insert(usuarioRoles).values(
          nuevos.map((rolId) => ({
            usuarioId: usuarioId,
            rolId,
            esPrincipal: !data.usuarioExistenteId && rolId === data.rolIds[0],
            asignadoPorId: data.actorId,
          })),
        );
      }

      return usuarioId;
    });
  }

  async syncPrincipalRole(userId: string, rolId: string, actorId: string | null): Promise<void> {
    await this.db.transaction(async (tx) => {
      // 1. Retirar el rol principal anterior si es otro (historial: vigente false)
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

      // 2. Marcar como principal el rol si ya estaba asignado, o asignarlo
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

  async findTiposFichaVigente(personaId: string): Promise<TipoFichaDeRol[]> {
    const [docente, estudiante, apoderado] = await Promise.all([
      this.db
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
      this.db
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
      this.db
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

  async findRoles(userId: string, includeRetired: boolean): Promise<UserRoleAssignmentDto[]> {
    const asignador = alias(usuarios, "asignador");
    const retirador = alias(usuarios, "retirador");

    const conditions = [eq(usuarioRoles.usuarioId, userId)];
    if (!includeRetired) conditions.push(eq(usuarioRoles.vigente, true));

    const rows = await this.db
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

  async addRole(userId: string, rolId: string, actorId: string): Promise<void> {
    await this.db.insert(usuarioRoles).values({
      usuarioId: userId,
      rolId,
      esPrincipal: false,
      asignadoPorId: actorId,
    });
  }

  async setPrincipalRole(userId: string, rolId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
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

  async retireRole(userId: string, rolId: string, actorId: string): Promise<void> {
    await this.db
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
