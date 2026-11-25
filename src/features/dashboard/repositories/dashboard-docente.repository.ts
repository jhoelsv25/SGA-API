import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  cursos,
  cursosSeccion,
  docentes,
  entregasTarea,
  grados,
  horarios,
  matriculas,
  secciones,
  sesionesClase,
  tareas,
} from "../../../core/database/schema";
import type { DashboardFiltrosDto, DocenteDashboardDataDto } from "../dto";
import type { PeriodoReferencia } from "./dashboard-referencia.repository";

/**
 * Repositorio analítico personalizado para el rol Docente (RF-021).
 */
@Injectable()
export class DashboardDocenteRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async obtenerDatosDocente(
    personaId: string,
    referencia: PeriodoReferencia,
    filtros: DashboardFiltrosDto,
  ): Promise<DocenteDashboardDataDto> {
    const hoyStr = new Date().toISOString().split("T")[0];

    const [docente] = await this.db
      .select({ id: docentes.id })
      .from(docentes)
      .where(and(eq(docentes.personaId, personaId), eq(docentes.estado, "activo")))
      .limit(1);

    if (!docente) {
      return {
        kpis: {
          misCursos: 0,
          misSecciones: 0,
          misEstudiantes: 0,
          sesionesHoyTotal: 0,
          sesionesHoyCompletadas: 0,
          tareasActivas: 0,
          entregasPendientesCalificar: 0,
          porcentajeAsistenciaPromedio: 100,
        },
        graficoEntregas: [],
        sesionesHoy: [],
        tareasPorCorregir: [],
      };
    }

    const docenteId = docente.id;

    const [cursosSeccionesRows, sesionesHoyRows, entregasTotalesRes, tareasRecientesRows] =
      await Promise.all([
        this.db
          .select({
            cursoSeccionId: cursosSeccion.id,
            cursoId: cursosSeccion.cursoId,
            cursoNombre: cursos.nombre,
            seccionId: cursosSeccion.seccionId,
            seccionNombre: secciones.nombre,
            gradoNombre: grados.nombre,
          })
          .from(cursosSeccion)
          .innerJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
          .innerJoin(secciones, eq(cursosSeccion.seccionId, secciones.id))
          .innerJoin(grados, eq(secciones.gradoId, grados.id))
          .where(
            and(
              eq(cursosSeccion.docenteId, docenteId),
              eq(secciones.anioAcademicoId, referencia.anioId),
            ),
          ),
        this.db
          .select({
            id: sesionesClase.id,
            fecha: sesionesClase.fecha,
            horaInicio: sesionesClase.horaInicioPlan,
            horaFin: sesionesClase.horaFinPlan,
            estado: sesionesClase.estado,
            cursoNombre: cursos.nombre,
            seccionNombre: secciones.nombre,
            gradoNombre: grados.nombre,
            aula: secciones.aula,
          })
          .from(sesionesClase)
          .innerJoin(horarios, eq(sesionesClase.horarioId, horarios.id))
          .innerJoin(cursosSeccion, eq(horarios.cursoSeccionId, cursosSeccion.id))
          .innerJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
          .innerJoin(secciones, eq(cursosSeccion.seccionId, secciones.id))
          .innerJoin(grados, eq(secciones.gradoId, grados.id))
          .where(and(eq(sesionesClase.docenteId, docenteId), eq(sesionesClase.fecha, hoyStr)))
          .orderBy(asc(sesionesClase.horaInicioPlan)),
        this.db
          .select({
            totalEntregadas: sql<number>`count(case when ${entregasTarea.estado} = 'entregada' and ${entregasTarea.nota} is null then 1 end)`,
            totalCalificadas: sql<number>`count(case when ${entregasTarea.nota} is not null or ${entregasTarea.estado} = 'calificada' then 1 end)`,
          })
          .from(entregasTarea)
          .innerJoin(tareas, eq(entregasTarea.tareaId, tareas.id))
          .innerJoin(cursosSeccion, eq(tareas.cursoSeccionId, cursosSeccion.id))
          .innerJoin(secciones, eq(cursosSeccion.seccionId, secciones.id))
          .where(
            and(
              eq(cursosSeccion.docenteId, docenteId),
              eq(secciones.anioAcademicoId, referencia.anioId),
              filtros.periodoId ? eq(tareas.periodoId, filtros.periodoId) : sql`TRUE`,
            ),
          ),
        this.db
          .select({
            id: tareas.id,
            titulo: tareas.titulo,
            curso: cursos.nombre,
            seccion: sql<string>`concat(${grados.nombre}, ' ', ${secciones.nombre})`,
            fechaLimite: tareas.fechaLimite,
            totalEntregas: count(entregasTarea.id),
            pendientes: sql<number>`count(case when ${entregasTarea.estado} = 'entregada' and ${entregasTarea.nota} is null then 1 end)`,
            calificadas: sql<number>`count(case when ${entregasTarea.nota} is not null then 1 end)`,
          })
          .from(tareas)
          .innerJoin(cursosSeccion, eq(tareas.cursoSeccionId, cursosSeccion.id))
          .innerJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
          .innerJoin(secciones, eq(cursosSeccion.seccionId, secciones.id))
          .innerJoin(grados, eq(secciones.gradoId, grados.id))
          .leftJoin(entregasTarea, eq(entregasTarea.tareaId, tareas.id))
          .where(
            and(
              eq(cursosSeccion.docenteId, docenteId),
              eq(secciones.anioAcademicoId, referencia.anioId),
              filtros.periodoId ? eq(tareas.periodoId, filtros.periodoId) : sql`TRUE`,
            ),
          )
          .groupBy(
            tareas.id,
            tareas.titulo,
            cursos.nombre,
            grados.nombre,
            secciones.nombre,
            tareas.fechaLimite,
          )
          .orderBy(desc(tareas.fechaLimite))
          .limit(6),
      ]);

    const cursosSet = new Set(cursosSeccionesRows.map((cs) => cs.cursoId));
    const seccionesSet = new Set(cursosSeccionesRows.map((cs) => cs.seccionId));
    const seccionesIds = Array.from(seccionesSet);

    let totalEstudiantes = 0;
    if (seccionesIds.length > 0) {
      const [estRes] = await this.db
        .select({ total: count(matriculas.id) })
        .from(matriculas)
        .where(
          and(inArray(matriculas.seccionId, seccionesIds), eq(matriculas.estado, "matriculado")),
        );
      totalEstudiantes = Number(estRes?.total ?? 0);
    }

    const pendientesCalificar = Number(entregasTotalesRes[0]?.totalEntregadas ?? 0);
    const calificadasTotal = Number(entregasTotalesRes[0]?.totalCalificadas ?? 0);

    const sesionesHoy = sesionesHoyRows.map((s) => ({
      id: s.id,
      curso: s.cursoNombre,
      seccion: s.seccionNombre,
      grado: s.gradoNombre,
      aula: s.aula,
      horaInicio: s.horaInicio || "--:--",
      horaFin: s.horaFin || "--:--",
      estado: s.estado,
    }));

    return {
      kpis: {
        misCursos: cursosSet.size,
        misSecciones: seccionesSet.size,
        misEstudiantes: totalEstudiantes,
        sesionesHoyTotal: sesionesHoy.length,
        sesionesHoyCompletadas: sesionesHoy.filter((s) => s.estado === "cumplida").length,
        tareasActivas: tareasRecientesRows.length,
        entregasPendientesCalificar: pendientesCalificar,
        porcentajeAsistenciaPromedio: 96,
      },
      graficoEntregas: [
        {
          estado: "Calificadas",
          cantidad: calificadasTotal,
          fill: "var(--color-calificadas, #10b981)",
        },
        {
          estado: "Pendientes",
          cantidad: pendientesCalificar,
          fill: "var(--color-pendientes, #f59e0b)",
        },
      ],
      sesionesHoy,
      tareasPorCorregir: tareasRecientesRows.map((t) => ({
        id: t.id,
        titulo: t.titulo,
        curso: t.curso,
        seccion: t.seccion,
        fechaLimite: t.fechaLimite,
        entregadas: Number(t.totalEntregas),
        calificadas: Number(t.calificadas),
        totalAlumnos: totalEstudiantes,
      })),
    };
  }
}
