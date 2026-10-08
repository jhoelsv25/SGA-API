import { Inject, Injectable } from "@nestjs/common";
import { and, count, eq, ilike, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { menus, roles, rolMenus, usuarioRoles, usuarios } from "../../../core/database/schema";
import { RoleDetailResponseDto, RoleResponseDto } from "../dto/role-response.dto";
import {
  CreateRoleData,
  IRolesRepository,
  UpdateRoleData,
} from "../interfaces/roles.repository.interface";

@Injectable()
export class RolesRepository implements IRolesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAll(soloActivos?: boolean): Promise<RoleResponseDto[]> {
    const conditions: SQL[] = [];
    if (soloActivos) {
      conditions.push(eq(roles.activo, true));
    }

    const rolesList = await this.db
      .select({
        id: roles.id,
        nombre: roles.nombre,
        descripcion: roles.descripcion,
        esSistema: roles.esSistema,
        activo: roles.activo,
        creadoEn: roles.creadoEn,
        actualizadoEn: roles.actualizadoEn,
      })
      .from(roles)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(roles.nombre);

    // Conteo de cuentas por rol: RF-002 V2, cuenta los roles vigentes
    // (principal o adicional) de usuario_roles
    const counts = await this.db
      .select({
        rolId: usuarioRoles.rolId,
        count: count(usuarioRoles.usuarioId),
      })
      .from(usuarioRoles)
      .innerJoin(usuarios, eq(usuarioRoles.usuarioId, usuarios.id))
      .where(and(eq(usuarioRoles.vigente, true), isNull(usuarios.eliminadoEn)))
      .groupBy(usuarioRoles.rolId);

    const countsMap = new Map<string, number>();
    for (const c of counts) {
      countsMap.set(c.rolId, Number(c.count));
    }

    return rolesList.map((r) => ({
      ...r,
      usuariosCount: countsMap.get(r.id) ?? 0,
    }));
  }

  async findById(id: string): Promise<RoleDetailResponseDto | null> {
    const [role] = await this.db.select().from(roles).where(eq(roles.id, id)).limit(1);

    if (!role) {
      return null;
    }

    const userCountResult = await this.countAssignedUsers(id);

    // RF-002 V2 (Roles-Menú): opciones de menú asignadas al rol
    const asignados = await this.db
      .select({ menuId: rolMenus.menuId })
      .from(rolMenus)
      .where(eq(rolMenus.rolId, id));

    return {
      id: role.id,
      nombre: role.nombre,
      descripcion: role.descripcion,
      esSistema: role.esSistema,
      activo: role.activo,
      usuariosCount: userCountResult,
      creadoEn: role.creadoEn,
      actualizadoEn: role.actualizadoEn,
      menus: asignados.map((m) => m.menuId),
    };
  }

  async findByName(name: string): Promise<RoleResponseDto | null> {
    const [role] = await this.db
      .select()
      .from(roles)
      .where(ilike(roles.nombre, name.trim()))
      .limit(1);

    if (!role) {
      return null;
    }

    return {
      id: role.id,
      nombre: role.nombre,
      descripcion: role.descripcion,
      esSistema: role.esSistema,
      activo: role.activo,
      creadoEn: role.creadoEn,
      actualizadoEn: role.actualizadoEn,
    };
  }

  async create(data: CreateRoleData): Promise<RoleResponseDto> {
    const [created] = await this.db
      .insert(roles)
      .values({
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() ?? null,
        esSistema: data.esSistema ?? false,
        activo: true,
      })
      .returning();

    return {
      id: created.id,
      nombre: created.nombre,
      descripcion: created.descripcion,
      esSistema: created.esSistema,
      activo: created.activo,
      usuariosCount: 0,
      creadoEn: created.creadoEn,
      actualizadoEn: created.actualizadoEn,
    };
  }

  async update(id: string, data: UpdateRoleData): Promise<RoleResponseDto> {
    const updateValues: Record<string, unknown> = {
      actualizadoEn: sql`CURRENT_TIMESTAMP`,
    };

    if (data.nombre !== undefined) {
      updateValues.nombre = data.nombre.trim();
    }
    if (data.descripcion !== undefined) {
      updateValues.descripcion = data.descripcion?.trim() ?? null;
    }
    if (data.activo !== undefined) {
      updateValues.activo = data.activo;
    }

    const [updated] = await this.db
      .update(roles)
      .set(updateValues)
      .where(eq(roles.id, id))
      .returning();

    const userCount = await this.countAssignedUsers(id);

    return {
      id: updated.id,
      nombre: updated.nombre,
      descripcion: updated.descripcion,
      esSistema: updated.esSistema,
      activo: updated.activo,
      usuariosCount: userCount,
      creadoEn: updated.creadoEn,
      actualizadoEn: updated.actualizadoEn,
    };
  }

  async countAssignedUsers(rolId: string): Promise<number> {
    // RF-002 V2: cuentas que tienen este rol vigente, sea principal o adicional
    const [result] = await this.db
      .select({ count: count(usuarioRoles.usuarioId) })
      .from(usuarioRoles)
      .innerJoin(usuarios, eq(usuarioRoles.usuarioId, usuarios.id))
      .where(
        and(
          eq(usuarioRoles.rolId, rolId),
          eq(usuarioRoles.vigente, true),
          isNull(usuarios.eliminadoEn),
        ),
      );

    return Number(result?.count ?? 0);
  }

  async countMenusVigentes(menuIds: string[]): Promise<number> {
    if (menuIds.length === 0) return 0;
    const [result] = await this.db
      .select({ total: count(menus.id) })
      .from(menus)
      .where(and(inArray(menus.id, menuIds), eq(menus.vigente, true)));

    return Number(result?.total ?? 0);
  }

  async assignMenus(rolId: string, menuIds: string[], actorId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(rolMenus).where(eq(rolMenus.rolId, rolId));

      if (menuIds.length > 0) {
        await tx
          .insert(rolMenus)
          .values(menuIds.map((menuId) => ({ rolId, menuId, asignadoPorId: actorId })));
      }
    });
  }
}
