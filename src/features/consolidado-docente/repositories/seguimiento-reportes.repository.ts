import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  ausenciasSesion,
  compromisosConsolidado,
  consolidadosDocente,
  docentes,
  horarios,
  periodosAcademicos,
  personas,
  sesionesClase,
  solicitudesRevisionConsolidado,
} from "../../../core/database/schema";
import type { FilaInformeMensual, FiltrosPendientes, PendienteCrudo } from "../interfaces";

const nombreDocente = sql<string>`concat_ws(' ', ${personas.apellidoPaterno}, ${personas.apellidoMaterno}, ${personas.nombres})`;

/** Duración planificada de la sesión en minutos (la del bloque doble si existe, si no la del horario). */
const duracion = sql`COALESCE((EXTRACT(epoch FROM (COALESCE(${sesionesClase.horaFinPlan}, ${horarios.horaFin}) - COALESCE(${sesionesClase.horaInicioPlan}, ${horarios.horaInicio}))) / 60)::int, 0)`;

@Injectable()
export class SeguimientoReportesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Una fila por docente con sus sesiones del rango, sin requerir consolidado. */
  async informeMensual(
    desde: string,
    hasta: string,
    toleranciaMinutos: number,
  ): Promise<FilaInformeMensual[]> {
    const filas = await this.db
      .select({
        docenteId: docentes.id,
        docenteNombre: nombreDocente,
        docenteDni: personas.numeroDocumento,
        jornadaHoras: docentes.jornadaHoras,
        sesiones: sql<number>`count(*)::int`,
        minutosProgramados: sql<number>`COALESCE(sum(${duracion}), 0)::int`,
        minutosDictados: sql<number>`COALESCE(sum(CASE ${sesionesClase.estado}
          WHEN 'cumplida' THEN ${duracion}
          WHEN 'parcial' THEN GREATEST(0, ${duracion} - ${sesionesClase.minutosPerdidos})
          ELSE 0 END), 0)::int`,
        justificadas: sql<number>`count(*) FILTER (WHERE ${sesionesClase.estado} = 'justificada')::int`,
        injustificadas: sql<number>`count(*) FILTER (WHERE ${sesionesClase.estado} = 'no_cumplida')::int`,
        tardanzas: sql<number>`count(*) FILTER (WHERE ${sesionesClase.minutosRetraso} > ${toleranciaMinutos})::int`,
        minutosPerdidosFirma: sql<number>`COALESCE(sum(${sesionesClase.minutosPerdidos}) FILTER (WHERE ${sesionesClase.estado} IN ('cumplida','parcial')), 0)::int`,
      })
      .from(sesionesClase)
      .innerJoin(horarios, eq(horarios.id, sesionesClase.horarioId))
      .innerJoin(docentes, eq(docentes.id, sesionesClase.docenteId))
      .innerJoin(personas, eq(personas.id, docentes.personaId))
      .where(and(gte(sesionesClase.fecha, desde), lte(sesionesClase.fecha, hasta)))
      .groupBy(docentes.id, personas.id)
      .orderBy(nombreDocente);

    const fuera = await this.db
      .select({
        docenteId: sesionesClase.docenteId,
        minutos: sql<number>`COALESCE(sum(${ausenciasSesion.minutos}), 0)::int`,
      })
      .from(ausenciasSesion)
      .innerJoin(sesionesClase, eq(sesionesClase.id, ausenciasSesion.sesionClaseId))
      .where(
        and(
          gte(sesionesClase.fecha, desde),
          lte(sesionesClase.fecha, hasta),
          eq(ausenciasSesion.vigente, true),
          eq(ausenciasSesion.anulada, false),
        ),
      )
      .groupBy(sesionesClase.docenteId);
    const porDocente = new Map(fuera.map((f) => [f.docenteId, f.minutos]));

    return filas.map((f) => ({ ...f, minutosFueraAula: porDocente.get(f.docenteId) ?? 0 }));
  }

  /** Los seis tipos de pendiente, antes de calcular los días de atraso. */
  async pendientes(
    filtros: FiltrosPendientes,
    hoy: string,
    plazoDescargoDias: number,
    diasParaDecidir: number,
  ): Promise<PendienteCrudo[]> {
    const { periodoId, docenteId } = filtros;
    const porPeriodo = (col: SQL | undefined) => (periodoId ? col : undefined);
    const periodoDeSesion = and(
      gte(sesionesClase.fecha, periodosAcademicos.fechaInicio),
      lte(sesionesClase.fecha, periodosAcademicos.fechaFin),
    );

    const justificaciones = await this.db
      .select({
        docenteId: sesionesClase.docenteId,
        docenteNombre: nombreDocente,
        periodoId: periodosAcademicos.id,
        periodoNombre: periodosAcademicos.nombre,
        origen: sql<string>`COALESCE(${sesionesClase.justificacionSolicitadaEn}::date, ${sesionesClase.fecha})::text`,
        referenciaId: sesionesClase.id,
      })
      .from(sesionesClase)
      .innerJoin(docentes, eq(docentes.id, sesionesClase.docenteId))
      .innerJoin(personas, eq(personas.id, docentes.personaId))
      .leftJoin(periodosAcademicos, periodoDeSesion)
      .where(
        and(
          eq(sesionesClase.justificacionEstado, "solicitada"),
          docenteId ? eq(sesionesClase.docenteId, docenteId) : undefined,
          porPeriodo(eq(periodosAcademicos.id, periodoId!)),
        ),
      );

    const descargos = await this.db
      .select({
        docenteId: sesionesClase.docenteId,
        docenteNombre: nombreDocente,
        periodoId: periodosAcademicos.id,
        periodoNombre: periodosAcademicos.nombre,
        origen: sql<string>`${ausenciasSesion.registradoEn}::date::text`,
        vence: sql<string>`(${ausenciasSesion.registradoEn}::date + ${plazoDescargoDias}::int)::text`,
        referenciaId: ausenciasSesion.id,
      })
      .from(ausenciasSesion)
      .innerJoin(sesionesClase, eq(sesionesClase.id, ausenciasSesion.sesionClaseId))
      .innerJoin(docentes, eq(docentes.id, sesionesClase.docenteId))
      .innerJoin(personas, eq(personas.id, docentes.personaId))
      .leftJoin(periodosAcademicos, periodoDeSesion)
      .where(
        and(
          eq(ausenciasSesion.vigente, true),
          eq(ausenciasSesion.anulada, false),
          sql`${ausenciasSesion.descargo} IS NULL`,
          sql`(${ausenciasSesion.registradoEn}::date + ${plazoDescargoDias}::int) < ${hoy}::date`,
          docenteId ? eq(sesionesClase.docenteId, docenteId) : undefined,
          porPeriodo(eq(periodosAcademicos.id, periodoId!)),
        ),
      );

    const sinGenerar = await this.db
      .selectDistinct({
        docenteId: docentes.id,
        docenteNombre: nombreDocente,
        periodoId: periodosAcademicos.id,
        periodoNombre: periodosAcademicos.nombre,
        origen: sql<string>`${periodosAcademicos.fechaFin}::text`,
      })
      .from(sesionesClase)
      .innerJoin(docentes, eq(docentes.id, sesionesClase.docenteId))
      .innerJoin(personas, eq(personas.id, docentes.personaId))
      .innerJoin(periodosAcademicos, periodoDeSesion)
      .where(
        and(
          eq(periodosAcademicos.estado, "cerrado"),
          sql`NOT EXISTS (
            SELECT 1 FROM ${consolidadosDocente} c
            WHERE c.docente_id = ${docentes.id}
              AND c.periodo_id = ${periodosAcademicos.id}
              AND c.vigente = true)`,
          docenteId ? eq(docentes.id, docenteId) : undefined,
          porPeriodo(eq(periodosAcademicos.id, periodoId!)),
        ),
      );

    const sinDecision = await this.db
      .select({
        docenteId: consolidadosDocente.docenteId,
        docenteNombre: nombreDocente,
        periodoId: periodosAcademicos.id,
        periodoNombre: periodosAcademicos.nombre,
        origen: sql<string>`${consolidadosDocente.generadoEn}::date::text`,
        vence: sql<string>`(${consolidadosDocente.generadoEn}::date + ${diasParaDecidir}::int)::text`,
        referenciaId: consolidadosDocente.id,
      })
      .from(consolidadosDocente)
      .innerJoin(docentes, eq(docentes.id, consolidadosDocente.docenteId))
      .innerJoin(personas, eq(personas.id, docentes.personaId))
      .innerJoin(periodosAcademicos, eq(periodosAcademicos.id, consolidadosDocente.periodoId))
      .where(
        and(
          eq(consolidadosDocente.vigente, true),
          sql`${consolidadosDocente.decisionRegistradaEn} IS NULL`,
          sql`(${consolidadosDocente.generadoEn}::date + ${diasParaDecidir}::int) < ${hoy}::date`,
          docenteId ? eq(consolidadosDocente.docenteId, docenteId) : undefined,
          porPeriodo(eq(periodosAcademicos.id, periodoId!)),
        ),
      );

    const solicitudes = await this.db
      .select({
        docenteId: solicitudesRevisionConsolidado.docenteId,
        docenteNombre: nombreDocente,
        periodoId: periodosAcademicos.id,
        periodoNombre: periodosAcademicos.nombre,
        origen: sql<string>`${solicitudesRevisionConsolidado.solicitadoEn}::date::text`,
        referenciaId: solicitudesRevisionConsolidado.id,
      })
      .from(solicitudesRevisionConsolidado)
      .innerJoin(
        consolidadosDocente,
        eq(consolidadosDocente.id, solicitudesRevisionConsolidado.consolidadoId),
      )
      .innerJoin(docentes, eq(docentes.id, solicitudesRevisionConsolidado.docenteId))
      .innerJoin(personas, eq(personas.id, docentes.personaId))
      .innerJoin(periodosAcademicos, eq(periodosAcademicos.id, consolidadosDocente.periodoId))
      .where(
        and(
          eq(solicitudesRevisionConsolidado.estado, "solicitada"),
          docenteId ? eq(solicitudesRevisionConsolidado.docenteId, docenteId) : undefined,
          porPeriodo(eq(periodosAcademicos.id, periodoId!)),
        ),
      );

    const compromisos = await this.db
      .select({
        docenteId: compromisosConsolidado.docenteId,
        docenteNombre: nombreDocente,
        periodoId: periodosAcademicos.id,
        periodoNombre: periodosAcademicos.nombre,
        origen: sql<string>`${compromisosConsolidado.fechaRevision}::text`,
        referenciaId: compromisosConsolidado.compromisoId,
      })
      .from(compromisosConsolidado)
      .innerJoin(
        consolidadosDocente,
        eq(consolidadosDocente.id, compromisosConsolidado.consolidadoId),
      )
      .innerJoin(docentes, eq(docentes.id, compromisosConsolidado.docenteId))
      .innerJoin(personas, eq(personas.id, docentes.personaId))
      .innerJoin(periodosAcademicos, eq(periodosAcademicos.id, consolidadosDocente.periodoId))
      .where(
        and(
          eq(compromisosConsolidado.vigente, true),
          eq(compromisosConsolidado.anulado, false),
          eq(compromisosConsolidado.estado, "pendiente"),
          sql`${compromisosConsolidado.fechaRevision} < ${hoy}::date`,
          docenteId ? eq(compromisosConsolidado.docenteId, docenteId) : undefined,
          porPeriodo(eq(periodosAcademicos.id, periodoId!)),
        ),
      );

    return [
      ...justificaciones.map((f) => ({
        ...f,
        tipo: "justificacion_sin_resolver" as const,
        vence: f.origen,
        referenciaId: f.referenciaId,
      })),
      ...descargos.map((f) => ({ ...f, tipo: "descargo_vencido" as const })),
      ...sinGenerar.map((f) => ({
        ...f,
        tipo: "consolidado_sin_generar" as const,
        vence: f.origen,
        referenciaId: f.docenteId,
      })),
      ...sinDecision.map((f) => ({ ...f, tipo: "consolidado_sin_decision" as const })),
      ...solicitudes.map((f) => ({
        ...f,
        tipo: "solicitud_revision_abierta" as const,
        vence: f.origen,
      })),
      ...compromisos.map((f) => ({
        ...f,
        tipo: "compromiso_vencido" as const,
        vence: f.origen,
      })),
    ];
  }
}
