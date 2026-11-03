import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  equiposAutorizados,
  marcacionesBiometricoPendientes,
  personas,
  puenteOrdenes,
} from "../../../core/database/schema";
import type { EstadoOrden, EstadoPendiente, MotivoPendiente, TipoOrden } from "../constants";
import type { ConfigRelojDto, OrdenDto, PendienteResponseDto } from "../dto";
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
        config: this.seleccionConfig(),
      })
      .from(equiposAutorizados)
      .where(and(eq(equiposAutorizados.tipo, "biometrico"), isNull(equiposAutorizados.eliminadoEn)))
      .orderBy(asc(equiposAutorizados.creadoEn));
  }

  private seleccionConfig() {
    return sql<ConfigRelojDto>`json_build_object(
      'relojIp', ${equiposAutorizados.relojIp},
      'relojPuerto', ${equiposAutorizados.relojPuerto},
      'relojClaveComunicacion', ${equiposAutorizados.relojClaveComunicacion},
      'intervaloSegundos', ${equiposAutorizados.intervaloSegundos}
    )`;
  }

  async findConfig(equipoId: string): Promise<ConfigRelojDto | null> {
    const [fila] = await this.db
      .select({
        relojIp: equiposAutorizados.relojIp,
        relojPuerto: equiposAutorizados.relojPuerto,
        relojClaveComunicacion: equiposAutorizados.relojClaveComunicacion,
        intervaloSegundos: equiposAutorizados.intervaloSegundos,
      })
      .from(equiposAutorizados)
      .where(
        and(
          eq(equiposAutorizados.id, equipoId),
          eq(equiposAutorizados.tipo, "biometrico"),
          isNull(equiposAutorizados.eliminadoEn),
        ),
      )
      .limit(1);
    return fila ?? null;
  }

  async guardarConfig(equipoId: string, config: ConfigRelojDto): Promise<void> {
    await this.db
      .update(equiposAutorizados)
      .set({
        relojIp: config.relojIp,
        relojPuerto: config.relojPuerto,
        relojClaveComunicacion: config.relojClaveComunicacion,
        intervaloSegundos: config.intervaloSegundos,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(equiposAutorizados.id, equipoId));
  }

  private seleccionOrden() {
    return {
      id: puenteOrdenes.id,
      tipo: puenteOrdenes.tipo,
      estado: puenteOrdenes.estado,
      mensaje: puenteOrdenes.mensaje,
      datos: puenteOrdenes.datos,
      creadoEn: puenteOrdenes.creadoEn,
      resueltaEn: puenteOrdenes.resueltaEn,
    };
  }

  private mapearOrden(fila: {
    id: string;
    tipo: string;
    estado: string;
    mensaje: string | null;
    datos: unknown;
    creadoEn: string;
    resueltaEn: string | null;
  }): OrdenDto {
    return { ...fila, tipo: fila.tipo as TipoOrden, estado: fila.estado as EstadoOrden };
  }

  async vencerOrdenes(equipoId: string, minutos: number, mensaje: string): Promise<void> {
    await this.db
      .update(puenteOrdenes)
      .set({ estado: "error", mensaje, resueltaEn: sql`CURRENT_TIMESTAMP` })
      .where(
        and(
          eq(puenteOrdenes.equipoId, equipoId),
          eq(puenteOrdenes.estado, "pendiente"),
          sql`${puenteOrdenes.creadoEn} < CURRENT_TIMESTAMP - (${minutos} * INTERVAL '1 minute')`,
        ),
      );
  }

  async findOrdenPendiente(equipoId: string, tipo: TipoOrden): Promise<OrdenDto | null> {
    const [fila] = await this.db
      .select(this.seleccionOrden())
      .from(puenteOrdenes)
      .where(
        and(
          eq(puenteOrdenes.equipoId, equipoId),
          eq(puenteOrdenes.tipo, tipo),
          eq(puenteOrdenes.estado, "pendiente"),
        ),
      )
      .limit(1);
    return fila ? this.mapearOrden(fila) : null;
  }

  async crearOrden(equipoId: string, tipo: TipoOrden, usuarioId: string): Promise<OrdenDto> {
    const [fila] = await this.db
      .insert(puenteOrdenes)
      .values({ equipoId, tipo, solicitadaPorId: usuarioId })
      .returning(this.seleccionOrden());
    return this.mapearOrden(fila);
  }

  async listarOrdenes(equipoId: string, limite: number): Promise<OrdenDto[]> {
    const filas = await this.db
      .select(this.seleccionOrden())
      .from(puenteOrdenes)
      .where(eq(puenteOrdenes.equipoId, equipoId))
      .orderBy(desc(puenteOrdenes.creadoEn))
      .limit(limite);
    return filas.map((f) => this.mapearOrden(f));
  }

  async listarOrdenesPendientes(equipoId: string): Promise<{ id: string; tipo: TipoOrden }[]> {
    const filas = await this.db
      .select({ id: puenteOrdenes.id, tipo: puenteOrdenes.tipo })
      .from(puenteOrdenes)
      .where(and(eq(puenteOrdenes.equipoId, equipoId), eq(puenteOrdenes.estado, "pendiente")))
      .orderBy(asc(puenteOrdenes.creadoEn));
    return filas.map((f) => ({ id: f.id, tipo: f.tipo as TipoOrden }));
  }

  async resolverOrden(
    equipoId: string,
    ordenId: string,
    estado: Exclude<EstadoOrden, "pendiente">,
    mensaje: string,
    datos: Record<string, unknown> | null,
  ): Promise<boolean> {
    const filas = await this.db
      .update(puenteOrdenes)
      .set({ estado, mensaje, datos, resueltaEn: sql`CURRENT_TIMESTAMP` })
      .where(
        and(
          eq(puenteOrdenes.id, ordenId),
          eq(puenteOrdenes.equipoId, equipoId),
          eq(puenteOrdenes.estado, "pendiente"),
        ),
      )
      .returning({ id: puenteOrdenes.id });
    return filas.length > 0;
  }
}
