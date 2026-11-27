import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  areasCurriculares,
  capacidadesCurriculares,
  catalogoSesionOpciones,
  competenciasCurriculares,
  desempenosCurriculares,
  docentes,
  enfoquesTransversales,
  enfoquesValores,
  enfoquesAccionesObservables,
} from "../../../../core/database/schema";
import type { TipoOpcionCatalogo } from "../../constants";
import type { PlanificacionSesionesRepositoryDeps } from "./deps";

export function areas(deps: PlanificacionSesionesRepositoryDeps) {
  return deps.db.select().from(areasCurriculares).orderBy(asc(areasCurriculares.orden));
}

export async function competencias(deps: PlanificacionSesionesRepositoryDeps, areaCodigo?: string) {
  const competencias = await deps.db
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
  const capacidades = await deps.db
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

export async function competenciasPorIds(deps: PlanificacionSesionesRepositoryDeps, ids: string[]) {
  if (ids.length === 0) return [];
  return await deps.db
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

export function desempenos(
  deps: PlanificacionSesionesRepositoryDeps,
  competenciaId: string,
  grado?: number,
) {
  return deps.db
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

export async function desempenosPorIds(deps: PlanificacionSesionesRepositoryDeps, ids: string[]) {
  if (ids.length === 0) return [];
  return await deps.db
    .select({
      id: desempenosCurriculares.id,
      competenciaId: desempenosCurriculares.competenciaId,
      texto: desempenosCurriculares.texto,
    })
    .from(desempenosCurriculares)
    .where(inArray(desempenosCurriculares.id, ids));
}

export async function desempeno(deps: PlanificacionSesionesRepositoryDeps, id: string) {
  const [fila] = await deps.db
    .select()
    .from(desempenosCurriculares)
    .where(eq(desempenosCurriculares.id, id))
    .limit(1);
  return fila ?? null;
}

export async function crearDesempeno(
  deps: PlanificacionSesionesRepositoryDeps,
  competenciaId: string,
  grado: number,
  texto: string,
): Promise<string> {
  const [{ siguiente }] = await deps.db
    .select({ siguiente: sql<number>`coalesce(max(${desempenosCurriculares.orden}), 0) + 1` })
    .from(desempenosCurriculares)
    .where(
      and(
        eq(desempenosCurriculares.competenciaId, competenciaId),
        eq(desempenosCurriculares.grado, grado),
      ),
    );
  const [fila] = await deps.db
    .insert(desempenosCurriculares)
    .values({ competenciaId, grado, orden: Number(siguiente), texto })
    .returning({ id: desempenosCurriculares.id });
  return fila.id;
}

export async function actualizarDesempeno(
  deps: PlanificacionSesionesRepositoryDeps,
  id: string,
  texto: string,
): Promise<void> {
  await deps.db
    .update(desempenosCurriculares)
    .set({ texto })
    .where(eq(desempenosCurriculares.id, id));
}

export async function competenciaExiste(
  deps: PlanificacionSesionesRepositoryDeps,
  id: string,
): Promise<boolean> {
  const [fila] = await deps.db
    .select({ id: competenciasCurriculares.id })
    .from(competenciasCurriculares)
    .where(eq(competenciasCurriculares.id, id))
    .limit(1);
  return !!fila;
}

export async function enfoques(deps: PlanificacionSesionesRepositoryDeps) {
  const filas = await deps.db
    .select({
      enfoqueId: enfoquesTransversales.id,
      enfoque: enfoquesTransversales.nombre,
      valorId: enfoquesValores.id,
      valor: enfoquesValores.nombre,
    })
    .from(enfoquesTransversales)
    .leftJoin(enfoquesValores, eq(enfoquesValores.enfoqueId, enfoquesTransversales.id))
    .orderBy(asc(enfoquesTransversales.orden), asc(enfoquesValores.orden));
  const acciones = await deps.db
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

export function opciones(deps: PlanificacionSesionesRepositoryDeps, tipo?: TipoOpcionCatalogo) {
  return deps.db
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

export async function docenteDePersona(
  deps: PlanificacionSesionesRepositoryDeps,
  personaId: string,
): Promise<{ id: string; activo: boolean } | null> {
  const [fila] = await deps.db
    .select({
      id: docentes.id,
      activo: sql<boolean>`${docentes.estado} = 'activo' AND ${docentes.eliminadoEn} IS NULL`,
    })
    .from(docentes)
    .where(eq(docentes.personaId, personaId))
    .limit(1);
  return fila ?? null;
}
