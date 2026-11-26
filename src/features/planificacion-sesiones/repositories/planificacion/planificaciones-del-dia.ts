import { and, asc, eq, sql } from "drizzle-orm";
import {
  cursos,
  cursosSeccion,
  docentes,
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
} from "../../../../core/database/schema";
import type { EstadoPlanificacion, Momento } from "../../constants";
import type {
  ComentarioPlanificacion,
  CompetenciaPlanificada,
  DatosGuardarPlanificacion,
  MomentoPlanificado,
  PlanificacionFila,
} from "../../interfaces";
import type { PlanificacionSesionesRepositoryDeps } from "./deps";
import { nombrePersona } from "./shared";
import { base } from "./base";

export async function planificacionesDelDia(
  deps: PlanificacionSesionesRepositoryDeps,
  fecha: string,
) {
  return (await base(deps).where(eq(planificacionesSesion.fecha, fecha))) as PlanificacionFila[];
}

export async function competenciasDe(
  deps: PlanificacionSesionesRepositoryDeps,
  planificacionId: string,
): Promise<CompetenciaPlanificada[]> {
  const filas = await deps.db
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

export async function momentosDe(
  deps: PlanificacionSesionesRepositoryDeps,
  planificacionId: string,
): Promise<MomentoPlanificado[]> {
  const filas = await deps.db
    .select()
    .from(planificacionesMomentos)
    .where(eq(planificacionesMomentos.planificacionId, planificacionId));
  return filas.map((f) => ({
    momento: f.momento as Momento,
    actividades: f.actividades,
    minutos: f.minutos,
  }));
}

export async function comentariosDe(
  deps: PlanificacionSesionesRepositoryDeps,
  planificacionId: string,
): Promise<ComentarioPlanificacion[]> {
  const nombre = sql<string>`concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno})`;
  return await deps.db
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

export async function guardar(
  deps: PlanificacionSesionesRepositoryDeps,
  datos: DatosGuardarPlanificacion,
  existenteId: string | null,
): Promise<string> {
  return await deps.db.transaction(async (tx) => {
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

export async function cambiarEstado(
  deps: PlanificacionSesionesRepositoryDeps,
  id: string,
  estado: EstadoPlanificacion,
  sesionClaseId?: string,
): Promise<void> {
  await deps.db
    .update(planificacionesSesion)
    .set({
      estado,
      ...(sesionClaseId ? { sesionClaseId } : {}),
      actualizadoEn: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(planificacionesSesion.id, id));
}

export async function agregarComentario(
  deps: PlanificacionSesionesRepositoryDeps,
  planificacionId: string,
  usuarioId: string,
  texto: string,
): Promise<string> {
  const [fila] = await deps.db
    .insert(planificacionesComentarios)
    .values({ planificacionId, usuarioId, texto })
    .returning({ id: planificacionesComentarios.id });
  return fila.id;
}

export async function periodoDeFecha(
  deps: PlanificacionSesionesRepositoryDeps,
  fecha: string,
): Promise<{ id: string; estado: string } | null> {
  const [fila] = await deps.db
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

export async function sesionDeBloque(
  deps: PlanificacionSesionesRepositoryDeps,
  horarioId: string,
  fecha: string,
) {
  const [fila] = await deps.db
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

export async function sesion(deps: PlanificacionSesionesRepositoryDeps, id: string) {
  const [fila] = await deps.db
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

export async function verificacionDeSesion(
  deps: PlanificacionSesionesRepositoryDeps,
  sesionId: string,
) {
  const [fila] = await deps.db
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

export async function guardarVerificacion(
  deps: PlanificacionSesionesRepositoryDeps,
  sesionClaseId: string,
  datos: {
    enAula: boolean;
    horaInicio: string | null;
    horaFin: string | null;
    observacion: string | null;
    usuarioId: string;
  },
): Promise<void> {
  await deps.db
    .insert(sesionesVerificacionAula)
    .values({ sesionClaseId, ...datos })
    .onConflictDoUpdate({
      target: sesionesVerificacionAula.sesionClaseId,
      set: { ...datos, actualizadoEn: sql`CURRENT_TIMESTAMP` },
    });
}

export async function sesionesConPlanificacion(
  deps: PlanificacionSesionesRepositoryDeps,
  fecha: string,
) {
  return await deps.db
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
