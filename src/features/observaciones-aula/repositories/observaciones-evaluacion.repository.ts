import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  docentes,
  observacionesAula,
  observacionesAulaArchivos,
  observacionesAulaCalificaciones,
  observacionesAulaComentarios,
  observacionesAulaCompromisos,
  observacionesAulaNotas,
} from "../../../core/database/schema";
import type {
  ArchivoFila,
  CalificacionFila,
  ComentarioFila,
  CompromisoObsFila,
  NotaFila,
} from "../interfaces";
import { nombreSql, personaDocente, textoNuloSql, textoSql } from "./observaciones-shared.helper";

/**
 * Repositorio especializado en notas de observación, calificaciones rubricadas,
 * compromisos de mejora, comentarios docentes y archivos adjuntos firmados.
 */
@Injectable()
export class ObservacionesEvaluacionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private readonly camposNota = {
    id: observacionesAulaNotas.id,
    observacionId: observacionesAulaNotas.observacionId,
    desempeno: observacionesAulaNotas.desempeno,
    aspecto: observacionesAulaNotas.aspecto,
    texto: observacionesAulaNotas.texto,
    horaAproximada: textoNuloSql(observacionesAulaNotas.horaAproximada),
    creadoEn: textoSql(observacionesAulaNotas.creadoEn),
  };

  private readonly camposCalificacion = {
    id: observacionesAulaCalificaciones.id,
    observacionId: observacionesAulaCalificaciones.observacionId,
    desempeno: observacionesAulaCalificaciones.desempeno,
    nivel: sql<1 | 2 | 3 | 4>`${observacionesAulaCalificaciones.nivel}`,
    fundamento: observacionesAulaCalificaciones.fundamento,
    version: observacionesAulaCalificaciones.version,
    vigente: observacionesAulaCalificaciones.vigente,
    motivoCambio: observacionesAulaCalificaciones.motivoCambio,
    creadoPorId: observacionesAulaCalificaciones.creadoPorId,
    creadoEn: textoSql(observacionesAulaCalificaciones.creadoEn),
  };

  private readonly camposCompromiso = {
    id: observacionesAulaCompromisos.id,
    compromisoId: observacionesAulaCompromisos.compromisoId,
    observacionId: observacionesAulaCompromisos.observacionId,
    desempeno: observacionesAulaCompromisos.desempeno,
    descripcion: observacionesAulaCompromisos.descripcion,
    fechaRevision: textoSql(observacionesAulaCompromisos.fechaRevision),
    estado: sql<"pendiente" | "cumplido" | "no_cumplido">`${observacionesAulaCompromisos.estado}`,
    observacionCierre: observacionesAulaCompromisos.observacionCierre,
    cerradoEn: textoNuloSql(observacionesAulaCompromisos.cerradoEn),
    version: observacionesAulaCompromisos.version,
    vigente: observacionesAulaCompromisos.vigente,
    motivoCambio: observacionesAulaCompromisos.motivoCambio,
    creadoPorId: observacionesAulaCompromisos.creadoPorId,
    creadoEn: textoSql(observacionesAulaCompromisos.creadoEn),
  };

  async agregarNota(datos: {
    observacionId: string;
    desempeno: number;
    aspecto?: string;
    texto: string;
    horaAproximada?: string;
  }): Promise<NotaFila> {
    const [fila] = await this.db
      .insert(observacionesAulaNotas)
      .values({
        observacionId: datos.observacionId,
        desempeno: datos.desempeno,
        aspecto: datos.aspecto ?? null,
        texto: datos.texto,
        horaAproximada: datos.horaAproximada ?? null,
      })
      .returning({ id: observacionesAulaNotas.id });
    return (await this.obtenerNota(fila.id)) as NotaFila;
  }

  async obtenerNota(id: string): Promise<NotaFila | null> {
    const [fila] = await this.db
      .select(this.camposNota)
      .from(observacionesAulaNotas)
      .where(eq(observacionesAulaNotas.id, id))
      .limit(1);
    return fila ?? null;
  }

  async editarNota(id: string, textoNuevo: string) {
    await this.db
      .update(observacionesAulaNotas)
      .set({ texto: textoNuevo, actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(observacionesAulaNotas.id, id));
  }

  async notas(observacionId: string): Promise<NotaFila[]> {
    return await this.db
      .select(this.camposNota)
      .from(observacionesAulaNotas)
      .where(eq(observacionesAulaNotas.observacionId, observacionId))
      .orderBy(asc(observacionesAulaNotas.desempeno), asc(observacionesAulaNotas.creadoEn));
  }

  async calificacionesVigentes(observacionId: string): Promise<CalificacionFila[]> {
    return await this.db
      .select(this.camposCalificacion)
      .from(observacionesAulaCalificaciones)
      .where(
        and(
          eq(observacionesAulaCalificaciones.observacionId, observacionId),
          eq(observacionesAulaCalificaciones.vigente, true),
        ),
      )
      .orderBy(asc(observacionesAulaCalificaciones.desempeno));
  }

  async historialCalificaciones(observacionId: string): Promise<CalificacionFila[]> {
    return await this.db
      .select(this.camposCalificacion)
      .from(observacionesAulaCalificaciones)
      .where(eq(observacionesAulaCalificaciones.observacionId, observacionId))
      .orderBy(
        asc(observacionesAulaCalificaciones.desempeno),
        desc(observacionesAulaCalificaciones.version),
      );
  }

  async guardarBorrador(
    observacionId: string,
    desempeno: number,
    nivel: number,
    fundamento: string,
    usuarioId: string,
  ) {
    const [existente] = await this.db
      .select({ id: observacionesAulaCalificaciones.id })
      .from(observacionesAulaCalificaciones)
      .where(
        and(
          eq(observacionesAulaCalificaciones.observacionId, observacionId),
          eq(observacionesAulaCalificaciones.desempeno, desempeno),
          eq(observacionesAulaCalificaciones.vigente, true),
        ),
      )
      .limit(1);
    if (existente) {
      await this.db
        .update(observacionesAulaCalificaciones)
        .set({ nivel, fundamento, creadoPorId: usuarioId })
        .where(eq(observacionesAulaCalificaciones.id, existente.id));
      return;
    }
    await this.db
      .insert(observacionesAulaCalificaciones)
      .values({ observacionId, desempeno, nivel, fundamento, creadoPorId: usuarioId });
  }

  async nuevaVersionCalificacion(
    vigente: CalificacionFila,
    cambios: { nivel: number; fundamento: string },
    motivo: string,
    usuarioId: string,
  ): Promise<number> {
    return await this.db.transaction(async (tx) => {
      await tx
        .update(observacionesAulaCalificaciones)
        .set({ vigente: false })
        .where(eq(observacionesAulaCalificaciones.id, vigente.id));
      await tx.insert(observacionesAulaCalificaciones).values({
        observacionId: vigente.observacionId,
        desempeno: vigente.desempeno,
        nivel: cambios.nivel,
        fundamento: cambios.fundamento,
        version: vigente.version + 1,
        motivoCambio: motivo,
        creadoPorId: usuarioId,
      });
      return vigente.version + 1;
    });
  }

  async crearCompromiso(datos: {
    observacionId: string;
    desempeno: number;
    descripcion: string;
    fechaRevision: string;
    creadoPorId: string;
  }): Promise<CompromisoObsFila> {
    const id = randomUUID();
    await this.db.insert(observacionesAulaCompromisos).values({
      id,
      compromisoId: id,
      observacionId: datos.observacionId,
      desempeno: datos.desempeno,
      descripcion: datos.descripcion,
      fechaRevision: datos.fechaRevision,
      creadoPorId: datos.creadoPorId,
    });
    return (await this.obtenerCompromisoFila(id)) as CompromisoObsFila;
  }

  async obtenerCompromisoFila(id: string): Promise<CompromisoObsFila | null> {
    const [fila] = await this.db
      .select(this.camposCompromiso)
      .from(observacionesAulaCompromisos)
      .where(eq(observacionesAulaCompromisos.id, id))
      .limit(1);
    return fila ?? null;
  }

  async compromisoVigente(compromisoId: string): Promise<CompromisoObsFila | null> {
    const [fila] = await this.db
      .select(this.camposCompromiso)
      .from(observacionesAulaCompromisos)
      .where(
        and(
          eq(observacionesAulaCompromisos.compromisoId, compromisoId),
          eq(observacionesAulaCompromisos.vigente, true),
        ),
      )
      .limit(1);
    return fila ?? null;
  }

  async compromisosVigentes(observacionId: string): Promise<CompromisoObsFila[]> {
    return await this.db
      .select(this.camposCompromiso)
      .from(observacionesAulaCompromisos)
      .where(
        and(
          eq(observacionesAulaCompromisos.observacionId, observacionId),
          eq(observacionesAulaCompromisos.vigente, true),
        ),
      )
      .orderBy(asc(observacionesAulaCompromisos.fechaRevision));
  }

  async historialCompromisos(observacionId: string): Promise<CompromisoObsFila[]> {
    return await this.db
      .select(this.camposCompromiso)
      .from(observacionesAulaCompromisos)
      .where(eq(observacionesAulaCompromisos.observacionId, observacionId))
      .orderBy(
        asc(observacionesAulaCompromisos.compromisoId),
        desc(observacionesAulaCompromisos.version),
      );
  }

  async editarCompromisoEnSitio(id: string, descripcion: string, fechaRevision: string) {
    await this.db
      .update(observacionesAulaCompromisos)
      .set({ descripcion, fechaRevision })
      .where(eq(observacionesAulaCompromisos.id, id));
  }

  async nuevaVersionCompromiso(
    vigente: CompromisoObsFila,
    cambios: { descripcion: string; fechaRevision: string },
    motivo: string,
    usuarioId: string,
  ): Promise<number> {
    return await this.db.transaction(async (tx) => {
      await tx
        .update(observacionesAulaCompromisos)
        .set({ vigente: false })
        .where(eq(observacionesAulaCompromisos.id, vigente.id));
      await tx.insert(observacionesAulaCompromisos).values({
        compromisoId: vigente.compromisoId,
        observacionId: vigente.observacionId,
        desempeno: vigente.desempeno,
        descripcion: cambios.descripcion,
        fechaRevision: cambios.fechaRevision,
        estado: vigente.estado,
        observacionCierre: vigente.observacionCierre,
        version: vigente.version + 1,
        motivoCambio: motivo,
        creadoPorId: usuarioId,
      });
      return vigente.version + 1;
    });
  }

  async cerrarCompromiso(id: string, resultado: string, observacion: string, usuarioId: string) {
    await this.db
      .update(observacionesAulaCompromisos)
      .set({
        estado: resultado,
        observacionCierre: observacion,
        cerradoPorId: usuarioId,
        cerradoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(observacionesAulaCompromisos.id, id));
  }

  async compromisosPorRevisar(hasta: string, soloEstaFecha = false) {
    return await this.db
      .select({
        ...this.camposCompromiso,
        docenteApellido: personaDocente.apellidoPaterno,
        docenteNombre: nombreSql(personaDocente),
        observadorUsuarioId: observacionesAula.observadorUsuarioId,
        docenteId: observacionesAula.docenteId,
      })
      .from(observacionesAulaCompromisos)
      .innerJoin(
        observacionesAula,
        eq(observacionesAula.id, observacionesAulaCompromisos.observacionId),
      )
      .innerJoin(docentes, eq(docentes.id, observacionesAula.docenteId))
      .innerJoin(personaDocente, eq(personaDocente.id, docentes.personaId))
      .where(
        and(
          eq(observacionesAulaCompromisos.vigente, true),
          eq(observacionesAulaCompromisos.estado, "pendiente"),
          eq(observacionesAula.estado, "retroalimentada"),
          soloEstaFecha
            ? sql`${observacionesAulaCompromisos.fechaRevision} = ${hasta}::date`
            : sql`${observacionesAulaCompromisos.fechaRevision} <= ${hasta}::date`,
        ),
      )
      .orderBy(asc(observacionesAulaCompromisos.fechaRevision));
  }

  async comentarioDe(observacionId: string): Promise<ComentarioFila | null> {
    const [fila] = await this.db
      .select({
        id: observacionesAulaComentarios.id,
        texto: observacionesAulaComentarios.texto,
        creadoEn: textoSql(observacionesAulaComentarios.creadoEn),
      })
      .from(observacionesAulaComentarios)
      .where(eq(observacionesAulaComentarios.observacionId, observacionId))
      .limit(1);
    return fila ?? null;
  }

  async crearComentario(observacionId: string, textoComentario: string, usuarioId: string) {
    const filas = await this.db
      .insert(observacionesAulaComentarios)
      .values({ observacionId, texto: textoComentario, usuarioId })
      .onConflictDoNothing()
      .returning({ id: observacionesAulaComentarios.id });
    return filas.length === 1;
  }

  async crearArchivo(datos: {
    observacionId: string;
    url: string;
    nombreOriginal: string;
    subidoPorId: string;
  }) {
    await this.db.insert(observacionesAulaArchivos).values(datos);
  }

  async archivos(observacionId: string): Promise<ArchivoFila[]> {
    return await this.db
      .select({
        id: observacionesAulaArchivos.id,
        url: observacionesAulaArchivos.url,
        nombreOriginal: observacionesAulaArchivos.nombreOriginal,
        retirado: observacionesAulaArchivos.retirado,
        creadoEn: textoSql(observacionesAulaArchivos.creadoEn),
      })
      .from(observacionesAulaArchivos)
      .where(eq(observacionesAulaArchivos.observacionId, observacionId))
      .orderBy(desc(observacionesAulaArchivos.creadoEn));
  }
}
