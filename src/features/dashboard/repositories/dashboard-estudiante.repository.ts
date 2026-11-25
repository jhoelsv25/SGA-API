import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, eq, gte, lte, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  apoderados,
  asistenciasEstudiante,
  cursos,
  cursosSeccion,
  docentes,
  entregasTarea,
  estudianteApoderados,
  estudiantes,
  grados,
  horarios,
  matriculas,
  personas,
  secciones,
  sesionesClase,
  tareas,
} from "../../../core/database/schema";
import type {
  DashboardFiltrosDto,
  EstudianteAsociadoDto,
  EstudianteDashboardDataDto,
} from "../dto";
import { type PeriodoReferencia, resumirAsistencias } from "./dashboard-referencia.repository";

/**
 * Repositorio analítico personalizado para los roles Estudiante y Apoderado (RF-021).
 */
@Injectable()
export class DashboardEstudianteRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private respuestaVacia(
    estudiantesAsociados: EstudianteAsociadoDto[],
  ): EstudianteDashboardDataDto {
    return {
      kpis: {
        porcentajeAsistencia: 100,
        presentes: 0,
        tardanzas: 0,
        faltas: 0,
        justificadas: 0,
        cursosInscritos: 0,
        tareasPendientes: 0,
        tareasEntregadas: 0,
      },
      graficoTareas: [],
      proximasTareas: [],
      horarioHoy: [],
      estudiantesAsociados,
    };
  }

  async obtenerDatosEstudiante(
    personaId: string,
    esApoderado: boolean,
    referencia: PeriodoReferencia,
    filtros: DashboardFiltrosDto,
  ): Promise<EstudianteDashboardDataDto> {
    const hoyStr = new Date().toISOString().split("T")[0];
    let estudianteId = filtros.estudianteId;
    let estudiantesAsociados: EstudianteAsociadoDto[] = [];

    if (esApoderado) {
      const [apoderado] = await this.db
        .select({ id: apoderados.id })
        .from(apoderados)
        .where(eq(apoderados.personaId, personaId))
        .limit(1);

      if (apoderado) {
        const hijosRows = await this.db
          .select({
            id: estudiantes.id,
            nombres: personas.nombres,
            apellidoPaterno: personas.apellidoPaterno,
            apellidoMaterno: personas.apellidoMaterno,
            gradoNombre: grados.nombre,
            seccionNombre: secciones.nombre,
          })
          .from(estudianteApoderados)
          .innerJoin(estudiantes, eq(estudianteApoderados.estudianteId, estudiantes.id))
          .innerJoin(personas, eq(estudiantes.personaId, personas.id))
          .leftJoin(
            matriculas,
            and(
              eq(matriculas.estudianteId, estudiantes.id),
              eq(matriculas.anioAcademicoId, referencia.anioId),
              eq(matriculas.estado, "matriculado"),
            ),
          )
          .leftJoin(secciones, eq(matriculas.seccionId, secciones.id))
          .leftJoin(grados, eq(secciones.gradoId, grados.id))
          .where(eq(estudianteApoderados.apoderadoId, apoderado.id));

        estudiantesAsociados = hijosRows.map((h) => ({
          id: h.id,
          nombreCompleto: [h.nombres, h.apellidoPaterno, h.apellidoMaterno]
            .filter(Boolean)
            .join(" "),
          grado: h.gradoNombre || "Sin asignar",
          seccion: h.seccionNombre || "-",
        }));

        if (!estudianteId && estudiantesAsociados.length > 0) {
          estudianteId = estudiantesAsociados[0].id;
        }
      }
    } else {
      const [estudiante] = await this.db
        .select({ id: estudiantes.id })
        .from(estudiantes)
        .where(eq(estudiantes.personaId, personaId))
        .limit(1);
      if (estudiante) estudianteId = estudiante.id;
    }

    if (!estudianteId) return this.respuestaVacia(estudiantesAsociados);

    const [matricula] = await this.db
      .select({ id: matriculas.id, seccionId: matriculas.seccionId })
      .from(matriculas)
      .where(
        and(
          eq(matriculas.estudianteId, estudianteId),
          eq(matriculas.anioAcademicoId, referencia.anioId),
          eq(matriculas.estado, "matriculado"),
        ),
      )
      .limit(1);

    if (!matricula) return this.respuestaVacia(estudiantesAsociados);

    const [asistenciasRes, tareasPublicadasRows, entregasRealizadasRows, horarioHoyRows] =
      await Promise.all([
        this.db
          .select({ estado: asistenciasEstudiante.estado, total: count() })
          .from(asistenciasEstudiante)
          .where(
            and(
              eq(asistenciasEstudiante.matriculaId, matricula.id),
              referencia.fechaInicioPeriodo
                ? gte(asistenciasEstudiante.fecha, referencia.fechaInicioPeriodo)
                : sql`TRUE`,
              referencia.fechaFinPeriodo
                ? lte(asistenciasEstudiante.fecha, referencia.fechaFinPeriodo)
                : sql`TRUE`,
            ),
          )
          .groupBy(asistenciasEstudiante.estado),
        this.db
          .select({
            id: tareas.id,
            titulo: tareas.titulo,
            cursoNombre: cursos.nombre,
            fechaLimite: tareas.fechaLimite,
            tipo: tareas.tipo,
            puntajeMaximo: tareas.puntajeMaximo,
          })
          .from(tareas)
          .innerJoin(cursosSeccion, eq(tareas.cursoSeccionId, cursosSeccion.id))
          .innerJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
          .where(
            and(
              eq(cursosSeccion.seccionId, matricula.seccionId),
              eq(tareas.estado, "publicada"),
              filtros.periodoId ? eq(tareas.periodoId, filtros.periodoId) : sql`TRUE`,
            ),
          )
          .orderBy(asc(tareas.fechaLimite)),
        this.db
          .select({
            tareaId: entregasTarea.tareaId,
            estado: entregasTarea.estado,
            nota: entregasTarea.nota,
            entregadaEn: entregasTarea.entregadaEn,
          })
          .from(entregasTarea)
          .where(eq(entregasTarea.matriculaId, matricula.id)),
        this.db
          .select({
            id: sesionesClase.id,
            cursoNombre: cursos.nombre,
            docenteNombre: sql<string>`concat(${personas.nombres}, ' ', ${personas.apellidoPaterno})`,
            aula: secciones.aula,
            horaInicio: sesionesClase.horaInicioPlan,
            horaFin: sesionesClase.horaFinPlan,
            estado: sesionesClase.estado,
          })
          .from(sesionesClase)
          .innerJoin(horarios, eq(sesionesClase.horarioId, horarios.id))
          .innerJoin(cursosSeccion, eq(horarios.cursoSeccionId, cursosSeccion.id))
          .innerJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
          .innerJoin(secciones, eq(cursosSeccion.seccionId, secciones.id))
          .innerJoin(docentes, eq(sesionesClase.docenteId, docentes.id))
          .innerJoin(personas, eq(docentes.personaId, personas.id))
          .where(
            and(eq(cursosSeccion.seccionId, matricula.seccionId), eq(sesionesClase.fecha, hoyStr)),
          )
          .orderBy(asc(sesionesClase.horaInicioPlan)),
      ]);

    const asistenciaResumen = resumirAsistencias(asistenciasRes, 100);
    const entregasMap = new Map(entregasRealizadasRows.map((e) => [e.tareaId, e]));

    let tareasPendientes = 0;
    let tareasEntregadas = 0;
    const proximasTareas = tareasPublicadasRows.map((t) => {
      const entrega = entregasMap.get(t.id);
      let estadoEntrega: "pendiente" | "entregada" | "calificada" = "pendiente";
      let nota: number | null = null;
      if (entrega) {
        tareasEntregadas++;
        if (entrega.nota !== null && entrega.nota !== undefined) {
          estadoEntrega = "calificada";
          nota = Number(entrega.nota);
        } else {
          estadoEntrega = "entregada";
        }
      } else {
        tareasPendientes++;
      }
      return {
        id: t.id,
        titulo: t.titulo,
        curso: t.cursoNombre,
        fechaLimite: t.fechaLimite,
        tipo: t.tipo,
        puntajeMaximo: Number(t.puntajeMaximo),
        estadoEntrega,
        nota,
      };
    });

    return {
      kpis: {
        porcentajeAsistencia: asistenciaResumen.porcentaje,
        presentes: asistenciaResumen.presentes,
        tardanzas: asistenciaResumen.tardanzas,
        faltas: asistenciaResumen.faltas,
        justificadas: asistenciaResumen.justificadas,
        cursosInscritos: 10,
        tareasPendientes,
        tareasEntregadas,
      },
      graficoTareas: [
        {
          estado: "Entregadas",
          cantidad: tareasEntregadas,
          fill: "var(--color-entregadas, #10b981)",
        },
        {
          estado: "Pendientes",
          cantidad: tareasPendientes,
          fill: "var(--color-pendientes, #f59e0b)",
        },
      ],
      proximasTareas: proximasTareas.slice(0, 6),
      horarioHoy: horarioHoyRows.map((h) => ({
        id: h.id,
        curso: h.cursoNombre,
        docente: h.docenteNombre,
        aula: h.aula,
        horaInicio: h.horaInicio || "--:--",
        horaFin: h.horaFin || "--:--",
        estado: h.estado,
      })),
      estudiantesAsociados,
    };
  }
}
