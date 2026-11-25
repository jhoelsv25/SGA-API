import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  entregasTarea,
  estudiantes,
  matriculas,
  personas,
  usuarios,
  variablesSistema,
} from "../../../core/database/schema";
import { VARIABLES_NOTA_PESO, type EstadoEntrega, type TipoTarea } from "../constants";
import type { EntregaFila } from "../interfaces";
import { aEntrega, columnasEntrega, nombreSql } from "./aula-shared.helper";

/**
 * Repositorio especializado en entregas de estudiantes, calificación manual,
 * matrículas participantes, pesos de evaluación y recordatorios sin entrega (RF-016).
 */
@Injectable()
export class AulaEntregasRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findEntrega(entregaId: string): Promise<EntregaFila | null> {
    const [fila] = await this.db
      .select({
        ...columnasEntrega,
        estudianteId: estudiantes.id,
        estudianteNombre: nombreSql(personas),
      })
      .from(entregasTarea)
      .innerJoin(matriculas, eq(matriculas.id, entregasTarea.matriculaId))
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .innerJoin(personas, eq(personas.id, estudiantes.personaId))
      .where(eq(entregasTarea.id, entregaId))
      .limit(1);

    return fila ? aEntrega(fila) : null;
  }

  async findEntregasDeTarea(tareaId: string): Promise<EntregaFila[]> {
    const filas = await this.db
      .select({
        ...columnasEntrega,
        estudianteId: estudiantes.id,
        estudianteNombre: nombreSql(personas),
      })
      .from(entregasTarea)
      .innerJoin(matriculas, eq(matriculas.id, entregasTarea.matriculaId))
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .innerJoin(personas, eq(personas.id, estudiantes.personaId))
      .where(eq(entregasTarea.tareaId, tareaId))
      .orderBy(asc(personas.apellidoPaterno), asc(entregasTarea.intento));

    return filas.map(aEntrega);
  }

  async findEntregasDeEstudiante(tareaId: string, matriculaId: string): Promise<EntregaFila[]> {
    const filas = await this.db
      .select(columnasEntrega)
      .from(entregasTarea)
      .where(and(eq(entregasTarea.tareaId, tareaId), eq(entregasTarea.matriculaId, matriculaId)))
      .orderBy(asc(entregasTarea.intento));

    return filas.map(aEntrega);
  }

  async findEntregaActiva(tareaId: string, matriculaId: string): Promise<EntregaFila | null> {
    const [fila] = await this.db
      .select(columnasEntrega)
      .from(entregasTarea)
      .where(and(eq(entregasTarea.tareaId, tareaId), eq(entregasTarea.matriculaId, matriculaId)))
      .orderBy(desc(entregasTarea.intento))
      .limit(1);

    return fila ? aEntrega(fila) : null;
  }

  async guardarEntrega(datos: {
    tareaId: string;
    matriculaId: string;
    intento: number;
    iniciadoEn?: string;
    entregadaEn?: string | null;
    texto?: string | null;
    archivoUrl?: string | null;
    archivoNombre?: string | null;
    archivoTamanoBytes?: number | null;
    enlaceUrl?: string | null;
    respuestas?: Record<string, unknown> | null;
    esTardia?: boolean;
    estado?: EstadoEntrega;
    nota?: number | null;
    retroalimentacion?: string | null;
    calificadaPorId?: string | null;
    calificadaEn?: string | null;
  }): Promise<EntregaFila> {
    const existente = await this.db
      .select({ id: entregasTarea.id })
      .from(entregasTarea)
      .where(
        and(
          eq(entregasTarea.tareaId, datos.tareaId),
          eq(entregasTarea.matriculaId, datos.matriculaId),
          eq(entregasTarea.intento, datos.intento),
        ),
      )
      .limit(1);

    if (existente.length > 0) {
      const [actualizada] = await this.db
        .update(entregasTarea)
        .set({
          entregadaEn: datos.entregadaEn !== undefined ? datos.entregadaEn : sql`CURRENT_TIMESTAMP`,
          texto: datos.texto !== undefined ? datos.texto : undefined,
          archivoUrl: datos.archivoUrl !== undefined ? datos.archivoUrl : undefined,
          archivoNombre: datos.archivoNombre !== undefined ? datos.archivoNombre : undefined,
          archivoTamanoBytes:
            datos.archivoTamanoBytes !== undefined ? datos.archivoTamanoBytes : undefined,
          enlaceUrl: datos.enlaceUrl !== undefined ? datos.enlaceUrl : undefined,
          respuestas: datos.respuestas !== undefined ? datos.respuestas : undefined,
          esTardia: datos.esTardia !== undefined ? datos.esTardia : undefined,
          estado: datos.estado !== undefined ? datos.estado : undefined,
          nota:
            datos.nota !== undefined
              ? datos.nota !== null
                ? String(datos.nota)
                : null
              : undefined,
          retroalimentacion:
            datos.retroalimentacion !== undefined ? datos.retroalimentacion : undefined,
          calificadaPorId: datos.calificadaPorId !== undefined ? datos.calificadaPorId : undefined,
          calificadaEn: datos.calificadaEn !== undefined ? datos.calificadaEn : undefined,
        })
        .where(eq(entregasTarea.id, existente[0].id))
        .returning(columnasEntrega);

      return aEntrega(actualizada);
    }

    const [insertada] = await this.db
      .insert(entregasTarea)
      .values({
        tareaId: datos.tareaId,
        matriculaId: datos.matriculaId,
        intento: datos.intento,
        iniciadoEn: datos.iniciadoEn,
        entregadaEn: datos.entregadaEn ?? null,
        texto: datos.texto ?? null,
        archivoUrl: datos.archivoUrl ?? null,
        archivoNombre: datos.archivoNombre ?? null,
        archivoTamanoBytes: datos.archivoTamanoBytes ?? null,
        enlaceUrl: datos.enlaceUrl ?? null,
        respuestas: datos.respuestas ?? null,
        esTardia: datos.esTardia ?? false,
        estado: datos.estado ?? "entregada",
        nota: datos.nota !== undefined && datos.nota !== null ? String(datos.nota) : null,
        retroalimentacion: datos.retroalimentacion ?? null,
        calificadaPorId: datos.calificadaPorId ?? null,
        calificadaEn: datos.calificadaEn ?? null,
      })
      .returning(columnasEntrega);

    return aEntrega(insertada);
  }

  async calificarEntrega(
    entregaId: string,
    datos: {
      nota: number;
      retroalimentacion?: string | null;
      calificadaPorId: string;
      calificadaEn: string;
      respuestas?: Record<string, unknown> | null;
      estado?: EstadoEntrega;
    },
  ): Promise<EntregaFila> {
    const [calificada] = await this.db
      .update(entregasTarea)
      .set({
        nota: String(datos.nota),
        retroalimentacion: datos.retroalimentacion ?? null,
        calificadaPorId: datos.calificadaPorId,
        calificadaEn: datos.calificadaEn,
        respuestas: datos.respuestas !== undefined ? datos.respuestas : undefined,
        estado: datos.estado ?? "calificada",
      })
      .where(eq(entregasTarea.id, entregaId))
      .returning(columnasEntrega);

    return aEntrega(calificada);
  }

  async devolverEntrega(
    entregaId: string,
    retroalimentacion: string,
    calificadaPorId: string,
  ): Promise<EntregaFila> {
    const [devuelta] = await this.db
      .update(entregasTarea)
      .set({
        estado: "devuelta",
        retroalimentacion,
        calificadaPorId,
        calificadaEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(entregasTarea.id, entregaId))
      .returning(columnasEntrega);

    return aEntrega(devuelta);
  }

  async findMatriculaDeEstudiante(
    seccionId: string,
    estudiantePersonaIdOId: string,
  ): Promise<{ id: string; estudianteId: string; codigo: string; nombreCompleto: string } | null> {
    const [fila] = await this.db
      .select({
        id: matriculas.id,
        estudianteId: estudiantes.id,
        codigo: matriculas.codigo,
        nombreCompleto: nombreSql(personas),
      })
      .from(matriculas)
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .innerJoin(personas, eq(personas.id, estudiantes.personaId))
      .where(
        and(
          eq(matriculas.seccionId, seccionId),
          inArray(matriculas.estado, ["matriculado", "vigente"]),
          or(
            eq(estudiantes.personaId, estudiantePersonaIdOId),
            eq(estudiantes.id, estudiantePersonaIdOId),
          ),
        ),
      )
      .limit(1);

    return fila ?? null;
  }

  async listarEstudiantesDeSeccion(
    seccionId: string,
  ): Promise<
    Array<{ matriculaId: string; estudianteId: string; codigo: string; nombreCompleto: string }>
  > {
    return this.db
      .select({
        matriculaId: matriculas.id,
        estudianteId: estudiantes.id,
        codigo: matriculas.codigo,
        nombreCompleto: nombreSql(personas),
      })
      .from(matriculas)
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .innerJoin(personas, eq(personas.id, estudiantes.personaId))
      .where(
        and(
          eq(matriculas.seccionId, seccionId),
          inArray(matriculas.estado, ["matriculado", "vigente"]),
        ),
      )
      .orderBy(asc(personas.apellidoPaterno), asc(personas.nombres));
  }

  async obtenerPesosVariables(): Promise<Record<TipoTarea, number>> {
    const vars = await this.db
      .select({ codigo: variablesSistema.codigo, valor: variablesSistema.valor })
      .from(variablesSistema)
      .where(
        and(
          inArray(variablesSistema.codigo, [
            VARIABLES_NOTA_PESO.EXAMEN,
            VARIABLES_NOTA_PESO.CUESTIONARIO,
            VARIABLES_NOTA_PESO.TRABAJO,
            VARIABLES_NOTA_PESO.PROYECTO,
          ]),
          eq(variablesSistema.vigente, true),
        ),
      );

    const mapa: Record<string, number> = {};
    for (const v of vars) {
      mapa[v.codigo] = parseFloat(v.valor) || 25;
    }

    return {
      examen: mapa[VARIABLES_NOTA_PESO.EXAMEN] ?? 25,
      cuestionario: mapa[VARIABLES_NOTA_PESO.CUESTIONARIO] ?? 25,
      trabajo: mapa[VARIABLES_NOTA_PESO.TRABAJO] ?? 25,
      proyecto: mapa[VARIABLES_NOTA_PESO.PROYECTO] ?? 25,
    };
  }

  async findEstudiantesSinEntrega(
    tareaId: string,
    seccionId: string,
    anioAcademicoId: string,
  ): Promise<Array<{ usuarioId: string; matriculaId: string }>> {
    return this.db
      .selectDistinct({
        usuarioId: usuarios.id,
        matriculaId: matriculas.id,
      })
      .from(matriculas)
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .innerJoin(personas, eq(personas.id, estudiantes.personaId))
      .innerJoin(usuarios, eq(usuarios.personaId, personas.id))
      .leftJoin(
        entregasTarea,
        and(
          eq(entregasTarea.tareaId, tareaId),
          eq(entregasTarea.matriculaId, matriculas.id),
          sql`${entregasTarea.estado} IN ('entregada', 'calificada')`,
        ),
      )
      .where(
        and(
          eq(matriculas.seccionId, seccionId),
          eq(matriculas.anioAcademicoId, anioAcademicoId),
          eq(matriculas.estado, "matriculado"),
          isNull(usuarios.eliminadoEn),
          isNull(entregasTarea.id),
        ),
      );
  }
}
