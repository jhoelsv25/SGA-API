import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, ilike, isNotNull, isNull, or, type SQL, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { aniosAcademicos, cursos, cursosSeccion, secciones } from "../../../core/database/schema";
import { AreaCurricular, AREA_CURRICULAR_LABELS } from "../constants";
import { CreateCursoDto, CursoResponseDto, FilterCursoDto, UpdateCursoDto } from "../dto";

export interface ICursosRepository {
  findAll(filter?: FilterCursoDto): Promise<CursoResponseDto[]>;
  findById(id: string): Promise<CursoResponseDto | null>;
  findByCodigo(codigo: string, excludeId?: string): Promise<CursoResponseDto | null>;
  create(dto: CreateCursoDto): Promise<CursoResponseDto>;
  update(id: string, dto: UpdateCursoDto): Promise<CursoResponseDto | null>;
  softDelete(id: string): Promise<CursoResponseDto | null>;
  reactivate(id: string): Promise<CursoResponseDto | null>;
  hasCargaAcademicaAnioEnCurso(cursoId: string): Promise<boolean>;
}

@Injectable()
export class CursosRepository implements ICursosRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private mapToDto(row: typeof cursos.$inferSelect): CursoResponseDto {
    const area = row.areaCurricular as AreaCurricular;
    return {
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      areaCurricular: area,
      areaCurricularNombre: AREA_CURRICULAR_LABELS[area] ?? row.areaCurricular,
      descripcion: row.descripcion,
      colorHex: row.colorHex,
      activo: row.eliminadoEn === null,
      eliminadoEn: row.eliminadoEn,
      creadoEn: row.creadoEn,
      actualizadoEn: row.actualizadoEn,
    };
  }

  async findAll(filter?: FilterCursoDto): Promise<CursoResponseDto[]> {
    const conditions: SQL[] = [];

    if (filter?.estado === "activo") {
      conditions.push(isNull(cursos.eliminadoEn));
    } else if (filter?.estado === "inactivo") {
      conditions.push(isNotNull(cursos.eliminadoEn));
    }

    if (filter?.areaCurricular) {
      conditions.push(eq(cursos.areaCurricular, filter.areaCurricular));
    }

    if (filter?.search?.trim()) {
      const term = `%${filter.search.trim()}%`;
      const searchCond = or(ilike(cursos.nombre, term), ilike(cursos.codigo, term));
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    const rows = await this.db
      .select()
      .from(cursos)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(cursos.areaCurricular), asc(cursos.nombre));

    return rows.map((r) => this.mapToDto(r));
  }

  async findById(id: string): Promise<CursoResponseDto | null> {
    const [row] = await this.db.select().from(cursos).where(eq(cursos.id, id)).limit(1);
    if (!row) return null;
    return this.mapToDto(row);
  }

  async findByCodigo(codigo: string, excludeId?: string): Promise<CursoResponseDto | null> {
    const conditions = [
      sql`upper(${cursos.codigo}) = upper(${codigo.trim()})`,
      isNull(cursos.eliminadoEn),
    ];

    if (excludeId) {
      conditions.push(sql`${cursos.id} != ${excludeId}`);
    }

    const [row] = await this.db
      .select()
      .from(cursos)
      .where(and(...conditions))
      .limit(1);

    if (!row) return null;
    return this.mapToDto(row);
  }

  async create(dto: CreateCursoDto): Promise<CursoResponseDto> {
    const [row] = await this.db
      .insert(cursos)
      .values({
        codigo: dto.codigo.trim().toUpperCase(),
        nombre: dto.nombre.trim(),
        areaCurricular: dto.areaCurricular,
        descripcion: dto.descripcion?.trim() || null,
        colorHex: dto.colorHex || null,
      })
      .returning();

    return this.mapToDto(row);
  }

  async update(id: string, dto: UpdateCursoDto): Promise<CursoResponseDto | null> {
    const updateValues: Record<string, unknown> = {
      actualizadoEn: sql`CURRENT_TIMESTAMP`,
    };

    if (dto.codigo !== undefined) {
      updateValues.codigo = dto.codigo.trim().toUpperCase();
    }
    if (dto.nombre !== undefined) {
      updateValues.nombre = dto.nombre.trim();
    }
    if (dto.areaCurricular !== undefined) {
      updateValues.areaCurricular = dto.areaCurricular;
    }
    if (dto.descripcion !== undefined) {
      updateValues.descripcion = dto.descripcion?.trim() || null;
    }
    if (dto.colorHex !== undefined) {
      updateValues.colorHex = dto.colorHex || null;
    }

    const [row] = await this.db
      .update(cursos)
      .set(updateValues)
      .where(eq(cursos.id, id))
      .returning();

    if (!row) return null;
    return this.mapToDto(row);
  }

  async softDelete(id: string): Promise<CursoResponseDto | null> {
    const [row] = await this.db
      .update(cursos)
      .set({
        eliminadoEn: sql`CURRENT_TIMESTAMP`,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(cursos.id, id))
      .returning();

    if (!row) return null;
    return this.mapToDto(row);
  }

  async reactivate(id: string): Promise<CursoResponseDto | null> {
    const [row] = await this.db
      .update(cursos)
      .set({
        eliminadoEn: null,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(cursos.id, id))
      .returning();

    if (!row) return null;
    return this.mapToDto(row);
  }

  async hasCargaAcademicaAnioEnCurso(cursoId: string): Promise<boolean> {
    const result = await this.db
      .select({ id: cursosSeccion.id })
      .from(cursosSeccion)
      .innerJoin(secciones, eq(cursosSeccion.seccionId, secciones.id))
      .innerJoin(aniosAcademicos, eq(secciones.anioAcademicoId, aniosAcademicos.id))
      .where(and(eq(cursosSeccion.cursoId, cursoId), eq(aniosAcademicos.estado, "en_curso")))
      .limit(1);

    return result.length > 0;
  }
}
