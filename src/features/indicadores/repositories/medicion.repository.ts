import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, or } from "drizzle-orm";
import { Database, DRIZZLE } from "@/core/database";
import {
  medicionesBimestre,
  medicionesBimestreIndicadores,
  periodosAcademicos,
  personas,
  usuarios,
} from "@/core/database/schema";
import type { Indicador } from "../constants";
import type { IMedicionRepository, MedicionFila } from "../interfaces";

@Injectable()
export class MedicionRepository implements IMedicionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async obtenerPeriodoPorId(periodoId: string): Promise<{
    id: string;
    nombre: string;
    estado: string;
    fechaInicio: string;
    fechaFin: string;
  } | null> {
    const [periodo] = await this.db
      .select({
        id: periodosAcademicos.id,
        nombre: periodosAcademicos.nombre,
        estado: periodosAcademicos.estado,
        fechaInicio: periodosAcademicos.fechaInicio,
        fechaFin: periodosAcademicos.fechaFin,
      })
      .from(periodosAcademicos)
      .where(eq(periodosAcademicos.id, periodoId))
      .limit(1);

    return periodo ?? null;
  }

  async obtenerMedicionVigentePorPeriodo(periodoOId: string): Promise<MedicionFila | null> {
    const [fila] = await this.db
      .select({
        id: medicionesBimestre.id,
        periodoId: medicionesBimestre.periodoId,
        periodoNombre: periodosAcademicos.nombre,
        version: medicionesBimestre.version,
        vigente: medicionesBimestre.vigente,
        motivoCambio: medicionesBimestre.motivoCambio,
        cerradaPorId: medicionesBimestre.cerradaPorId,
        cerradaEn: medicionesBimestre.cerradaEn,
        nombres: personas.nombres,
        apellidoPaterno: personas.apellidoPaterno,
        apellidoMaterno: personas.apellidoMaterno,
      })
      .from(medicionesBimestre)
      .innerJoin(periodosAcademicos, eq(periodosAcademicos.id, medicionesBimestre.periodoId))
      .leftJoin(usuarios, eq(usuarios.id, medicionesBimestre.cerradaPorId))
      .leftJoin(personas, eq(personas.id, usuarios.personaId))
      .where(
        and(
          or(eq(medicionesBimestre.periodoId, periodoOId), eq(medicionesBimestre.id, periodoOId)),
          eq(medicionesBimestre.vigente, true),
        ),
      )
      .limit(1);

    if (!fila) {
      return null;
    }

    const indicadores = await this.db
      .select({
        indicador: medicionesBimestreIndicadores.indicador,
        numerador: medicionesBimestreIndicadores.numerador,
        denominador: medicionesBimestreIndicadores.denominador,
        porcentaje: medicionesBimestreIndicadores.porcentaje,
        desglose: medicionesBimestreIndicadores.desglose,
      })
      .from(medicionesBimestreIndicadores)
      .where(eq(medicionesBimestreIndicadores.medicionId, fila.id));

    const cerradaPorNombre = fila.nombres
      ? `${fila.nombres} ${fila.apellidoPaterno ?? ""} ${fila.apellidoMaterno ?? ""}`.trim()
      : undefined;

    return {
      id: fila.id,
      periodoId: fila.periodoId,
      periodoNombre: fila.periodoNombre,
      version: fila.version,
      vigente: fila.vigente,
      motivoCambio: fila.motivoCambio,
      cerradaPorId: fila.cerradaPorId ?? "",
      cerradaPorNombre,
      cerradaEn:
        typeof fila.cerradaEn === "string"
          ? fila.cerradaEn
          : new Date(fila.cerradaEn).toISOString(),
      indicadores: indicadores.map((ind) => ({
        indicador: ind.indicador as Indicador,
        numerador: ind.numerador,
        denominador: ind.denominador,
        porcentaje: Number(ind.porcentaje),
        desglose: ind.desglose as Record<string, unknown>,
      })),
    };
  }

  async obtenerHistorialPorPeriodo(periodoId: string): Promise<MedicionFila[]> {
    const filas = await this.db
      .select({
        id: medicionesBimestre.id,
        periodoId: medicionesBimestre.periodoId,
        periodoNombre: periodosAcademicos.nombre,
        version: medicionesBimestre.version,
        vigente: medicionesBimestre.vigente,
        motivoCambio: medicionesBimestre.motivoCambio,
        cerradaPorId: medicionesBimestre.cerradaPorId,
        cerradaEn: medicionesBimestre.cerradaEn,
        nombres: personas.nombres,
        apellidoPaterno: personas.apellidoPaterno,
        apellidoMaterno: personas.apellidoMaterno,
      })
      .from(medicionesBimestre)
      .innerJoin(periodosAcademicos, eq(periodosAcademicos.id, medicionesBimestre.periodoId))
      .leftJoin(usuarios, eq(usuarios.id, medicionesBimestre.cerradaPorId))
      .leftJoin(personas, eq(personas.id, usuarios.personaId))
      .where(eq(medicionesBimestre.periodoId, periodoId))
      .orderBy(asc(medicionesBimestre.version));

    if (filas.length === 0) {
      return [];
    }

    const resultado: MedicionFila[] = [];

    for (const fila of filas) {
      const indicadores = await this.db
        .select({
          indicador: medicionesBimestreIndicadores.indicador,
          numerador: medicionesBimestreIndicadores.numerador,
          denominador: medicionesBimestreIndicadores.denominador,
          porcentaje: medicionesBimestreIndicadores.porcentaje,
          desglose: medicionesBimestreIndicadores.desglose,
        })
        .from(medicionesBimestreIndicadores)
        .where(eq(medicionesBimestreIndicadores.medicionId, fila.id));

      const cerradaPorNombre = fila.nombres
        ? `${fila.nombres} ${fila.apellidoPaterno ?? ""} ${fila.apellidoMaterno ?? ""}`.trim()
        : undefined;

      resultado.push({
        id: fila.id,
        periodoId: fila.periodoId,
        periodoNombre: fila.periodoNombre,
        version: fila.version,
        vigente: fila.vigente,
        motivoCambio: fila.motivoCambio,
        cerradaPorId: fila.cerradaPorId ?? "",
        cerradaPorNombre,
        cerradaEn:
          typeof fila.cerradaEn === "string"
            ? fila.cerradaEn
            : new Date(fila.cerradaEn).toISOString(),
        indicadores: indicadores.map((ind) => ({
          indicador: ind.indicador as Indicador,
          numerador: ind.numerador,
          denominador: ind.denominador,
          porcentaje: Number(ind.porcentaje),
          desglose: ind.desglose as Record<string, unknown>,
        })),
      });
    }

    return resultado;
  }

  async guardarMedicionCongelada(datos: {
    periodoId: string;
    version: number;
    motivoCambio?: string | null;
    cerradaPorId: string;
    indicadores: Array<{
      indicador: Indicador;
      numerador: number;
      denominador: number;
      porcentaje: number;
      desglose: Record<string, unknown>;
    }>;
  }): Promise<MedicionFila> {
    return await this.db.transaction(async (tx) => {
      const [insertada] = await tx
        .insert(medicionesBimestre)
        .values({
          periodoId: datos.periodoId,
          version: datos.version,
          vigente: true,
          motivoCambio: datos.motivoCambio ?? null,
          cerradaPorId: datos.cerradaPorId,
        })
        .returning();

      if (datos.indicadores.length > 0) {
        await tx.insert(medicionesBimestreIndicadores).values(
          datos.indicadores.map((ind) => ({
            medicionId: insertada.id,
            indicador: ind.indicador,
            numerador: ind.numerador,
            denominador: ind.denominador,
            porcentaje: ind.porcentaje.toFixed(2),
            desglose: ind.desglose,
          })),
        );
      }

      const [periodo] = await tx
        .select({ nombre: periodosAcademicos.nombre })
        .from(periodosAcademicos)
        .where(eq(periodosAcademicos.id, datos.periodoId))
        .limit(1);

      return {
        id: insertada.id,
        periodoId: insertada.periodoId,
        periodoNombre: periodo?.nombre ?? "",
        version: insertada.version,
        vigente: insertada.vigente,
        motivoCambio: insertada.motivoCambio,
        cerradaPorId: insertada.cerradaPorId ?? "",
        cerradaEn:
          typeof insertada.cerradaEn === "string"
            ? insertada.cerradaEn
            : new Date(insertada.cerradaEn).toISOString(),
        indicadores: datos.indicadores,
      };
    });
  }

  async invalidarVersionVigente(periodoId: string): Promise<void> {
    await this.db
      .update(medicionesBimestre)
      .set({ vigente: false })
      .where(
        and(eq(medicionesBimestre.periodoId, periodoId), eq(medicionesBimestre.vigente, true)),
      );
  }
}
