import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
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
} from "../../../core/database/schema";
import type {
  ConsolidadoResumenItem,
  DecisionConsolidado,
  DetalleAusenciaConsolidado,
  DetalleSesionConsolidado,
  EstadoConsolidado,
  EstadoSolicitudRevision,
  HistorialVersionConsolidadoItem,
  SolicitudRevisionItem,
} from "../interfaces";
import { formatearMinutosAHrsMin } from "../utils";

@Injectable()
export class ConsolidadoDocenteRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async obtenerPeriodo(periodoId: string) {
    const [periodo] = await this.db
      .select({
        id: periodosAcademicos.id,
        nombre: periodosAcademicos.nombre,
        fechaInicio: sql<string>`${periodosAcademicos.fechaInicio}::text`,
        fechaFin: sql<string>`${periodosAcademicos.fechaFin}::text`,
        estado: periodosAcademicos.estado,
        anioAcademicoId: periodosAcademicos.anioAcademicoId,
      })
      .from(periodosAcademicos)
      .where(eq(periodosAcademicos.id, periodoId))
      .limit(1);

    return periodo ?? null;
  }

  async listarDocentesConSesionesEnPeriodo(
    fechaInicio: string,
    fechaFin: string,
    docenteId?: string,
  ) {
    const condiciones = [
      sql`${sesionesClase.fecha} >= ${fechaInicio}`,
      sql`${sesionesClase.fecha} <= ${fechaFin}`,
    ];

    if (docenteId) {
      condiciones.push(eq(sesionesClase.docenteId, docenteId));
    }

    const filas = await this.db
      .selectDistinct({
        docenteId: docentes.id,
        nombreCompleto: sql<string>`concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno})`,
        numeroDocumento: personas.numeroDocumento,
        usuarioId: usuarios.id,
        personaId: personas.id,
      })
      .from(sesionesClase)
      .innerJoin(docentes, eq(docentes.id, sesionesClase.docenteId))
      .innerJoin(personas, eq(personas.id, docentes.personaId))
      .leftJoin(usuarios, eq(usuarios.personaId, personas.id))
      .where(and(...condiciones));

    return filas;
  }

  async obtenerConsolidadosVigentesPeriodo(periodoId: string): Promise<ConsolidadoResumenItem[]> {
    const filas = await this.db
      .select({
        id: consolidadosDocente.id,
        docenteId: consolidadosDocente.docenteId,
        docenteNombre: sql<string>`concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno})`,
        docenteDni: personas.numeroDocumento,
        periodoId: consolidadosDocente.periodoId,
        periodoNombre: periodosAcademicos.nombre,
        version: consolidadosDocente.version,
        vigente: consolidadosDocente.vigente,
        estado: sql<EstadoConsolidado>`${consolidadosDocente.estado}`,
        sesionesProgramadas: consolidadosDocente.sesionesProgramadas,
        sesionesCumplidas: consolidadosDocente.sesionesCumplidas,
        sesionesParciales: consolidadosDocente.sesionesParciales,
        sesionesNoCumplidas: consolidadosDocente.sesionesNoCumplidas,
        sesionesJustificadas: consolidadosDocente.sesionesJustificadas,
        minutosPerdidosFirma: consolidadosDocente.minutosPerdidosFirma,
        totalAusencias: consolidadosDocente.totalAusencias,
        minutosFueraAula: consolidadosDocente.minutosFueraAula,
        minutosTotalFuera: consolidadosDocente.minutosTotalFuera,
        decision: sql<DecisionConsolidado>`${consolidadosDocente.decision}`,
        observacion: consolidadosDocente.observacion,
        motivoCambio: consolidadosDocente.motivoCambio,
        generadoEn: sql<string>`${consolidadosDocente.generadoEn}::text`,
        generadoPorNombre: sql<string>`concat_ws(' ', u_per.nombres, u_per.apellido_paterno)`,
      })
      .from(consolidadosDocente)
      .innerJoin(docentes, eq(docentes.id, consolidadosDocente.docenteId))
      .innerJoin(personas, eq(personas.id, docentes.personaId))
      .innerJoin(periodosAcademicos, eq(periodosAcademicos.id, consolidadosDocente.periodoId))
      .innerJoin(usuarios, eq(usuarios.id, consolidadosDocente.generadoPorId))
      .innerJoin(sql`personas u_per`, sql`u_per.id = ${usuarios.personaId}`)
      .where(
        and(eq(consolidadosDocente.periodoId, periodoId), eq(consolidadosDocente.vigente, true)),
      );

    const resultado: ConsolidadoResumenItem[] = [];
    for (const fila of filas) {
      const [solicitud] = await this.db
        .select({
          total: sql<number>`count(*)::int`,
        })
        .from(solicitudesRevisionConsolidado)
        .where(
          and(
            eq(solicitudesRevisionConsolidado.consolidadoId, fila.id),
            eq(solicitudesRevisionConsolidado.estado, "solicitada"),
          ),
        );

      resultado.push({
        ...fila,
        tiempoTotalFueraTexto: formatearMinutosAHrsMin(fila.minutosTotalFuera),
        solicitudesPendientesCount: solicitud?.total ?? 0,
      });
    }

    return resultado;
  }

  async obtenerConsolidadoVigenteDocente(docenteId: string, periodoId: string) {
    const [fila] = await this.db
      .select({
        id: consolidadosDocente.id,
        docenteId: consolidadosDocente.docenteId,
        periodoId: consolidadosDocente.periodoId,
        version: consolidadosDocente.version,
        vigente: consolidadosDocente.vigente,
        estado: sql<EstadoConsolidado>`${consolidadosDocente.estado}`,
        sesionesProgramadas: consolidadosDocente.sesionesProgramadas,
        sesionesCumplidas: consolidadosDocente.sesionesCumplidas,
        sesionesParciales: consolidadosDocente.sesionesParciales,
        sesionesNoCumplidas: consolidadosDocente.sesionesNoCumplidas,
        sesionesJustificadas: consolidadosDocente.sesionesJustificadas,
        minutosPerdidosFirma: consolidadosDocente.minutosPerdidosFirma,
        totalAusencias: consolidadosDocente.totalAusencias,
        minutosFueraAula: consolidadosDocente.minutosFueraAula,
        minutosTotalFuera: consolidadosDocente.minutosTotalFuera,
        decision: sql<DecisionConsolidado>`${consolidadosDocente.decision}`,
        observacion: consolidadosDocente.observacion,
        motivoCambio: consolidadosDocente.motivoCambio,
        generadoPorId: consolidadosDocente.generadoPorId,
        generadoEn: sql<string>`${consolidadosDocente.generadoEn}::text`,
      })
      .from(consolidadosDocente)
      .where(
        and(
          eq(consolidadosDocente.docenteId, docenteId),
          eq(consolidadosDocente.periodoId, periodoId),
          eq(consolidadosDocente.vigente, true),
        ),
      )
      .limit(1);

    return fila ?? null;
  }

  async obtenerConsolidadoPorId(consolidadoId: string) {
    const [fila] = await this.db
      .select({
        id: consolidadosDocente.id,
        docenteId: consolidadosDocente.docenteId,
        docenteNombre: sql<string>`concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno})`,
        docenteDni: personas.numeroDocumento,
        firmaDocenteUrl: docentes.firmaUrl,
        periodoId: consolidadosDocente.periodoId,
        periodoNombre: periodosAcademicos.nombre,
        version: consolidadosDocente.version,
        vigente: consolidadosDocente.vigente,
        estado: sql<EstadoConsolidado>`${consolidadosDocente.estado}`,
        sesionesProgramadas: consolidadosDocente.sesionesProgramadas,
        sesionesCumplidas: consolidadosDocente.sesionesCumplidas,
        sesionesParciales: consolidadosDocente.sesionesParciales,
        sesionesNoCumplidas: consolidadosDocente.sesionesNoCumplidas,
        sesionesJustificadas: consolidadosDocente.sesionesJustificadas,
        minutosPerdidosFirma: consolidadosDocente.minutosPerdidosFirma,
        totalAusencias: consolidadosDocente.totalAusencias,
        minutosFueraAula: consolidadosDocente.minutosFueraAula,
        minutosTotalFuera: consolidadosDocente.minutosTotalFuera,
        decision: sql<DecisionConsolidado>`${consolidadosDocente.decision}`,
        observacion: consolidadosDocente.observacion,
        motivoCambio: consolidadosDocente.motivoCambio,
        generadoEn: sql<string>`${consolidadosDocente.generadoEn}::text`,
        generadoPorId: consolidadosDocente.generadoPorId,
        generadoPorNombre: sql<string>`concat_ws(' ', u_per.nombres, u_per.apellido_paterno)`,
      })
      .from(consolidadosDocente)
      .innerJoin(docentes, eq(docentes.id, consolidadosDocente.docenteId))
      .innerJoin(personas, eq(personas.id, docentes.personaId))
      .innerJoin(periodosAcademicos, eq(periodosAcademicos.id, consolidadosDocente.periodoId))
      .innerJoin(usuarios, eq(usuarios.id, consolidadosDocente.generadoPorId))
      .innerJoin(sql`personas u_per`, sql`u_per.id = ${usuarios.personaId}`)
      .where(eq(consolidadosDocente.id, consolidadoId))
      .limit(1);

    return fila ?? null;
  }

  async calcularMetricasDocente(docenteId: string, fechaInicio: string, fechaFin: string) {
    const sesiones = await this.db
      .select({
        id: sesionesClase.id,
        estado: sesionesClase.estado,
        minutosPerdidos: sesionesClase.minutosPerdidos,
      })
      .from(sesionesClase)
      .where(
        and(
          eq(sesionesClase.docenteId, docenteId),
          sql`${sesionesClase.fecha} >= ${fechaInicio}`,
          sql`${sesionesClase.fecha} <= ${fechaFin}`,
        ),
      );

    let cumplidas = 0;
    let parciales = 0;
    let noCumplidas = 0;
    let justificadas = 0;
    let minutosPerdidosFirma = 0;

    for (const s of sesiones) {
      if (s.estado === "cumplida") cumplidas++;
      else if (s.estado === "parcial") parciales++;
      else if (s.estado === "no_cumplida") noCumplidas++;
      else if (s.estado === "justificada") justificadas++;

      minutosPerdidosFirma += s.minutosPerdidos || 0;
    }

    const ausencias = await this.db
      .select({
        id: ausenciasSesion.id,
        minutos: ausenciasSesion.minutos,
      })
      .from(ausenciasSesion)
      .innerJoin(sesionesClase, eq(sesionesClase.id, ausenciasSesion.sesionClaseId))
      .where(
        and(
          eq(sesionesClase.docenteId, docenteId),
          sql`${sesionesClase.fecha} >= ${fechaInicio}`,
          sql`${sesionesClase.fecha} <= ${fechaFin}`,
          eq(ausenciasSesion.vigente, true),
          eq(ausenciasSesion.anulada, false),
        ),
      );

    const totalAusencias = ausencias.length;
    const minutosFueraAula = ausencias.reduce((sum, a) => sum + (a.minutos || 0), 0);
    const minutosTotalFuera = minutosPerdidosFirma + minutosFueraAula;

    return {
      sesionesProgramadas: sesiones.length,
      sesionesCumplidas: cumplidas,
      sesionesParciales: parciales,
      sesionesNoCumplidas: noCumplidas,
      sesionesJustificadas: justificadas,
      minutosPerdidosFirma,
      totalAusencias,
      minutosFueraAula,
      minutosTotalFuera,
    };
  }

  async crearConsolidado(datos: {
    docenteId: string;
    periodoId: string;
    sesionesProgramadas: number;
    sesionesCumplidas: number;
    sesionesParciales: number;
    sesionesNoCumplidas: number;
    sesionesJustificadas: number;
    minutosPerdidosFirma: number;
    totalAusencias: number;
    minutosFueraAula: number;
    minutosTotalFuera: number;
    generadoPorId: string;
  }) {
    const [creado] = await this.db
      .insert(consolidadosDocente)
      .values({
        docenteId: datos.docenteId,
        periodoId: datos.periodoId,
        estado: "cerrado",
        version: 1,
        vigente: true,
        sesionesProgramadas: datos.sesionesProgramadas,
        sesionesCumplidas: datos.sesionesCumplidas,
        sesionesParciales: datos.sesionesParciales,
        sesionesNoCumplidas: datos.sesionesNoCumplidas,
        sesionesJustificadas: datos.sesionesJustificadas,
        minutosPerdidosFirma: datos.minutosPerdidosFirma,
        totalAusencias: datos.totalAusencias,
        minutosFueraAula: datos.minutosFueraAula,
        minutosTotalFuera: datos.minutosTotalFuera,
        decision: "ninguna",
        generadoPorId: datos.generadoPorId,
      })
      .returning();

    return creado;
  }

  async actualizarDecision(
    consolidadoId: string,
    decision: DecisionConsolidado,
    observacion?: string,
  ) {
    const [actualizado] = await this.db
      .update(consolidadosDocente)
      .set({
        decision,
        observacion: observacion || null,
      })
      .where(eq(consolidadosDocente.id, consolidadoId))
      .returning();

    return actualizado;
  }

  async reabrirConsolidado(consolidadoId: string) {
    const [actualizado] = await this.db
      .update(consolidadosDocente)
      .set({ estado: "reabierto" })
      .where(eq(consolidadosDocente.id, consolidadoId))
      .returning();

    return actualizado;
  }

  async cerrarConNuevaVersion(
    consolidadoAnteriorId: string,
    motivoCambio: string,
    metricasRecalculadas: {
      sesionesProgramadas: number;
      sesionesCumplidas: number;
      sesionesParciales: number;
      sesionesNoCumplidas: number;
      sesionesJustificadas: number;
      minutosPerdidosFirma: number;
      totalAusencias: number;
      minutosFueraAula: number;
      minutosTotalFuera: number;
    },
    generadoPorId: string,
  ) {
    return await this.db.transaction(async (tx) => {
      const [anterior] = await tx
        .select()
        .from(consolidadosDocente)
        .where(eq(consolidadosDocente.id, consolidadoAnteriorId))
        .limit(1);

      if (!anterior) {
        throw new Error("Consolidado anterior no encontrado.");
      }

      await tx
        .update(consolidadosDocente)
        .set({ vigente: false, estado: "cerrado" })
        .where(eq(consolidadosDocente.id, consolidadoAnteriorId));

      const [nuevaVersion] = await tx
        .insert(consolidadosDocente)
        .values({
          docenteId: anterior.docenteId,
          periodoId: anterior.periodoId,
          version: anterior.version + 1,
          estado: "cerrado",
          vigente: true,
          motivoCambio,
          sesionesProgramadas: metricasRecalculadas.sesionesProgramadas,
          sesionesCumplidas: metricasRecalculadas.sesionesCumplidas,
          sesionesParciales: metricasRecalculadas.sesionesParciales,
          sesionesNoCumplidas: metricasRecalculadas.sesionesNoCumplidas,
          sesionesJustificadas: metricasRecalculadas.sesionesJustificadas,
          minutosPerdidosFirma: metricasRecalculadas.minutosPerdidosFirma,
          totalAusencias: metricasRecalculadas.totalAusencias,
          minutosFueraAula: metricasRecalculadas.minutosFueraAula,
          minutosTotalFuera: metricasRecalculadas.minutosTotalFuera,
          decision: anterior.decision,
          observacion: anterior.observacion,
          generadoPorId,
        })
        .returning();

      return nuevaVersion;
    });
  }

  async listarHistorialVersiones(
    docenteId: string,
    periodoId: string,
  ): Promise<HistorialVersionConsolidadoItem[]> {
    const filas = await this.db
      .select({
        id: consolidadosDocente.id,
        version: consolidadosDocente.version,
        vigente: consolidadosDocente.vigente,
        estado: sql<EstadoConsolidado>`${consolidadosDocente.estado}`,
        motivoCambio: consolidadosDocente.motivoCambio,
        minutosTotalFuera: consolidadosDocente.minutosTotalFuera,
        sesionesProgramadas: consolidadosDocente.sesionesProgramadas,
        sesionesCumplidas: consolidadosDocente.sesionesCumplidas,
        sesionesParciales: consolidadosDocente.sesionesParciales,
        sesionesNoCumplidas: consolidadosDocente.sesionesNoCumplidas,
        sesionesJustificadas: consolidadosDocente.sesionesJustificadas,
        totalAusencias: consolidadosDocente.totalAusencias,
        minutosFueraAula: consolidadosDocente.minutosFueraAula,
        decision: sql<DecisionConsolidado>`${consolidadosDocente.decision}`,
        observacion: consolidadosDocente.observacion,
        generadoPorNombre: sql<string>`concat_ws(' ', u_per.nombres, u_per.apellido_paterno)`,
        generadoEn: sql<string>`${consolidadosDocente.generadoEn}::text`,
      })
      .from(consolidadosDocente)
      .innerJoin(usuarios, eq(usuarios.id, consolidadosDocente.generadoPorId))
      .innerJoin(sql`personas u_per`, sql`u_per.id = ${usuarios.personaId}`)
      .where(
        and(
          eq(consolidadosDocente.docenteId, docenteId),
          eq(consolidadosDocente.periodoId, periodoId),
        ),
      )
      .orderBy(desc(consolidadosDocente.version));

    return filas.map((f) => ({
      ...f,
      tiempoTotalFueraTexto: formatearMinutosAHrsMin(f.minutosTotalFuera),
    }));
  }

  async obtenerDetalleSesiones(
    docenteId: string,
    fechaInicio: string,
    fechaFin: string,
  ): Promise<DetalleSesionConsolidado[]> {
    const sesiones = await this.db
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
      const ausencias = await this.db
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
          and(
            eq(ausenciasSesion.sesionClaseId, sesion.sesionId),
            eq(ausenciasSesion.vigente, true),
          ),
        );

      const ausenciasConFotos: DetalleAusenciaConsolidado[] = [];
      for (const a of ausencias) {
        const evidencias = await this.db
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

  async crearSolicitudRevision(datos: {
    consolidadoId: string;
    docenteId: string;
    motivo: string;
    adjuntoUrl?: string;
  }): Promise<SolicitudRevisionItem> {
    const [creada] = await this.db
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

  async obtenerSolicitudPendiente(consolidadoId: string) {
    const [fila] = await this.db
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

  async obtenerSolicitudPorId(solicitudId: string) {
    const [fila] = await this.db
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
      .leftJoin(
        sql`usuarios u_res`,
        sql`u_res.id = ${solicitudesRevisionConsolidado.resueltoPorId}`,
      )
      .leftJoin(sql`personas u_per`, sql`u_per.id = u_res.persona_id`)
      .where(eq(solicitudesRevisionConsolidado.id, solicitudId))
      .limit(1);

    return fila ?? null;
  }

  async resolverSolicitud(
    solicitudId: string,
    accion: "aceptar" | "rechazar",
    respuesta: string,
    resueltoPorId: string,
  ) {
    return await this.db.transaction(async (tx) => {
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

  async obtenerDocenteDePersona(personaId: string) {
    const [docente] = await this.db
      .select({
        id: docentes.id,
        personaId: docentes.personaId,
      })
      .from(docentes)
      .where(eq(docentes.personaId, personaId))
      .limit(1);

    return docente ?? null;
  }

  async consolidadoCerradoBloqueante(docenteId: string, fecha: string): Promise<boolean> {
    const [periodo] = await this.db
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

    const [consolidado] = await this.db
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
}
