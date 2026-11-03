import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  equiposAutorizados,
  marcacionesBiometricoPendientes,
  personas,
} from "../../../core/database/schema";
import type { EstadoPendiente, MotivoPendiente } from "../constants";
import type { PendienteResponseDto } from "../dto";
import type {
  IBiometricoRepository,
  LatidoRegistrado,
  NuevaPendiente,
  PersonaBasica,
  RelojRegistrado,
  ResolucionPendiente,
} from "../interfaces";

const nombreCompletoSql = sql<string>`TRIM(${personas.apellidoPaterno} || ' ' || COALESCE(${personas.apellidoMaterno}, '') || ', ' || ${personas.nombres})`;

@Injectable()
export class BiometricoRepository implements IBiometricoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private seleccionPendiente() {
    return {
      id: marcacionesBiometricoPendientes.id,
      equipoId: marcacionesBiometricoPendientes.equipoId,
      equipoNombre: equiposAutorizados.nombre,
      codigoBiometrico: marcacionesBiometricoPendientes.codigoBiometrico,
      fechaHora: marcacionesBiometricoPendientes.fechaHora,
      motivo: marcacionesBiometricoPendientes.motivo,
      estado: marcacionesBiometricoPendientes.estado,
      personaId: marcacionesBiometricoPendientes.personaId,
      motivoDescarte: marcacionesBiometricoPendientes.motivoDescarte,
      resueltaEn: marcacionesBiometricoPendientes.resueltaEn,
    };
  }

  private mapearPendiente(fila: {
    id: string;
    equipoId: string;
    equipoNombre: string | null;
    codigoBiometrico: string;
    fechaHora: string;
    motivo: string;
    estado: string;
    personaId: string | null;
    motivoDescarte: string | null;
    resueltaEn: string | null;
  }): PendienteResponseDto {
    return {
      ...fila,
      motivo: fila.motivo as MotivoPendiente,
      estado: fila.estado as EstadoPendiente,
    };
  }

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

  async insertarPendiente(data: NuevaPendiente): Promise<boolean> {
    const creadas = await this.db
      .insert(marcacionesBiometricoPendientes)
      .values(data)
      .onConflictDoNothing()
      .returning({ id: marcacionesBiometricoPendientes.id });
    return creadas.length > 0;
  }

  async listarPendientes(estado: EstadoPendiente, limite: number): Promise<PendienteResponseDto[]> {
    const filas = await this.db
      .select(this.seleccionPendiente())
      .from(marcacionesBiometricoPendientes)
      .leftJoin(
        equiposAutorizados,
        eq(equiposAutorizados.id, marcacionesBiometricoPendientes.equipoId),
      )
      .where(eq(marcacionesBiometricoPendientes.estado, estado))
      .orderBy(asc(marcacionesBiometricoPendientes.fechaHora))
      .limit(limite);
    return filas.map((f) => this.mapearPendiente(f));
  }

  async findPendientePorId(id: string): Promise<PendienteResponseDto | null> {
    const [fila] = await this.db
      .select(this.seleccionPendiente())
      .from(marcacionesBiometricoPendientes)
      .leftJoin(
        equiposAutorizados,
        eq(equiposAutorizados.id, marcacionesBiometricoPendientes.equipoId),
      )
      .where(eq(marcacionesBiometricoPendientes.id, id))
      .limit(1);
    return fila ? this.mapearPendiente(fila) : null;
  }

  async resolverPendiente(
    id: string,
    resolucion: ResolucionPendiente,
  ): Promise<PendienteResponseDto> {
    await this.db
      .update(marcacionesBiometricoPendientes)
      .set({
        estado: resolucion.estado,
        personaId: resolucion.personaId ?? null,
        marcacionId: resolucion.marcacionId ?? null,
        motivoDescarte: resolucion.motivoDescarte ?? null,
        resueltaPorId: resolucion.usuarioId,
        resueltaEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(marcacionesBiometricoPendientes.id, id));
    const actualizada = await this.findPendientePorId(id);
    if (!actualizada) throw new Error("La marcación pendiente resuelta no se pudo leer.");
    return actualizada;
  }

  async registrarLatido(equipoId: string, latido: LatidoRegistrado): Promise<void> {
    await this.db
      .update(equiposAutorizados)
      .set({
        ultimoLatidoEn: latido.ahora,
        ...(latido.relojResponde ? { relojRespondioEn: latido.ahora } : {}),
        ...(latido.desfaseMinutos !== null ? { ultimoDesfaseMin: latido.desfaseMinutos } : {}),
      })
      .where(eq(equiposAutorizados.id, equipoId));
  }

  async listarRelojes(): Promise<RelojRegistrado[]> {
    return this.db
      .select({
        id: equiposAutorizados.id,
        nombre: equiposAutorizados.nombre,
        ubicacion: equiposAutorizados.ubicacion,
        activo: equiposAutorizados.activo,
        ultimoLatidoEn: equiposAutorizados.ultimoLatidoEn,
        relojRespondioEn: equiposAutorizados.relojRespondioEn,
        ultimoDesfaseMin: equiposAutorizados.ultimoDesfaseMin,
      })
      .from(equiposAutorizados)
      .where(and(eq(equiposAutorizados.tipo, "biometrico"), isNull(equiposAutorizados.eliminadoEn)))
      .orderBy(asc(equiposAutorizados.creadoEn));
  }
}
