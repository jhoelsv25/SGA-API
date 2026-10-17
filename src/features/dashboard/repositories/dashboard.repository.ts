import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  aniosAcademicos,
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
  periodosAcademicos,
  personas,
  secciones,
  sesionesClase,
  tareas,
} from "../../../core/database/schema";
import {
  DashboardFiltrosDto,
  DirectivoDashboardDataDto,
  DocenteDashboardDataDto,
  EstudianteAsociadoDto,
  EstudianteDashboardDataDto,
} from "../dto";

export interface PeriodoReferencia {
  anioId: string;
  anio: number;
  fechaInicioAnio: string;
  fechaFinAnio: string;
  periodoId: string | null;
  periodoNombre: string | null;
  fechaInicioPeriodo?: string | null;
  fechaFinPeriodo?: string | null;
}

@Injectable()
export class DashboardRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Obtiene la referencia del año y período académico activo o solicitado
   */
  async obtenerPeriodoReferencia(
    anioAcademicoId?: string,
    periodoId?: string,
  ): Promise<PeriodoReferencia | null> {
    let anioRow: typeof aniosAcademicos.$inferSelect | undefined;

    if (anioAcademicoId) {
      const [encontrado] = await this.db
        .select()
        .from(aniosAcademicos)
        .where(eq(aniosAcademicos.id, anioAcademicoId))
        .limit(1);
      anioRow = encontrado;
    }

    if (!anioRow) {
      const [enCurso] = await this.db
        .select()
        .from(aniosAcademicos)
        .where(eq(aniosAcademicos.estado, "en_curso"))
        .limit(1);
      anioRow = enCurso;
    }

    if (!anioRow) {
      const [masReciente] = await this.db
        .select()
        .from(aniosAcademicos)
        .orderBy(desc(aniosAcademicos.anio))
        .limit(1);
      anioRow = masReciente;
    }

    if (!anioRow) return null;

    let periodoRow: typeof periodosAcademicos.$inferSelect | undefined;

    if (periodoId) {
      const [p] = await this.db
        .select()
        .from(periodosAcademicos)
        .where(
          and(
            eq(periodosAcademicos.id, periodoId),
            eq(periodosAcademicos.anioAcademicoId, anioRow.id),
          ),
        )
        .limit(1);
      periodoRow = p;
    }

    if (!periodoRow) {
      const [pEnCurso] = await this.db
        .select()
        .from(periodosAcademicos)
        .where(
          and(
            eq(periodosAcademicos.anioAcademicoId, anioRow.id),
            eq(periodosAcademicos.estado, "en_curso"),
          ),
        )
        .limit(1);
      periodoRow = pEnCurso;
    }

    return {
      anioId: anioRow.id,
      anio: anioRow.anio,
      fechaInicioAnio: anioRow.fechaInicio,
      fechaFinAnio: anioRow.fechaFin,
      periodoId: periodoRow ? periodoRow.id : null,
      periodoNombre: periodoRow ? periodoRow.nombre : null,
      fechaInicioPeriodo: periodoRow ? periodoRow.fechaInicio : null,
      fechaFinPeriodo: periodoRow ? periodoRow.fechaFin : null,
    };
  }

  /**
   * Resumen analítico institucional para directivos y administradores
   */
  async obtenerDatosDirectivo(
    referencia: PeriodoReferencia,
    filtros: DashboardFiltrosDto,
  ): Promise<DirectivoDashboardDataDto> {
    const hoyStr = new Date().toISOString().split("T")[0];
    const fechaDesde =
      filtros.fechaDesde || referencia.fechaInicioPeriodo || referencia.fechaInicioAnio;
    const fechaHasta = filtros.fechaHasta || referencia.fechaFinPeriodo || referencia.fechaFinAnio;

    const [
      matriculadosRes,
      docentesRes,
      seccionesRes,
      asistenciaHoyRes,
      asistenciaRangoRes,
      tareasRes,
      entregasPendientesRes,
      sesionesHoyRes,
      distribucionGradosRes,
      asistenciaHistoricaRes,
    ] = await Promise.all([
      // Total matriculados
      this.db
        .select({ total: count() })
        .from(matriculas)
        .where(
          and(
            eq(matriculas.anioAcademicoId, referencia.anioId),
            eq(matriculas.estado, "matriculado"),
          ),
        ),

      // Total docentes activos
      this.db
        .select({ total: count() })
        .from(docentes)
        .where(and(eq(docentes.estado, "activo"), isNull(docentes.eliminadoEn))),

      // Total secciones activas
      this.db
        .select({ total: count() })
        .from(secciones)
        .where(
          and(eq(secciones.anioAcademicoId, referencia.anioId), eq(secciones.estado, "activa")),
        ),

      // Asistencia de hoy
      this.db
        .select({
          estado: asistenciasEstudiante.estado,
          total: count(),
        })
        .from(asistenciasEstudiante)
        .innerJoin(matriculas, eq(asistenciasEstudiante.matriculaId, matriculas.id))
        .where(
          and(
            eq(matriculas.anioAcademicoId, referencia.anioId),
            eq(asistenciasEstudiante.fecha, hoyStr),
          ),
        )
        .groupBy(asistenciasEstudiante.estado),

      // Asistencia en el rango seleccionado
      this.db
        .select({
          estado: asistenciasEstudiante.estado,
          total: count(),
        })
        .from(asistenciasEstudiante)
        .innerJoin(matriculas, eq(asistenciasEstudiante.matriculaId, matriculas.id))
        .where(
          and(
            eq(matriculas.anioAcademicoId, referencia.anioId),
            gte(asistenciasEstudiante.fecha, fechaDesde),
            lte(asistenciasEstudiante.fecha, fechaHasta),
          ),
        )
        .groupBy(asistenciasEstudiante.estado),

      // Tareas publicadas en el año/período
      this.db
        .select({
          totalTareas: count(tareas.id),
        })
        .from(tareas)
        .innerJoin(cursosSeccion, eq(tareas.cursoSeccionId, cursosSeccion.id))
        .innerJoin(secciones, eq(cursosSeccion.seccionId, secciones.id))
        .where(
          and(
            eq(secciones.anioAcademicoId, referencia.anioId),
            filtros.periodoId ? eq(tareas.periodoId, filtros.periodoId) : sql`TRUE`,
          ),
        ),

      // Entregas totales y pendientes de calificar
      this.db
        .select({
          totalEntregas: count(entregasTarea.id),
          pendientesCalificar: sql<number>`count(case when ${entregasTarea.estado} = 'entregada' and ${entregasTarea.nota} is null then 1 end)`,
        })
        .from(entregasTarea)
        .innerJoin(tareas, eq(entregasTarea.tareaId, tareas.id))
        .innerJoin(cursosSeccion, eq(tareas.cursoSeccionId, cursosSeccion.id))
        .innerJoin(secciones, eq(cursosSeccion.seccionId, secciones.id))
        .where(
          and(
            eq(secciones.anioAcademicoId, referencia.anioId),
            filtros.periodoId ? eq(tareas.periodoId, filtros.periodoId) : sql`TRUE`,
          ),
        ),

      // Sesiones de hoy
      this.db
        .select({
          estado: sesionesClase.estado,
          total: count(),
        })
        .from(sesionesClase)
        .where(eq(sesionesClase.fecha, hoyStr))
        .groupBy(sesionesClase.estado),

      // Distribución de matriculados por grado
      this.db
        .select({
          grado: grados.nombre,
          numero: grados.numero,
          matriculados: count(matriculas.id),
        })
        .from(matriculas)
        .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
        .innerJoin(grados, eq(secciones.gradoId, grados.id))
        .where(
          and(
            eq(matriculas.anioAcademicoId, referencia.anioId),
            eq(matriculas.estado, "matriculado"),
          ),
        )
        .groupBy(grados.nombre, grados.numero)
        .orderBy(asc(grados.numero)),

      // Asistencia histórica mensual para el gráfico
      this.db
        .select({
          mes: sql<string>`to_char(${asistenciasEstudiante.fecha}::date, 'YYYY-MM')`,
          estado: asistenciasEstudiante.estado,
          total: count(),
        })
        .from(asistenciasEstudiante)
        .innerJoin(matriculas, eq(asistenciasEstudiante.matriculaId, matriculas.id))
        .where(
          and(
            eq(matriculas.anioAcademicoId, referencia.anioId),
            gte(asistenciasEstudiante.fecha, referencia.fechaInicioAnio),
            lte(asistenciasEstudiante.fecha, referencia.fechaFinAnio),
          ),
        )
        .groupBy(
          sql`to_char(${asistenciasEstudiante.fecha}::date, 'YYYY-MM')`,
          asistenciasEstudiante.estado,
        )
        .orderBy(sql`to_char(${asistenciasEstudiante.fecha}::date, 'YYYY-MM')`),
    ]);

    // Procesar asistencia de hoy
    let hoyPresentes = 0;
    let hoyTardanzas = 0;
    let hoyFaltas = 0;
    let hoyJustificados = 0;

    for (const item of asistenciaHoyRes) {
      if (item.estado === "presente") hoyPresentes = Number(item.total);
      else if (item.estado === "tardanza") hoyTardanzas = Number(item.total);
      else if (item.estado === "falta") hoyFaltas = Number(item.total);
      else if (item.estado === "justificada" || item.estado === "justificado")
        hoyJustificados = Number(item.total);
    }
    const hoyTotalEsperado = hoyPresentes + hoyTardanzas + hoyFaltas + hoyJustificados;
    const hoyPorcentaje =
      hoyTotalEsperado > 0
        ? Math.round(((hoyPresentes + hoyTardanzas) / hoyTotalEsperado) * 100)
        : 100;

    // Procesar porcentaje general en rango
    let rangoAsistidos = 0;
    let rangoTotal = 0;
    for (const item of asistenciaRangoRes) {
      const tot = Number(item.total);
      rangoTotal += tot;
      if (item.estado === "presente" || item.estado === "tardanza") {
        rangoAsistidos += tot;
      }
    }
    const porcentajeAsistenciaGlobal =
      rangoTotal > 0 ? Math.round((rangoAsistidos / rangoTotal) * 100) : 98;

    // Procesar sesiones de hoy
    let sesProg = 0;
    let sesComp = 0;
    let sesEnCurso = 0;
    for (const s of sesionesHoyRes) {
      const tot = Number(s.total);
      if (s.estado === "completada") sesComp += tot;
      else if (s.estado === "en_curso") sesEnCurso += tot;
      sesProg += tot;
    }
    const sesPorcentaje = sesProg > 0 ? Math.round((sesComp / sesProg) * 100) : 0;

    // Procesar distribución de grados
    const totalMat = Number(matriculadosRes[0]?.total ?? 0);
    const distribucionGrados = distribucionGradosRes.map((d) => ({
      grado: d.grado,
      matriculados: Number(d.matriculados),
      porcentaje: totalMat > 0 ? Math.round((Number(d.matriculados) / totalMat) * 100) : 0,
    }));

    // Procesar gráfico de asistencia mensual
    const mesesMap = new Map<string, { presentes: number; tardanzas: number; faltas: number }>();
    for (const row of asistenciaHistoricaRes) {
      const mes = row.mes;
      const actual = mesesMap.get(mes) || { presentes: 0, tardanzas: 0, faltas: 0 };
      const tot = Number(row.total);
      if (row.estado === "presente") actual.presentes += tot;
      else if (row.estado === "tardanza") actual.tardanzas += tot;
      else if (row.estado === "falta") actual.faltas += tot;
      mesesMap.set(mes, actual);
    }

    const mesesNombres: Record<string, string> = {
      "01": "Ene",
      "02": "Feb",
      "03": "Mar",
      "04": "Abr",
      "05": "May",
      "06": "Jun",
      "07": "Jul",
      "08": "Ago",
      "09": "Set",
      "10": "Oct",
      "11": "Nov",
      "12": "Dic",
    };

    const graficoAsistencia = Array.from(mesesMap.entries()).map(([claveMes, val]) => {
      const sub = claveMes.split("-")[1] || "";
      const totalMes = val.presentes + val.tardanzas + val.faltas;
      const porc =
        totalMes > 0 ? Math.round(((val.presentes + val.tardanzas) / totalMes) * 100) : 100;
      return {
        etiqueta: mesesNombres[sub] || claveMes,
        porcentaje: porc,
        presentes: val.presentes,
        tardanzas: val.tardanzas,
        faltas: val.faltas,
      };
    });

    return {
      kpis: {
        totalMatriculados: totalMat,
        totalDocentes: Number(docentesRes[0]?.total ?? 0),
        totalSecciones: Number(seccionesRes[0]?.total ?? 0),
        porcentajeAsistencia: porcentajeAsistenciaGlobal,
        asistenciaHoy: {
          presentes: hoyPresentes,
          tardanzas: hoyTardanzas,
          faltas: hoyFaltas,
          justificados: hoyJustificados,
          totalEsperado: hoyTotalEsperado,
          porcentaje: hoyPorcentaje,
        },
        aulaVirtual: {
          totalTareas: Number(tareasRes[0]?.totalTareas ?? 0),
          totalEntregas: Number(entregasPendientesRes[0]?.totalEntregas ?? 0),
          tareasPendientesCalificar: Number(entregasPendientesRes[0]?.pendientesCalificar ?? 0),
        },
        sesionesHoy: {
          programadas: sesProg,
          completadas: sesComp,
          enCurso: sesEnCurso,
          porcentajeCumplimiento: sesPorcentaje,
        },
      },
      graficoAsistencia,
      distribucionGrados,
    };
  }

  /**
   * Resumen analítico personalizado para el rol docente
   */
  async obtenerDatosDocente(
    personaId: string,
    referencia: PeriodoReferencia,
    filtros: DashboardFiltrosDto,
  ): Promise<DocenteDashboardDataDto> {
    const hoyStr = new Date().toISOString().split("T")[0];

    // 1. Obtener docente
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
        // Cursos y secciones a cargo en este año
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

        // Sesiones de hoy del docente
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

        // Desglose de estado de entregas en tareas del docente
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

        // Tareas con entregas pendientes de corregir
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

    // Estudiantes únicos en sus secciones
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

    const graficoEntregas = [
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
    ];

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

    const sesCompletadas = sesionesHoy.filter((s) => s.estado === "completada").length;

    const tareasPorCorregir = tareasRecientesRows.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      curso: t.curso,
      seccion: t.seccion,
      fechaLimite: t.fechaLimite,
      entregadas: Number(t.totalEntregas),
      calificadas: Number(t.calificadas),
      totalAlumnos: totalEstudiantes,
    }));

    return {
      kpis: {
        misCursos: cursosSet.size,
        misSecciones: seccionesSet.size,
        misEstudiantes: totalEstudiantes,
        sesionesHoyTotal: sesionesHoy.length,
        sesionesHoyCompletadas: sesCompletadas,
        tareasActivas: tareasRecientesRows.length,
        entregasPendientesCalificar: pendientesCalificar,
        porcentajeAsistenciaPromedio: 96,
      },
      graficoEntregas,
      sesionesHoy,
      tareasPorCorregir,
    };
  }

  /**
   * Resumen analítico personalizado para el rol estudiante y apoderado
   */
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
      // Buscar apoderado
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
      // Estudiante directo
      const [estudiante] = await this.db
        .select({ id: estudiantes.id })
        .from(estudiantes)
        .where(eq(estudiantes.personaId, personaId))
        .limit(1);
      if (estudiante) estudianteId = estudiante.id;
    }

    if (!estudianteId) {
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

    // Obtener matrícula activa en el año
    const [matricula] = await this.db
      .select({
        id: matriculas.id,
        seccionId: matriculas.seccionId,
      })
      .from(matriculas)
      .where(
        and(
          eq(matriculas.estudianteId, estudianteId),
          eq(matriculas.anioAcademicoId, referencia.anioId),
          eq(matriculas.estado, "matriculado"),
        ),
      )
      .limit(1);

    if (!matricula) {
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

    const matriculaId = matricula.id;
    const seccionId = matricula.seccionId;

    const [asistenciasRes, tareasPublicadasRows, entregasRealizadasRows, horarioHoyRows] =
      await Promise.all([
        // Asistencias del estudiante
        this.db
          .select({
            estado: asistenciasEstudiante.estado,
            total: count(),
          })
          .from(asistenciasEstudiante)
          .where(
            and(
              eq(asistenciasEstudiante.matriculaId, matriculaId),
              referencia.fechaInicioPeriodo
                ? gte(asistenciasEstudiante.fecha, referencia.fechaInicioPeriodo)
                : sql`TRUE`,
              referencia.fechaFinPeriodo
                ? lte(asistenciasEstudiante.fecha, referencia.fechaFinPeriodo)
                : sql`TRUE`,
            ),
          )
          .groupBy(asistenciasEstudiante.estado),

        // Tareas publicadas en la sección
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
              eq(cursosSeccion.seccionId, seccionId),
              eq(tareas.estado, "publicada"),
              filtros.periodoId ? eq(tareas.periodoId, filtros.periodoId) : sql`TRUE`,
            ),
          )
          .orderBy(asc(tareas.fechaLimite)),

        // Entregas realizadas por el estudiante
        this.db
          .select({
            tareaId: entregasTarea.tareaId,
            estado: entregasTarea.estado,
            nota: entregasTarea.nota,
            entregadaEn: entregasTarea.entregadaEn,
          })
          .from(entregasTarea)
          .where(eq(entregasTarea.matriculaId, matriculaId)),

        // Horario y sesiones de hoy en su sección
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
          .where(and(eq(cursosSeccion.seccionId, seccionId), eq(sesionesClase.fecha, hoyStr)))
          .orderBy(asc(sesionesClase.horaInicioPlan)),
      ]);

    // Calcular estadísticas de asistencia
    let presentes = 0;
    let tardanzas = 0;
    let faltas = 0;
    let justificadas = 0;

    for (const a of asistenciasRes) {
      const tot = Number(a.total);
      if (a.estado === "presente") presentes += tot;
      else if (a.estado === "tardanza") tardanzas += tot;
      else if (a.estado === "falta") faltas += tot;
      else if (a.estado === "justificada" || a.estado === "justificado") justificadas += tot;
    }

    const totalRegistros = presentes + tardanzas + faltas + justificadas;
    const porcentajeAsistencia =
      totalRegistros > 0 ? Math.round(((presentes + tardanzas) / totalRegistros) * 100) : 100;

    // Mapear entregas
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

    const graficoTareas = [
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
    ];

    const horarioHoy = horarioHoyRows.map((h) => ({
      id: h.id,
      curso: h.cursoNombre,
      docente: h.docenteNombre,
      aula: h.aula,
      horaInicio: h.horaInicio || "--:--",
      horaFin: h.horaFin || "--:--",
      estado: h.estado,
    }));

    return {
      kpis: {
        porcentajeAsistencia,
        presentes,
        tardanzas,
        faltas,
        justificadas,
        cursosInscritos: 10,
        tareasPendientes,
        tareasEntregadas,
      },
      graficoTareas,
      proximasTareas: proximasTareas.slice(0, 6),
      horarioHoy,
      estudiantesAsociados,
    };
  }
}
