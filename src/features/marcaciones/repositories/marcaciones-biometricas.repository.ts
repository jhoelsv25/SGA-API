import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
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

  /**
   * Las más antiguas primero, para que entrada y salida se asignen en orden. Con `despuesDe` sigue desde la última
   * fila ya revisada: así las que quedan pendientes (por ejemplo, sin turno) no tapan a las siguientes.
   */
  async pendientes(
    limite: number,
    despuesDe?: Pick<MarcacionCruda, "fechaHora" | "id">,
  ): Promise<MarcacionCruda[]> {
    return this.db
      .select({
        id: marcacionesBiometricas.id,
        relojSerie: marcacionesBiometricas.relojSerie,
        codigoUsuario: marcacionesBiometricas.codigoUsuario,
        fechaHora: marcacionesBiometricas.fechaHora,
        tipoReloj: marcacionesBiometricas.tipoReloj,
      })
      .from(marcacionesBiometricas)
      .where(
        and(
          eq(marcacionesBiometricas.estado, "pendiente"),
          despuesDe
            ? or(
                gt(marcacionesBiometricas.fechaHora, despuesDe.fechaHora),
                and(
                  eq(marcacionesBiometricas.fechaHora, despuesDe.fechaHora),
                  gt(marcacionesBiometricas.id, despuesDe.id),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(asc(marcacionesBiometricas.fechaHora), asc(marcacionesBiometricas.id))
      .limit(limite);
  }

  /**
   * El código del reloj es el código biométrico asignado a la persona; si no hay, el de la credencial (carné), el del
   * docente o el documento de la persona, en ese orden.
   */
  async buscarPersonaId(codigo: string): Promise<string | null> {
    const [porBiometrico] = await this.db
      .select({ id: personas.id })
      .from(personas)
      .where(and(eq(personas.codigoBiometrico, codigo), isNull(personas.eliminadoEn)))
      .limit(1);
    if (porBiometrico) return porBiometrico.id;

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

  /** Quien guardó la asistencia manda: corrige la fila aunque otra instancia ya la hubiera rechazado. */
  async marcarProcesada(id: string, marcacionId: string): Promise<void> {
    await this.db
      .update(marcacionesBiometricas)
      .set({
        estado: "procesada",
        marcacionId,
        motivoRechazo: null,
        procesadaEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(marcacionesBiometricas.id, id));
  }

  /** Solo rechaza lo que sigue pendiente: con dos instancias, la otra ya pudo haberla procesado. */
  async marcarRechazada(id: string, motivo: string): Promise<void> {
    await this.db
      .update(marcacionesBiometricas)
      .set({
        estado: "rechazada",
        motivoRechazo: motivo.slice(0, 255),
        procesadaEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(eq(marcacionesBiometricas.id, id), eq(marcacionesBiometricas.estado, "pendiente")),
      );
  }
}
