import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, ne, or, sql } from "drizzle-orm";
import {
  ausenciasSesion,
  cursos,
  cursosSeccion,
  docentes,
  evidenciasAusencia,
  grados,
  horarios,
  personas,
  secciones,
  sesionesClase,
  usuarios,
} from "../../../../core/database/schema";
import type {
  AusenciaConDetalle,
  AusenciaFila,
  DatosCrearAusencia,
  DatosCrearEvidencia,
  SesionParaAusencia,
} from "../../interfaces";
import type { AusenciasDocenteRepositoryDeps, AusenciasDocenteRepositoryCalls } from "./deps";

export async function buscarSesionParaAusencia(
  deps: AusenciasDocenteRepositoryDeps,
  sesionId: string,
): Promise<SesionParaAusencia | null> {
  const [fila] = await deps.db
    .select({
      id: sesionesClase.id,
      fecha: sql<string>`${sesionesClase.fecha}::text`,
      horaInicioPlan: sesionesClase.horaInicioPlan,
      horaFinPlan: sesionesClase.horaFinPlan,
      horarioHoraInicio: horarios.horaInicio,
      horarioHoraFin: horarios.horaFin,
      horaInicioReal: sesionesClase.horaInicioReal,
      horaFinReal: sesionesClase.horaFinReal,
      estado: sesionesClase.estado,
      docenteId: sesionesClase.docenteId,
      docentePersonaId: docentes.personaId,
      docenteNombres: personas.nombres,
      docenteApellidoPaterno: personas.apellidoPaterno,
      docenteApellidoMaterno: personas.apellidoMaterno,
      docenteUsuarioId: sql<string>`(
          SELECT u.id FROM usuarios u WHERE u.persona_id = ${docentes.personaId} LIMIT 1
        )`,
      cursoNombre: cursos.nombre,
      gradoNumero: grados.numero,
      seccionNombre: secciones.nombre,
      anioAcademicoId: secciones.anioAcademicoId,
    })
    .from(sesionesClase)
    .innerJoin(horarios, eq(sesionesClase.horarioId, horarios.id))
    .innerJoin(cursosSeccion, eq(horarios.cursoSeccionId, cursosSeccion.id))
    .innerJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
    .innerJoin(secciones, eq(horarios.seccionId, secciones.id))
    .innerJoin(grados, eq(secciones.gradoId, grados.id))
    .innerJoin(docentes, eq(sesionesClase.docenteId, docentes.id))
    .innerJoin(personas, eq(docentes.personaId, personas.id))
    .where(eq(sesionesClase.id, sesionId))
    .limit(1);

  if (!fila) {
    return null;
  }

  const horaInicioCompleta = fila.horaInicioPlan ?? fila.horarioHoraInicio;
  const horaFinCompleta = fila.horaFinPlan ?? fila.horarioHoraFin;

  const horaInicio = horaInicioCompleta ? horaInicioCompleta.slice(0, 5) : "";
  const horaFin = horaFinCompleta ? horaFinCompleta.slice(0, 5) : "";

  const docenteApellidoMaterno = fila.docenteApellidoMaterno
    ? ` ${fila.docenteApellidoMaterno}`
    : "";
  const docenteNombre = `${fila.docenteApellidoPaterno}${docenteApellidoMaterno}, ${fila.docenteNombres}`;
  const seccionNombre = `${fila.gradoNumero}.° ${fila.seccionNombre}`;

  return {
    id: fila.id,
    fecha: fila.fecha,
    horaInicio,
    horaFin,
    horaInicioReal: fila.horaInicioReal ? fila.horaInicioReal.slice(0, 5) : null,
    horaFinReal: fila.horaFinReal ? fila.horaFinReal.slice(0, 5) : null,
    estado: fila.estado,
    docenteId: fila.docenteId,
    docenteNombre,
    docentePersonaId: fila.docentePersonaId,
    docenteUsuarioId: fila.docenteUsuarioId ?? "",
    cursoNombre: fila.cursoNombre,
    seccionNombre,
    anioAcademicoId: fila.anioAcademicoId,
  };
}

export async function buscarAusenciasVigentesDeSesion(
  deps: AusenciasDocenteRepositoryDeps,
  sesionId: string,
  exceptoId?: string,
): Promise<AusenciaFila[]> {
  const condiciones = [
    eq(ausenciasSesion.sesionClaseId, sesionId),
    eq(ausenciasSesion.vigente, true),
  ];
  if (exceptoId) {
    condiciones.push(ne(ausenciasSesion.id, exceptoId));
  }

  const filas = await deps.db
    .select({
      id: ausenciasSesion.id,
      ausenciaRaizId: ausenciasSesion.ausenciaRaizId,
      sesionClaseId: ausenciasSesion.sesionClaseId,
      registradoPorId: ausenciasSesion.registradoPorId,
      horaDesde: ausenciasSesion.horaDesde,
      horaHasta: ausenciasSesion.horaHasta,
      minutos: ausenciasSesion.minutos,
      motivo: ausenciasSesion.motivo,
      observacion: ausenciasSesion.observacion,
      descargo: ausenciasSesion.descargo,
      descargoEn: ausenciasSesion.descargoEn,
      version: ausenciasSesion.version,
      vigente: ausenciasSesion.vigente,
      motivoCambio: ausenciasSesion.motivoCambio,
      anulada: ausenciasSesion.anulada,
      anuladaPorId: ausenciasSesion.anuladaPorId,
      anuladaEn: ausenciasSesion.anuladaEn,
      motivoAnulacion: ausenciasSesion.motivoAnulacion,
      registradoEn: ausenciasSesion.registradoEn,
    })
    .from(ausenciasSesion)
    .where(and(...condiciones))
    .orderBy(asc(ausenciasSesion.horaDesde));

  return filas.map((f) => ({
    ...f,
    horaDesde: f.horaDesde.slice(0, 5),
    horaHasta: f.horaHasta.slice(0, 5),
    minutos: f.minutos ?? 0,
  }));
}

export async function buscarPorId(
  deps: AusenciasDocenteRepositoryDeps,
  calls: AusenciasDocenteRepositoryCalls,
  id: string,
): Promise<AusenciaConDetalle | null> {
  const [fila] = await deps.db
    .select({
      id: ausenciasSesion.id,
      ausenciaRaizId: ausenciasSesion.ausenciaRaizId,
      sesionClaseId: ausenciasSesion.sesionClaseId,
      registradoPorId: ausenciasSesion.registradoPorId,
      horaDesde: ausenciasSesion.horaDesde,
      horaHasta: ausenciasSesion.horaHasta,
      minutos: ausenciasSesion.minutos,
      motivo: ausenciasSesion.motivo,
      observacion: ausenciasSesion.observacion,
      descargo: ausenciasSesion.descargo,
      descargoEn: ausenciasSesion.descargoEn,
      version: ausenciasSesion.version,
      vigente: ausenciasSesion.vigente,
      motivoCambio: ausenciasSesion.motivoCambio,
      anulada: ausenciasSesion.anulada,
      anuladaPorId: ausenciasSesion.anuladaPorId,
      anuladaEn: ausenciasSesion.anuladaEn,
      motivoAnulacion: ausenciasSesion.motivoAnulacion,
      registradoEn: ausenciasSesion.registradoEn,
      registradorNombres: personas.nombres,
      registradorApellidoPaterno: personas.apellidoPaterno,
      registradorApellidoMaterno: personas.apellidoMaterno,
    })
    .from(ausenciasSesion)
    .innerJoin(usuarios, eq(ausenciasSesion.registradoPorId, usuarios.id))
    .innerJoin(personas, eq(usuarios.personaId, personas.id))
    .where(eq(ausenciasSesion.id, id))
    .limit(1);

  if (!fila) {
    return null;
  }

  const sesion = await calls.buscarSesionParaAusencia(fila.sesionClaseId);
  if (!sesion) {
    return null;
  }

  const fotos = await deps.db
    .select({
      id: evidenciasAusencia.id,
      ausenciaId: evidenciasAusencia.ausenciaId,
      archivoUrl: evidenciasAusencia.archivoUrl,
      tomadaEn: evidenciasAusencia.tomadaEn,
      orden: evidenciasAusencia.orden,
      vigente: evidenciasAusencia.vigente,
    })
    .from(evidenciasAusencia)
    .where(and(eq(evidenciasAusencia.ausenciaId, id), eq(evidenciasAusencia.vigente, true)))
    .orderBy(asc(evidenciasAusencia.orden));

  const registradorMaterno = fila.registradorApellidoMaterno
    ? ` ${fila.registradorApellidoMaterno}`
    : "";
  const registradoPorNombre =
    `${fila.registradorNombres} ${fila.registradorApellidoPaterno}${registradorMaterno}`.trim();

  return {
    id: fila.id,
    ausenciaRaizId: fila.ausenciaRaizId,
    sesionClaseId: fila.sesionClaseId,
    registradoPorId: fila.registradoPorId,
    horaDesde: fila.horaDesde.slice(0, 5),
    horaHasta: fila.horaHasta.slice(0, 5),
    minutos: fila.minutos ?? 0,
    motivo: fila.motivo,
    observacion: fila.observacion,
    descargo: fila.descargo,
    descargoEn: fila.descargoEn,
    version: fila.version,
    vigente: fila.vigente,
    motivoCambio: fila.motivoCambio,
    anulada: fila.anulada,
    anuladaPorId: fila.anuladaPorId,
    anuladaEn: fila.anuladaEn,
    motivoAnulacion: fila.motivoAnulacion,
    registradoEn: fila.registradoEn,
    sesion,
    fotos,
    registradoPorNombre,
  };
}

export async function buscarVersionesDeRaiz(
  deps: AusenciasDocenteRepositoryDeps,
  calls: AusenciasDocenteRepositoryCalls,
  raizId: string,
): Promise<AusenciaConDetalle[]> {
  const versiones = await deps.db
    .select({ id: ausenciasSesion.id })
    .from(ausenciasSesion)
    .where(or(eq(ausenciasSesion.ausenciaRaizId, raizId), eq(ausenciasSesion.id, raizId)))
    .orderBy(desc(ausenciasSesion.version));

  const resultados: AusenciaConDetalle[] = [];
  for (const v of versiones) {
    const detalle = await calls.buscarPorId(v.id);
    if (detalle) {
      resultados.push(detalle);
    }
  }
  return resultados;
}

export async function crearAusenciaConFotos(
  deps: AusenciasDocenteRepositoryDeps,
  calls: AusenciasDocenteRepositoryCalls,
  datos: DatosCrearAusencia,
  fotos: DatosCrearEvidencia[],
): Promise<AusenciaConDetalle> {
  const nuevoId = randomUUID();

  await deps.db.transaction(async (tx) => {
    await tx.insert(ausenciasSesion).values({
      id: nuevoId,
      ausenciaRaizId: nuevoId,
      sesionClaseId: datos.sesionClaseId,
      registradoPorId: datos.registradoPorId,
      horaDesde: datos.horaDesde,
      horaHasta: datos.horaHasta,
      motivo: datos.motivo,
      observacion: datos.observacion ?? null,
      version: 1,
      vigente: true,
      anulada: false,
    });

    if (fotos.length > 0) {
      await tx.insert(evidenciasAusencia).values(
        fotos.map((f, idx) => ({
          id: randomUUID(),
          ausenciaId: nuevoId,
          archivoUrl: f.archivoUrl,
          tomadaEn: f.tomadaEn ?? null,
          orden: f.orden ?? idx + 1,
          vigente: true,
        })),
      );
    }
  });

  const creada = await calls.buscarPorId(nuevoId);
  if (!creada) {
    throw new Error("No se pudo recuperar la ausencia recién creada.");
  }
  return creada;
}
