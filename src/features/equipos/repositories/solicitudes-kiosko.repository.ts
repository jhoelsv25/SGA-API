import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, gt, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { equiposAutorizados, solicitudesKiosko } from "../../../core/database/schema";
import { ESTADO_SOLICITUD_KIOSKO, EstadoSolicitudKiosko } from "../constants";
import { SolicitudKioskoResponseDto } from "../dto";

export type SolicitudKiosko = typeof solicitudesKiosko.$inferSelect;

@Injectable()
export class SolicitudesKioskoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAll(): Promise<SolicitudKioskoResponseDto[]> {
    const filas = await this.db
      .select({
        id: solicitudesKiosko.id,
        codigo: solicitudesKiosko.codigo,
        estado: solicitudesKiosko.estado,
        equipoId: solicitudesKiosko.equipoId,
        equipoNombre: equiposAutorizados.nombre,
        solicitadoEn: solicitudesKiosko.solicitadoEn,
        ultimaConsultaEn: solicitudesKiosko.ultimaConsultaEn,
        resueltoEn: solicitudesKiosko.resueltoEn,
      })
      .from(solicitudesKiosko)
      .leftJoin(equiposAutorizados, eq(equiposAutorizados.id, solicitudesKiosko.equipoId))
      .orderBy(solicitudesKiosko.estado, desc(solicitudesKiosko.solicitadoEn));
    return filas.map((f) => ({ ...f, estado: f.estado as EstadoSolicitudKiosko }));
  }

  async findById(id: string): Promise<SolicitudKiosko | null> {
    const [fila] = await this.db
      .select()
      .from(solicitudesKiosko)
      .where(eq(solicitudesKiosko.id, id))
      .limit(1);
    return fila ?? null;
  }

  async findBySecretoHash(secretoHash: string): Promise<SolicitudKiosko | null> {
    const [fila] = await this.db
      .select()
      .from(solicitudesKiosko)
      .where(eq(solicitudesKiosko.secretoHash, secretoHash))
      .limit(1);
    return fila ?? null;
  }

  /** Pendientes de equipos que consultaron en las últimas 24 horas. */
  async contarPendientesActivas(): Promise<number> {
    const [fila] = await this.db
      .select({ total: count() })
      .from(solicitudesKiosko)
      .where(
        and(
          eq(solicitudesKiosko.estado, ESTADO_SOLICITUD_KIOSKO.PENDIENTE),
          gt(solicitudesKiosko.ultimaConsultaEn, sql`now() - interval '24 hours'`),
        ),
      );
    return Number(fila?.total ?? 0);
  }

  async crear(codigo: string, secretoHash: string): Promise<void> {
    // Dos pestañas pueden registrar a la vez el mismo secreto
    await this.db
      .insert(solicitudesKiosko)
      .values({ codigo, secretoHash })
      .onConflictDoNothing({ target: solicitudesKiosko.secretoHash });
  }

  async registrarConsulta(id: string): Promise<void> {
    await this.db
      .update(solicitudesKiosko)
      .set({ ultimaConsultaEn: sql`now()` })
      .where(eq(solicitudesKiosko.id, id));
  }

  async reabrir(id: string): Promise<void> {
    await this.db
      .update(solicitudesKiosko)
      .set({
        estado: ESTADO_SOLICITUD_KIOSKO.PENDIENTE,
        equipoId: null,
        resueltoEn: null,
        resueltoPor: null,
        ultimaConsultaEn: sql`now()`,
      })
      .where(eq(solicitudesKiosko.id, id));
  }

  async resolver(
    id: string,
    estado: EstadoSolicitudKiosko,
    resueltoPor: string,
    equipoId: string | null,
  ): Promise<void> {
    await this.db
      .update(solicitudesKiosko)
      .set({ estado, resueltoPor, equipoId, resueltoEn: sql`now()` })
      .where(eq(solicitudesKiosko.id, id));
  }
}
