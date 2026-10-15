import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import { alias, type AnyPgColumn } from "drizzle-orm/pg-core";
import { Database, DRIZZLE } from "../../../core/database";
import {
  cursos,
  cursosSeccion,
  docentes,
  grados,
  horarios,
  periodosAcademicos,
  personas,
  secciones,
  sesionesClase,
  variablesSistema,
} from "../../../core/database/schema";
import type { EstadoJustificacion, EstadoSesion } from "../constants";
import type { SesionResponseDto } from "../dto";
import type {
  DatosFirmaIngreso,
  DatosFirmaSalida,
  ISesionesClaseRepository,
  ResultadoCierre,
} from "../interfaces";
import type { BloqueDelDia, SesionPlanificada } from "../utils";

const personaDocente = alias(personas, "persona_docente");
const docenteTitular = alias(docentes, "docente_titular");
const personaTitular = alias(personas, "persona_titular");

const nombre = (p: {
  apellidoPaterno: AnyPgColumn;
  apellidoMaterno: AnyPgColumn;
  nombres: AnyPgColumn;
}) =>
  sql<string>`TRIM(${p.apellidoPaterno} || ' ' || COALESCE(${p.apellidoMaterno}, '') || ', ' || ${p.nombres})`;

const hhmm = (columna: SQL | AnyPgColumn) => sql<string | null>`to_char(${columna}, 'HH24:MI')`;

@Injectable()
export class SesionesClaseRepository implements ISesionesClaseRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private consultaBase() {
    return this.db
      .select({
        id: sesionesClase.id,
        fecha: sesionesClase.fecha,
        horaInicio: hhmm(sql`COALESCE(${sesionesClase.horaInicioPlan}, ${horarios.horaInicio})`),
        horaFin: hhmm(sql`COALESCE(${sesionesClase.horaFinPlan}, ${horarios.horaFin})`),
        cursoNombre: cursos.nombre,
        seccionNombre: sql<string>`${grados.numero} || '.° ' || ${secciones.nombre}`,
        docenteId: sesionesClase.docenteId,
        docenteNombre: nombre(personaDocente),
        docenteTitularNombre: sql<
          string | null
        >`CASE WHEN ${personaTitular.id} IS NULL THEN NULL ELSE ${nombre(personaTitular)} END`,
        estado: sesionesClase.estado,
        tema: sesionesClase.tema,
        horaIngreso: hhmm(sesionesClase.horaInicioReal),
        horaSalida: hhmm(sesionesClase.horaFinReal),
        minutosRetraso: sesionesClase.minutosRetraso,
        minutosPerdidos: sesionesClase.minutosPerdidos,
        salidaAutomatica: sesionesClase.salidaAutomatica,
        observaciones: sesionesClase.observaciones,
        justificacionEstado: sesionesClase.justificacionEstado,
        justificacionMotivo: sesionesClase.justificacion,
        justificacionDocumentoUrl: sesionesClase.justificacionDocumentoUrl,
        justificacionComentario: sesionesClase.justificacionComentario,
        justificacionSolicitadaEn: sesionesClase.justificacionSolicitadaEn,
        justificacionRevisadaEn: sesionesClase.justificacionRevisadaEn,
      })
      .from(sesionesClase)
      .innerJoin(horarios, eq(horarios.id, sesionesClase.horarioId))
      .innerJoin(secciones, eq(secciones.id, horarios.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .innerJoin(cursosSeccion, eq(cursosSeccion.id, horarios.cursoSeccionId))
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .innerJoin(docentes, eq(docentes.id, sesionesClase.docenteId))
      .innerJoin(personaDocente, eq(personaDocente.id, docentes.personaId))
      .leftJoin(docenteTitular, eq(docenteTitular.id, sesionesClase.docenteTitularId))
      .leftJoin(personaTitular, eq(personaTitular.id, docenteTitular.personaId));
  }

  private mapear(
    fila: Awaited<ReturnType<SesionesClaseRepository["consultaBase"]>>[number],
  ): SesionResponseDto {
    return {
      id: fila.id,
      fecha: fila.fecha,
      horaInicio: fila.horaInicio ?? "",
      horaFin: fila.horaFin ?? "",
      cursoNombre: fila.cursoNombre,
      seccionNombre: fila.seccionNombre,
      docenteId: fila.docenteId,
      docenteNombre: fila.docenteNombre,
      docenteTitularNombre: fila.docenteTitularNombre,
      estado: fila.estado as EstadoSesion,
      tema: fila.tema,
      horaIngreso: fila.horaIngreso,
      horaSalida: fila.horaSalida,
      minutosRetraso: fila.minutosRetraso,
      minutosPerdidos: fila.minutosPerdidos,
      salidaAutomatica: fila.salidaAutomatica,
      observaciones: fila.observaciones,
      justificacion: fila.justificacionEstado
        ? {
            estado: fila.justificacionEstado as EstadoJustificacion,
            motivo: fila.justificacionMotivo ?? "",
            documentoUrl: fila.justificacionDocumentoUrl,
            comentario: fila.justificacionComentario,
            solicitadaEn: fila.justificacionSolicitadaEn,
            revisadaEn: fila.justificacionRevisadaEn,
          }
        : null,
    };
  }

  private ordenDelDia() {
    return [
      asc(sesionesClase.fecha),
      asc(sql`COALESCE(${sesionesClase.horaInicioPlan}, ${horarios.horaInicio})`),
      asc(grados.numero),
      asc(secciones.nombre),
    ];
  }

  async bloquesDelDia(anioAcademicoId: string, diaSemana: number): Promise<BloqueDelDia[]> {
    const filas = await this.db
      .select({
        horarioId: horarios.id,
        seccionId: horarios.seccionId,
        cursoSeccionId: horarios.cursoSeccionId,
        docenteId: cursosSeccion.docenteId,
        tipoBloque: horarios.tipoBloque,
        horaInicio: horarios.horaInicio,
        horaFin: horarios.horaFin,
      })
      .from(horarios)
      .innerJoin(secciones, eq(secciones.id, horarios.seccionId))
      .leftJoin(cursosSeccion, eq(cursosSeccion.id, horarios.cursoSeccionId))
      .where(
        and(
          eq(secciones.anioAcademicoId, anioAcademicoId),
          eq(secciones.estado, "activa"),
          eq(horarios.diaSemana, diaSemana),
        ),
      );
    return filas;
  }

  async insertarSesiones(fecha: string, planes: SesionPlanificada[]): Promise<number> {
    if (planes.length === 0) return 0;
    const creadas = await this.db
      .insert(sesionesClase)
      .values(
        planes.map((p) => ({
          horarioId: p.horarioId,
          docenteId: p.docenteId,
          fecha,
          horaInicioPlan: p.horaInicio,
          horaFinPlan: p.horaFin,
        })),
      )
      .onConflictDoNothing({ target: [sesionesClase.horarioId, sesionesClase.fecha] })
      .returning({ id: sesionesClase.id });
    return creadas.length;
  }

  async cerrarDia(
    fecha: string,
    salidaAutomatica: boolean,
    observacion: string,
  ): Promise<ResultadoCierre> {
    return this.db.transaction(async (tx) => {
      const noCumplidas = await tx
        .update(sesionesClase)
        .set({ estado: "no_cumplida", actualizadoEn: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(sesionesClase.estado, "pendiente"), sql`${sesionesClase.fecha} <= ${fecha}`))
        .returning({ id: sesionesClase.id });
      const parciales = await tx
        .update(sesionesClase)
        .set({
          estado: "parcial",
          observaciones: observacion,
          minutosPerdidos: sql`${sesionesClase.minutosRetraso}`,
          ...(salidaAutomatica
            ? {
                salidaAutomatica: true,
                horaFinReal: sql`${sesionesClase.horaFinPlan}`,
                firmadaFinEn: sql`(${sesionesClase.fecha} + ${sesionesClase.horaFinPlan})`,
              }
            : {}),
          actualizadoEn: sql`CURRENT_TIMESTAMP`,
        })
        .where(and(eq(sesionesClase.estado, "en_curso"), sql`${sesionesClase.fecha} <= ${fecha}`))
        .returning({ id: sesionesClase.id });
      return { noCumplidas: noCumplidas.length, parciales: parciales.length };
    });
  }

  async findById(id: string): Promise<SesionResponseDto | null> {
    const [fila] = await this.consultaBase().where(eq(sesionesClase.id, id)).limit(1);
    return fila ? this.mapear(fila) : null;
  }

  async sesionesDelDia(fecha: string): Promise<SesionResponseDto[]> {
    const filas = await this.consultaBase()
      .where(eq(sesionesClase.fecha, fecha))
      .orderBy(...this.ordenDelDia());
    return filas.map((f) => this.mapear(f));
  }

  async sesionesDeDocente(
    docenteId: string,
    desde: string,
    hasta: string,
  ): Promise<SesionResponseDto[]> {
    const filas = await this.consultaBase()
      .where(
        and(
          eq(sesionesClase.docenteId, docenteId),
          sql`${sesionesClase.fecha} >= ${desde}`,
          sql`${sesionesClase.fecha} <= ${hasta}`,
        ),
      )
      .orderBy(...this.ordenDelDia());
    return filas.map((f) => this.mapear(f));
  }

  async firmarIngreso(id: string, docenteId: string, datos: DatosFirmaIngreso): Promise<boolean> {
    const filas = await this.db
      .update(sesionesClase)
      .set({
        estado: "en_curso",
        tema: datos.tema,
        horaInicioReal: datos.hora,
        firmadaInicioEn: sql`(${sesionesClase.fecha} + ${datos.hora}::time)`,
        minutosRetraso: datos.minutosRetraso,
        equipoIngresoId: datos.equipoId,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(sesionesClase.id, id),
          eq(sesionesClase.docenteId, docenteId),
          eq(sesionesClase.estado, "pendiente"),
        ),
      )
      .returning({ id: sesionesClase.id });
    return filas.length === 1;
  }

  async firmarSalida(id: string, docenteId: string, datos: DatosFirmaSalida): Promise<boolean> {
    const filas = await this.db
      .update(sesionesClase)
      .set({
        estado: datos.estado,
        horaFinReal: datos.hora,
        firmadaFinEn: sql`(${sesionesClase.fecha} + ${datos.hora}::time)`,
        minutosPerdidos: datos.minutosPerdidos,
        equipoSalidaId: datos.equipoId,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(sesionesClase.id, id),
          eq(sesionesClase.docenteId, docenteId),
          eq(sesionesClase.estado, "en_curso"),
        ),
      )
      .returning({ id: sesionesClase.id });
    return filas.length === 1;
  }

  async actualizarTema(id: string, tema: string): Promise<void> {
    await this.db
      .update(sesionesClase)
      .set({ tema, actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(sesionesClase.id, id));
  }

  async reemplazar(id: string, docenteId: string): Promise<boolean> {
    const filas = await this.db
      .update(sesionesClase)
      .set({
        docenteTitularId: sql`COALESCE(${sesionesClase.docenteTitularId}, ${sesionesClase.docenteId})`,
        docenteId,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(sesionesClase.id, id), eq(sesionesClase.estado, "pendiente")))
      .returning({ id: sesionesClase.id });
    return filas.length === 1;
  }

  async solicitarJustificacion(
    id: string,
    motivo: string,
    documentoUrl: string | null,
  ): Promise<void> {
    await this.db
      .update(sesionesClase)
      .set({
        justificacionEstado: "solicitada",
        justificacion: motivo,
        justificacionDocumentoUrl: documentoUrl,
        justificacionSolicitadaEn: sql`CURRENT_TIMESTAMP`,
        justificacionComentario: null,
        justificacionRevisadaEn: null,
        justificacionRevisadaPorId: null,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(sesionesClase.id, id));
  }

  async resolverJustificacion(
    id: string,
    estado: Extract<EstadoJustificacion, "aprobada" | "rechazada">,
    usuarioId: string,
    comentario: string | null,
  ): Promise<void> {
    await this.db
      .update(sesionesClase)
      .set({
        justificacionEstado: estado,
        justificacionComentario: comentario,
        justificacionRevisadaPorId: usuarioId,
        justificacionRevisadaEn: sql`CURRENT_TIMESTAMP`,
        ...(estado === "aprobada" ? { estado: "justificada" } : {}),
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(sesionesClase.id, id), eq(sesionesClase.justificacionEstado, "solicitada")));
  }

  async justificacionesPorEstado(estado: EstadoJustificacion): Promise<SesionResponseDto[]> {
    const filas = await this.consultaBase()
      .where(
        and(eq(sesionesClase.justificacionEstado, estado), isNotNull(sesionesClase.justificacion)),
      )
      .orderBy(desc(sesionesClase.justificacionSolicitadaEn));
    return filas.map((f) => this.mapear(f));
  }

  async docenteDePersona(personaId: string): Promise<{ id: string; activo: boolean } | null> {
    const [fila] = await this.db
      .select({
        id: docentes.id,
        activo: sql<boolean>`${docentes.estado} = 'activo' AND ${docentes.eliminadoEn} IS NULL`,
      })
      .from(docentes)
      .where(eq(docentes.personaId, personaId))
      .limit(1);
    return fila ?? null;
  }

  async docenteActivo(docenteId: string): Promise<boolean> {
    const [fila] = await this.db
      .select({ id: docentes.id })
      .from(docentes)
      .where(
        and(
          eq(docentes.id, docenteId),
          eq(docentes.estado, "activo"),
          sql`${docentes.eliminadoEn} IS NULL`,
        ),
      )
      .limit(1);
    return Boolean(fila);
  }

  async valoresVariables(codigos: readonly string[]): Promise<Map<string, string>> {
    const filas = await this.db
      .select({ codigo: variablesSistema.codigo, valor: variablesSistema.valor })
      .from(variablesSistema)
      .where(
        and(inArray(variablesSistema.codigo, [...codigos]), eq(variablesSistema.vigente, true)),
      );
    return new Map(filas.map((f) => [f.codigo, f.valor]));
  }

  async buscarPeriodoIdPorFecha(fecha: string): Promise<string | null> {
    const [fila] = await this.db
      .select({ id: periodosAcademicos.id })
      .from(periodosAcademicos)
      .where(
        and(
          sql`${periodosAcademicos.fechaInicio} <= ${fecha}::date`,
          sql`${periodosAcademicos.fechaFin} >= ${fecha}::date`,
        ),
      )
      .limit(1);
    return fila?.id ?? null;
  }
}
