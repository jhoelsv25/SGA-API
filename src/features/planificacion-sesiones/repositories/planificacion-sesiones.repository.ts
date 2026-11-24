import { Inject, Injectable } from "@nestjs/common";
import { and, asc, between, eq, inArray, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  areasCurriculares,
  capacidadesCurriculares,
  catalogoSesionOpciones,
  competenciasCurriculares,
  cursos,
  cursosSeccion,
  desempenosCurriculares,
  docentes,
  enfoquesTransversales,
  enfoquesValores,
  enfoquesAccionesObservables,
  grados,
  horarios,
  periodosAcademicos,
  personas,
  planificacionesComentarios,
  planificacionesCompetencias,
  planificacionesMomentos,
  planificacionesSesion,
  secciones,
  sesionesClase,
  sesionesVerificacionAula,
  usuarios,
} from "../../../core/database/schema";
import type { EstadoPlanificacion, Momento, TipoOpcionCatalogo } from "../constants";
import type {
  BloqueDocente,
  ComentarioPlanificacion,
  CompetenciaPlanificada,
  DatosGuardarPlanificacion,
  MomentoPlanificado,
  PlanificacionFila,
} from "../interfaces";

const nombrePersona = sql<string>`concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno})`;

const camposBloque = {
  horarioId: horarios.id,
  cursoSeccionId: cursosSeccion.id,
  docenteId: sql<string>`${cursosSeccion.docenteId}`,
  diaSemana: horarios.diaSemana,
  horaInicio: sql<string>`${horarios.horaInicio}::text`,
  horaFin: sql<string>`${horarios.horaFin}::text`,
  cursoNombre: cursos.nombre,
  areaCurricular: cursos.areaCurricular,
  seccionNombre: secciones.nombre,
  gradoNumero: grados.numero,
  gradoNombre: grados.nombre,
};

const camposPlanificacion = {
  id: planificacionesSesion.id,
  docenteId: planificacionesSesion.docenteId,
  docentePersonaId: docentes.personaId,
  docenteNombre: nombrePersona,
  cursoSeccionId: planificacionesSesion.cursoSeccionId,
  horarioId: planificacionesSesion.horarioId,
  sesionClaseId: planificacionesSesion.sesionClaseId,
  fecha: sql<string>`${planificacionesSesion.fecha}::text`,
  numero: planificacionesSesion.numero,
  unidad: planificacionesSesion.unidad,
  titulo: planificacionesSesion.titulo,
  proposito: planificacionesSesion.proposito,
  evidencia: planificacionesSesion.evidencia,
  criterios: planificacionesSesion.criterios,
  instrumentoCodigo: planificacionesSesion.instrumentoCodigo,
  competenciasTransversales: planificacionesSesion.competenciasTransversales,
  enfoques: planificacionesSesion.enfoques,
  materiales: planificacionesSesion.materiales,
  referencias: planificacionesSesion.referencias,
  estado: planificacionesSesion.estado,
  copiadaDeId: planificacionesSesion.copiadaDeId,
  actualizadoEn: sql<string>`${planificacionesSesion.actualizadoEn}::text`,
};

@Injectable()
export class PlanificacionSesionesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // ─── Catálogo curricular ───────────────────────────────────────────────────
  areas() {
    return this.db.select().from(areasCurriculares).orderBy(asc(areasCurriculares.orden));
  }

  async competencias(areaCodigo?: string) {
    const competencias = await this.db
      .select({
        id: competenciasCurriculares.id,
        numero: competenciasCurriculares.numero,
        tipo: competenciasCurriculares.tipo,
        nombre: competenciasCurriculares.nombre,
        areaId: competenciasCurriculares.areaId,
        areaCodigo: areasCurriculares.codigo,
      })
      .from(competenciasCurriculares)
      .leftJoin(areasCurriculares, eq(areasCurriculares.id, competenciasCurriculares.areaId))
      .where(
        and(
          eq(competenciasCurriculares.activo, true),
          areaCodigo ? eq(areasCurriculares.codigo, areaCodigo) : undefined,
        ),
      )
      .orderBy(asc(competenciasCurriculares.numero));
    if (competencias.length === 0) return [];
    const capacidades = await this.db
      .select({
        competenciaId: capacidadesCurriculares.competenciaId,
        nombre: capacidadesCurriculares.nombre,
      })
      .from(capacidadesCurriculares)
      .where(
        inArray(
          capacidadesCurriculares.competenciaId,
          competencias.map((c) => c.id),
        ),
      )
      .orderBy(asc(capacidadesCurriculares.orden));
    return competencias.map((c) => ({
      ...c,
      capacidades: capacidades.filter((x) => x.competenciaId === c.id).map((x) => x.nombre),
    }));
  }

  async competenciasPorIds(ids: string[]) {
    if (ids.length === 0) return [];
    return await this.db
      .select({
        id: competenciasCurriculares.id,
        nombre: competenciasCurriculares.nombre,
        tipo: competenciasCurriculares.tipo,
        areaCodigo: areasCurriculares.codigo,
      })
      .from(competenciasCurriculares)
      .leftJoin(areasCurriculares, eq(areasCurriculares.id, competenciasCurriculares.areaId))
      .where(inArray(competenciasCurriculares.id, ids));
  }

  desempenos(competenciaId: string, grado?: number) {
    return this.db
      .select({
        id: desempenosCurriculares.id,
        competenciaId: desempenosCurriculares.competenciaId,
        grado: desempenosCurriculares.grado,
        orden: desempenosCurriculares.orden,
        texto: desempenosCurriculares.texto,
      })
      .from(desempenosCurriculares)
      .where(
        and(
          eq(desempenosCurriculares.competenciaId, competenciaId),
          grado ? eq(desempenosCurriculares.grado, grado) : undefined,
        ),
      )
      .orderBy(asc(desempenosCurriculares.grado), asc(desempenosCurriculares.orden));
  }

  async desempenosPorIds(ids: string[]) {
    if (ids.length === 0) return [];
    return await this.db
      .select({
        id: desempenosCurriculares.id,
        competenciaId: desempenosCurriculares.competenciaId,
        texto: desempenosCurriculares.texto,
      })
      .from(desempenosCurriculares)
      .where(inArray(desempenosCurriculares.id, ids));
  }

  async desempeno(id: string) {
    const [fila] = await this.db
      .select()
      .from(desempenosCurriculares)
      .where(eq(desempenosCurriculares.id, id))
      .limit(1);
    return fila ?? null;
  }

  async crearDesempeno(competenciaId: string, grado: number, texto: string): Promise<string> {
    const [{ siguiente }] = await this.db
      .select({ siguiente: sql<number>`coalesce(max(${desempenosCurriculares.orden}), 0) + 1` })
      .from(desempenosCurriculares)
      .where(
        and(
          eq(desempenosCurriculares.competenciaId, competenciaId),
          eq(desempenosCurriculares.grado, grado),
        ),
      );
    const [fila] = await this.db
      .insert(desempenosCurriculares)
      .values({ competenciaId, grado, orden: Number(siguiente), texto })
      .returning({ id: desempenosCurriculares.id });
    return fila.id;
  }

  async actualizarDesempeno(id: string, texto: string): Promise<void> {
    await this.db
      .update(desempenosCurriculares)
      .set({ texto })
      .where(eq(desempenosCurriculares.id, id));
  }

  async competenciaExiste(id: string): Promise<boolean> {
    const [fila] = await this.db
      .select({ id: competenciasCurriculares.id })
      .from(competenciasCurriculares)
      .where(eq(competenciasCurriculares.id, id))
      .limit(1);
    return !!fila;
  }

  async enfoques() {
    const filas = await this.db
      .select({
        enfoqueId: enfoquesTransversales.id,
        enfoque: enfoquesTransversales.nombre,
        valorId: enfoquesValores.id,
        valor: enfoquesValores.nombre,
      })
      .from(enfoquesTransversales)
      .leftJoin(enfoquesValores, eq(enfoquesValores.enfoqueId, enfoquesTransversales.id))
      .orderBy(asc(enfoquesTransversales.orden), asc(enfoquesValores.orden));
    const acciones = await this.db
      .select({
        valorId: enfoquesAccionesObservables.valorId,
        texto: enfoquesAccionesObservables.texto,
      })
      .from(enfoquesAccionesObservables)
      .orderBy(asc(enfoquesAccionesObservables.orden));
    const mapa = new Map<
      string,
      {
        id: string;
        nombre: string;
        valores: { id: string; nombre: string; acciones: string[] }[];
      }
    >();
    for (const f of filas) {
      const e = mapa.get(f.enfoqueId) ?? { id: f.enfoqueId, nombre: f.enfoque, valores: [] };
      if (f.valorId && f.valor) {
        e.valores.push({
          id: f.valorId,
          nombre: f.valor,
          acciones: acciones.filter((a) => a.valorId === f.valorId).map((a) => a.texto),
        });
      }
      mapa.set(f.enfoqueId, e);
    }
    return [...mapa.values()];
  }

  opciones(tipo?: TipoOpcionCatalogo) {
    return this.db
      .select({
        tipo: catalogoSesionOpciones.tipo,
        codigo: catalogoSesionOpciones.codigo,
        nombre: catalogoSesionOpciones.nombre,
      })
      .from(catalogoSesionOpciones)
      .where(
        and(
          eq(catalogoSesionOpciones.activo, true),
          tipo ? eq(catalogoSesionOpciones.tipo, tipo) : undefined,
        ),
      )
      .orderBy(asc(catalogoSesionOpciones.tipo), asc(catalogoSesionOpciones.orden));
  }

  // ─── Docente y bloques del horario ────────────────────────────────────────
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

  private bloquesBase() {
    return this.db
      .select(camposBloque)
      .from(horarios)
      .innerJoin(cursosSeccion, eq(cursosSeccion.id, horarios.cursoSeccionId))
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId));
  }

  async bloque(horarioId: string): Promise<BloqueDocente | null> {
    const [fila] = await this.bloquesBase().where(eq(horarios.id, horarioId)).limit(1);
    return fila ?? null;
  }

  bloquesDeDocente(docenteId: string): Promise<BloqueDocente[]> {
    return this.bloquesBase()
      .where(and(eq(cursosSeccion.docenteId, docenteId), eq(horarios.tipoBloque, "clase")))
      .orderBy(asc(horarios.diaSemana), asc(horarios.horaInicio));
  }

  async usuarioDeDocente(docenteId: string): Promise<string | null> {
    const [fila] = await this.db
      .select({ id: usuarios.id })
      .from(docentes)
      .innerJoin(usuarios, eq(usuarios.personaId, docentes.personaId))
      .where(and(eq(docentes.id, docenteId), eq(usuarios.estado, "activo")))
      .limit(1);
    return fila?.id ?? null;
  }

  // ─── Planificaciones ──────────────────────────────────────────────────────
  private base() {
    return this.db
      .select(camposPlanificacion)
      .from(planificacionesSesion)
      .innerJoin(docentes, eq(docentes.id, planificacionesSesion.docenteId))
      .innerJoin(personas, eq(personas.id, docentes.personaId));
  }

  async planificacion(id: string): Promise<PlanificacionFila | null> {
    const [fila] = await this.base().where(eq(planificacionesSesion.id, id)).limit(1);
    return (fila as PlanificacionFila | undefined) ?? null;
  }

  async planificacionDeBloque(horarioId: string, fecha: string): Promise<PlanificacionFila | null> {
    const [fila] = await this.base()
      .where(
        and(eq(planificacionesSesion.horarioId, horarioId), eq(planificacionesSesion.fecha, fecha)),
      )
      .limit(1);
    return (fila as PlanificacionFila | undefined) ?? null;
  }

  async planificacionesDeDocente(docenteId: string, desde: string, hasta: string) {
    return (await this.base().where(
      and(
        eq(planificacionesSesion.docenteId, docenteId),
        between(planificacionesSesion.fecha, desde, hasta),
      ),
    )) as PlanificacionFila[];
  }

  /** Planificaciones de cualquier día, con el bloque y el docente, de la más reciente a la más antigua. */
  async historial(filtro: {
    desde: string;
    hasta: string;
    docenteId?: string;
    estado?: EstadoPlanificacion;
  }) {
    return await this.db
      .select({
        id: planificacionesSesion.id,
        fecha: sql<string>`${planificacionesSesion.fecha}::text`,
        numero: planificacionesSesion.numero,
        titulo: planificacionesSesion.titulo,
        estado: planificacionesSesion.estado,
        docenteId: planificacionesSesion.docenteId,
        docenteNombre: nombrePersona,
        horaInicio: sql<string>`${horarios.horaInicio}::text`,
        horaFin: sql<string>`${horarios.horaFin}::text`,
        cursoNombre: cursos.nombre,
        seccionNombre: secciones.nombre,
        gradoNombre: grados.nombre,
        comentarios: sql<number>`(select count(*)::int from ${planificacionesComentarios} c where c.planificacion_id = ${planificacionesSesion.id})`,
      })
      .from(planificacionesSesion)
      .innerJoin(horarios, eq(horarios.id, planificacionesSesion.horarioId))
      .innerJoin(cursosSeccion, eq(cursosSeccion.id, horarios.cursoSeccionId))
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .innerJoin(docentes, eq(docentes.id, planificacionesSesion.docenteId))
      .innerJoin(personas, eq(personas.id, docentes.personaId))
      .where(
        and(
          between(planificacionesSesion.fecha, filtro.desde, filtro.hasta),
          filtro.docenteId ? eq(planificacionesSesion.docenteId, filtro.docenteId) : undefined,
          filtro.estado ? eq(planificacionesSesion.estado, filtro.estado) : undefined,
        ),
      )
      .orderBy(sql`${planificacionesSesion.fecha} desc`, sql`${horarios.horaInicio} desc`)
      .limit(500);
  }

  async planificacionesDelDia(fecha: string) {
    return (await this.base().where(eq(planificacionesSesion.fecha, fecha))) as PlanificacionFila[];
  }

  async competenciasDe(planificacionId: string): Promise<CompetenciaPlanificada[]> {
    const filas = await this.db
      .select()
      .from(planificacionesCompetencias)
      .where(eq(planificacionesCompetencias.planificacionId, planificacionId))
      .orderBy(asc(planificacionesCompetencias.orden));
    return filas.map((f) => ({
      orden: f.orden,
      competenciaId: f.competenciaId,
      competenciaTexto: f.competenciaTexto,
      capacidades: f.capacidades as string[],
      desempenos: f.desempenos as CompetenciaPlanificada["desempenos"],
      campoTematico: f.campoTematico,
    }));
  }

  async momentosDe(planificacionId: string): Promise<MomentoPlanificado[]> {
    const filas = await this.db
      .select()
      .from(planificacionesMomentos)
      .where(eq(planificacionesMomentos.planificacionId, planificacionId));
    return filas.map((f) => ({
      momento: f.momento as Momento,
      actividades: f.actividades,
      minutos: f.minutos,
    }));
  }

  async comentariosDe(planificacionId: string): Promise<ComentarioPlanificacion[]> {
    const nombre = sql<string>`concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno})`;
    return await this.db
      .select({
        id: planificacionesComentarios.id,
        usuarioId: planificacionesComentarios.usuarioId,
        autor: nombre,
        texto: planificacionesComentarios.texto,
        creadoEn: sql<string>`${planificacionesComentarios.creadoEn}::text`,
      })
      .from(planificacionesComentarios)
      .innerJoin(usuarios, eq(usuarios.id, planificacionesComentarios.usuarioId))
      .innerJoin(personas, eq(personas.id, usuarios.personaId))
      .where(eq(planificacionesComentarios.planificacionId, planificacionId))
      .orderBy(asc(planificacionesComentarios.creadoEn));
  }

  /** Crea o reemplaza la planificación de un bloque con sus competencias y momentos, en una transacción. */
  async guardar(datos: DatosGuardarPlanificacion, existenteId: string | null): Promise<string> {
    return await this.db.transaction(async (tx) => {
      const valores = {
        docenteId: datos.docenteId,
        cursoSeccionId: datos.cursoSeccionId,
        horarioId: datos.horarioId,
        fecha: datos.fecha,
        numero: datos.numero,
        unidad: datos.unidad,
        titulo: datos.titulo,
        proposito: datos.proposito,
        evidencia: datos.evidencia,
        criterios: datos.criterios,
        instrumentoCodigo: datos.instrumentoCodigo,
        competenciasTransversales: datos.competenciasTransversales,
        enfoques: datos.enfoques,
        materiales: datos.materiales,
        referencias: datos.referencias,
        estado: datos.estado,
        copiadaDeId: datos.copiadaDeId,
      };
      let id = existenteId;
      if (id) {
        await tx
          .update(planificacionesSesion)
          .set({ ...valores, actualizadoEn: sql`CURRENT_TIMESTAMP` })
          .where(eq(planificacionesSesion.id, id));
        await tx
          .delete(planificacionesCompetencias)
          .where(eq(planificacionesCompetencias.planificacionId, id));
        await tx
          .delete(planificacionesMomentos)
          .where(eq(planificacionesMomentos.planificacionId, id));
      } else {
        const [fila] = await tx
          .insert(planificacionesSesion)
          .values(valores)
          .returning({ id: planificacionesSesion.id });
        id = fila.id;
      }
      if (datos.competencias.length > 0) {
        await tx.insert(planificacionesCompetencias).values(
          datos.competencias.map((c, i) => ({
            planificacionId: id,
            orden: i + 1,
            competenciaId: c.competenciaId,
            competenciaTexto: c.competenciaTexto,
            capacidades: c.capacidades,
            desempenos: c.desempenos,
            campoTematico: c.campoTematico,
          })),
        );
      }
      if (datos.momentos.length > 0) {
        await tx.insert(planificacionesMomentos).values(
          datos.momentos.map((m) => ({
            planificacionId: id,
            momento: m.momento,
            actividades: m.actividades,
            minutos: m.minutos,
          })),
        );
      }
      return id;
    });
  }

  async cambiarEstado(
    id: string,
    estado: EstadoPlanificacion,
    sesionClaseId?: string,
  ): Promise<void> {
    await this.db
      .update(planificacionesSesion)
      .set({
        estado,
        ...(sesionClaseId ? { sesionClaseId } : {}),
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(planificacionesSesion.id, id));
  }

  async agregarComentario(
    planificacionId: string,
    usuarioId: string,
    texto: string,
  ): Promise<string> {
    const [fila] = await this.db
      .insert(planificacionesComentarios)
      .values({ planificacionId, usuarioId, texto })
      .returning({ id: planificacionesComentarios.id });
    return fila.id;
  }

  // ─── Calendario y sesiones ────────────────────────────────────────────────
  async periodoDeFecha(fecha: string): Promise<{ id: string; estado: string } | null> {
    const [fila] = await this.db
      .select({ id: periodosAcademicos.id, estado: periodosAcademicos.estado })
      .from(periodosAcademicos)
      .where(
        and(
          sql`${periodosAcademicos.fechaInicio} <= ${fecha}`,
          sql`${periodosAcademicos.fechaFin} >= ${fecha}`,
        ),
      )
      .limit(1);
    return fila ?? null;
  }

  async sesionDeBloque(horarioId: string, fecha: string) {
    const [fila] = await this.db
      .select({
        id: sesionesClase.id,
        estado: sesionesClase.estado,
        docenteId: sesionesClase.docenteId,
      })
      .from(sesionesClase)
      .where(and(eq(sesionesClase.horarioId, horarioId), eq(sesionesClase.fecha, fecha)))
      .limit(1);
    return fila ?? null;
  }

  async sesion(id: string) {
    const [fila] = await this.db
      .select({
        id: sesionesClase.id,
        estado: sesionesClase.estado,
        docenteId: sesionesClase.docenteId,
        horarioId: sesionesClase.horarioId,
        fecha: sql<string>`${sesionesClase.fecha}::text`,
        horaInicioReal: sql<string | null>`${sesionesClase.horaInicioReal}::text`,
        horaFinReal: sql<string | null>`${sesionesClase.horaFinReal}::text`,
      })
      .from(sesionesClase)
      .where(eq(sesionesClase.id, id))
      .limit(1);
    return fila ?? null;
  }

  async verificacionDeSesion(sesionId: string) {
    const [fila] = await this.db
      .select({
        id: sesionesVerificacionAula.id,
        enAula: sesionesVerificacionAula.enAula,
        horaInicio: sql<string | null>`${sesionesVerificacionAula.horaInicio}::text`,
        horaFin: sql<string | null>`${sesionesVerificacionAula.horaFin}::text`,
        observacion: sesionesVerificacionAula.observacion,
        usuarioId: sesionesVerificacionAula.usuarioId,
      })
      .from(sesionesVerificacionAula)
      .where(eq(sesionesVerificacionAula.sesionClaseId, sesionId))
      .limit(1);
    return fila ?? null;
  }

  async guardarVerificacion(
    sesionClaseId: string,
    datos: {
      enAula: boolean;
      horaInicio: string | null;
      horaFin: string | null;
      observacion: string | null;
      usuarioId: string;
    },
  ): Promise<void> {
    await this.db
      .insert(sesionesVerificacionAula)
      .values({ sesionClaseId, ...datos })
      .onConflictDoUpdate({
        target: sesionesVerificacionAula.sesionClaseId,
        set: { ...datos, actualizadoEn: sql`CURRENT_TIMESTAMP` },
      });
  }

  /** Sesiones de un día con su marca de planificación (panel del supervisor). */
  async sesionesConPlanificacion(fecha: string) {
    return await this.db
      .select({
        sesionId: sesionesClase.id,
        estadoSesion: sesionesClase.estado,
        horaInicio: sql<string>`${sesionesClase.horaInicioPlan}::text`,
        horaFin: sql<string>`${sesionesClase.horaFinPlan}::text`,
        docenteNombre: nombrePersona,
        cursoNombre: cursos.nombre,
        seccionNombre: secciones.nombre,
        gradoNombre: grados.nombre,
        planificacionId: planificacionesSesion.id,
        planificacionEstado: planificacionesSesion.estado,
        planificacionTitulo: planificacionesSesion.titulo,
        verificacionEnAula: sesionesVerificacionAula.enAula,
      })
      .from(sesionesClase)
      .innerJoin(horarios, eq(horarios.id, sesionesClase.horarioId))
      .innerJoin(cursosSeccion, eq(cursosSeccion.id, horarios.cursoSeccionId))
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .innerJoin(docentes, eq(docentes.id, sesionesClase.docenteId))
      .innerJoin(personas, eq(personas.id, docentes.personaId))
      .leftJoin(
        planificacionesSesion,
        and(
          eq(planificacionesSesion.horarioId, sesionesClase.horarioId),
          eq(planificacionesSesion.fecha, sesionesClase.fecha),
        ),
      )
      .leftJoin(
        sesionesVerificacionAula,
        eq(sesionesVerificacionAula.sesionClaseId, sesionesClase.id),
      )
      .where(eq(sesionesClase.fecha, fecha))
      .orderBy(asc(sesionesClase.horaInicioPlan));
  }
}
