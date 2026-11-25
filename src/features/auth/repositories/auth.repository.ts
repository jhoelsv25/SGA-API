import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  institucion,
  menus,
  modulos,
  personas,
  roles,
  rolMenus,
  sesiones,
  usuarioRoles,
  usuarios,
} from "../../../core/database/schema";
import { AuthModuleDto } from "../dto/auth-response.dto";
import type {
  ContextoSesionSqlResult,
  IAuthRepository,
  InstitutionSummary,
  UsuarioRolRecord,
  PersonaRecord,
  RolRecord,
  SessionData,
  UsuarioRecord,
  UserWithPersonaBirthdate,
  ValidacionJwtSqlResult,
} from "../interfaces";

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findUserByUsername(username: string): Promise<UsuarioRecord | null> {
    const [user] = await this.db
      .select()
      .from(usuarios)
      .where(and(eq(usuarios.nombreUsuario, username), isNull(usuarios.eliminadoEn)))
      .limit(1);

    return user ?? null;
  }

  async findUserById(id: string): Promise<UsuarioRecord | null> {
    const [user] = await this.db
      .select()
      .from(usuarios)
      .where(and(eq(usuarios.id, id), isNull(usuarios.eliminadoEn)))
      .limit(1);

    return user ?? null;
  }

  async findUserWithPersonaByUsername(username: string): Promise<UserWithPersonaBirthdate | null> {
    const [result] = await this.db
      .select({
        id: usuarios.id,
        nombreUsuario: usuarios.nombreUsuario,
        fechaNacimiento: personas.fechaNacimiento,
      })
      .from(usuarios)
      .innerJoin(personas, eq(usuarios.personaId, personas.id))
      .where(and(eq(usuarios.nombreUsuario, username), isNull(usuarios.eliminadoEn)))
      .limit(1);

    return result ?? null;
  }

  async findPersonaById(personaId: string): Promise<PersonaRecord | null> {
    const [persona] = await this.db
      .select()
      .from(personas)
      .where(eq(personas.id, personaId))
      .limit(1);

    return persona ?? null;
  }

  async findRoleById(rolId: string): Promise<RolRecord | null> {
    const [role] = await this.db.select().from(roles).where(eq(roles.id, rolId)).limit(1);

    return role ?? null;
  }

  /** Roles vigentes del usuario, el principal primero. */
  async findUserRoles(userId: string): Promise<UsuarioRolRecord[]> {
    return this.db
      .select({
        rolId: usuarioRoles.rolId,
        nombre: roles.nombre,
        esSistema: roles.esSistema,
        esPrincipal: usuarioRoles.esPrincipal,
      })
      .from(usuarioRoles)
      .innerJoin(roles, eq(usuarioRoles.rolId, roles.id))
      .where(and(eq(usuarioRoles.usuarioId, userId), eq(usuarioRoles.vigente, true)))
      .orderBy(desc(usuarioRoles.esPrincipal), roles.nombre);
  }

  async findInstitution(): Promise<InstitutionSummary | null> {
    const [inst] = await this.db
      .select({ id: institucion.id, nombre: institucion.nombre })
      .from(institucion)
      .limit(1);

    return inst ?? null;
  }

  async updateLoginAttempts(
    userId: string,
    attempts: number,
    blockAccount: boolean,
  ): Promise<void> {
    await this.db
      .update(usuarios)
      .set({
        intentosFallidos: attempts,
        ...(blockAccount ? { estado: "bloqueado" } : {}),
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(usuarios.id, userId));
  }

  async resetLoginAttempts(userId: string): Promise<void> {
    await this.db
      .update(usuarios)
      .set({
        intentosFallidos: 0,
        ultimoAcceso: sql`CURRENT_TIMESTAMP`,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(usuarios.id, userId));
  }

  async createSession(data: SessionData): Promise<void> {
    await this.db.insert(sesiones).values({
      usuarioId: data.usuarioId,
      tokenHash: data.tokenHash,
      direccionIp: data.direccionIp ?? null,
      navegador: data.navegador ?? null,
      expiraEn: data.expiraEn,
    });
  }

  async hasPreviousSessionFromIp(userId: string, ipAddress: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: sesiones.id })
      .from(sesiones)
      .where(and(eq(sesiones.usuarioId, userId), eq(sesiones.direccionIp, ipAddress)))
      .limit(1);

    return Boolean(row);
  }

  async closeSession(tokenHash: string): Promise<void> {
    await this.db
      .update(sesiones)
      .set({
        cerradaEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(sesiones.tokenHash, tokenHash));
  }

  async isSessionClosed(tokenHash: string): Promise<boolean> {
    const [row] = await this.db
      .select({ cerradaEn: sesiones.cerradaEn })
      .from(sesiones)
      .where(eq(sesiones.tokenHash, tokenHash))
      .limit(1);

    return Boolean(row?.cerradaEn);
  }

  async validarJwtUsuario(
    usuarioId: string,
    tokenHash: string | null,
  ): Promise<ValidacionJwtSqlResult> {
    const payload = { usuarioId, tokenHash };
    const result = (await this.db.execute(sql`
      SELECT fn_validar_jwt_usuario(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as { rows?: Array<{ resultado?: ValidacionJwtSqlResult }> };

    return (
      result.rows?.[0]?.resultado ?? {
        sesionCerrada: false,
        usuario: null,
        roles: [],
      }
    );
  }

  async obtenerContextoSesion(
    usuarioId: string,
    rolId?: string,
  ): Promise<ContextoSesionSqlResult | null> {
    const payload = { usuarioId, rolId: rolId ?? null };
    const result = (await this.db.execute(sql`
      SELECT fn_obtener_contexto_sesion(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as { rows?: Array<{ resultado?: ContextoSesionSqlResult | null }> };

    return result.rows?.[0]?.resultado ?? null;
  }

  private async obtenerPrimerasRutasWebPorModulo(
    moduloIds: string[],
  ): Promise<Map<string, string>> {
    const rutasPorModulo = new Map<string, string>();
    if (moduloIds.length === 0) return rutasPorModulo;

    const rows = await this.db
      .select({ moduloId: menus.moduloId, ruta: menus.ruta })
      .from(menus)
      .where(
        and(
          inArray(menus.moduloId, moduloIds),
          eq(menus.vigente, true),
          sql`'web' = ANY(${menus.aplicaciones})`,
        ),
      )
      .orderBy(asc(menus.orden));

    for (const row of rows) {
      if (row.ruta && !rutasPorModulo.has(row.moduloId)) {
        rutasPorModulo.set(row.moduloId, row.ruta);
      }
    }

    return rutasPorModulo;
  }

  async getUserModules(rolId: string, esSistema: boolean): Promise<AuthModuleDto[]> {
    const baseModules = esSistema
      ? await this.db
          .select({
            id: modulos.id,
            nombre: modulos.nombre,
            codigo: modulos.codigo,
            icono: modulos.icono,
          })
          .from(modulos)
          .where(eq(modulos.vigente, true))
          .orderBy(modulos.orden)
      : await this.db
          .selectDistinct({
            id: modulos.id,
            nombre: modulos.nombre,
            codigo: modulos.codigo,
            icono: modulos.icono,
            orden: modulos.orden,
          })
          .from(rolMenus)
          .innerJoin(menus, eq(rolMenus.menuId, menus.id))
          .innerJoin(modulos, eq(menus.moduloId, modulos.id))
          .where(
            and(
              eq(rolMenus.rolId, rolId),
              eq(menus.vigente, true),
              eq(modulos.vigente, true),
              sql`'web' = ANY(${menus.aplicaciones})`,
            ),
          )
          .orderBy(modulos.orden);

    const rutasPorModulo = await this.obtenerPrimerasRutasWebPorModulo(
      baseModules.map((mod) => mod.id),
    );

    return baseModules.map((mod) => ({
      id: mod.id,
      name: mod.nombre,
      code: mod.codigo,
      icon: mod.icono ?? undefined,
      path: rutasPorModulo.get(mod.id) ?? `/${mod.codigo}`,
    }));
  }

  async getMenuRoutes(rolId: string, _esSistema?: boolean): Promise<string[]> {
    const rows = await this.db
      .select({ ruta: menus.ruta })
      .from(rolMenus)
      .innerJoin(menus, eq(rolMenus.menuId, menus.id))
      .where(
        and(
          eq(rolMenus.rolId, rolId),
          eq(menus.vigente, true),
          sql`'web' = ANY(${menus.aplicaciones})`,
        ),
      );

    return rows.flatMap((row) => (row.ruta ? [row.ruta] : []));
  }

  async updatePassword(userId: string, newHash: string): Promise<void> {
    await this.db
      .update(usuarios)
      .set({
        contrasenaHash: newHash,
        debeCambiarContrasena: false,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(usuarios.id, userId));
  }

  async closeOtherSessions(userId: string, currentTokenHash: string): Promise<void> {
    await this.db
      .update(sesiones)
      .set({
        cerradaEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(sesiones.usuarioId, userId),
          ne(sesiones.tokenHash, currentTokenHash),
          isNull(sesiones.cerradaEn),
        ),
      );
  }
}
