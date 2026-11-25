import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { aniosAcademicos, periodosAcademicos } from "../../../core/database/schema";

export interface PeriodoReferencia {
  anioId: string;
  anio: number;
  fechaInicioAnio: string;
  fechaFinAnio: string;
  periodoId: string | null;
  periodoNombre: string | null;
  fechaInicioPeriodo?: string | null;
  fechaFinPeriodo?: string | null;
}

export interface ResumenAsistencia {
  presentes: number;
  tardanzas: number;
  faltas: number;
  justificadas: number;
  total: number;
  porcentaje: number;
}

/** Resume conteos de asistencia por estado y calcula el porcentaje efectivo. */
export function resumirAsistencias(
  filas: Array<{ estado: string | null; total: number | string }>,
  porcentajePorDefecto = 100,
): ResumenAsistencia {
  let presentes = 0;
  let tardanzas = 0;
  let faltas = 0;
  let justificadas = 0;

  for (const item of filas) {
    const tot = Number(item.total);
    if (item.estado === "presente") presentes += tot;
    else if (item.estado === "tardanza") tardanzas += tot;
    else if (item.estado === "falta") faltas += tot;
    else if (item.estado === "justificada" || item.estado === "justificado") justificadas += tot;
  }

  const total = presentes + tardanzas + faltas + justificadas;
  const porcentaje =
    total > 0 ? Math.round(((presentes + tardanzas) / total) * 100) : porcentajePorDefecto;

  return { presentes, tardanzas, faltas, justificadas, total, porcentaje };
}

/**
 * Repositorio de referencia académica compartido por los distintos paneles del dashboard.
 */
@Injectable()
export class DashboardReferenciaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Obtiene la referencia del año y período académico activo o solicitado. */
  async obtenerPeriodoReferencia(
    anioAcademicoId?: string,
    periodoId?: string,
  ): Promise<PeriodoReferencia | null> {
    let anioRow: typeof aniosAcademicos.$inferSelect | undefined;

    if (anioAcademicoId) {
      const [encontrado] = await this.db
        .select()
        .from(aniosAcademicos)
        .where(eq(aniosAcademicos.id, anioAcademicoId))
        .limit(1);
      anioRow = encontrado;
    }

    if (!anioRow) {
      const [enCurso] = await this.db
        .select()
        .from(aniosAcademicos)
        .where(eq(aniosAcademicos.estado, "en_curso"))
        .limit(1);
      anioRow = enCurso;
    }

    if (!anioRow) {
      const [masReciente] = await this.db
        .select()
        .from(aniosAcademicos)
        .orderBy(desc(aniosAcademicos.anio))
        .limit(1);
      anioRow = masReciente;
    }

    if (!anioRow) return null;

    let periodoRow: typeof periodosAcademicos.$inferSelect | undefined;

    if (periodoId) {
      const [p] = await this.db
        .select()
        .from(periodosAcademicos)
        .where(
          and(
            eq(periodosAcademicos.id, periodoId),
            eq(periodosAcademicos.anioAcademicoId, anioRow.id),
          ),
        )
        .limit(1);
      periodoRow = p;
    }

    if (!periodoRow) {
      const [pEnCurso] = await this.db
        .select()
        .from(periodosAcademicos)
        .where(
          and(
            eq(periodosAcademicos.anioAcademicoId, anioRow.id),
            eq(periodosAcademicos.estado, "en_curso"),
          ),
        )
        .limit(1);
      periodoRow = pEnCurso;
    }

    return {
      anioId: anioRow.id,
      anio: anioRow.anio,
      fechaInicioAnio: anioRow.fechaInicio,
      fechaFinAnio: anioRow.fechaFin,
      periodoId: periodoRow ? periodoRow.id : null,
      periodoNombre: periodoRow ? periodoRow.nombre : null,
      fechaInicioPeriodo: periodoRow ? periodoRow.fechaInicio : null,
      fechaFinPeriodo: periodoRow ? periodoRow.fechaFin : null,
    };
  }
}
