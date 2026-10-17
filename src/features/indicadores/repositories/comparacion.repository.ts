import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { Database, DRIZZLE } from "@/core/database";
import {
  medicionesBimestre,
  medicionesBimestreIndicadores,
  periodosAcademicos,
} from "@/core/database/schema";
import type { Indicador } from "../constants";
import type { IComparacionRepository } from "../interfaces";

@Injectable()
export class ComparacionRepository implements IComparacionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async obtenerMedicionesVigentesPorAnio(anioAcademicoId: string): Promise<
    Array<{
      periodoId: string;
      periodoNombre: string;
      numeroPeriodo: number;
      indicador: Indicador;
      porcentaje: number;
    }>
  > {
    const filas = await this.db
      .select({
        periodoId: periodosAcademicos.id,
        periodoNombre: periodosAcademicos.nombre,
        numeroPeriodo: periodosAcademicos.numero,
        indicador: medicionesBimestreIndicadores.indicador,
        porcentaje: medicionesBimestreIndicadores.porcentaje,
      })
      .from(medicionesBimestre)
      .innerJoin(periodosAcademicos, eq(medicionesBimestre.periodoId, periodosAcademicos.id))
      .innerJoin(
        medicionesBimestreIndicadores,
        eq(medicionesBimestre.id, medicionesBimestreIndicadores.medicionId),
      )
      .where(
        and(
          eq(periodosAcademicos.anioAcademicoId, anioAcademicoId),
          eq(medicionesBimestre.vigente, true),
        ),
      )
      .orderBy(asc(periodosAcademicos.numero), asc(medicionesBimestreIndicadores.indicador));

    return filas.map((fila) => ({
      periodoId: fila.periodoId,
      periodoNombre: fila.periodoNombre,
      numeroPeriodo: Number(fila.numeroPeriodo),
      indicador: fila.indicador as Indicador,
      porcentaje: Number(fila.porcentaje),
    }));
  }
}
