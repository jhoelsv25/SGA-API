import { Inject, Injectable } from "@nestjs/common";
import { asc, eq, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { grados } from "../../../core/database/schema";
import { GradoResponseDto } from "../dto";

export interface IGradosRepository {
  findAll(): Promise<GradoResponseDto[]>;
  findById(id: string): Promise<GradoResponseDto | null>;
  findByNumero(numero: number): Promise<GradoResponseDto | null>;
  updateNombre(id: string, nombre: string): Promise<GradoResponseDto | null>;
}

@Injectable()
export class GradosRepository implements IGradosRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private mapToDto(row: typeof grados.$inferSelect): GradoResponseDto {
    return {
      id: row.id,
      numero: row.numero,
      nombre: row.nombre,
      creadoEn: row.creadoEn,
      actualizadoEn: row.actualizadoEn,
    };
  }

  async findAll(): Promise<GradoResponseDto[]> {
    const rows = await this.db.select().from(grados).orderBy(asc(grados.numero));
    return rows.map((r) => this.mapToDto(r));
  }

  async findById(id: string): Promise<GradoResponseDto | null> {
    const [row] = await this.db.select().from(grados).where(eq(grados.id, id)).limit(1);
    if (!row) return null;
    return this.mapToDto(row);
  }

  async findByNumero(numero: number): Promise<GradoResponseDto | null> {
    const [row] = await this.db.select().from(grados).where(eq(grados.numero, numero)).limit(1);
    if (!row) return null;
    return this.mapToDto(row);
  }

  async updateNombre(id: string, nombre: string): Promise<GradoResponseDto | null> {
    const [row] = await this.db
      .update(grados)
      .set({
        nombre,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(grados.id, id))
      .returning();
    if (!row) return null;
    return this.mapToDto(row);
  }
}
