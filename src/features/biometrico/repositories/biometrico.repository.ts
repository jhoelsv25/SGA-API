import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  biometricoProgramacion,
  personas,
  sincronizacionesBiometrico,
} from "../../../core/database/schema";
import type {
  HoraProgramada,
  IBiometricoRepository,
  PersonaBasica,
  SincronizacionReloj,
} from "../interfaces";

const nombreCompletoSql = sql<string>`TRIM(${personas.apellidoPaterno} || ' ' || COALESCE(${personas.apellidoMaterno}, '') || ', ' || ${personas.nombres})`;

@Injectable()
export class BiometricoRepository implements IBiometricoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findPersonaPorCodigo(codigo: string): Promise<{ id: string } | null> {
    const [fila] = await this.db
      .select({ id: personas.id })
      .from(personas)
      .where(and(eq(personas.codigoBiometrico, codigo), isNull(personas.eliminadoEn)))
      .limit(1);
    return fila ?? null;
  }

  async findPersonaBasica(personaId: string): Promise<PersonaBasica | null> {
    const [fila] = await this.db
      .select({
        id: personas.id,
        nombreCompleto: nombreCompletoSql,
        codigoBiometrico: personas.codigoBiometrico,
      })
      .from(personas)
      .where(and(eq(personas.id, personaId), isNull(personas.eliminadoEn)))
      .limit(1);
    return fila ?? null;
  }

  async asignarCodigo(personaId: string, codigo: string | null): Promise<void> {
    await this.db
      .update(personas)
      .set({ codigoBiometrico: codigo, actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(personas.id, personaId));
  }

  async listarProgramacion(): Promise<{
    horarios: HoraProgramada[];
    actualizadoEn: string | null;
  }> {
    const filas = await this.db
      .select({
        hora: biometricoProgramacion.hora,
        dias: biometricoProgramacion.dias,
        activa: biometricoProgramacion.activa,
        actualizadoEn: biometricoProgramacion.actualizadoEn,
      })
      .from(biometricoProgramacion)
      .orderBy(asc(biometricoProgramacion.hora));
    const ultima = filas.reduce<string | null>(
      (max, f) => (max === null || f.actualizadoEn > max ? f.actualizadoEn : max),
      null,
    );
    return {
      horarios: filas.map((f) => ({ hora: f.hora.slice(0, 5), dias: f.dias, activa: f.activa })),
      actualizadoEn: ultima,
    };
  }

  /** La lista completa reemplaza a la anterior, todo o nada. */
  async reemplazarProgramacion(horarios: HoraProgramada[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(biometricoProgramacion);
      if (horarios.length === 0) return;
      await tx
        .insert(biometricoProgramacion)
        .values(horarios.map((h) => ({ hora: `${h.hora}:00`, dias: h.dias, activa: h.activa })));
    });
  }

  async listarSincronizaciones(): Promise<SincronizacionReloj[]> {
    return this.db
      .select({
        relojSerie: sincronizacionesBiometrico.relojSerie,
        ultimaMarca: sincronizacionesBiometrico.ultimaMarca,
        ultimaSincronizacion: sincronizacionesBiometrico.ultimaSincronizacion,
        equipo: sincronizacionesBiometrico.equipo,
      })
      .from(sincronizacionesBiometrico)
      .orderBy(asc(sincronizacionesBiometrico.relojSerie));
  }
}
