import { Inject, Injectable } from "@nestjs/common";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { cargoRolesSugeridos, cargos, personaCargos, roles } from "../../../core/database/schema";
import { CargoResponseDto } from "../dto";
import type { CargoData, ICargosRepository } from "../interfaces";

@Injectable()
export class CargosRepository implements ICargosRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAll(soloVigentes: boolean): Promise<CargoResponseDto[]> {
    const rows = await this.db
      .select()
      .from(cargos)
      .where(soloVigentes ? eq(cargos.vigente, true) : undefined)
      .orderBy(cargos.nombre);

    return this.enriquecer(rows);
  }

  async findById(id: string): Promise<CargoResponseDto | null> {
    const [row] = await this.db.select().from(cargos).where(eq(cargos.id, id)).limit(1);
    if (!row) return null;
    const [cargo] = await this.enriquecer([row]);
    return cargo;
  }

  async findByName(nombre: string): Promise<{ id: string } | null> {
    const [row] = await this.db
      .select({ id: cargos.id })
      .from(cargos)
      .where(sql`lower(${cargos.nombre}) = lower(${nombre})`)
      .limit(1);
    return row ?? null;
  }

  async create(data: CargoData, rolesSugeridosIds: string[]): Promise<string> {
    return this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(cargos)
        .values({ nombre: data.nombre, descripcion: data.descripcion ?? null })
        .returning({ id: cargos.id });

      if (rolesSugeridosIds.length > 0) {
        await tx
          .insert(cargoRolesSugeridos)
          .values(rolesSugeridosIds.map((rolId) => ({ cargoId: created.id, rolId })));
      }
      return created.id;
    });
  }

  async update(id: string, data: Partial<CargoData>, rolesSugeridosIds?: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(cargos)
        .set({ ...data, actualizadoEn: sql`CURRENT_TIMESTAMP` })
        .where(eq(cargos.id, id));

      if (rolesSugeridosIds !== undefined) {
        await tx.delete(cargoRolesSugeridos).where(eq(cargoRolesSugeridos.cargoId, id));
        if (rolesSugeridosIds.length > 0) {
          await tx
            .insert(cargoRolesSugeridos)
            .values(rolesSugeridosIds.map((rolId) => ({ cargoId: id, rolId })));
        }
      }
    });
  }

  async setVigente(id: string, vigente: boolean): Promise<void> {
    await this.db
      .update(cargos)
      .set({ vigente, actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(cargos.id, id));
  }

  async countPersonasVigentes(id: string): Promise<number> {
    const [result] = await this.db
      .select({ total: count(personaCargos.id) })
      .from(personaCargos)
      .where(and(eq(personaCargos.cargoId, id), eq(personaCargos.vigente, true)));
    return Number(result?.total ?? 0);
  }

  async countRolesActivos(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const [result] = await this.db
      .select({ total: count(roles.id) })
      .from(roles)
      .where(and(inArray(roles.id, ids), eq(roles.activo, true)));
    return Number(result?.total ?? 0);
  }

  /** Agrega roles sugeridos y cantidad de personas vigentes a cada cargo. */
  private async enriquecer(rows: (typeof cargos.$inferSelect)[]): Promise<CargoResponseDto[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);

    const sugeridos = await this.db
      .select({ cargoId: cargoRolesSugeridos.cargoId, id: roles.id, nombre: roles.nombre })
      .from(cargoRolesSugeridos)
      .innerJoin(roles, eq(cargoRolesSugeridos.rolId, roles.id))
      .where(inArray(cargoRolesSugeridos.cargoId, ids))
      .orderBy(roles.nombre);

    const personas = await this.db
      .select({ cargoId: personaCargos.cargoId, total: count(personaCargos.id) })
      .from(personaCargos)
      .where(and(inArray(personaCargos.cargoId, ids), eq(personaCargos.vigente, true)))
      .groupBy(personaCargos.cargoId);
    const personasMap = new Map(personas.map((p) => [p.cargoId, Number(p.total)]));

    return rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion,
      vigente: r.vigente,
      rolesSugeridos: sugeridos
        .filter((s) => s.cargoId === r.id)
        .map((s) => ({ id: s.id, nombre: s.nombre })),
      personasCount: personasMap.get(r.id) ?? 0,
    }));
  }
}
