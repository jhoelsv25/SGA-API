import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
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
  IAuthRepository,
  InstitutionSummary,
  UsuarioRolRecord,
  PersonaRecord,
  RolRecord,
  SessionData,
  UsuarioRecord,
  UserWithPersonaBirthdate,
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

  async getUserModules(rolId: string, esSistema: boolean): Promise<AuthModuleDto[]> {
    if (esSistema) {
      const allModules = await this.db
        .select({
          id: modulos.id,
          nombre: modulos.nombre,
          codigo: modulos.codigo,
          icono: modulos.icono,
        })
        .from(modulos)
        .where(eq(modulos.vigente, true))
        .orderBy(modulos.orden);

      const moduleList: AuthModuleDto[] = [];
      for (const mod of allModules) {
        const [firstMenu] = await this.db
          .select({ ruta: menus.ruta })
          .from(menus)
          .where(and(eq(menus.moduloId, mod.id), eq(menus.vigente, true)))
          .orderBy(menus.orden)
          .limit(1);

        moduleList.push({
          id: mod.id,
          name: mod.nombre,
          code: mod.codigo,
          icon: mod.icono ?? undefined,
          path: firstMenu?.ruta ?? `/${mod.codigo}`,
        });
      }
      return moduleList;
    }

    const permittedModules = await this.db
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
      .where(and(eq(rolMenus.rolId, rolId), eq(menus.vigente, true), eq(modulos.vigente, true)))
      .orderBy(modulos.orden);

    const result: AuthModuleDto[] = [];
    for (const mod of permittedModules) {
      const [firstMenu] = await this.db
        .select({ ruta: menus.ruta })
        .from(menus)
        .where(and(eq(menus.moduloId, mod.id), eq(menus.vigente, true)))
        .orderBy(menus.orden)
        .limit(1);

      result.push({
        id: mod.id,
        name: mod.nombre,
        code: mod.codigo,
        icon: mod.icono ?? undefined,
        path: firstMenu?.ruta ?? `/${mod.codigo}`,
      });
    }

    return result;
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
