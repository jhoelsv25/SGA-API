import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { Database, DRIZZLE } from "../../core/database";
import { permisos, rolPermisos } from "../../core/database/schema";

@Injectable()
export class RolePermissionsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async hasAll(rolId: string, codigos: string[]): Promise<boolean> {
    const requeridos = [...new Set(codigos)];
    if (requeridos.length === 0) return true;

    const rows = await this.db
      .select({ codigo: permisos.codigo })
      .from(rolPermisos)
      .innerJoin(permisos, eq(rolPermisos.permisoId, permisos.id))
      .where(and(eq(rolPermisos.rolId, rolId), inArray(permisos.codigo, requeridos)));

    const asignados = new Set(rows.map((row) => row.codigo));
    return requeridos.every((codigo) => asignados.has(codigo));
  }
}
