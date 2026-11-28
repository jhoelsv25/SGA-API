import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  cursosSeccion,
  estudiantes,
  matriculas,
  personas,
  planificacionesSesion,
  variablesSistema,
} from "../../../../core/database/schema";
import type { PlanificacionSesionesRepositoryDeps } from "./deps";

export async function lemaAnual(deps: PlanificacionSesionesRepositoryDeps): Promise<string> {
  const [fila] = await deps.db
    .select({ valor: variablesSistema.valor })
    .from(variablesSistema)
    .where(
      and(
        eq(variablesSistema.codigo, "institucion.lema_anual"),
        eq(variablesSistema.vigente, true),
      ),
    )
    .limit(1);
  return fila?.valor.trim() ?? "";
}

/** Estudiantes matriculados en cada `curso_seccion`, en orden alfabético (lista de cotejo). */
export async function estudiantesDeCursosSeccion(
  deps: PlanificacionSesionesRepositoryDeps,
  ids: string[],
): Promise<{ cursoSeccionId: string; nombre: string }[]> {
  if (ids.length === 0) return [];
  const filas = await deps.db
    .select({
      cursoSeccionId: cursosSeccion.id,
      paterno: personas.apellidoPaterno,
      materno: personas.apellidoMaterno,
      nombres: personas.nombres,
    })
    .from(cursosSeccion)
    .innerJoin(
      matriculas,
      and(eq(matriculas.seccionId, cursosSeccion.seccionId), eq(matriculas.estado, "matriculado")),
    )
    .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
    .innerJoin(personas, eq(personas.id, estudiantes.personaId))
    .where(inArray(cursosSeccion.id, ids))
    .orderBy(asc(personas.apellidoPaterno), asc(personas.apellidoMaterno), asc(personas.nombres));
  return filas.map((f) => ({
    cursoSeccionId: f.cursoSeccionId,
    nombre: `${[f.paterno, f.materno].filter(Boolean).join(" ")}, ${f.nombres}`,
  }));
}

/** Coordinador y acuerdos de la última planificación del docente: se proponen en la siguiente. */
export async function ultimosDatosDeDocente(
  deps: PlanificacionSesionesRepositoryDeps,
  docenteId: string,
): Promise<{ coordinador: string | null; acuerdos: string[] } | null> {
  const [fila] = await deps.db
    .select({
      coordinador: planificacionesSesion.coordinador,
      acuerdos: planificacionesSesion.acuerdos,
    })
    .from(planificacionesSesion)
    .where(eq(planificacionesSesion.docenteId, docenteId))
    .orderBy(desc(planificacionesSesion.actualizadoEn))
    .limit(1);
  return fila ? { coordinador: fila.coordinador, acuerdos: fila.acuerdos as string[] } : null;
}
