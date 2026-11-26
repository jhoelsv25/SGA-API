import { and, between, eq, sql } from "drizzle-orm";
import {
  cursos,
  cursosSeccion,
  docentes,
  grados,
  horarios,
  personas,
  planificacionesComentarios,
  planificacionesSesion,
  secciones,
} from "../../../../core/database/schema";
import type { EstadoPlanificacion } from "../../constants";
import type { PlanificacionFila } from "../../interfaces";
import type { PlanificacionSesionesRepositoryDeps } from "./deps";
import { nombrePersona, camposPlanificacion } from "./shared";

export function base(deps: PlanificacionSesionesRepositoryDeps) {
  return deps.db
    .select(camposPlanificacion)
    .from(planificacionesSesion)
    .innerJoin(docentes, eq(docentes.id, planificacionesSesion.docenteId))
    .innerJoin(personas, eq(personas.id, docentes.personaId));
}

export async function planificacion(
  deps: PlanificacionSesionesRepositoryDeps,
  id: string,
): Promise<PlanificacionFila | null> {
  const [fila] = await base(deps).where(eq(planificacionesSesion.id, id)).limit(1);
  return (fila as PlanificacionFila | undefined) ?? null;
}

export async function planificacionDeBloque(
  deps: PlanificacionSesionesRepositoryDeps,
  horarioId: string,
  fecha: string,
): Promise<PlanificacionFila | null> {
  const [fila] = await base(deps)
    .where(
      and(eq(planificacionesSesion.horarioId, horarioId), eq(planificacionesSesion.fecha, fecha)),
    )
    .limit(1);
  return (fila as PlanificacionFila | undefined) ?? null;
}

export async function planificacionesDeDocente(
  deps: PlanificacionSesionesRepositoryDeps,
  docenteId: string,
  desde: string,
  hasta: string,
) {
  return (await base(deps).where(
    and(
      eq(planificacionesSesion.docenteId, docenteId),
      between(planificacionesSesion.fecha, desde, hasta),
    ),
  )) as PlanificacionFila[];
}

export async function historial(
  deps: PlanificacionSesionesRepositoryDeps,
  filtro: {
    desde: string;
    hasta: string;
    docenteId?: string;
    estado?: EstadoPlanificacion;
  },
) {
  return await deps.db
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
