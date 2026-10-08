import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, gte, inArray, isNotNull, isNull, lte, ne, or, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  calendarioEventos,
  materiales,
  notificaciones,
  sesionesClase,
  tareas,
} from "../../../core/database/schema";
import { TipoEvento } from "../constants";
import {
  EventoPersistido,
  GuardarEventoData,
  ICalendarioRepository,
  SesionesAfectadas,
} from "../interfaces";

type EventoRow = typeof calendarioEventos.$inferSelect;

@Injectable()
export class CalendarioRepository implements ICalendarioRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async listarEnRango(
    anioAcademicoId: string,
    desde: string,
    hasta: string,
  ): Promise<EventoPersistido[]> {
    const rows = await this.db
      .select()
      .from(calendarioEventos)
      .where(
        and(
          eq(calendarioEventos.anioAcademicoId, anioAcademicoId),
          lte(calendarioEventos.fechaInicio, hasta),
          gte(calendarioEventos.fechaFin, desde),
        ),
      )
      .orderBy(asc(calendarioEventos.fechaInicio), asc(calendarioEventos.titulo));

    return rows.map((row) => this.map(row));
  }

  async findById(id: string): Promise<EventoPersistido | null> {
    const [row] = await this.db
      .select()
      .from(calendarioEventos)
      .where(eq(calendarioEventos.id, id))
      .limit(1);
    return row ? this.map(row) : null;
  }

  async create(data: GuardarEventoData): Promise<EventoPersistido> {
    const [row] = await this.db
      .insert(calendarioEventos)
      .values({
        anioAcademicoId: data.anioAcademicoId,
        titulo: data.titulo,
        descripcion: data.descripcion,
        tipo: data.tipo,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        suspendeClases: data.suspendeClases,
        creadoPorId: data.creadoPorId,
      })
      .returning();
    return this.map(row);
  }

  async update(
    id: string,
    data: Partial<Omit<GuardarEventoData, "creadoPorId" | "anioAcademicoId">>,
  ): Promise<EventoPersistido> {
    const [row] = await this.db
      .update(calendarioEventos)
      .set({
        ...(data.titulo !== undefined ? { titulo: data.titulo } : {}),
        ...(data.descripcion !== undefined ? { descripcion: data.descripcion } : {}),
        ...(data.tipo !== undefined ? { tipo: data.tipo } : {}),
        ...(data.fechaInicio !== undefined ? { fechaInicio: data.fechaInicio } : {}),
        ...(data.fechaFin !== undefined ? { fechaFin: data.fechaFin } : {}),
        ...(data.suspendeClases !== undefined ? { suspendeClases: data.suspendeClases } : {}),
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(calendarioEventos.id, id))
      .returning();
    return this.map(row);
  }

  async remove(id: string): Promise<void> {
    await this.db.delete(calendarioEventos).where(eq(calendarioEventos.id, id));
  }

  async eliminarSesionesPendientes(desde: string, hasta: string): Promise<SesionesAfectadas> {
    return this.db.transaction(async (tx) => {
      const enRango = and(gte(sesionesClase.fecha, desde), lte(sesionesClase.fecha, hasta));

      const pendientes = await tx
        .select({ id: sesionesClase.id })
        .from(sesionesClase)
        .where(
          and(
            enRango,
            eq(sesionesClase.estado, "pendiente"),
            isNull(sesionesClase.firmadaInicioEn),
          ),
        );

      const firmadas = await tx
        .select({ id: sesionesClase.id })
        .from(sesionesClase)
        .where(
          and(
            enRango,
            or(ne(sesionesClase.estado, "pendiente"), isNotNull(sesionesClase.firmadaInicioEn)),
          ),
        );

      if (pendientes.length > 0) {
        const ids = pendientes.map((row) => row.id);
        await tx
          .update(notificaciones)
          .set({ sesionClaseId: null })
          .where(inArray(notificaciones.sesionClaseId, ids));
        await tx
          .update(materiales)
          .set({ sesionClaseId: null })
          .where(inArray(materiales.sesionClaseId, ids));
        await tx
          .update(tareas)
          .set({ sesionClaseId: null })
          .where(inArray(tareas.sesionClaseId, ids));
        await tx.delete(sesionesClase).where(inArray(sesionesClase.id, ids));
      }

      return { eliminadas: pendientes.length, firmadas: firmadas.length };
    });
  }

  async suspendeClasesEn(fecha: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: calendarioEventos.id })
      .from(calendarioEventos)
      .where(
        and(
          eq(calendarioEventos.suspendeClases, true),
          lte(calendarioEventos.fechaInicio, fecha),
          gte(calendarioEventos.fechaFin, fecha),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  private map(row: EventoRow): EventoPersistido {
    return {
      id: row.id,
      anioAcademicoId: row.anioAcademicoId,
      titulo: row.titulo,
      descripcion: row.descripcion,
      tipo: row.tipo as TipoEvento,
      fechaInicio: row.fechaInicio,
      fechaFin: row.fechaFin,
      suspendeClases: row.suspendeClases,
      creadoPorId: row.creadoPorId,
    };
  }
}
