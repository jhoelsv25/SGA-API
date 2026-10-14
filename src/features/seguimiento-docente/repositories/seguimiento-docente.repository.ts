import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
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
import type { DecisionConsolidado, EstadoConsolidado, EstadoSolicitudRevision } from "../constants";
import type {
  ConsolidadoFila,
  DatosCrearConsolidado,
  DatosCrearSolicitud,
  DatosNuevaVersionConsolidado,
  DocenteParaConsolidado,
  FiltrosListarSolicitudesRepo,
  ISeguimientoDocenteRepository,
  MetricasCalculadasDocente,
  PeriodoParaConsolidado,
  SolicitudRevisionFila,
} from "../interfaces";

@Injectable()
export class SeguimientoDocenteRepository implements ISeguimientoDocenteRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async buscarPeriodoPorId(periodoId: string): Promise<PeriodoParaConsolidado | null> {
    const [fila] = await this.db
      .select({
        id: periodosAcademicos.id,
        nombre: periodosAcademicos.nombre,
        numero: periodosAcademicos.numero,
        estado: periodosAcademicos.estado,
        fechaInicio: sql<string>`${periodosAcademicos.fechaInicio}::text`,
        fechaFin: sql<string>`${periodosAcademicos.fechaFin}::text`,
      })
      .from(periodosAcademicos)
      .where(eq(periodosAcademicos.id, periodoId))
      .limit(1);

    return fila ?? null;
  }

  async buscarPeriodoPorFecha(fecha: string): Promise<PeriodoParaConsolidado | null> {
    const [fila] = await this.db
      .select({
        id: periodosAcademicos.id,
        nombre: periodosAcademicos.nombre,
        numero: periodosAcademicos.numero,
        estado: periodosAcademicos.estado,
        fechaInicio: sql<string>`${periodosAcademicos.fechaInicio}::text`,
        fechaFin: sql<string>`${periodosAcademicos.fechaFin}::text`,
      })
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

  async buscarDocentesConSesionesEnPeriodo(periodoId: string): Promise<DocenteParaConsolidado[]> {
    const periodo = await this.buscarPeriodoPorId(periodoId);
    if (!periodo) {
      return [];
    }

    const filas = await this.db
      .selectDistinct({
        id: docentes.id,
        personaId: docentes.personaId,
        usuarioId: sql<string>`COALESCE((SELECT u.id FROM usuarios u WHERE u.persona_id = ${docentes.personaId} LIMIT 1), '')`,
        nombres: personas.nombres,
        apellidoPaterno: personas.apellidoPaterno,
        apellidoMaterno: personas.apellidoMaterno,
        numeroDocumento: personas.numeroDocumento,
        firmaUrl: docentes.firmaUrl,
      })
      .from(sesionesClase)
      .innerJoin(docentes, eq(sesionesClase.docenteId, docentes.id))
      .innerJoin(personas, eq(docentes.personaId, personas.id))
      .where(
        and(
          sql`${sesionesClase.fecha} >= ${periodo.fechaInicio}`,
          sql`${sesionesClase.fecha} <= ${periodo.fechaFin}`,
        ),
      )
      .orderBy(asc(personas.apellidoPaterno), asc(personas.apellidoMaterno), asc(personas.nombres));

    return filas.map((f) => {
      const materno = f.apellidoMaterno ? ` ${f.apellidoMaterno}` : "";
      return {
        id: f.id,
        personaId: f.personaId,
        usuarioId: f.usuarioId,
        nombres: f.nombres,
        apellidoPaterno: f.apellidoPaterno,
        apellidoMaterno: f.apellidoMaterno ?? "",
        nombreCompleto: `${f.apellidoPaterno}${materno}, ${f.nombres}`,
        numeroDocumento: f.numeroDocumento,
        firmaUrl: f.firmaUrl,
      };
    });
  }

  async buscarConsolidadoVigente(
    docenteId: string,
    periodoId: string,
  ): Promise<ConsolidadoFila | null> {
    const [fila] = await this.db
      .select()
      .from(consolidadosDocente)
      .where(
        and(
          eq(consolidadosDocente.docenteId, docenteId),
          eq(consolidadosDocente.periodoId, periodoId),
          eq(consolidadosDocente.vigente, true),
        ),
      )
      .limit(1);

    if (!fila) return null;
    return this.mapearConsolidadoFila(fila);
  }

  async buscarConsolidadoPorId(id: string): Promise<ConsolidadoFila | null> {
    const [fila] = await this.db
      .select()
      .from(consolidadosDocente)
      .where(eq(consolidadosDocente.id, id))
      .limit(1);

    if (!fila) return null;
    return this.mapearConsolidadoFila(fila);
  }

  async buscarConsolidadoConDetalle(id: string): Promise<{
    consolidado: ConsolidadoFila;
    docente: DocenteParaConsolidado;
    periodo: PeriodoParaConsolidado;
    generadoPorNombre: string;
    reabiertoPorNombre: string | null;
    sesiones: Array<{
      id: string;
      fecha: string;
      cursoNombre: string;
      seccionNombre: string;
      tema: string | null;
      horaInicioPlan: string | null;
      horaFinPlan: string | null;
      horaInicioReal: string | null;
      horaFinReal: string | null;
      minutosRetraso: number;
      minutosPerdidos: number;
      estado: string;
      justificacionComentario: string | null;
      ausencias: Array<{
        id: string;
        horaDesde: string;
        horaHasta: string;
        minutos: number;
        motivo: string;
        observacion: string | null;
        descargo: string | null;
        descargoEn: string | null;
        fotos: Array<{ id: string; archivoUrl: string; tomadaEn: string | null; orden: number }>;
      }>;
    }>;
  } | null> {
    const consolidado = await this.buscarConsolidadoPorId(id);
    if (!consolidado) return null;

    const periodo = await this.buscarPeriodoPorId(consolidado.periodoId);
    const docente = await this.docentePorId(consolidado.docenteId);
    if (!periodo || !docente) return null;

    // Nombres de usuario creador y reabridor
    const generadoPorNombre = await this.obtenerNombreUsuario(consolidado.generadoPorId);
    const reabiertoPorNombre = consolidado.reabiertoPorId
      ? await this.obtenerNombreUsuario(consolidado.reabiertoPorId)
      : null;

    // Sesiones del docente en el periodo
    const sesionesDb = await this.db
      .select({
        id: sesionesClase.id,
        fecha: sql<string>`${sesionesClase.fecha}::text`,
        cursoNombre: cursos.nombre,
        seccionNombre: sql<string>`concat(${grados.numero}::text, '.° ', ${secciones.nombre})`,
        tema: sesionesClase.tema,
        horaInicioPlan: sesionesClase.horaInicioPlan,
        horaFinPlan: sesionesClase.horaFinPlan,
        horaInicioReal: sesionesClase.horaInicioReal,
        horaFinReal: sesionesClase.horaFinReal,
        minutosRetraso: sesionesClase.minutosRetraso,
        minutosPerdidos: sesionesClase.minutosPerdidos,
        estado: sesionesClase.estado,
        justificacionComentario: sesionesClase.justificacionComentario,
      })
      .from(sesionesClase)
      .innerJoin(horarios, eq(sesionesClase.horarioId, horarios.id))
      .innerJoin(cursosSeccion, eq(horarios.cursoSeccionId, cursosSeccion.id))
      .innerJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
      .innerJoin(secciones, eq(horarios.seccionId, secciones.id))
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .where(
        and(
          eq(sesionesClase.docenteId, consolidado.docenteId),
          sql`${sesionesClase.fecha} >= ${periodo.fechaInicio}`,
          sql`${sesionesClase.fecha} <= ${periodo.fechaFin}`,
        ),
      )
      .orderBy(asc(sesionesClase.fecha), asc(sesionesClase.horaInicioPlan));

    if (sesionesDb.length === 0) {
      return {
        consolidado,
        docente,
        periodo,
        generadoPorNombre,
        reabiertoPorNombre,
        sesiones: [],
      };
    }

    const sesionIds = sesionesDb.map((s) => s.id);

    // Ausencias vigentes y no anuladas de esas sesiones
    const ausenciasDb = await this.db
      .select({
        id: ausenciasSesion.id,
        sesionClaseId: ausenciasSesion.sesionClaseId,
        horaDesde: ausenciasSesion.horaDesde,
        horaHasta: ausenciasSesion.horaHasta,
        minutos: ausenciasSesion.minutos,
        motivo: ausenciasSesion.motivo,
        observacion: ausenciasSesion.observacion,
        descargo: ausenciasSesion.descargo,
        descargoEn: ausenciasSesion.descargoEn,
      })
      .from(ausenciasSesion)
      .where(
        and(
          inArray(ausenciasSesion.sesionClaseId, sesionIds),
          eq(ausenciasSesion.vigente, true),
          eq(ausenciasSesion.anulada, false),
        ),
      )
      .orderBy(asc(ausenciasSesion.horaDesde));

    const ausenciaIds = ausenciasDb.map((a) => a.id);
    const fotosDb =
      ausenciaIds.length > 0
        ? await this.db
            .select({
              id: evidenciasAusencia.id,
              ausenciaId: evidenciasAusencia.ausenciaId,
              archivoUrl: evidenciasAusencia.archivoUrl,
              tomadaEn: evidenciasAusencia.tomadaEn,
              orden: evidenciasAusencia.orden,
            })
            .from(evidenciasAusencia)
            .where(
              and(
                inArray(evidenciasAusencia.ausenciaId, ausenciaIds),
                eq(evidenciasAusencia.vigente, true),
              ),
            )
            .orderBy(asc(evidenciasAusencia.orden))
        : [];

    const fotosPorAusencia = new Map<string, typeof fotosDb>();
    for (const foto of fotosDb) {
      const lista = fotosPorAusencia.get(foto.ausenciaId) ?? [];
      lista.push(foto);
      fotosPorAusencia.set(foto.ausenciaId, lista);
    }

    const ausenciasPorSesion = new Map<
      string,
      Array<{
        id: string;
        horaDesde: string;
        horaHasta: string;
        minutos: number;
        motivo: string;
        observacion: string | null;
        descargo: string | null;
        descargoEn: string | null;
        fotos: Array<{ id: string; archivoUrl: string; tomadaEn: string | null; orden: number }>;
      }>
    >();

    for (const aus of ausenciasDb) {
      const lista = ausenciasPorSesion.get(aus.sesionClaseId) ?? [];
      lista.push({
        id: aus.id,
        horaDesde: aus.horaDesde ? aus.horaDesde.slice(0, 5) : "",
        horaHasta: aus.horaHasta ? aus.horaHasta.slice(0, 5) : "",
        minutos: aus.minutos ?? 0,
        motivo: aus.motivo,
        observacion: aus.observacion,
        descargo: aus.descargo,
        descargoEn: aus.descargoEn,
        fotos: (fotosPorAusencia.get(aus.id) ?? []).map((f) => ({
          id: f.id,
          archivoUrl: f.archivoUrl,
          tomadaEn: f.tomadaEn,
          orden: f.orden,
        })),
      });
      ausenciasPorSesion.set(aus.sesionClaseId, lista);
    }

    const sesiones = sesionesDb.map((s) => ({
      id: s.id,
      fecha: s.fecha,
      cursoNombre: s.cursoNombre,
      seccionNombre: s.seccionNombre,
      tema: s.tema,
      horaInicioPlan: s.horaInicioPlan ? s.horaInicioPlan.slice(0, 5) : null,
      horaFinPlan: s.horaFinPlan ? s.horaFinPlan.slice(0, 5) : null,
      horaInicioReal: s.horaInicioReal ? s.horaInicioReal.slice(0, 5) : null,
      horaFinReal: s.horaFinReal ? s.horaFinReal.slice(0, 5) : null,
      minutosRetraso: s.minutosRetraso,
      minutosPerdidos: s.minutosPerdidos,
      estado: s.estado,
      justificacionComentario: s.justificacionComentario,
      ausencias: ausenciasPorSesion.get(s.id) ?? [],
    }));

    return {
      consolidado,
      docente,
      periodo,
      generadoPorNombre,
      reabiertoPorNombre,
      sesiones,
    };
  }

  async buscarHistorialVersiones(
    raizId: string,
  ): Promise<
    Array<ConsolidadoFila & { generadoPorNombre: string; reabiertoPorNombre: string | null }>
  > {
    const usuarioGenerador = alias(usuarios, "hist_usuario_generador");
    const personaGenerador = alias(personas, "hist_persona_generador");
    const usuarioReabridor = alias(usuarios, "hist_usuario_reabridor");
    const personaReabridor = alias(personas, "hist_persona_reabridor");

    const filas = await this.db
      .select({
        consolidado: consolidadosDocente,
        genNombres: personaGenerador.nombres,
        genPaterno: personaGenerador.apellidoPaterno,
        genMaterno: personaGenerador.apellidoMaterno,
        reabNombres: personaReabridor.nombres,
        reabPaterno: personaReabridor.apellidoPaterno,
        reabMaterno: personaReabridor.apellidoMaterno,
      })
      .from(consolidadosDocente)
      .leftJoin(usuarioGenerador, eq(consolidadosDocente.generadoPorId, usuarioGenerador.id))
      .leftJoin(personaGenerador, eq(usuarioGenerador.personaId, personaGenerador.id))
      .leftJoin(usuarioReabridor, eq(consolidadosDocente.reabiertoPorId, usuarioReabridor.id))
      .leftJoin(personaReabridor, eq(usuarioReabridor.personaId, personaReabridor.id))
      .where(
        or(eq(consolidadosDocente.consolidadoRaizId, raizId), eq(consolidadosDocente.id, raizId)),
      )
      .orderBy(desc(consolidadosDocente.version));

    const resultado: Array<
      ConsolidadoFila & { generadoPorNombre: string; reabiertoPorNombre: string | null }
    > = [];

    for (const f of filas) {
      let genNombre = "Usuario institucional";
      if (f.genPaterno && f.genNombres) {
        const materno = f.genMaterno ? ` ${f.genMaterno}` : "";
        genNombre = `${f.genPaterno}${materno}, ${f.genNombres}`;
      }

      let reabNombre: string | null = null;
      if (f.reabPaterno && f.reabNombres) {
        const materno = f.reabMaterno ? ` ${f.reabMaterno}` : "";
        reabNombre = `${f.reabPaterno}${materno}, ${f.reabNombres}`;
      }

      resultado.push({
        ...this.mapearConsolidadoFila(f.consolidado),
        generadoPorNombre: genNombre,
        reabiertoPorNombre: reabNombre,
      });
    }

    return resultado;
  }

  async calcularMetricasDocente(
    docenteId: string,
    periodoId: string,
  ): Promise<MetricasCalculadasDocente> {
    const periodo = await this.buscarPeriodoPorId(periodoId);
    if (!periodo) {
      return {
        docenteId,
        sesionesProgramadas: 0,
        sesionesCumplidas: 0,
        sesionesParciales: 0,
        sesionesNoCumplidas: 0,
        sesionesJustificadas: 0,
        minutosPerdidosFirma: 0,
        totalAusencias: 0,
        minutosFueraAula: 0,
        totalMinutosFueraClase: 0,
      };
    }

    const [sesiones] = await this.db
      .select({
        programadas: sql<number>`count(*)::int`,
        cumplidas: sql<number>`count(*) filter (where ${sesionesClase.estado} = 'cumplida')::int`,
        parciales: sql<number>`count(*) filter (where ${sesionesClase.estado} = 'parcial')::int`,
        noCumplidas: sql<number>`count(*) filter (where ${sesionesClase.estado} = 'no_cumplida')::int`,
        justificadas: sql<number>`count(*) filter (where ${sesionesClase.estado} = 'justificada')::int`,
        minutosPerdidos: sql<number>`coalesce(sum(${sesionesClase.minutosPerdidos}), 0)::int`,
      })
      .from(sesionesClase)
      .where(
        and(
          eq(sesionesClase.docenteId, docenteId),
          sql`${sesionesClase.fecha} >= ${periodo.fechaInicio}`,
          sql`${sesionesClase.fecha} <= ${periodo.fechaFin}`,
        ),
      );

    const [ausencias] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        minutos: sql<number>`coalesce(sum(${ausenciasSesion.minutos}), 0)::int`,
      })
      .from(ausenciasSesion)
      .innerJoin(sesionesClase, eq(ausenciasSesion.sesionClaseId, sesionesClase.id))
      .where(
        and(
          eq(sesionesClase.docenteId, docenteId),
          sql`${sesionesClase.fecha} >= ${periodo.fechaInicio}`,
          sql`${sesionesClase.fecha} <= ${periodo.fechaFin}`,
          eq(ausenciasSesion.vigente, true),
          eq(ausenciasSesion.anulada, false),
        ),
      );

    const minutosPerdidosFirma = sesiones?.minutosPerdidos ?? 0;
    const minutosFueraAula = ausencias?.minutos ?? 0;
    const totalMinutosFueraClase = minutosPerdidosFirma + minutosFueraAula;

    return {
      docenteId,
      sesionesProgramadas: sesiones?.programadas ?? 0,
      sesionesCumplidas: sesiones?.cumplidas ?? 0,
      sesionesParciales: sesiones?.parciales ?? 0,
      sesionesNoCumplidas: sesiones?.noCumplidas ?? 0,
      sesionesJustificadas: sesiones?.justificadas ?? 0,
      minutosPerdidosFirma,
      totalAusencias: ausencias?.total ?? 0,
      minutosFueraAula,
      totalMinutosFueraClase,
    };
  }

  async crearConsolidado(datos: DatosCrearConsolidado): Promise<ConsolidadoFila> {
    const nuevoId = randomUUID();
    const [insertado] = await this.db
      .insert(consolidadosDocente)
      .values({
        id: nuevoId,
        docenteId: datos.docenteId,
        periodoId: datos.periodoId,
        consolidadoRaizId: nuevoId,
        version: 1,
        vigente: true,
        estado: "cerrado",
        sesionesProgramadas: datos.metricas.sesionesProgramadas,
        sesionesCumplidas: datos.metricas.sesionesCumplidas,
        sesionesParciales: datos.metricas.sesionesParciales,
        sesionesNoCumplidas: datos.metricas.sesionesNoCumplidas,
        sesionesJustificadas: datos.metricas.sesionesJustificadas,
        minutosPerdidosFirma: datos.metricas.minutosPerdidosFirma,
        totalAusencias: datos.metricas.totalAusencias,
        minutosFueraAula: datos.metricas.minutosFueraAula,
        decision: "ninguna",
        observacion: null,
        generadoPorId: datos.generadoPorId,
      })
      .returning();

    return this.mapearConsolidadoFila(insertado);
  }

  async actualizarDecision(
    id: string,
    decision: DecisionConsolidado,
    observacion?: string | null,
  ): Promise<ConsolidadoFila> {
    const [actualizado] = await this.db
      .update(consolidadosDocente)
      .set({
        decision,
        observacion: observacion ?? null,
      })
      .where(eq(consolidadosDocente.id, id))
      .returning();

    return this.mapearConsolidadoFila(actualizado);
  }

  async reabrirConsolidado(id: string, reabiertoPorId: string): Promise<ConsolidadoFila> {
    const [actualizado] = await this.db
      .update(consolidadosDocente)
      .set({
        estado: "reabierto",
        reabiertoPorId,
        reabiertoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(consolidadosDocente.id, id))
      .returning();

    return this.mapearConsolidadoFila(actualizado);
  }

  async crearNuevaVersion(datos: DatosNuevaVersionConsolidado): Promise<ConsolidadoFila> {
    return this.db.transaction(async (tx) => {
      // 1. Invalidar vigencia de versión anterior
      const [anterior] = await tx
        .update(consolidadosDocente)
        .set({ vigente: false })
        .where(eq(consolidadosDocente.id, datos.anteriorId))
        .returning();

      const docenteId = anterior?.docenteId ?? "";
      const periodoId = anterior?.periodoId ?? "";
      const raizId = datos.consolidadoRaizId || anterior?.consolidadoRaizId || datos.anteriorId;

      // 2. Insertar versión N+1 vigente
      const [nueva] = await tx
        .insert(consolidadosDocente)
        .values({
          id: randomUUID(),
          docenteId,
          periodoId,
          consolidadoRaizId: raizId,
          version: datos.version,
          vigente: true,
          estado: "cerrado",
          motivoCambio: datos.motivoCambio,
          sesionesProgramadas: datos.metricas.sesionesProgramadas,
          sesionesCumplidas: datos.metricas.sesionesCumplidas,
          sesionesParciales: datos.metricas.sesionesParciales,
          sesionesNoCumplidas: datos.metricas.sesionesNoCumplidas,
          sesionesJustificadas: datos.metricas.sesionesJustificadas,
          minutosPerdidosFirma: datos.metricas.minutosPerdidosFirma,
          totalAusencias: datos.metricas.totalAusencias,
          minutosFueraAula: datos.metricas.minutosFueraAula,
          decision: datos.decision,
          observacion: datos.observacion ?? null,
          generadoPorId: datos.generadoPorId,
        })
        .returning();

      return this.mapearConsolidadoFila(nueva);
    });
  }

  async docentePorPersonaId(personaId: string): Promise<DocenteParaConsolidado | null> {
    const [fila] = await this.db
      .select({
        id: docentes.id,
        personaId: docentes.personaId,
        usuarioId: sql<string>`COALESCE((SELECT u.id FROM usuarios u WHERE u.persona_id = ${docentes.personaId} LIMIT 1), '')`,
        nombres: personas.nombres,
        apellidoPaterno: personas.apellidoPaterno,
        apellidoMaterno: personas.apellidoMaterno,
        numeroDocumento: personas.numeroDocumento,
        firmaUrl: docentes.firmaUrl,
      })
      .from(docentes)
      .innerJoin(personas, eq(docentes.personaId, personas.id))
      .where(eq(docentes.personaId, personaId))
      .limit(1);

    if (!fila) return null;
    const materno = fila.apellidoMaterno ? ` ${fila.apellidoMaterno}` : "";
    return {
      id: fila.id,
      personaId: fila.personaId,
      usuarioId: fila.usuarioId,
      nombres: fila.nombres,
      apellidoPaterno: fila.apellidoPaterno,
      apellidoMaterno: fila.apellidoMaterno ?? "",
      nombreCompleto: `${fila.apellidoPaterno}${materno}, ${fila.nombres}`,
      numeroDocumento: fila.numeroDocumento,
      firmaUrl: fila.firmaUrl,
    };
  }

  async docentePorId(docenteId: string): Promise<DocenteParaConsolidado | null> {
    const [fila] = await this.db
      .select({
        id: docentes.id,
        personaId: docentes.personaId,
        usuarioId: sql<string>`COALESCE((SELECT u.id FROM usuarios u WHERE u.persona_id = ${docentes.personaId} LIMIT 1), '')`,
        nombres: personas.nombres,
        apellidoPaterno: personas.apellidoPaterno,
        apellidoMaterno: personas.apellidoMaterno,
        numeroDocumento: personas.numeroDocumento,
        firmaUrl: docentes.firmaUrl,
      })
      .from(docentes)
      .innerJoin(personas, eq(docentes.personaId, personas.id))
      .where(eq(docentes.id, docenteId))
      .limit(1);

    if (!fila) return null;
    const materno = fila.apellidoMaterno ? ` ${fila.apellidoMaterno}` : "";
    return {
      id: fila.id,
      personaId: fila.personaId,
      usuarioId: fila.usuarioId,
      nombres: fila.nombres,
      apellidoPaterno: fila.apellidoPaterno,
      apellidoMaterno: fila.apellidoMaterno ?? "",
      nombreCompleto: `${fila.apellidoPaterno}${materno}, ${fila.nombres}`,
      numeroDocumento: fila.numeroDocumento,
      firmaUrl: fila.firmaUrl,
    };
  }

  async usuarioPorPersonaId(personaId: string): Promise<{ id: string } | null> {
    const [fila] = await this.db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.personaId, personaId))
      .limit(1);

    return fila ?? null;
  }

  async crearSolicitud(datos: DatosCrearSolicitud): Promise<SolicitudRevisionFila> {
    const nuevoId = randomUUID();
    const [insertada] = await this.db
      .insert(solicitudesRevisionConsolidado)
      .values({
        id: nuevoId,
        consolidadoId: datos.consolidadoId,
        docenteId: datos.docenteId,
        motivo: datos.motivo,
        adjuntoRuta: datos.adjuntoRuta ?? null,
        adjuntoNombre: datos.adjuntoNombre ?? null,
        estado: "solicitada",
      })
      .returning();

    return this.mapearSolicitudFila(insertada);
  }

  async buscarSolicitudPorId(
    id: string,
  ): Promise<
    | (SolicitudRevisionFila & {
        docente: DocenteParaConsolidado;
        periodo: PeriodoParaConsolidado;
        resueltaPorNombre: string | null;
      })
    | null
  > {
    const [fila] = await this.db
      .select({
        solicitud: solicitudesRevisionConsolidado,
        periodoId: consolidadosDocente.periodoId,
      })
      .from(solicitudesRevisionConsolidado)
      .innerJoin(
        consolidadosDocente,
        eq(solicitudesRevisionConsolidado.consolidadoId, consolidadosDocente.id),
      )
      .where(eq(solicitudesRevisionConsolidado.id, id))
      .limit(1);

    if (!fila) return null;

    const docente = await this.docentePorId(fila.solicitud.docenteId);
    const periodo = await this.buscarPeriodoPorId(fila.periodoId);
    if (!docente || !periodo) return null;

    const resueltaPorNombre = fila.solicitud.resueltaPorId
      ? await this.obtenerNombreUsuario(fila.solicitud.resueltaPorId)
      : null;

    return {
      ...this.mapearSolicitudFila(fila.solicitud),
      docente,
      periodo,
      resueltaPorNombre,
    };
  }

  async buscarSolicitudAbierta(consolidadoId: string): Promise<SolicitudRevisionFila | null> {
    const [fila] = await this.db
      .select()
      .from(solicitudesRevisionConsolidado)
      .where(
        and(
          eq(solicitudesRevisionConsolidado.consolidadoId, consolidadoId),
          eq(solicitudesRevisionConsolidado.estado, "solicitada"),
        ),
      )
      .limit(1);

    if (!fila) return null;
    return this.mapearSolicitudFila(fila);
  }

  async listarSolicitudes(filtros: FiltrosListarSolicitudesRepo): Promise<
    Array<
      SolicitudRevisionFila & {
        docente: DocenteParaConsolidado;
        periodo: PeriodoParaConsolidado;
        resueltaPorNombre: string | null;
      }
    >
  > {
    const condiciones: SQL[] = [];
    if (filtros.estado) {
      condiciones.push(eq(solicitudesRevisionConsolidado.estado, filtros.estado));
    }
    if (filtros.periodoId) {
      condiciones.push(eq(consolidadosDocente.periodoId, filtros.periodoId));
    }

    const filas = await this.db
      .select({
        solicitud: solicitudesRevisionConsolidado,
        periodoId: consolidadosDocente.periodoId,
      })
      .from(solicitudesRevisionConsolidado)
      .innerJoin(
        consolidadosDocente,
        eq(solicitudesRevisionConsolidado.consolidadoId, consolidadosDocente.id),
      )
      .where(condiciones.length > 0 ? and(...condiciones) : undefined)
      .orderBy(desc(solicitudesRevisionConsolidado.creadoEn));

    const resultado: Array<
      SolicitudRevisionFila & {
        docente: DocenteParaConsolidado;
        periodo: PeriodoParaConsolidado;
        resueltaPorNombre: string | null;
      }
    > = [];

    for (const f of filas) {
      const docente = await this.docentePorId(f.solicitud.docenteId);
      const periodo = await this.buscarPeriodoPorId(f.periodoId);
      if (docente && periodo) {
        const resueltaPorNombre = f.solicitud.resueltaPorId
          ? await this.obtenerNombreUsuario(f.solicitud.resueltaPorId)
          : null;

        resultado.push({
          ...this.mapearSolicitudFila(f.solicitud),
          docente,
          periodo,
          resueltaPorNombre,
        });
      }
    }

    return resultado;
  }

  async resolverSolicitud(
    id: string,
    estado: EstadoSolicitudRevision,
    resueltaPorId: string,
    respuesta?: string | null,
  ): Promise<SolicitudRevisionFila> {
    const [actualizada] = await this.db
      .update(solicitudesRevisionConsolidado)
      .set({
        estado,
        resueltaPorId,
        respuesta: respuesta ?? null,
        resueltaEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(solicitudesRevisionConsolidado.id, id))
      .returning();

    return this.mapearSolicitudFila(actualizada);
  }

  async listarConsolidadosVigentesPorPeriodo(
    periodoId: string,
  ): Promise<
    Array<
      ConsolidadoFila & {
        docente: DocenteParaConsolidado;
        generadoPorNombre: string;
        reabiertoPorNombre: string | null;
      }
    >
  > {
    const personaDocente = alias(personas, "list_persona_docente");
    const usuarioDocente = alias(usuarios, "list_usuario_docente");
    const usuarioGenerador = alias(usuarios, "list_usuario_generador");
    const personaGenerador = alias(personas, "list_persona_generador");
    const usuarioReabridor = alias(usuarios, "list_usuario_reabridor");
    const personaReabridor = alias(personas, "list_persona_reabridor");

    const filas = await this.db
      .select({
        consolidado: consolidadosDocente,
        docenteId: docentes.id,
        docentePersonaId: docentes.personaId,
        docenteUsuarioId: usuarioDocente.id,
        docenteNombres: personaDocente.nombres,
        docentePaterno: personaDocente.apellidoPaterno,
        docenteMaterno: personaDocente.apellidoMaterno,
        docenteDocumento: personaDocente.numeroDocumento,
        docenteFirmaUrl: docentes.firmaUrl,
        genNombres: personaGenerador.nombres,
        genPaterno: personaGenerador.apellidoPaterno,
        genMaterno: personaGenerador.apellidoMaterno,
        reabNombres: personaReabridor.nombres,
        reabPaterno: personaReabridor.apellidoPaterno,
        reabMaterno: personaReabridor.apellidoMaterno,
      })
      .from(consolidadosDocente)
      .innerJoin(docentes, eq(consolidadosDocente.docenteId, docentes.id))
      .innerJoin(personaDocente, eq(docentes.personaId, personaDocente.id))
      .leftJoin(usuarioDocente, eq(personaDocente.id, usuarioDocente.personaId))
      .leftJoin(usuarioGenerador, eq(consolidadosDocente.generadoPorId, usuarioGenerador.id))
      .leftJoin(personaGenerador, eq(usuarioGenerador.personaId, personaGenerador.id))
      .leftJoin(usuarioReabridor, eq(consolidadosDocente.reabiertoPorId, usuarioReabridor.id))
      .leftJoin(personaReabridor, eq(usuarioReabridor.personaId, personaReabridor.id))
      .where(
        and(eq(consolidadosDocente.periodoId, periodoId), eq(consolidadosDocente.vigente, true)),
      )
      .orderBy(
        asc(personaDocente.apellidoPaterno),
        asc(personaDocente.apellidoMaterno),
        asc(personaDocente.nombres),
      );

    const resultado: Array<
      ConsolidadoFila & {
        docente: DocenteParaConsolidado;
        generadoPorNombre: string;
        reabiertoPorNombre: string | null;
      }
    > = [];

    for (const f of filas) {
      const materno = f.docenteMaterno ? ` ${f.docenteMaterno}` : "";
      const docente: DocenteParaConsolidado = {
        id: f.docenteId,
        personaId: f.docentePersonaId,
        usuarioId: f.docenteUsuarioId ?? "",
        nombres: f.docenteNombres,
        apellidoPaterno: f.docentePaterno,
        apellidoMaterno: f.docenteMaterno ?? "",
        nombreCompleto: `${f.docentePaterno}${materno}, ${f.docenteNombres}`,
        numeroDocumento: f.docenteDocumento,
        firmaUrl: f.docenteFirmaUrl,
      };

      let generadoPorNombre = "Usuario institucional";
      if (f.genPaterno && f.genNombres) {
        const mat = f.genMaterno ? ` ${f.genMaterno}` : "";
        generadoPorNombre = `${f.genPaterno}${mat}, ${f.genNombres}`;
      }

      let reabiertoPorNombre: string | null = null;
      if (f.reabPaterno && f.reabNombres) {
        const mat = f.reabMaterno ? ` ${f.reabMaterno}` : "";
        reabiertoPorNombre = `${f.reabPaterno}${mat}, ${f.reabNombres}`;
      }

      resultado.push({
        ...this.mapearConsolidadoFila(f.consolidado),
        docente,
        generadoPorNombre,
        reabiertoPorNombre,
      });
    }

    return resultado;
  }

  // Métodos auxiliares de mapeo
  private async obtenerNombreUsuario(usuarioId: string): Promise<string> {
    const [fila] = await this.db
      .select({
        nombres: personas.nombres,
        apellidoPaterno: personas.apellidoPaterno,
        apellidoMaterno: personas.apellidoMaterno,
      })
      .from(usuarios)
      .innerJoin(personas, eq(usuarios.personaId, personas.id))
      .where(eq(usuarios.id, usuarioId))
      .limit(1);

    if (!fila) return "Usuario institucional";
    const materno = fila.apellidoMaterno ? ` ${fila.apellidoMaterno}` : "";
    return `${fila.apellidoPaterno}${materno}, ${fila.nombres}`;
  }

  private mapearConsolidadoFila(raw: typeof consolidadosDocente.$inferSelect): ConsolidadoFila {
    return {
      id: raw.id,
      docenteId: raw.docenteId,
      periodoId: raw.periodoId,
      consolidadoRaizId: raw.consolidadoRaizId,
      estado: raw.estado as EstadoConsolidado,
      version: raw.version,
      vigente: raw.vigente,
      motivoCambio: raw.motivoCambio,
      sesionesProgramadas: raw.sesionesProgramadas,
      sesionesCumplidas: raw.sesionesCumplidas,
      sesionesParciales: raw.sesionesParciales,
      sesionesNoCumplidas: raw.sesionesNoCumplidas,
      sesionesJustificadas: raw.sesionesJustificadas,
      minutosPerdidosFirma: raw.minutosPerdidosFirma,
      totalAusencias: raw.totalAusencias,
      minutosFueraAula: raw.minutosFueraAula,
      decision: raw.decision as DecisionConsolidado,
      observacion: raw.observacion,
      generadoPorId: raw.generadoPorId,
      generadoEn: raw.generadoEn,
      enviadoEn: raw.enviadoEn,
      reabiertoPorId: raw.reabiertoPorId,
      reabiertoEn: raw.reabiertoEn,
    };
  }

  private mapearSolicitudFila(
    raw: typeof solicitudesRevisionConsolidado.$inferSelect,
  ): SolicitudRevisionFila {
    return {
      id: raw.id,
      consolidadoId: raw.consolidadoId,
      docenteId: raw.docenteId,
      motivo: raw.motivo,
      adjuntoRuta: raw.adjuntoRuta,
      adjuntoNombre: raw.adjuntoNombre,
      estado: raw.estado as EstadoSolicitudRevision,
      respuesta: raw.respuesta,
      resueltaPorId: raw.resueltaPorId,
      creadoEn: raw.creadoEn,
      resueltaEn: raw.resueltaEn,
    };
  }
}
