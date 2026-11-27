import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import {
  ausenciasSesion,
  consolidadosDocente,
  docentes,
  evidenciasAusencia,
  horarios,
  periodosAcademicos,
  secciones,
  sesionesClase,
  usuarios,
  variablesSistema,
} from "../../../../core/database/schema";
import type {
  AusenciaConDetalle,
  DatosCrearEvidencia,
  DatosCrearVersion,
  FiltrosListarSupervisor,
} from "../../interfaces";
import type { AusenciasDocenteRepositoryDeps, AusenciasDocenteRepositoryCalls } from "./deps";

export async function crearNuevaVersion(
  deps: AusenciasDocenteRepositoryDeps,
  calls: AusenciasDocenteRepositoryCalls,
  versionAnteriorId: string,
  datosVersion: DatosCrearVersion,
  fotosNuevas: DatosCrearEvidencia[],
  fotosRetiradasIds?: string[],
): Promise<AusenciaConDetalle> {
  const nuevoId = randomUUID();

  await deps.db.transaction(async (tx) => {
    await tx
      .update(ausenciasSesion)
      .set({ vigente: false })
      .where(eq(ausenciasSesion.id, versionAnteriorId));

    await tx.insert(ausenciasSesion).values({
      id: nuevoId,
      ausenciaRaizId: datosVersion.ausenciaRaizId,
      sesionClaseId: datosVersion.sesionClaseId,
      registradoPorId: datosVersion.registradoPorId,
      horaDesde: datosVersion.horaDesde,
      horaHasta: datosVersion.horaHasta,
      motivo: datosVersion.motivo,
      observacion: datosVersion.observacion ?? null,
      version: datosVersion.version,
      motivoCambio: datosVersion.motivoCambio,
      vigente: true,
      anulada: false,
    });

    const fotosAnteriores = await tx
      .select()
      .from(evidenciasAusencia)
      .where(
        and(
          eq(evidenciasAusencia.ausenciaId, versionAnteriorId),
          eq(evidenciasAusencia.vigente, true),
        ),
      );

    const retiradasSet = new Set(fotosRetiradasIds ?? []);
    const fotosParaCopiar = fotosAnteriores.filter((f) => !retiradasSet.has(f.id));

    let ordenActual = 1;
    const insercionesEvidencias: Array<{
      id: string;
      ausenciaId: string;
      archivoUrl: string;
      tomadaEn: string | null;
      orden: number;
      vigente: boolean;
    }> = [];

    for (const fotoAnt of fotosParaCopiar) {
      insercionesEvidencias.push({
        id: randomUUID(),
        ausenciaId: nuevoId,
        archivoUrl: fotoAnt.archivoUrl,
        tomadaEn: fotoAnt.tomadaEn,
        orden: ordenActual++,
        vigente: true,
      });
    }

    for (const fotoNueva of fotosNuevas) {
      insercionesEvidencias.push({
        id: randomUUID(),
        ausenciaId: nuevoId,
        archivoUrl: fotoNueva.archivoUrl,
        tomadaEn: fotoNueva.tomadaEn ?? null,
        orden: ordenActual++,
        vigente: true,
      });
    }

    if (insercionesEvidencias.length > 0) {
      await tx.insert(evidenciasAusencia).values(insercionesEvidencias);
    }
  });

  const nuevaVersion = await calls.buscarPorId(nuevoId);
  if (!nuevaVersion) {
    throw new Error("No se pudo recuperar la nueva versión creada.");
  }
  return nuevaVersion;
}

export async function anularAusencia(
  deps: AusenciasDocenteRepositoryDeps,
  calls: AusenciasDocenteRepositoryCalls,
  id: string,
  anuladaPorId: string,
  motivoAnulacion: string,
): Promise<AusenciaConDetalle> {
  await deps.db
    .update(ausenciasSesion)
    .set({
      anulada: true,
      anuladaPorId,
      motivoAnulacion,
      anuladaEn: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(ausenciasSesion.id, id));

  const anulada = await calls.buscarPorId(id);
  if (!anulada) {
    throw new Error("No se pudo recuperar la ausencia anulada.");
  }
  return anulada;
}

export async function guardarDescargo(
  deps: AusenciasDocenteRepositoryDeps,
  id: string,
  descargo: string,
): Promise<void> {
  await deps.db
    .update(ausenciasSesion)
    .set({
      descargo,
      descargoEn: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(ausenciasSesion.id, id));
}

export async function listarSupervisor(
  deps: AusenciasDocenteRepositoryDeps,
  calls: AusenciasDocenteRepositoryCalls,
  filtros: FiltrosListarSupervisor,
): Promise<AusenciaConDetalle[]> {
  const condiciones = [eq(ausenciasSesion.vigente, true)];

  if (filtros.docenteId) {
    condiciones.push(eq(sesionesClase.docenteId, filtros.docenteId));
  }
  if (filtros.fechaDesde) {
    condiciones.push(sql`${sesionesClase.fecha} >= ${filtros.fechaDesde}::date`);
  }
  if (filtros.fechaHasta) {
    condiciones.push(sql`${sesionesClase.fecha} <= ${filtros.fechaHasta}::date`);
  }
  if (filtros.periodoId) {
    condiciones.push(
      sql`EXISTS (
          SELECT 1 FROM periodos_academicos pa
          WHERE pa.id = ${filtros.periodoId}
            AND pa.fecha_inicio <= ${sesionesClase.fecha}
            AND pa.fecha_fin >= ${sesionesClase.fecha}
        )`,
    );
  }
  if (filtros.anioAcademicoId) {
    condiciones.push(eq(secciones.anioAcademicoId, filtros.anioAcademicoId));
  }

  const filas = await deps.db
    .select({ id: ausenciasSesion.id })
    .from(ausenciasSesion)
    .innerJoin(sesionesClase, eq(ausenciasSesion.sesionClaseId, sesionesClase.id))
    .innerJoin(horarios, eq(sesionesClase.horarioId, horarios.id))
    .innerJoin(secciones, eq(horarios.seccionId, secciones.id))
    .where(and(...condiciones))
    .orderBy(desc(sesionesClase.fecha), desc(ausenciasSesion.horaDesde));

  const resultados: AusenciaConDetalle[] = [];
  for (const f of filas) {
    const detalle = await calls.buscarPorId(f.id);
    if (detalle) {
      resultados.push(detalle);
    }
  }
  return resultados;
}

export async function listarPorDocente(
  deps: AusenciasDocenteRepositoryDeps,
  calls: AusenciasDocenteRepositoryCalls,
  docenteId: string,
  anioAcademicoId?: string,
): Promise<AusenciaConDetalle[]> {
  const condiciones = [eq(ausenciasSesion.vigente, true), eq(sesionesClase.docenteId, docenteId)];
  if (anioAcademicoId) {
    condiciones.push(eq(secciones.anioAcademicoId, anioAcademicoId));
  }

  const filas = await deps.db
    .select({ id: ausenciasSesion.id })
    .from(ausenciasSesion)
    .innerJoin(sesionesClase, eq(ausenciasSesion.sesionClaseId, sesionesClase.id))
    .innerJoin(horarios, eq(sesionesClase.horarioId, horarios.id))
    .innerJoin(secciones, eq(horarios.seccionId, secciones.id))
    .where(and(...condiciones))
    .orderBy(desc(sesionesClase.fecha), desc(ausenciasSesion.horaDesde));

  const resultados: AusenciaConDetalle[] = [];
  for (const f of filas) {
    const detalle = await calls.buscarPorId(f.id);
    if (detalle) {
      resultados.push(detalle);
    }
  }
  return resultados;
}

export async function docentePorPersonaId(
  deps: AusenciasDocenteRepositoryDeps,
  personaId: string,
): Promise<{ id: string } | null> {
  const [doc] = await deps.db
    .select({ id: docentes.id })
    .from(docentes)
    .where(eq(docentes.personaId, personaId))
    .limit(1);

  return doc ?? null;
}

export async function usuarioPorPersonaId(
  deps: AusenciasDocenteRepositoryDeps,
  personaId: string,
): Promise<{ id: string } | null> {
  const [u] = await deps.db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(
      and(
        eq(usuarios.personaId, personaId),
        eq(usuarios.estado, "activo"),
        isNull(usuarios.eliminadoEn),
      ),
    )
    .limit(1);

  return u ?? null;
}

export async function bimestreEstaBloqueado(
  deps: AusenciasDocenteRepositoryDeps,
  fecha: string,
  docenteId: string,
): Promise<boolean> {
  const [periodo] = await deps.db
    .select({
      id: periodosAcademicos.id,
      estado: periodosAcademicos.estado,
    })
    .from(periodosAcademicos)
    .where(
      and(
        sql`${periodosAcademicos.fechaInicio} <= ${fecha}::date`,
        sql`${periodosAcademicos.fechaFin} >= ${fecha}::date`,
      ),
    )
    .limit(1);

  if (!periodo) {
    return false;
  }

  if (periodo.estado === "cerrado") {
    return true;
  }

  const [consolidado] = await deps.db
    .select({ id: consolidadosDocente.id })
    .from(consolidadosDocente)
    .where(
      and(
        eq(consolidadosDocente.periodoId, periodo.id),
        eq(consolidadosDocente.docenteId, docenteId),
        eq(consolidadosDocente.vigente, true),
        eq(consolidadosDocente.estado, "cerrado"),
      ),
    )
    .limit(1);

  return Boolean(consolidado);
}

export async function obtenerVariableSistema(
  deps: AusenciasDocenteRepositoryDeps,
  codigo: string,
): Promise<string | null> {
  const [variable] = await deps.db
    .select({ valor: variablesSistema.valor })
    .from(variablesSistema)
    .where(and(eq(variablesSistema.codigo, codigo), eq(variablesSistema.vigente, true)))
    .limit(1);

  return variable?.valor ?? null;
}
