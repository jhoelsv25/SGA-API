import { and, eq, sql } from "drizzle-orm";
import {
  ausenciasSesion,
  consolidadosDocente,
  cursos,
  cursosSeccion,
  docentes,
  evidenciasAusencia,
  grados,
  horarios,
  periodosAcademicos,
  personas,
  secciones,
  sesionesClase,
  solicitudesRevisionConsolidado,
  usuarios,
} from "../../../../core/database/schema";
import type {
  DetalleAusenciaConsolidado,
  DetalleSesionConsolidado,
  EstadoSolicitudRevision,
  SolicitudRevisionItem,
} from "../../interfaces";
import type { ConsolidadoDocenteRepositoryDeps } from "./deps";

export async function obtenerDetalleSesiones(
  deps: ConsolidadoDocenteRepositoryDeps,
  docenteId: string,
  fechaInicio: string,
  fechaFin: string,
): Promise<DetalleSesionConsolidado[]> {
  const sesiones = await deps.db
    .select({
      sesionId: sesionesClase.id,
      fecha: sql<string>`${sesionesClase.fecha}::text`,
      cursoNombre: cursos.nombre,
      seccionNombre: secciones.nombre,
      gradoNombre: grados.nombre,
      tema: sesionesClase.tema,
      horaIngresoProgramada: sql<string>`coalesce(${sesionesClase.horaInicioPlan}::text, ${horarios.horaInicio}::text)`,
      horaSalidaProgramada: sql<string>`coalesce(${sesionesClase.horaFinPlan}::text, ${horarios.horaFin}::text)`,
      horaIngresoFirmada: sql<string>`${sesionesClase.horaInicioReal}::text`,
      horaSalidaFirmada: sql<string>`${sesionesClase.horaFinReal}::text`,
      minutosPerdidos: sesionesClase.minutosPerdidos,
      estado: sesionesClase.estado,
    })
    .from(sesionesClase)
    .innerJoin(horarios, eq(horarios.id, sesionesClase.horarioId))
    .leftJoin(cursosSeccion, eq(cursosSeccion.id, horarios.cursoSeccionId))
    .leftJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
    .innerJoin(secciones, eq(secciones.id, horarios.seccionId))
    .innerJoin(grados, eq(grados.id, secciones.gradoId))
    .where(
      and(
        eq(sesionesClase.docenteId, docenteId),
        sql`${sesionesClase.fecha} >= ${fechaInicio}`,
        sql`${sesionesClase.fecha} <= ${fechaFin}`,
      ),
    )
    .orderBy(sesionesClase.fecha, horarios.horaInicio);

  const resultado: DetalleSesionConsolidado[] = [];

  for (const sesion of sesiones) {
    const ausencias = await deps.db
      .select({
        ausenciaId: ausenciasSesion.id,
        tramoHorario: sql<string>`concat(${ausenciasSesion.horaDesde}::text, ' - ', ${ausenciasSesion.horaHasta}::text)`,
        minutos: ausenciasSesion.minutos,
        motivo: ausenciasSesion.motivo,
        observacion: ausenciasSesion.observacion,
        descargo: ausenciasSesion.descargo,
        anulada: ausenciasSesion.anulada,
      })
      .from(ausenciasSesion)
      .where(
        and(eq(ausenciasSesion.sesionClaseId, sesion.sesionId), eq(ausenciasSesion.vigente, true)),
      );

    const ausenciasConFotos: DetalleAusenciaConsolidado[] = [];
    for (const a of ausencias) {
      const evidencias = await deps.db
        .select({ fotoUrl: evidenciasAusencia.archivoUrl })
        .from(evidenciasAusencia)
        .where(
          and(
            eq(evidenciasAusencia.ausenciaId, a.ausenciaId),
            eq(evidenciasAusencia.vigente, true),
          ),
        );

      ausenciasConFotos.push({
        ausenciaId: a.ausenciaId,
        tramoHorario: a.tramoHorario,
        minutos: a.minutos ?? 0,
        motivo: a.motivo,
        observacion: a.observacion,
        descargo: a.descargo,
        anulada: a.anulada,
        fotos: evidencias.map((e) => e.fotoUrl),
      });
    }

    resultado.push({
      sesionId: sesion.sesionId,
      fecha: sesion.fecha,
      cursoNombre: sesion.cursoNombre || "Clase",
      seccionNombre: sesion.seccionNombre,
      gradoNombre: sesion.gradoNombre,
      tema: sesion.tema,
      horaIngresoProgramada: sesion.horaIngresoProgramada,
      horaSalidaProgramada: sesion.horaSalidaProgramada,
      horaIngresoFirmada: sesion.horaIngresoFirmada,
      horaSalidaFirmada: sesion.horaSalidaFirmada,
      minutosPerdidos: sesion.minutosPerdidos,
      estado: sesion.estado,
      ausencias: ausenciasConFotos,
    });
  }

  return resultado;
}

export async function crearSolicitudRevision(
  deps: ConsolidadoDocenteRepositoryDeps,
  datos: {
    consolidadoId: string;
    docenteId: string;
    motivo: string;
    adjuntoUrl?: string;
  },
): Promise<SolicitudRevisionItem> {
  const [creada] = await deps.db
    .insert(solicitudesRevisionConsolidado)
    .values({
      consolidadoId: datos.consolidadoId,
      docenteId: datos.docenteId,
      estado: "solicitada",
      motivo: datos.motivo,
      adjuntoUrl: datos.adjuntoUrl || null,
    })
    .returning();

  return {
    id: creada.id,
    consolidadoId: creada.consolidadoId,
    docenteId: creada.docenteId,
    estado: creada.estado as EstadoSolicitudRevision,
    motivo: creada.motivo,
    adjuntoUrl: creada.adjuntoUrl,
    solicitadoEn: creada.solicitadoEn,
    resueltoPorNombre: null,
    resueltoEn: null,
    respuesta: null,
  };
}

export async function obtenerSolicitudPendiente(
  deps: ConsolidadoDocenteRepositoryDeps,
  consolidadoId: string,
) {
  const [fila] = await deps.db
    .select({
      id: solicitudesRevisionConsolidado.id,
      consolidadoId: solicitudesRevisionConsolidado.consolidadoId,
      docenteId: solicitudesRevisionConsolidado.docenteId,
      docenteNombre: sql<string>`concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno})`,
      estado: sql<EstadoSolicitudRevision>`${solicitudesRevisionConsolidado.estado}`,
      motivo: solicitudesRevisionConsolidado.motivo,
      adjuntoUrl: solicitudesRevisionConsolidado.adjuntoUrl,
      solicitadoEn: sql<string>`${solicitudesRevisionConsolidado.solicitadoEn}::text`,
      resueltoPorNombre: sql<string>`concat_ws(' ', u_per.nombres, u_per.apellido_paterno)`,
      resueltoEn: sql<string>`${solicitudesRevisionConsolidado.resueltoEn}::text`,
      respuesta: solicitudesRevisionConsolidado.respuesta,
    })
    .from(solicitudesRevisionConsolidado)
    .innerJoin(docentes, eq(docentes.id, solicitudesRevisionConsolidado.docenteId))
    .innerJoin(personas, eq(personas.id, docentes.personaId))
    .leftJoin(usuarios, eq(usuarios.id, solicitudesRevisionConsolidado.resueltoPorId))
    .leftJoin(sql`personas u_per`, sql`u_per.id = ${usuarios.personaId}`)
    .where(
      and(
        eq(solicitudesRevisionConsolidado.consolidadoId, consolidadoId),
        eq(solicitudesRevisionConsolidado.estado, "solicitada"),
      ),
    )
    .limit(1);

  return fila ?? null;
}

export async function obtenerSolicitudPorId(
  deps: ConsolidadoDocenteRepositoryDeps,
  solicitudId: string,
) {
  const [fila] = await deps.db
    .select({
      id: solicitudesRevisionConsolidado.id,
      consolidadoId: solicitudesRevisionConsolidado.consolidadoId,
      docenteId: solicitudesRevisionConsolidado.docenteId,
      docenteUsuarioId: usuarios.id,
      docentePersonaId: personas.id,
      docenteNombre: sql<string>`concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno})`,
      estado: sql<EstadoSolicitudRevision>`${solicitudesRevisionConsolidado.estado}`,
      motivo: solicitudesRevisionConsolidado.motivo,
      adjuntoUrl: solicitudesRevisionConsolidado.adjuntoUrl,
      solicitadoEn: sql<string>`${solicitudesRevisionConsolidado.solicitadoEn}::text`,
      resueltoPorNombre: sql<string>`concat_ws(' ', u_per.nombres, u_per.apellido_paterno)`,
      resueltoEn: sql<string>`${solicitudesRevisionConsolidado.resueltoEn}::text`,
      respuesta: solicitudesRevisionConsolidado.respuesta,
    })
    .from(solicitudesRevisionConsolidado)
    .innerJoin(docentes, eq(docentes.id, solicitudesRevisionConsolidado.docenteId))
    .innerJoin(personas, eq(personas.id, docentes.personaId))
    .leftJoin(usuarios, eq(usuarios.personaId, personas.id))
    .leftJoin(sql`usuarios u_res`, sql`u_res.id = ${solicitudesRevisionConsolidado.resueltoPorId}`)
    .leftJoin(sql`personas u_per`, sql`u_per.id = u_res.persona_id`)
    .where(eq(solicitudesRevisionConsolidado.id, solicitudId))
    .limit(1);

  return fila ?? null;
}

export async function resolverSolicitud(
  deps: ConsolidadoDocenteRepositoryDeps,
  solicitudId: string,
  accion: "aceptar" | "rechazar",
  respuesta: string,
  resueltoPorId: string,
) {
  return await deps.db.transaction(async (tx) => {
    const nuevoEstado = accion === "aceptar" ? "aceptada" : "rechazada";

    const [solicitud] = await tx
      .update(solicitudesRevisionConsolidado)
      .set({
        estado: nuevoEstado,
        respuesta,
        resueltoPorId,
        resueltoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(solicitudesRevisionConsolidado.id, solicitudId))
      .returning();

    if (accion === "aceptar") {
      await tx
        .update(consolidadosDocente)
        .set({ estado: "reabierto" })
        .where(eq(consolidadosDocente.id, solicitud.consolidadoId));
    }

    return solicitud;
  });
}

export async function obtenerDocenteDePersona(
  deps: ConsolidadoDocenteRepositoryDeps,
  personaId: string,
) {
  const [docente] = await deps.db
    .select({
      id: docentes.id,
      personaId: docentes.personaId,
    })
    .from(docentes)
    .where(eq(docentes.personaId, personaId))
    .limit(1);

  return docente ?? null;
}

export async function consolidadoCerradoBloqueante(
  deps: ConsolidadoDocenteRepositoryDeps,
  docenteId: string,
  fecha: string,
): Promise<boolean> {
  const [periodo] = await deps.db
    .select({ id: periodosAcademicos.id })
    .from(periodosAcademicos)
    .where(
      and(
        sql`${periodosAcademicos.fechaInicio} <= ${fecha}`,
        sql`${periodosAcademicos.fechaFin} >= ${fecha}`,
      ),
    )
    .limit(1);

  if (!periodo) return false;

  const [consolidado] = await deps.db
    .select({ id: consolidadosDocente.id })
    .from(consolidadosDocente)
    .where(
      and(
        eq(consolidadosDocente.docenteId, docenteId),
        eq(consolidadosDocente.periodoId, periodo.id),
        eq(consolidadosDocente.vigente, true),
        eq(consolidadosDocente.estado, "cerrado"),
      ),
    )
    .limit(1);

  return Boolean(consolidado);
}
