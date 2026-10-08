import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { institucion } from "../../../core/database/schema";
import { GestionType } from "../constants";
import { InstitucionResponseDto, UpdateInstitucionDto } from "../dto";
import { IInstitucionRepository } from "../interfaces";

@Injectable()
export class InstitucionRepository implements IInstitucionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private mapToDto(row: typeof institucion.$inferSelect): InstitucionResponseDto {
    return {
      id: row.id,
      nombre: row.nombre,
      codigoModular: row.codigoModular,
      codigoLocal: row.codigoLocal,
      tipoGestion: row.tipoGestion as GestionType,
      ugel: row.ugel,
      dre: row.dre,
      ugelDre: row.ugel && row.dre ? `${row.ugel} / ${row.dre}` : row.ugel || row.dre || null,
      director: row.director,
      direccion: row.direccion,
      distrito: row.distrito,
      provincia: row.provincia,
      departamento: row.departamento,
      telefono: row.telefono,
      correo: row.correo,
      logoUrl: row.logoUrl,
      radioGeocercaM: row.radioGeocercaM,
      creadoEn: row.creadoEn,
      actualizadoEn: row.actualizadoEn,
    };
  }

  async get(): Promise<InstitucionResponseDto | null> {
    const [row] = await this.db.select().from(institucion).limit(1);
    if (!row) return null;
    return this.mapToDto(row);
  }

  async update(dto: UpdateInstitucionDto): Promise<InstitucionResponseDto> {
    const [updated] = await this.db
      .update(institucion)
      .set({
        nombre: dto.nombre,
        codigoModular: dto.codigoModular,
        codigoLocal: dto.codigoLocal ?? null,
        tipoGestion: dto.tipoGestion,
        ugel: dto.ugel ?? null,
        dre: dto.dre ?? null,
        director: dto.director ?? null,
        direccion: dto.direccion,
        distrito: dto.distrito ?? null,
        provincia: dto.provincia ?? null,
        departamento: dto.departamento ?? null,
        telefono: dto.telefono ?? null,
        correo: dto.correo ?? null,
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl ?? null } : {}),
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .returning();

    return this.mapToDto(updated);
  }

  async updateLogoUrl(logoUrl: string): Promise<InstitucionResponseDto> {
    const [updated] = await this.db
      .update(institucion)
      .set({
        logoUrl,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .returning();

    return this.mapToDto(updated);
  }
}
