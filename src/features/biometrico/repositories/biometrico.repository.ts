import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { personas } from "../../../core/database/schema";
import type { IBiometricoRepository, PersonaBasica } from "../interfaces";

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
}
