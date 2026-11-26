import { and, asc, eq, sql } from "drizzle-orm";
import {
  cursos,
  cursosSeccion,
  docentes,
  grados,
  horarios,
  secciones,
  usuarios,
} from "../../../../core/database/schema";
import type { BloqueDocente } from "../../interfaces";
import type { PlanificacionSesionesRepositoryDeps } from "./deps";

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

export function bloquesBase(deps: PlanificacionSesionesRepositoryDeps) {
  return deps.db
    .select(camposBloque)
    .from(horarios)
    .innerJoin(cursosSeccion, eq(cursosSeccion.id, horarios.cursoSeccionId))
    .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
    .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
    .innerJoin(grados, eq(grados.id, secciones.gradoId));
}

export async function bloque(
  deps: PlanificacionSesionesRepositoryDeps,
  horarioId: string,
): Promise<BloqueDocente | null> {
  const [fila] = await bloquesBase(deps).where(eq(horarios.id, horarioId)).limit(1);
  return fila ?? null;
}

export function bloquesDeDocente(
  deps: PlanificacionSesionesRepositoryDeps,
  docenteId: string,
): Promise<BloqueDocente[]> {
  return bloquesBase(deps)
    .where(and(eq(cursosSeccion.docenteId, docenteId), eq(horarios.tipoBloque, "clase")))
    .orderBy(asc(horarios.diaSemana), asc(horarios.horaInicio));
}

export async function usuarioDeDocente(
  deps: PlanificacionSesionesRepositoryDeps,
  docenteId: string,
): Promise<string | null> {
  const [fila] = await deps.db
    .select({ id: usuarios.id })
    .from(docentes)
    .innerJoin(usuarios, eq(usuarios.personaId, docentes.personaId))
    .where(and(eq(docentes.id, docenteId), eq(usuarios.estado, "activo")))
    .limit(1);
  return fila?.id ?? null;
}
