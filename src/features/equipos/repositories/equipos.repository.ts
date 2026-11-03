import { Inject, Injectable } from "@nestjs/common";
import { and, eq, ilike, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { equiposAutorizados } from "../../../core/database/schema";
import { EquipoProposito, EquipoTipo } from "../constants";
import { CreateEquipoDto, EquipoResponseDto, UpdateEquipoDto } from "../dto";
import { IEquiposRepository } from "../interfaces";

@Injectable()
export class EquiposRepository implements IEquiposRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private mapToDto(row: typeof equiposAutorizados.$inferSelect): EquipoResponseDto {
    return {
      id: row.id,
      nombre: row.nombre,
      ubicacion: row.ubicacion,
      tipo: row.tipo as EquipoTipo,
      proposito: row.proposito as EquipoProposito,
      usuariosPermitidos: row.usuariosPermitidos,
      numeroSerie: row.numeroSerie,
      autorizado: row.autorizado,
      autorizadoEn: row.autorizadoEn,
      autorizadoPorId: row.autorizadoPorId,
      activo: row.activo,
      ultimoAcceso: row.ultimoAcceso,
      ipRegistro: row.ipRegistro,
      ultimoLatidoEn: row.ultimoLatidoEn,
      relojRespondioEn: row.relojRespondioEn,
      ultimoDesfaseMin: row.ultimoDesfaseMin,
      creadoEn: row.creadoEn,
      actualizadoEn: row.actualizadoEn,
    };
  }

  async findAll(): Promise<EquipoResponseDto[]> {
    const rows = await this.db
      .select()
      .from(equiposAutorizados)
      .where(isNull(equiposAutorizados.eliminadoEn))
      .orderBy(equiposAutorizados.creadoEn);

    return rows.map((r) => this.mapToDto(r));
  }

  async findById(id: string): Promise<EquipoResponseDto | null> {
    const [row] = await this.db
      .select()
      .from(equiposAutorizados)
      .where(and(eq(equiposAutorizados.id, id), isNull(equiposAutorizados.eliminadoEn)))
      .limit(1);

    if (!row) return null;
    return this.mapToDto(row);
  }

  async findByName(nombre: string): Promise<EquipoResponseDto | null> {
    const [row] = await this.db
      .select()
      .from(equiposAutorizados)
      .where(
        and(
          ilike(equiposAutorizados.nombre, nombre.trim()),
          isNull(equiposAutorizados.eliminadoEn),
        ),
      )
      .limit(1);

    if (!row) return null;
    return this.mapToDto(row);
  }

  async findByTokenHash(tokenHash: string): Promise<EquipoResponseDto | null> {
    const [row] = await this.db
      .select()
      .from(equiposAutorizados)
      .where(
        and(
          eq(equiposAutorizados.tokenAutorizacion, tokenHash),
          isNull(equiposAutorizados.eliminadoEn),
        ),
      )
      .limit(1);

    if (!row) return null;
    return this.mapToDto(row);
  }

  async create(dto: CreateEquipoDto): Promise<EquipoResponseDto> {
    const [row] = await this.db
      .insert(equiposAutorizados)
      .values({
        nombre: dto.nombre.trim(),
        ubicacion: dto.ubicacion.trim(),
        tipo: dto.tipo,
        proposito: dto.proposito,
        usuariosPermitidos: dto.usuariosPermitidos.trim(),
        numeroSerie: dto.numeroSerie?.trim() ?? null,
        activo: true,
        autorizado: false,
      })
      .returning();

    return this.mapToDto(row);
  }

  async update(id: string, dto: UpdateEquipoDto): Promise<EquipoResponseDto> {
    const [row] = await this.db
      .update(equiposAutorizados)
      .set({
        nombre: dto.nombre.trim(),
        ubicacion: dto.ubicacion.trim(),
        usuariosPermitidos: dto.usuariosPermitidos.trim(),
        numeroSerie: dto.numeroSerie?.trim() ?? null,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(equiposAutorizados.id, id))
      .returning();

    return this.mapToDto(row);
  }

  async toggleActivo(id: string, activo: boolean): Promise<EquipoResponseDto> {
    const [row] = await this.db
      .update(equiposAutorizados)
      .set({
        activo,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(equiposAutorizados.id, id))
      .returning();

    return this.mapToDto(row);
  }

  async authorize(
    id: string,
    tokenHash: string,
    usuarioId: string,
    ip?: string,
  ): Promise<EquipoResponseDto> {
    const [row] = await this.db
      .update(equiposAutorizados)
      .set({
        autorizado: true,
        tokenAutorizacion: tokenHash,
        autorizadoPorId: usuarioId,
        autorizadoEn: sql`CURRENT_TIMESTAMP`,
        ipRegistro: ip ?? null,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(equiposAutorizados.id, id))
      .returning();

    return this.mapToDto(row);
  }

  async updateLastAccess(id: string, ip?: string): Promise<void> {
    await this.db
      .update(equiposAutorizados)
      .set({
        ultimoAcceso: sql`CURRENT_TIMESTAMP`,
        ipRegistro: ip ?? null,
      })
      .where(eq(equiposAutorizados.id, id));
  }
}
