import { Inject, Injectable } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { sesionesClase } from "../../../core/database/schema";
import type { DatosFirmaIngreso, DatosFirmaSalida, ResultadoCierre } from "../interfaces";
import type { SesionPlanificada } from "../utils";

/**
 * Repositorio de mutaciones sobre el ciclo diario y firma de sesiones
 * (generación, cierre automático, ingreso/salida, tema y reemplazo docente).
 */
@Injectable()
export class SesionesFirmasRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async insertarSesiones(fecha: string, planes: SesionPlanificada[]): Promise<number> {
    if (planes.length === 0) return 0;
    const creadas = await this.db
      .insert(sesionesClase)
      .values(
        planes.map((p) => ({
          horarioId: p.horarioId,
          docenteId: p.docenteId,
          fecha,
          horaInicioPlan: p.horaInicio,
          horaFinPlan: p.horaFin,
        })),
      )
      .onConflictDoNothing({ target: [sesionesClase.horarioId, sesionesClase.fecha] })
      .returning({ id: sesionesClase.id });
    return creadas.length;
  }

  async cerrarDia(
    fecha: string,
    salidaAutomatica: boolean,
    observacion: string,
  ): Promise<ResultadoCierre> {
    return this.db.transaction(async (tx) => {
      const noCumplidas = await tx
        .update(sesionesClase)
        .set({ estado: "no_cumplida", actualizadoEn: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(sesionesClase.estado, "pendiente"), sql`${sesionesClase.fecha} <= ${fecha}`))
        .returning({ id: sesionesClase.id, docenteId: sesionesClase.docenteId });
      const parciales = await tx
        .update(sesionesClase)
        .set({
          estado: "parcial",
          observaciones: observacion,
          minutosPerdidos: sql`${sesionesClase.minutosRetraso}`,
          ...(salidaAutomatica
            ? {
                salidaAutomatica: true,
                horaFinReal: sql`${sesionesClase.horaFinPlan}`,
                firmadaFinEn: sql`(${sesionesClase.fecha} + ${sesionesClase.horaFinPlan})`,
              }
            : {}),
          actualizadoEn: sql`CURRENT_TIMESTAMP`,
        })
        .where(and(eq(sesionesClase.estado, "en_curso"), sql`${sesionesClase.fecha} <= ${fecha}`))
        .returning({ id: sesionesClase.id, docenteId: sesionesClase.docenteId });

      const docentesAfectados = Array.from(
        new Set(
          [...noCumplidas, ...parciales]
            .map((s) => s.docenteId)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      return { noCumplidas: noCumplidas.length, parciales: parciales.length, docentesAfectados };
    });
  }

  async firmarIngreso(id: string, docenteId: string, datos: DatosFirmaIngreso): Promise<boolean> {
    const filas = await this.db
      .update(sesionesClase)
      .set({
        estado: "en_curso",
        tema: datos.tema,
        horaInicioReal: datos.hora,
        firmadaInicioEn: sql`(${sesionesClase.fecha} + ${datos.hora}::time)`,
        minutosRetraso: datos.minutosRetraso,
        equipoIngresoId: datos.equipoId,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(sesionesClase.id, id),
          eq(sesionesClase.docenteId, docenteId),
          eq(sesionesClase.estado, "pendiente"),
        ),
      )
      .returning({ id: sesionesClase.id });
    return filas.length === 1;
  }

  async firmarSalida(id: string, docenteId: string, datos: DatosFirmaSalida): Promise<boolean> {
    const filas = await this.db
      .update(sesionesClase)
      .set({
        estado: datos.estado,
        horaFinReal: datos.hora,
        firmadaFinEn: sql`(${sesionesClase.fecha} + ${datos.hora}::time)`,
        minutosPerdidos: datos.minutosPerdidos,
        equipoSalidaId: datos.equipoId,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(sesionesClase.id, id),
          eq(sesionesClase.docenteId, docenteId),
          eq(sesionesClase.estado, "en_curso"),
        ),
      )
      .returning({ id: sesionesClase.id });
    return filas.length === 1;
  }

  async actualizarTema(id: string, tema: string): Promise<void> {
    await this.db
      .update(sesionesClase)
      .set({ tema, actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(sesionesClase.id, id));
  }

  async reemplazar(id: string, docenteId: string): Promise<boolean> {
    const filas = await this.db
      .update(sesionesClase)
      .set({
        docenteTitularId: sql`COALESCE(${sesionesClase.docenteTitularId}, ${sesionesClase.docenteId})`,
        docenteId,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(sesionesClase.id, id), eq(sesionesClase.estado, "pendiente")))
      .returning({ id: sesionesClase.id });
    return filas.length === 1;
  }
}
