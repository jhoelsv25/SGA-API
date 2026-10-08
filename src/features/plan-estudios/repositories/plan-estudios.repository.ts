import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  aniosAcademicos,
  cursos,
  cursosSeccion,
  planEstudios,
  secciones,
} from "../../../core/database/schema";
import { AreaCurricular, AREA_CURRICULAR_LABELS } from "../../cursos";
import { PlanEstudioItemDto } from "../dto";

export interface IPlanEstudiosRepository {
  findByGradoId(gradoId: string): Promise<PlanEstudioItemDto[]>;
  findById(id: string): Promise<PlanEstudioItemDto | null>;
  findByGradoAndCurso(gradoId: string, cursoId: string): Promise<PlanEstudioItemDto | null>;
  create(gradoId: string, cursoId: string, horasSemanales: number): Promise<PlanEstudioItemDto>;
  updateHoras(id: string, horasSemanales: number): Promise<PlanEstudioItemDto | null>;
  delete(id: string): Promise<boolean>;
  hasCargaAcademicaEnGrado(gradoId: string, cursoId: string): Promise<boolean>;
  copyPlan(origenGradoId: string, destinoGradoId: string): Promise<PlanEstudioItemDto[]>;
}

@Injectable()
export class PlanEstudiosRepository implements IPlanEstudiosRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private mapRowToDto(row: {
    plan: typeof planEstudios.$inferSelect;
    curso: typeof cursos.$inferSelect;
  }): PlanEstudioItemDto {
    const area = row.curso.areaCurricular as AreaCurricular;
    return {
      id: row.plan.id,
      gradoId: row.plan.gradoId,
      cursoId: row.plan.cursoId,
      horasSemanales: row.plan.horasSemanales,
      activo: row.plan.activo,
      curso: {
        id: row.curso.id,
        codigo: row.curso.codigo,
        nombre: row.curso.nombre,
        areaCurricular: area,
        areaCurricularNombre: AREA_CURRICULAR_LABELS[area] ?? row.curso.areaCurricular,
        descripcion: row.curso.descripcion,
        colorHex: row.curso.colorHex,
        activo: row.curso.eliminadoEn === null,
        eliminadoEn: row.curso.eliminadoEn,
        creadoEn: row.curso.creadoEn,
        actualizadoEn: row.curso.actualizadoEn,
      },
    };
  }

  async findByGradoId(gradoId: string): Promise<PlanEstudioItemDto[]> {
    const rows = await this.db
      .select({
        plan: planEstudios,
        curso: cursos,
      })
      .from(planEstudios)
      .innerJoin(cursos, eq(planEstudios.cursoId, cursos.id))
      .where(eq(planEstudios.gradoId, gradoId))
      .orderBy(asc(cursos.areaCurricular), asc(cursos.nombre));

    return rows.map((r) => this.mapRowToDto(r));
  }

  async findById(id: string): Promise<PlanEstudioItemDto | null> {
    const rows = await this.db
      .select({
        plan: planEstudios,
        curso: cursos,
      })
      .from(planEstudios)
      .innerJoin(cursos, eq(planEstudios.cursoId, cursos.id))
      .where(eq(planEstudios.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return this.mapRowToDto(rows[0]);
  }

  async findByGradoAndCurso(gradoId: string, cursoId: string): Promise<PlanEstudioItemDto | null> {
    const rows = await this.db
      .select({
        plan: planEstudios,
        curso: cursos,
      })
      .from(planEstudios)
      .innerJoin(cursos, eq(planEstudios.cursoId, cursos.id))
      .where(and(eq(planEstudios.gradoId, gradoId), eq(planEstudios.cursoId, cursoId)))
      .limit(1);

    if (rows.length === 0) return null;
    return this.mapRowToDto(rows[0]);
  }

  async create(
    gradoId: string,
    cursoId: string,
    horasSemanales: number,
  ): Promise<PlanEstudioItemDto> {
    const [inserted] = await this.db
      .insert(planEstudios)
      .values({
        gradoId,
        cursoId,
        horasSemanales,
        activo: true,
      })
      .returning();

    const created = await this.findById(inserted.id);
    if (!created) {
      throw new Error("No se pudo recuperar el curso insertado en el plan de estudios.");
    }
    return created;
  }

  async updateHoras(id: string, horasSemanales: number): Promise<PlanEstudioItemDto | null> {
    const [updated] = await this.db
      .update(planEstudios)
      .set({ horasSemanales })
      .where(eq(planEstudios.id, id))
      .returning();

    if (!updated) return null;
    return this.findById(updated.id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(planEstudios).where(eq(planEstudios.id, id)).returning();

    return result.length > 0;
  }

  async hasCargaAcademicaEnGrado(gradoId: string, cursoId: string): Promise<boolean> {
    const result = await this.db
      .select({ id: cursosSeccion.id })
      .from(cursosSeccion)
      .innerJoin(secciones, eq(cursosSeccion.seccionId, secciones.id))
      .innerJoin(aniosAcademicos, eq(secciones.anioAcademicoId, aniosAcademicos.id))
      .where(
        and(
          eq(cursosSeccion.cursoId, cursoId),
          eq(secciones.gradoId, gradoId),
          eq(aniosAcademicos.estado, "en_curso"),
        ),
      )
      .limit(1);

    return result.length > 0;
  }

  async copyPlan(origenGradoId: string, destinoGradoId: string): Promise<PlanEstudioItemDto[]> {
    // Obtener cursos activos del origen
    const sourceRows = await this.db
      .select({
        plan: planEstudios,
        curso: cursos,
      })
      .from(planEstudios)
      .innerJoin(cursos, eq(planEstudios.cursoId, cursos.id))
      .where(and(eq(planEstudios.gradoId, origenGradoId), isNull(cursos.eliminadoEn)));

    if (sourceRows.length === 0) {
      return [];
    }

    const valuesToInsert = sourceRows.map((r) => ({
      gradoId: destinoGradoId,
      cursoId: r.plan.cursoId,
      horasSemanales: r.plan.horasSemanales,
      activo: true,
    }));

    await this.db.insert(planEstudios).values(valuesToInsert);

    return this.findByGradoId(destinoGradoId);
  }
}
