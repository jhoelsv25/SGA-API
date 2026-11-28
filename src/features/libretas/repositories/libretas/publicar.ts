import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  apoderados,
  estudianteApoderados,
  estudiantes,
  grados,
  libretaArchivos,
  libretas,
  matriculas,
  periodosAcademicos,
  personas,
  secciones,
  usuarios,
} from "@/core/database/schema";
import type {
  DetalleLibretaRow,
  EstadoLibreta,
  HistorialArchivoRow,
  LibretaAperturaRow,
  MiLibretaRow,
  PeriodoLibretaRow,
  PublicacionPersistida,
  SeguimientoSeccionRow,
} from "../../interfaces";
import type { LibretasRepositoryDeps } from "./deps";
import { nombrePersona } from "./shared";

export async function publicar(
  deps: LibretasRepositoryDeps,
  items: PublicacionPersistida[],
  actorId: string,
): Promise<void> {
  await deps.db.transaction(async (tx) => {
    for (const item of items) {
      if (item.esReemplazo) {
        await tx
          .update(libretaArchivos)
          .set({ vigente: false })
          .where(eq(libretaArchivos.libretaId, item.libretaId));
        await tx
          .update(libretas)
          .set({
            archivoUrl: item.archivoUrl,
            codigoLeido: item.codigoLeido,
            subidoPorId: actorId,
            subidoEn: sql`CURRENT_TIMESTAMP`,
            actualizadoEn: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(libretas.id, item.libretaId));
      } else {
        await tx
          .update(libretas)
          .set({
            estado: item.estado,
            archivoUrl: item.archivoUrl,
            codigoLeido: item.codigoLeido,
            subidoPorId: actorId,
            subidoEn: sql`CURRENT_TIMESTAMP`,
            actualizadoEn: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(libretas.id, item.libretaId));
      }

      await tx.insert(libretaArchivos).values({
        libretaId: item.libretaId,
        nombreOriginal: item.nombreOriginal,
        archivoUrl: item.archivoUrl,
        tamanoBytes: item.tamanoBytes,
        asignacion: item.asignacion,
        vigente: true,
        motivo: item.motivo,
        subidoPorId: actorId,
      });
    }
  });
}

export async function seguimiento(
  deps: LibretasRepositoryDeps,
  periodoId: string,
  seccionIds?: string[],
): Promise<SeguimientoSeccionRow[]> {
  if (seccionIds && seccionIds.length === 0) return [];
  const filtroSeccion =
    seccionIds && seccionIds.length > 0 ? inArray(secciones.id, seccionIds) : undefined;

  const rows = await deps.db
    .select({
      seccionId: secciones.id,
      seccionNombre: secciones.nombre,
      gradoNombre: grados.nombre,
      estado: libretas.estado,
      vistoEn: libretas.vistoEn,
    })
    .from(libretas)
    .innerJoin(matriculas, eq(libretas.matriculaId, matriculas.id))
    .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
    .innerJoin(grados, eq(secciones.gradoId, grados.id))
    .where(and(eq(libretas.periodoId, periodoId), filtroSeccion));

  const mapa = new Map<string, SeguimientoSeccionRow>();
  for (const row of rows) {
    const actual = mapa.get(row.seccionId) ?? {
      seccionId: row.seccionId,
      seccionNombre: row.seccionNombre,
      gradoNombre: row.gradoNombre,
      aTiempo: 0,
      fueraDePlazo: 0,
      pendientes: 0,
      vistas: 0,
    };
    if (row.estado === "a_tiempo") actual.aTiempo += 1;
    else if (row.estado === "fuera_de_plazo") actual.fueraDePlazo += 1;
    else actual.pendientes += 1;
    if (row.vistoEn) actual.vistas += 1;
    mapa.set(row.seccionId, actual);
  }
  return [...mapa.values()];
}

export async function detalleSeccion(
  deps: LibretasRepositoryDeps,
  seccionId: string,
  periodoId: string,
): Promise<DetalleLibretaRow[]> {
  const rows = await deps.db
    .select({
      libretaId: libretas.id,
      matriculaId: matriculas.id,
      codigo: estudiantes.codigo,
      nombres: personas.nombres,
      paterno: personas.apellidoPaterno,
      materno: personas.apellidoMaterno,
      estado: libretas.estado,
      vistoEn: libretas.vistoEn,
      fechaLimite: libretas.fechaLimite,
    })
    .from(libretas)
    .innerJoin(matriculas, eq(libretas.matriculaId, matriculas.id))
    .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
    .innerJoin(personas, eq(estudiantes.personaId, personas.id))
    .where(and(eq(libretas.periodoId, periodoId), eq(matriculas.seccionId, seccionId)));

  return rows.map((row) => ({
    libretaId: row.libretaId,
    matriculaId: row.matriculaId,
    codigo: row.codigo,
    nombreCompleto: nombrePersona(row.nombres, row.paterno, row.materno),
    estado: row.estado as EstadoLibreta,
    vistoEn: row.vistoEn,
    fechaLimite: row.fechaLimite,
  }));
}

export async function misLibretas(
  deps: LibretasRepositoryDeps,
  personaId: string,
  rol: string,
): Promise<MiLibretaRow[]> {
  const esApoderado = rol.toLowerCase() === "apoderado";
  const base = deps.db
    .select({
      id: libretas.id,
      periodoId: libretas.periodoId,
      bimestre: periodosAcademicos.nombre,
      estado: libretas.estado,
      fechaLimite: libretas.fechaLimite,
      archivoUrl: libretas.archivoUrl,
      vistoEn: libretas.vistoEn,
      nombres: personas.nombres,
      paterno: personas.apellidoPaterno,
      materno: personas.apellidoMaterno,
    })
    .from(libretas)
    .innerJoin(matriculas, eq(libretas.matriculaId, matriculas.id))
    .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
    .innerJoin(personas, eq(estudiantes.personaId, personas.id))
    .innerJoin(periodosAcademicos, eq(libretas.periodoId, periodosAcademicos.id));

  const rows = esApoderado
    ? await base
        .innerJoin(estudianteApoderados, eq(estudianteApoderados.estudianteId, estudiantes.id))
        .innerJoin(apoderados, eq(estudianteApoderados.apoderadoId, apoderados.id))
        .where(and(eq(apoderados.personaId, personaId), isNull(apoderados.eliminadoEn)))
    : await base.where(eq(estudiantes.personaId, personaId));

  return rows.map((row) => ({
    id: row.id,
    periodoId: row.periodoId,
    bimestre: row.bimestre,
    estado: row.estado as EstadoLibreta,
    fechaLimite: row.fechaLimite,
    archivoUrl: row.archivoUrl,
    vistoEn: row.vistoEn,
    estudianteNombre: nombrePersona(row.nombres, row.paterno, row.materno),
  }));
}

export async function obtenerParaApertura(
  deps: LibretasRepositoryDeps,
  libretaId: string,
): Promise<LibretaAperturaRow | null> {
  const rows = await deps.db
    .select({
      id: libretas.id,
      estado: libretas.estado,
      bimestre: periodosAcademicos.nombre,
      archivoUrl: libretas.archivoUrl,
      vistoEn: libretas.vistoEn,
      seccionId: matriculas.seccionId,
      estudianteId: estudiantes.id,
      estudiantePersonaId: estudiantes.personaId,
    })
    .from(libretas)
    .innerJoin(matriculas, eq(libretas.matriculaId, matriculas.id))
    .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
    .innerJoin(periodosAcademicos, eq(libretas.periodoId, periodosAcademicos.id))
    .where(eq(libretas.id, libretaId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const apoderadosRows = await deps.db
    .select({ personaId: apoderados.personaId })
    .from(estudianteApoderados)
    .innerJoin(apoderados, eq(estudianteApoderados.apoderadoId, apoderados.id))
    .where(eq(estudianteApoderados.estudianteId, row.estudianteId));

  const vigente = row.archivoUrl
    ? await deps.db
        .select({ nombre: libretaArchivos.nombreOriginal })
        .from(libretaArchivos)
        .where(and(eq(libretaArchivos.libretaId, libretaId), eq(libretaArchivos.vigente, true)))
        .limit(1)
    : [];

  return {
    id: row.id,
    estado: row.estado as EstadoLibreta,
    bimestre: row.bimestre,
    archivoUrl: row.archivoUrl,
    nombreArchivo: vigente[0]?.nombre ?? null,
    vistoEn: row.vistoEn,
    seccionId: row.seccionId,
    estudiantePersonaId: row.estudiantePersonaId,
    apoderadoPersonaIds: apoderadosRows.map((item) => item.personaId),
  };
}

export async function registrarPrimeraVista(
  deps: LibretasRepositoryDeps,
  libretaId: string,
  usuarioId: string,
): Promise<void> {
  await deps.db
    .update(libretas)
    .set({
      vistoEn: sql`CURRENT_TIMESTAMP`,
      vistoPorId: usuarioId,
      actualizadoEn: sql`CURRENT_TIMESTAMP`,
    })
    .where(and(eq(libretas.id, libretaId), isNull(libretas.vistoEn)));
}

export async function historial(
  deps: LibretasRepositoryDeps,
  libretaId: string,
): Promise<HistorialArchivoRow[]> {
  const rows = await deps.db
    .select({
      id: libretaArchivos.id,
      nombreOriginal: libretaArchivos.nombreOriginal,
      asignacion: libretaArchivos.asignacion,
      vigente: libretaArchivos.vigente,
      motivo: libretaArchivos.motivo,
      subidoEn: libretaArchivos.subidoEn,
      nombres: personas.nombres,
      paterno: personas.apellidoPaterno,
      materno: personas.apellidoMaterno,
    })
    .from(libretaArchivos)
    .innerJoin(usuarios, eq(libretaArchivos.subidoPorId, usuarios.id))
    .innerJoin(personas, eq(usuarios.personaId, personas.id))
    .where(eq(libretaArchivos.libretaId, libretaId))
    .orderBy(sql`${libretaArchivos.subidoEn} DESC`);

  return rows.map((row) => ({
    id: row.id,
    nombreOriginal: row.nombreOriginal,
    asignacion: row.asignacion === "manual" ? "manual" : "automatica",
    vigente: row.vigente,
    motivo: row.motivo,
    subidoPorNombre: nombrePersona(row.nombres, row.paterno, row.materno),
    subidoEn: row.subidoEn,
  }));
}

export async function listarPeriodos(
  deps: LibretasRepositoryDeps,
  anioId: string,
): Promise<Array<PeriodoLibretaRow & { fechaLimite: string | null }>> {
  const periodos = await deps.db
    .select({
      id: periodosAcademicos.id,
      nombre: periodosAcademicos.nombre,
      anioAcademicoId: periodosAcademicos.anioAcademicoId,
      fechaInicio: periodosAcademicos.fechaInicio,
      fechaFin: periodosAcademicos.fechaFin,
    })
    .from(periodosAcademicos)
    .where(eq(periodosAcademicos.anioAcademicoId, anioId))
    .orderBy(periodosAcademicos.numero);

  const fechas = await deps.db
    .select({
      periodoId: libretas.periodoId,
      fechaLimite: libretas.fechaLimite,
      estado: libretas.estado,
    })
    .from(libretas)
    .innerJoin(matriculas, eq(libretas.matriculaId, matriculas.id))
    .where(eq(matriculas.anioAcademicoId, anioId));

  return periodos.map((periodo) => {
    const delPeriodo = fechas.filter((item) => item.periodoId === periodo.id);
    const pendiente = delPeriodo.find((item) => item.estado === "pendiente");
    return {
      ...periodo,
      fechaLimite: pendiente?.fechaLimite ?? delPeriodo[0]?.fechaLimite ?? null,
    };
  });
}
