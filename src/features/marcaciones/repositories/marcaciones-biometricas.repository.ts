import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  credenciales,
  docentes,
  marcacionesBiometricas,
  personas,
} from "../../../core/database/schema";

export interface MarcacionCruda {
  id: string;
  relojSerie: string;
  codigoUsuario: string;
  /** "YYYY-MM-DD HH:mm:ss" en la hora del colegio, tal como la entregó el reloj. */
  fechaHora: string;
  tipoReloj: string | null;
}

/** Marcaciones crudas que inserta SGA-NET; SGA-API las convierte en `marcaciones`. */
@Injectable()
export class MarcacionesBiometricasRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Las más antiguas primero, para que entrada y salida se asignen en orden. */
  async pendientes(limite: number): Promise<MarcacionCruda[]> {
    return this.db
      .select({
        id: marcacionesBiometricas.id,
        relojSerie: marcacionesBiometricas.relojSerie,
        codigoUsuario: marcacionesBiometricas.codigoUsuario,
        fechaHora: marcacionesBiometricas.fechaHora,
        tipoReloj: marcacionesBiometricas.tipoReloj,
      })
      .from(marcacionesBiometricas)
      .where(eq(marcacionesBiometricas.estado, "pendiente"))
      .orderBy(asc(marcacionesBiometricas.fechaHora), asc(marcacionesBiometricas.id))
      .limit(limite);
  }

  /** El código del reloj es el de la credencial (carné), el del docente o el documento de la persona, en ese orden. */
  async buscarPersonaId(codigo: string): Promise<string | null> {
    const [porCredencial] = await this.db
      .select({ personaId: credenciales.personaId })
      .from(credenciales)
      .where(eq(credenciales.codigo, codigo))
      .orderBy(desc(credenciales.activa), desc(credenciales.emitidaEn))
      .limit(1);
    if (porCredencial) return porCredencial.personaId;

    const [porDocente] = await this.db
      .select({ personaId: docentes.personaId })
      .from(docentes)
      .where(and(eq(docentes.codigo, codigo), isNull(docentes.eliminadoEn)))
      .limit(1);
    if (porDocente) return porDocente.personaId;

    const [porDocumento] = await this.db
      .select({ id: personas.id })
      .from(personas)
      .where(eq(personas.numeroDocumento, codigo))
      .limit(1);
    return porDocumento?.id ?? null;
  }

  async marcarProcesada(id: string, marcacionId: string): Promise<void> {
    await this.db
      .update(marcacionesBiometricas)
      .set({ estado: "procesada", marcacionId, procesadaEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(marcacionesBiometricas.id, id));
  }

  async marcarRechazada(id: string, motivo: string): Promise<void> {
    await this.db
      .update(marcacionesBiometricas)
      .set({
        estado: "rechazada",
        motivoRechazo: motivo.slice(0, 255),
        procesadaEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(marcacionesBiometricas.id, id));
  }
}
