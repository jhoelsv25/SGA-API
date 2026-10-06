import { Inject, Injectable } from "@nestjs/common";
import { and, count, eq, ilike, isNull, sql, type SQL } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { modulos, permisos, roles, rolPermisos, usuarios } from "../../../core/database/schema";
import {
  PermissionCatalogItemDto,
  RoleDetailResponseDto,
  RoleResponseDto,
} from "../dto/role-response.dto";
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

    // Obtener conteo de usuarios por cada rol
    const counts = await this.db
      .select({
        rolId: usuarios.rolId,
        count: count(usuarios.id),
      })
      .from(usuarios)
      .where(isNull(usuarios.eliminadoEn))
      .groupBy(usuarios.rolId);

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

    // Obtener permisos asignados
    let assignedPermisos: string[] = [];

    if (role.nombre === "Administrador") {
      // El Administrador siempre tiene todos los permisos vigentes
      assignedPermisos = await this.getAllPermissionIds();
    } else {
      const assigned = await this.db
        .select({ permisoId: rolPermisos.permisoId })
        .from(rolPermisos)
        .where(eq(rolPermisos.rolId, id));

      assignedPermisos = assigned.map((p) => p.permisoId);
    }

    return {
      id: role.id,
      nombre: role.nombre,
      descripcion: role.descripcion,
      esSistema: role.esSistema,
      activo: role.activo,
      usuariosCount: userCountResult,
      creadoEn: role.creadoEn,
      actualizadoEn: role.actualizadoEn,
      permisos: assignedPermisos,
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
    const [result] = await this.db
      .select({ count: count(usuarios.id) })
      .from(usuarios)
      .where(and(eq(usuarios.rolId, rolId), isNull(usuarios.eliminadoEn)));

    return Number(result?.count ?? 0);
  }

  async getAllPermissions(): Promise<PermissionCatalogItemDto[]> {
    const perms = await this.db
      .select({
        id: permisos.id,
        codigo: permisos.codigo,
        nombre: permisos.nombre,
        descripcion: permisos.descripcion,
        moduloId: permisos.moduloId,
        moduloNombre: modulos.nombre,
        moduloCodigo: modulos.codigo,
      })
      .from(permisos)
      .innerJoin(modulos, eq(permisos.moduloId, modulos.id))
      .where(eq(modulos.vigente, true))
      .orderBy(modulos.orden, permisos.codigo);

    return perms;
  }

  async getAllPermissionIds(): Promise<string[]> {
    const perms = await this.db
      .select({ id: permisos.id })
      .from(permisos)
      .innerJoin(modulos, eq(permisos.moduloId, modulos.id))
      .where(eq(modulos.vigente, true));

    return perms.map((p) => p.id);
  }

  async assignPermissions(rolId: string, permissionIds: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Eliminar permisos actuales del rol
      await tx.delete(rolPermisos).where(eq(rolPermisos.rolId, rolId));

      // Insertar nuevos permisos
      if (permissionIds.length > 0) {
        await tx.insert(rolPermisos).values(
          permissionIds.map((pId) => ({
            rolId,
            permisoId: pId,
          })),
        );
      }
    });
  }
}
