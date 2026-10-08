import { Inject, Injectable } from "@nestjs/common";
import { and, eq, ilike, type SQL } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { menus, modulos, rolMenus } from "../../../core/database/schema";
import {
  MenuItemResponseDto,
  MenuOptionResponseDto,
  MenuContainerResponseDto,
  ModuleMenuTreeResponseDto,
  ModuleResponseDto,
} from "../dto/menu-response.dto";
import {
  CreateMenuData,
  CreateModuleData,
  IMenusRepository,
  UpdateMenuData,
  UpdateModuleData,
} from "../interfaces/menus.repository.interface";

@Injectable()
export class MenusRepository implements IMenusRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAllModules(soloVigentes?: boolean): Promise<ModuleResponseDto[]> {
    const conditions: SQL[] = [];
    if (soloVigentes) {
      conditions.push(eq(modulos.vigente, true));
    }

    const rows = await this.db
      .select({
        id: modulos.id,
        codigo: modulos.codigo,
        nombre: modulos.nombre,
        icono: modulos.icono,
        orden: modulos.orden,
        vigente: modulos.vigente,
        creadoEn: modulos.creadoEn,
      })
      .from(modulos)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(modulos.orden);

    return rows;
  }

  async findModuleById(id: string): Promise<ModuleResponseDto | null> {
    const [row] = await this.db
      .select({
        id: modulos.id,
        codigo: modulos.codigo,
        nombre: modulos.nombre,
        icono: modulos.icono,
        orden: modulos.orden,
        vigente: modulos.vigente,
        creadoEn: modulos.creadoEn,
      })
      .from(modulos)
      .where(eq(modulos.id, id))
      .limit(1);

    return row ?? null;
  }

  async findModuleByCode(code: string): Promise<ModuleResponseDto | null> {
    const [row] = await this.db
      .select({
        id: modulos.id,
        codigo: modulos.codigo,
        nombre: modulos.nombre,
        icono: modulos.icono,
        orden: modulos.orden,
        vigente: modulos.vigente,
        creadoEn: modulos.creadoEn,
      })
      .from(modulos)
      .where(ilike(modulos.codigo, code.trim()))
      .limit(1);

    return row ?? null;
  }

  async createModule(data: CreateModuleData): Promise<ModuleResponseDto> {
    const [created] = await this.db
      .insert(modulos)
      .values({
        codigo: data.codigo.trim().toLowerCase(),
        nombre: data.nombre.trim(),
        icono: data.icono?.trim() ?? null,
        orden: data.orden,
        vigente: data.vigente ?? true,
      })
      .returning();

    return created;
  }

  async updateModule(id: string, data: UpdateModuleData): Promise<ModuleResponseDto> {
    const updateValues: Partial<typeof modulos.$inferInsert> = {};

    if (data.codigo !== undefined) {
      updateValues.codigo = data.codigo.trim().toLowerCase();
    }
    if (data.nombre !== undefined) {
      updateValues.nombre = data.nombre.trim();
    }
    if (data.icono !== undefined) {
      updateValues.icono = data.icono?.trim() ?? null;
    }
    if (data.orden !== undefined) {
      updateValues.orden = data.orden;
    }
    if (data.vigente !== undefined) {
      updateValues.vigente = data.vigente;
    }

    const [updated] = await this.db
      .update(modulos)
      .set(updateValues)
      .where(eq(modulos.id, id))
      .returning();

    return updated;
  }

  async findAllMenuItems(moduloId?: string): Promise<MenuItemResponseDto[]> {
    const conditions: SQL[] = [];
    if (moduloId) {
      conditions.push(eq(menus.moduloId, moduloId));
    }

    const rows = await this.db
      .select({
        id: menus.id,
        menuPadreId: menus.menuPadreId,
        moduloId: menus.moduloId,
        nombre: menus.nombre,
        ruta: menus.ruta,
        icono: menus.icono,
        orden: menus.orden,
        esContenedor: menus.esContenedor,
        vigente: menus.vigente,
        creadoEn: menus.creadoEn,
      })
      .from(menus)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(menus.orden);

    return rows;
  }

  async findMenuItemById(id: string): Promise<MenuItemResponseDto | null> {
    const [row] = await this.db
      .select({
        id: menus.id,
        menuPadreId: menus.menuPadreId,
        moduloId: menus.moduloId,
        nombre: menus.nombre,
        ruta: menus.ruta,
        icono: menus.icono,
        orden: menus.orden,
        esContenedor: menus.esContenedor,
        vigente: menus.vigente,
        creadoEn: menus.creadoEn,
      })
      .from(menus)
      .where(eq(menus.id, id))
      .limit(1);

    return row ?? null;
  }

  async createMenuItem(data: CreateMenuData): Promise<MenuItemResponseDto> {
    const [created] = await this.db
      .insert(menus)
      .values({
        moduloId: data.moduloId,
        menuPadreId: data.menuPadreId ?? null,
        nombre: data.nombre.trim(),
        ruta: data.ruta?.trim() ?? null,
        icono: data.icono?.trim() ?? null,
        orden: data.orden,
        esContenedor: data.esContenedor,
        vigente: data.vigente ?? true,
      })
      .returning();

    return created;
  }

  async updateMenuItem(id: string, data: UpdateMenuData): Promise<MenuItemResponseDto> {
    const updateValues: Partial<typeof menus.$inferInsert> = {};

    if (data.menuPadreId !== undefined) {
      updateValues.menuPadreId = data.menuPadreId;
    }
    if (data.nombre !== undefined) {
      updateValues.nombre = data.nombre.trim();
    }
    if (data.ruta !== undefined) {
      updateValues.ruta = data.ruta?.trim() ?? null;
    }
    if (data.icono !== undefined) {
      updateValues.icono = data.icono?.trim() ?? null;
    }
    if (data.orden !== undefined) {
      updateValues.orden = data.orden;
    }
    if (data.vigente !== undefined) {
      updateValues.vigente = data.vigente;
    }

    const [updated] = await this.db
      .update(menus)
      .set(updateValues)
      .where(eq(menus.id, id))
      .returning();

    return updated;
  }

  async deleteMenuItem(id: string): Promise<void> {
    // Si tiene hijos (opciones dentro del contenedor), desactiva también los hijos
    await this.db.update(menus).set({ vigente: false }).where(eq(menus.menuPadreId, id));
    await this.db.update(menus).set({ vigente: false }).where(eq(menus.id, id));
  }

  async getMenuTreeForRole(rolId: string, esAdmin: boolean): Promise<ModuleMenuTreeResponseDto[]> {
    // 1. Obtener módulos vigentes
    const activeModules = await this.db
      .select({
        id: modulos.id,
        codigo: modulos.codigo,
        nombre: modulos.nombre,
        icono: modulos.icono,
        orden: modulos.orden,
      })
      .from(modulos)
      .where(eq(modulos.vigente, true))
      .orderBy(modulos.orden);

    // 2. Obtener contenedores vigentes
    const activeContainers = await this.db
      .select({
        id: menus.id,
        moduloId: menus.moduloId,
        nombre: menus.nombre,
        icono: menus.icono,
        orden: menus.orden,
        vigente: menus.vigente,
      })
      .from(menus)
      .where(and(eq(menus.esContenedor, true), eq(menus.vigente, true)))
      .orderBy(menus.orden);

    // 3. Obtener opciones vigentes
    const activeOptions = await this.db
      .select({
        id: menus.id,
        moduloId: menus.moduloId,
        menuPadreId: menus.menuPadreId,
        nombre: menus.nombre,
        ruta: menus.ruta,
        icono: menus.icono,
        orden: menus.orden,
        vigente: menus.vigente,
      })
      .from(menus)
      .where(and(eq(menus.esContenedor, false), eq(menus.vigente, true)))
      .orderBy(menus.orden);

    // 4. RF-002 V2 (Roles-Menú): el rol ve solo las opciones que tiene asignadas;
    // el Administrador ve todas
    let asignados = new Set<string>();
    if (!esAdmin) {
      const rows = await this.db
        .select({ menuId: rolMenus.menuId })
        .from(rolMenus)
        .where(eq(rolMenus.rolId, rolId));

      asignados = new Set(rows.map((r) => r.menuId));
    }

    // 5. Filtrar opciones visibles
    const visibleOptions = activeOptions.filter((opt) => esAdmin || asignados.has(opt.id));

    // Agrupar opciones por contenedor (menuPadreId)
    const optionsByContainer = new Map<string, MenuOptionResponseDto[]>();
    for (const opt of visibleOptions) {
      if (!opt.menuPadreId || !opt.ruta) continue;
      const list = optionsByContainer.get(opt.menuPadreId) ?? [];
      list.push({
        id: opt.id,
        nombre: opt.nombre,
        ruta: opt.ruta,
        icono: opt.icono,
        orden: opt.orden,
        vigente: opt.vigente,
      });
      optionsByContainer.set(opt.menuPadreId, list);
    }

    // 6. Construir árbol: un contenedor solo se muestra si tiene al menos una opción visible
    // "Un contenedor se muestra si tiene al menos una opción visible."
    const tree: ModuleMenuTreeResponseDto[] = [];

    for (const mod of activeModules) {
      const moduleContainers = activeContainers.filter((c) => c.moduloId === mod.id);
      const visibleContainers: MenuContainerResponseDto[] = [];

      for (const cont of moduleContainers) {
        const options = optionsByContainer.get(cont.id);
        if (options && options.length > 0) {
          visibleContainers.push({
            id: cont.id,
            nombre: cont.nombre,
            icono: cont.icono,
            orden: cont.orden,
            vigente: cont.vigente,
            opciones: options,
          });
        }
      }

      // Un módulo se muestra si tiene al menos un contenedor visible
      if (visibleContainers.length > 0) {
        tree.push({
          id: mod.id,
          codigo: mod.codigo,
          nombre: mod.nombre,
          icono: mod.icono,
          orden: mod.orden,
          contenedores: visibleContainers,
        });
      }
    }

    return tree;
  }
}
