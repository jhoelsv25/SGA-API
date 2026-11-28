import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  cursos,
  cursosSeccion,
  grados,
  notificaciones,
  opcionesPregunta,
  preguntasTarea,
  secciones,
  tareas,
} from "../../../core/database/schema";
import type { TipoPregunta, TipoTarea } from "../constants";
import type { NuevaTarea, PreguntaConOpciones, TareaConPreguntas, TareaFila } from "../interfaces";
import { aTarea, columnasTarea } from "./aula-shared.helper";

/**
 * Repositorio especializado en tareas, exámenes/cuestionarios, preguntas
 * y consultas de ventana de vencimiento para recordatorios (RF-016).
 */
@Injectable()
export class AulaTareasRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async listarTareas(
    cursoSeccionId: string,
    opciones: { soloPublicadas?: boolean; unidadId?: string; periodoId?: string },
  ): Promise<TareaFila[]> {
    const condiciones = [eq(tareas.cursoSeccionId, cursoSeccionId)];
    if (opciones.soloPublicadas) {
      condiciones.push(inArray(tareas.estado, ["publicada", "cerrada"]));
    }
    if (opciones.unidadId) condiciones.push(eq(tareas.unidadId, opciones.unidadId));
    if (opciones.periodoId) condiciones.push(eq(tareas.periodoId, opciones.periodoId));

    const filas = await this.db
      .select(columnasTarea)
      .from(tareas)
      .where(and(...condiciones))
      .orderBy(asc(tareas.fechaLimite), asc(tareas.creadoEn));

    return filas.map(aTarea);
  }

  async findTarea(tareaId: string): Promise<TareaConPreguntas | null> {
    const [fila] = await this.db
      .select(columnasTarea)
      .from(tareas)
      .where(eq(tareas.id, tareaId))
      .limit(1);

    if (!fila) return null;
    const tareaBase = aTarea(fila);

    const filasPreguntas = await this.db
      .select({
        id: preguntasTarea.id,
        tareaId: preguntasTarea.tareaId,
        enunciado: preguntasTarea.enunciado,
        tipo: preguntasTarea.tipo,
        puntaje: sql<number>`${preguntasTarea.puntaje}::float`,
        orden: preguntasTarea.orden,
      })
      .from(preguntasTarea)
      .where(eq(preguntasTarea.tareaId, tareaId))
      .orderBy(asc(preguntasTarea.orden));

    const preguntasIds = filasPreguntas.map((p) => p.id);
    const filasOpciones =
      preguntasIds.length > 0
        ? await this.db
            .select({
              id: opcionesPregunta.id,
              preguntaId: opcionesPregunta.preguntaId,
              texto: opcionesPregunta.texto,
              esCorrecta: opcionesPregunta.esCorrecta,
              orden: opcionesPregunta.orden,
            })
            .from(opcionesPregunta)
            .where(inArray(opcionesPregunta.preguntaId, preguntasIds))
            .orderBy(asc(opcionesPregunta.orden))
        : [];

    const opcionesPorPregunta = new Map<
      string,
      Array<{ id: string; texto: string; esCorrecta: boolean; orden: number }>
    >();
    for (const o of filasOpciones) {
      const arr = opcionesPorPregunta.get(o.preguntaId) || [];
      arr.push({ id: o.id, texto: o.texto, esCorrecta: o.esCorrecta, orden: o.orden });
      opcionesPorPregunta.set(o.preguntaId, arr);
    }

    const preguntas: PreguntaConOpciones[] = filasPreguntas.map((p) => ({
      id: p.id,
      tareaId: p.tareaId,
      enunciado: p.enunciado,
      tipo: p.tipo as TipoPregunta,
      puntaje: Number(p.puntaje) || 1,
      orden: p.orden,
      opciones: opcionesPorPregunta.get(p.id) || [],
    }));

    return { ...tareaBase, preguntas };
  }

  async crearTarea(datos: NuevaTarea): Promise<TareaFila> {
    const [creada] = await this.db
      .insert(tareas)
      .values({
        cursoSeccionId: datos.cursoSeccionId,
        periodoId: datos.periodoId ?? null,
        unidadId: datos.unidadId ?? null,
        sesionClaseId: datos.sesionClaseId ?? null,
        titulo: datos.titulo,
        instrucciones: datos.instrucciones ?? null,
        tipo: datos.tipo,
        fechaLimite: datos.fechaLimite,
        permiteEntregaTardia: datos.permiteEntregaTardia ?? false,
        intentosMaximos: datos.intentosMaximos ?? 1,
        limiteTiempoMinutos: datos.limiteTiempoMinutos ?? null,
        calculoNotaIntentos: datos.calculoNotaIntentos ?? "mas_alta",
        revelarRespuestas: datos.revelarRespuestas ?? "al_terminar_intentos",
        tiposArchivo: datos.tiposArchivo ?? null,
        estado: datos.estado ?? "borrador",
        publicadaEn: datos.estado === "publicada" ? sql`CURRENT_TIMESTAMP` : null,
      })
      .returning(columnasTarea);

    return aTarea(creada);
  }

  async actualizarTarea(tareaId: string, datos: Partial<NuevaTarea>): Promise<TareaFila> {
    const updates: Record<string, unknown> = { actualizadoEn: sql`CURRENT_TIMESTAMP` };
    if (datos.titulo !== undefined) updates.titulo = datos.titulo;
    if (datos.instrucciones !== undefined) updates.instrucciones = datos.instrucciones;
    if (datos.tipo !== undefined) updates.tipo = datos.tipo;
    if (datos.fechaLimite !== undefined) updates.fechaLimite = datos.fechaLimite;
    if (datos.permiteEntregaTardia !== undefined) {
      updates.permiteEntregaTardia = datos.permiteEntregaTardia;
    }
    if (datos.intentosMaximos !== undefined) updates.intentosMaximos = datos.intentosMaximos;
    if (datos.limiteTiempoMinutos !== undefined) {
      updates.limiteTiempoMinutos = datos.limiteTiempoMinutos;
    }
    if (datos.calculoNotaIntentos !== undefined) {
      updates.calculoNotaIntentos = datos.calculoNotaIntentos;
    }
    if (datos.revelarRespuestas !== undefined) updates.revelarRespuestas = datos.revelarRespuestas;
    if (datos.tiposArchivo !== undefined) updates.tiposArchivo = datos.tiposArchivo;
    if (datos.periodoId !== undefined) updates.periodoId = datos.periodoId;
    if (datos.unidadId !== undefined) updates.unidadId = datos.unidadId;

    const [actualizada] = await this.db
      .update(tareas)
      .set(updates)
      .where(eq(tareas.id, tareaId))
      .returning(columnasTarea);

    return aTarea(actualizada);
  }

  async publicarTarea(tareaId: string, publicadaEn: string): Promise<TareaFila> {
    const [publicada] = await this.db
      .update(tareas)
      .set({ estado: "publicada", publicadaEn, actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(tareas.id, tareaId))
      .returning(columnasTarea);

    return aTarea(publicada);
  }

  async cerrarTarea(tareaId: string, _cerradaEn: string): Promise<TareaFila> {
    const [cerrada] = await this.db
      .update(tareas)
      .set({ estado: "cerrada", actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(tareas.id, tareaId))
      .returning(columnasTarea);

    return aTarea(cerrada);
  }

  async eliminarTarea(tareaId: string): Promise<void> {
    await this.db.delete(tareas).where(eq(tareas.id, tareaId));
  }

  async guardarPreguntasTarea(
    tareaId: string,
    preguntas: Array<{
      enunciado: string;
      tipo: TipoPregunta;
      puntaje: number;
      orden: number;
      opciones?: Array<{ texto: string; esCorrecta: boolean; orden: number }>;
    }>,
  ): Promise<void> {
    await this.db.delete(preguntasTarea).where(eq(preguntasTarea.tareaId, tareaId));

    for (const p of preguntas) {
      const [insertada] = await this.db
        .insert(preguntasTarea)
        .values({
          tareaId,
          enunciado: p.enunciado,
          tipo: p.tipo,
          puntaje: String(p.puntaje),
          orden: p.orden,
        })
        .returning({ id: preguntasTarea.id });

      if (p.opciones && p.opciones.length > 0) {
        await this.db.insert(opcionesPregunta).values(
          p.opciones.map((o) => ({
            preguntaId: insertada.id,
            texto: o.texto,
            esCorrecta: o.esCorrecta,
            orden: o.orden,
          })),
        );
      }
    }
  }

  async findTareasParaVentana(
    desde: string,
    hasta: string,
  ): Promise<
    Array<{
      id: string;
      titulo: string;
      tipo: TipoTarea;
      fechaLimite: string;
      permiteEntregaTardia: boolean;
      cursoSeccionId: string;
      cursoNombre: string;
      seccionNombre: string;
      seccionId: string;
      anioAcademicoId: string;
    }>
  > {
    const filas = await this.db
      .select({
        id: tareas.id,
        titulo: tareas.titulo,
        tipo: tareas.tipo,
        fechaLimite: tareas.fechaLimite,
        permiteEntregaTardia: tareas.permiteEntregaTardia,
        cursoSeccionId: cursosSeccion.id,
        cursoNombre: cursos.nombre,
        seccionNombre: sql<string>`CONCAT(${grados.nombre}, ' ', ${secciones.nombre})`,
        seccionId: cursosSeccion.seccionId,
        anioAcademicoId: secciones.anioAcademicoId,
      })
      .from(tareas)
      .innerJoin(cursosSeccion, eq(cursosSeccion.id, tareas.cursoSeccionId))
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .where(
        and(
          eq(tareas.estado, "publicada"),
          sql`${tareas.fechaLimite} >= ${desde}::timestamp`,
          sql`${tareas.fechaLimite} <= ${hasta}::timestamp`,
        ),
      );
    return filas.map((f) => ({ ...f, tipo: f.tipo as TipoTarea }));
  }

  async yaSeNotifico(usuarioId: string, enlaceUrl: string): Promise<boolean> {
    const [fila] = await this.db
      .select({ id: notificaciones.id })
      .from(notificaciones)
      .where(and(eq(notificaciones.usuarioId, usuarioId), eq(notificaciones.enlaceUrl, enlaceUrl)))
      .limit(1);
    return Boolean(fila);
  }
}
