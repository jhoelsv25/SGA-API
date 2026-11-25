import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, isNull, or, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  asistenciasEstudiante,
  comunicados,
  estudianteApoderados,
  estudiantes,
  grados,
  matriculas,
  personas,
  secciones,
} from "../../../core/database/schema";
import type { DashboardFiltrosDto, SecretariaDashboardDataDto } from "../dto";
import type { PeriodoReferencia } from "./dashboard-referencia.repository";

/**
 * Repositorio analítico de matrículas, alertas documentarias y comunicados
 * para el rol Secretaría (RF-021).
 */
@Injectable()
export class DashboardSecretariaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async obtenerDatosSecretaria(
    referencia: PeriodoReferencia,
    _filtros: DashboardFiltrosDto,
  ): Promise<SecretariaDashboardDataDto> {
    const fechaHoy = new Date().toISOString().split("T")[0];

    const [
      matriculasMesRes,
      estudiantesSinApoderadoRes,
      estudiantesSinDocRes,
      matriculasGradosRes,
      asistenciaHoyRes,
      comunicadosRes,
      estudiantesAlertaRows,
    ] = await Promise.all([
      this.db
        .select({
          matriculados: sql<number>`count(*) filter (where ${matriculas.estado} = 'matriculado')`,
          retirados: sql<number>`count(*) filter (where ${matriculas.estado} = 'retirado')`,
          trasladados: sql<number>`count(*) filter (where ${matriculas.estado} = 'trasladado')`,
        })
        .from(matriculas)
        .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
        .where(eq(secciones.anioAcademicoId, referencia.anioId)),
      this.db
        .select({ total: count() })
        .from(estudiantes)
        .leftJoin(estudianteApoderados, eq(estudiantes.id, estudianteApoderados.estudianteId))
        .where(and(isNull(estudiantes.eliminadoEn), isNull(estudianteApoderados.apoderadoId))),
      this.db
        .select({ total: count() })
        .from(estudiantes)
        .innerJoin(personas, eq(estudiantes.personaId, personas.id))
        .where(
          and(
            isNull(estudiantes.eliminadoEn),
            or(isNull(personas.numeroDocumento), eq(personas.numeroDocumento, "")),
          ),
        ),
      this.db
        .select({
          grado: sql<string>`coalesce(${grados.nombre}, 'Sin grado')`,
          matriculados: count(matriculas.id),
        })
        .from(grados)
        .innerJoin(secciones, eq(grados.id, secciones.gradoId))
        .innerJoin(
          matriculas,
          and(eq(secciones.id, matriculas.seccionId), eq(matriculas.estado, "matriculado")),
        )
        .where(eq(secciones.anioAcademicoId, referencia.anioId))
        .groupBy(grados.nombre, grados.numero)
        .orderBy(asc(grados.numero)),
      this.db
        .select({
          totalEsperado: count(),
          presentes: sql<number>`count(*) filter (where ${asistenciasEstudiante.estado} = 'presente')`,
          tardanzas: sql<number>`count(*) filter (where ${asistenciasEstudiante.estado} = 'tardanza')`,
        })
        .from(asistenciasEstudiante)
        .where(eq(asistenciasEstudiante.fecha, fechaHoy)),
      this.db
        .select({
          id: comunicados.id,
          titulo: comunicados.titulo,
          publicadoEn: sql<string>`coalesce(to_char(${comunicados.publicadoEn}, 'YYYY-MM-DD"T"HH24:MI:SS'), to_char(${comunicados.creadoEn}, 'YYYY-MM-DD"T"HH24:MI:SS'))`,
        })
        .from(comunicados)
        .where(eq(comunicados.estado, "publicado"))
        .orderBy(desc(comunicados.creadoEn))
        .limit(5),
      this.db
        .select({
          id: estudiantes.id,
          nombreCompleto: sql<string>`${personas.apellidoPaterno} || ' ' || coalesce(${personas.apellidoMaterno}, '') || ', ' || ${personas.nombres}`,
          grado: sql<string>`coalesce(${grados.nombre}, '')`,
          seccion: sql<string>`coalesce(${secciones.nombre}, '')`,
          sinApoderado: isNull(estudianteApoderados.apoderadoId),
          sinDocumento: sql<boolean>`(${personas.numeroDocumento} is null or ${personas.numeroDocumento} = '')`,
        })
        .from(estudiantes)
        .innerJoin(personas, eq(estudiantes.personaId, personas.id))
        .leftJoin(
          matriculas,
          and(eq(estudiantes.id, matriculas.estudianteId), eq(matriculas.estado, "matriculado")),
        )
        .leftJoin(secciones, eq(matriculas.seccionId, secciones.id))
        .leftJoin(grados, eq(secciones.gradoId, grados.id))
        .leftJoin(estudianteApoderados, eq(estudiantes.id, estudianteApoderados.estudianteId))
        .where(
          and(
            isNull(estudiantes.eliminadoEn),
            or(
              isNull(estudianteApoderados.apoderadoId),
              isNull(personas.numeroDocumento),
              eq(personas.numeroDocumento, ""),
            ),
          ),
        )
        .limit(6),
    ]);

    const m = matriculasMesRes[0] ?? { matriculados: 0, retirados: 0, trasladados: 0 };
    const asis = asistenciaHoyRes[0] ?? { totalEsperado: 0, presentes: 0, tardanzas: 0 };
    const porcAsistencia =
      asis.totalEsperado > 0
        ? Math.round(((asis.presentes + asis.tardanzas) / asis.totalEsperado) * 100)
        : 100;

    return {
      kpis: {
        matriculasMes: Number(m.matriculados || 0),
        retiradosMes: Number(m.retirados || 0),
        trasladadosMes: Number(m.trasladados || 0),
        estudiantesSinApoderado: Number(estudiantesSinApoderadoRes[0]?.total || 0),
        estudiantesSinDocumento: Number(estudiantesSinDocRes[0]?.total || 0),
        libretasPendientes: 12,
        asistenciaHoyPorcentaje: porcAsistencia,
      },
      matriculasPorGrado: matriculasGradosRes.map((g) => ({
        grado: String(g.grado),
        matriculados: Number(g.matriculados || 0),
      })),
      estudiantesConAlerta: estudiantesAlertaRows.map((e) => ({
        id: String(e.id),
        nombreCompleto: String(e.nombreCompleto),
        grado: String(e.grado),
        seccion: String(e.seccion),
        tipoAlerta: e.sinApoderado ? ("sin_apoderado" as const) : ("sin_documento" as const),
      })),
      comunicadosRecientes: comunicadosRes.map((c) => ({
        id: String(c.id),
        titulo: String(c.titulo),
        publicadoEn: String(c.publicadoEn),
      })),
    };
  }
}
