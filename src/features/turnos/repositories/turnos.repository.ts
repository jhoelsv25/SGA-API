import { Inject, Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { turnos } from "../../../core/database/schema";
import { PersonaTypeTurno } from "../constants";
import { CreateTurnoDto, TurnoResponseDto, UpdateTurnoDto } from "../dto";
import { ITurnosRepository } from "../interfaces";

@Injectable()
export class TurnosRepository implements ITurnosRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private mapToDto(row: typeof turnos.$inferSelect): TurnoResponseDto {
    return {
      id: row.id,
      aplicaA: row.aplicaA as PersonaTypeTurno,
      horaEntrada: row.horaEntrada,
      horaSalida: row.horaSalida,
      ventanaEntradaInicio: row.ventanaEntradaInicio ?? row.horaEntrada,
      ventanaEntradaFin: row.ventanaEntradaFin ?? row.horaEntrada,
      ventanaSalidaInicio: row.ventanaSalidaInicio ?? row.horaSalida,
      ventanaSalidaFin: row.ventanaSalidaFin ?? row.horaSalida,
      toleranciaMin: row.toleranciaMin,
      diasLaborables: row.diasLaborables,
      activo: row.activo,
      creadoEn: row.creadoEn,
      actualizadoEn: row.actualizadoEn,
    };
  }

  async findAll(): Promise<TurnoResponseDto[]> {
    const rows = await this.db.select().from(turnos).orderBy(turnos.creadoEn);
    return rows.map((r) => this.mapToDto(r));
  }

  async findById(id: string): Promise<TurnoResponseDto | null> {
    const [row] = await this.db.select().from(turnos).where(eq(turnos.id, id)).limit(1);
    if (!row) return null;
    return this.mapToDto(row);
  }

  async findByAplicaA(aplicaA: string): Promise<TurnoResponseDto | null> {
    const [row] = await this.db.select().from(turnos).where(eq(turnos.aplicaA, aplicaA)).limit(1);
    if (!row) return null;
    return this.mapToDto(row);
  }

  async create(dto: CreateTurnoDto): Promise<TurnoResponseDto> {
    const [row] = await this.db
      .insert(turnos)
      .values({
        aplicaA: dto.aplicaA,
        horaEntrada: dto.horaEntrada,
        horaSalida: dto.horaSalida,
        ventanaEntradaInicio: dto.ventanaEntradaInicio,
        ventanaEntradaFin: dto.ventanaEntradaFin,
        ventanaSalidaInicio: dto.ventanaSalidaInicio,
        ventanaSalidaFin: dto.ventanaSalidaFin,
        toleranciaMin: dto.toleranciaMin,
        diasLaborables: dto.diasLaborables,
        activo: true,
      })
      .returning();

    return this.mapToDto(row);
  }

  async update(id: string, dto: UpdateTurnoDto): Promise<TurnoResponseDto> {
    const [row] = await this.db
      .update(turnos)
      .set({
        horaEntrada: dto.horaEntrada,
        horaSalida: dto.horaSalida,
        ventanaEntradaInicio: dto.ventanaEntradaInicio,
        ventanaEntradaFin: dto.ventanaEntradaFin,
        ventanaSalidaInicio: dto.ventanaSalidaInicio,
        ventanaSalidaFin: dto.ventanaSalidaFin,
        toleranciaMin: dto.toleranciaMin,
        diasLaborables: dto.diasLaborables,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(turnos.id, id))
      .returning();

    return this.mapToDto(row);
  }

  async toggleActivo(id: string, activo: boolean): Promise<TurnoResponseDto> {
    const [row] = await this.db
      .update(turnos)
      .set({
        activo,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(turnos.id, id))
      .returning();

    return this.mapToDto(row);
  }
}
