import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { Database, DRIZZLE } from "../../core/database";
import { menus, rolMenus } from "../../core/database/schema";

@Injectable()
export class RolMenusService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** ¿El rol tiene asignado el menú vigente con esa ruta? */
  async tieneMenu(rolId: string, ruta: string): Promise<boolean> {
    const [row] = await this.db
      .select({ menuId: rolMenus.menuId })
      .from(rolMenus)
      .innerJoin(menus, eq(rolMenus.menuId, menus.id))
      .where(and(eq(rolMenus.rolId, rolId), eq(menus.ruta, ruta), eq(menus.vigente, true)))
      .limit(1);

    return Boolean(row);
  }
}
