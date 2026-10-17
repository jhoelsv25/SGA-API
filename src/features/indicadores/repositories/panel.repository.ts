import { Inject, Injectable } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "@/core/database";
import {
  estudiantes,
  libretas,
  marcaciones,
  matriculas,
  periodosAcademicos,
  sesionesClase,
} from "@/core/database/schema";
import type { IPanelRepository } from "../interfaces/panel.repository.interface";

@Injectable()
export class PanelRepository implements IPanelRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async contarEstudiantesMatriculadosActivos(anioAcademicoId: string): Promise<number> {
    const [resultado] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(matriculas)
      .where(
        and(eq(matriculas.anioAcademicoId, anioAcademicoId), eq(matriculas.estado, "matriculado")),
      );
    return resultado?.total ?? 0;
  }

  async contarEstudiantesConMarcacionIngresoHoy(fechaHoy: string): Promise<number> {
    const [resultado] = await this.db
      .select({
        total: sql<number>`count(distinct ${marcaciones.personaId})::int`,
      })
      .from(marcaciones)
      .innerJoin(estudiantes, eq(estudiantes.personaId, marcaciones.personaId))
      .where(
        and(
          eq(marcaciones.tipo, "entrada"),
          sql`DATE(${marcaciones.fechaHora}) = ${fechaHoy}::date`,
        ),
      );
    return resultado?.total ?? 0;
  }

  async contarTardanzasHoy(fechaHoy: string): Promise<number> {
    const [resultado] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(marcaciones)
      .where(
        and(
          eq(marcaciones.tipo, "entrada"),
          eq(marcaciones.resultado, "tardanza"),
          sql`DATE(${marcaciones.fechaHora}) = ${fechaHoy}::date`,
        ),
      );
    return resultado?.total ?? 0;
  }

  async contarSesionesHoyPorEstado(fechaHoy: string): Promise<{
    cumplidas: number;
    enCurso: number;
    pendientes: number;
    noCumplidas: number;
    justificadas: number;
  }> {
    const [resultado] = await this.db
      .select({
        cumplidas: sql<number>`count(case when ${sesionesClase.estado} = 'cumplida' then 1 end)::int`,
        enCurso: sql<number>`count(case when ${sesionesClase.estado} = 'en_curso' then 1 end)::int`,
        pendientes: sql<number>`count(case when ${sesionesClase.estado} = 'pendiente' then 1 end)::int`,
        noCumplidas: sql<number>`count(case when ${sesionesClase.estado} = 'no_cumplida' then 1 end)::int`,
        justificadas: sql<number>`count(case when ${sesionesClase.estado} = 'justificada' then 1 end)::int`,
      })
      .from(sesionesClase)
      .where(eq(sesionesClase.fecha, fechaHoy));

    return {
      cumplidas: resultado?.cumplidas ?? 0,
      enCurso: resultado?.enCurso ?? 0,
      pendientes: resultado?.pendientes ?? 0,
      noCumplidas: resultado?.noCumplidas ?? 0,
      justificadas: resultado?.justificadas ?? 0,
    };
  }

  async contarLibretasPendientes(
    anioAcademicoId: string,
    fechaHoy: string,
  ): Promise<{
    vencidas: number;
    porVencer: number;
  }> {
    const [resultado] = await this.db
      .select({
        vencidas: sql<number>`count(case when ${libretas.fechaLimite} < ${fechaHoy}::date then 1 end)::int`,
        porVencer: sql<number>`count(case when ${libretas.fechaLimite} >= ${fechaHoy}::date then 1 end)::int`,
      })
      .from(libretas)
      .innerJoin(periodosAcademicos, eq(periodosAcademicos.id, libretas.periodoId))
      .where(
        and(
          eq(periodosAcademicos.anioAcademicoId, anioAcademicoId),
          eq(libretas.estado, "pendiente"),
        ),
      );

    return {
      vencidas: resultado?.vencidas ?? 0,
      porVencer: resultado?.porVencer ?? 0,
    };
  }
}
