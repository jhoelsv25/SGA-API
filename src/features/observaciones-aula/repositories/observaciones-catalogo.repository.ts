import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  docentes,
  instrumentosObservacion,
  observacionesAula,
  observacionesAulaCalificaciones,
  periodosAcademicos,
  personas,
  usuarios,
} from "../../../core/database/schema";
import type { EstadoObservacion } from "../constants";
import type { InstrumentoContenido, InstrumentoFila } from "../interfaces";
import { nombreSql, personaObservador, textoSql } from "./observaciones-shared.helper";

/**
 * Repositorio especializado en catálogo de instrumentos de observación
 * y consultas agregadas para reportes y matriz de desempeños.
 */
@Injectable()
export class ObservacionesCatalogoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private readonly camposInstrumento = {
    id: instrumentosObservacion.id,
    codigo: instrumentosObservacion.codigo,
    nombre: instrumentosObservacion.nombre,
    fuente: instrumentosObservacion.fuente,
    contenido: sql<InstrumentoContenido>`${instrumentosObservacion.contenido}`,
    vigente: instrumentosObservacion.vigente,
    creadoEn: textoSql(instrumentosObservacion.creadoEn),
  };

  async instrumentoVigente(): Promise<InstrumentoFila | null> {
    const [fila] = await this.db
      .select(this.camposInstrumento)
      .from(instrumentosObservacion)
      .where(eq(instrumentosObservacion.vigente, true))
      .limit(1);
    return fila ?? null;
  }

  async instrumento(id: string): Promise<InstrumentoFila | null> {
    const [fila] = await this.db
      .select(this.camposInstrumento)
      .from(instrumentosObservacion)
      .where(eq(instrumentosObservacion.id, id))
      .limit(1);
    return fila ?? null;
  }

  async instrumentos(): Promise<InstrumentoFila[]> {
    return await this.db
      .select(this.camposInstrumento)
      .from(instrumentosObservacion)
      .orderBy(desc(instrumentosObservacion.creadoEn));
  }

  async existeCodigoInstrumento(codigo: string): Promise<boolean> {
    const [fila] = await this.db
      .select({ id: instrumentosObservacion.id })
      .from(instrumentosObservacion)
      .where(eq(instrumentosObservacion.codigo, codigo))
      .limit(1);
    return Boolean(fila);
  }

  async crearInstrumento(
    datos: {
      codigo: string;
      nombre: string;
      fuente?: string;
      contenido: InstrumentoContenido;
      creadoPorId: string;
    },
    vigente: boolean,
  ): Promise<string> {
    return await this.db.transaction(async (tx) => {
      if (vigente) {
        await tx
          .update(instrumentosObservacion)
          .set({ vigente: false })
          .where(eq(instrumentosObservacion.vigente, true));
      }
      const [fila] = await tx
        .insert(instrumentosObservacion)
        .values({
          codigo: datos.codigo,
          nombre: datos.nombre,
          fuente: datos.fuente ?? null,
          contenido: datos.contenido,
          vigente,
          creadoPorId: datos.creadoPorId,
        })
        .returning({ id: instrumentosObservacion.id });
      return fila.id;
    });
  }

  async marcarInstrumentoVigente(id: string) {
    await this.db.transaction(async (tx) => {
      await tx
        .update(instrumentosObservacion)
        .set({ vigente: false })
        .where(eq(instrumentosObservacion.vigente, true));
      await tx
        .update(instrumentosObservacion)
        .set({ vigente: true })
        .where(eq(instrumentosObservacion.id, id));
    });
  }

  async docentesActivos(): Promise<Array<{ id: string; nombre: string }>> {
    return await this.db
      .select({ id: docentes.id, nombre: nombreSql(personas) })
      .from(docentes)
      .innerJoin(personas, eq(personas.id, docentes.personaId))
      .where(and(isNull(docentes.eliminadoEn), eq(docentes.estado, "activo")))
      .orderBy(asc(personas.apellidoPaterno), asc(personas.nombres));
  }

  async conteosPorDocente(
    anioAcademicoId: string,
  ): Promise<Array<{ docenteId: string; estado: EstadoObservacion }>> {
    return await this.db
      .select({
        docenteId: observacionesAula.docenteId,
        estado: sql<EstadoObservacion>`${observacionesAula.estado}`,
      })
      .from(observacionesAula)
      .innerJoin(periodosAcademicos, eq(periodosAcademicos.id, observacionesAula.periodoId))
      .where(
        and(
          eq(periodosAcademicos.anioAcademicoId, anioAcademicoId),
          ne(observacionesAula.estado, "cancelada"),
        ),
      );
  }

  async calificacionesDelAnio(anioAcademicoId: string): Promise<
    Array<{
      observacionId: string;
      docenteId: string;
      fecha: string;
      observadorNombre: string;
      desempeno: number;
      nivel: 1 | 2 | 3 | 4;
    }>
  > {
    return await this.db
      .select({
        observacionId: observacionesAula.id,
        docenteId: observacionesAula.docenteId,
        fecha: textoSql(observacionesAula.fecha),
        observadorNombre: nombreSql(personaObservador),
        desempeno: observacionesAulaCalificaciones.desempeno,
        nivel: sql<1 | 2 | 3 | 4>`${observacionesAulaCalificaciones.nivel}`,
      })
      .from(observacionesAulaCalificaciones)
      .innerJoin(
        observacionesAula,
        eq(observacionesAula.id, observacionesAulaCalificaciones.observacionId),
      )
      .innerJoin(periodosAcademicos, eq(periodosAcademicos.id, observacionesAula.periodoId))
      .innerJoin(usuarios, eq(usuarios.id, observacionesAula.observadorUsuarioId))
      .innerJoin(personaObservador, eq(personaObservador.id, usuarios.personaId))
      .where(
        and(
          eq(periodosAcademicos.anioAcademicoId, anioAcademicoId),
          eq(observacionesAulaCalificaciones.vigente, true),
          inArray(observacionesAula.estado, ["calificada", "retroalimentada"]),
        ),
      )
      .orderBy(asc(observacionesAula.fecha));
  }

  async ultimaRetroalimentadaDelPeriodo(docenteId: string, periodoId: string) {
    const [fila] = await this.db
      .select({ id: observacionesAula.id, fecha: textoSql(observacionesAula.fecha) })
      .from(observacionesAula)
      .where(
        and(
          eq(observacionesAula.docenteId, docenteId),
          eq(observacionesAula.periodoId, periodoId),
          eq(observacionesAula.estado, "retroalimentada"),
        ),
      )
      .orderBy(desc(observacionesAula.fecha))
      .limit(1);
    return fila ?? null;
  }
}
