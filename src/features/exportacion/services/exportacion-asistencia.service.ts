import { BadRequestException, Injectable, Optional } from "@nestjs/common";
import { AnioLectivoCls } from "../../../common/anio-lectivo";
import {
  type ColumnaReporte,
  obtenerTodasLasFilas,
} from "../../../common/excel/reporte-excel.builder";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import { AsistenciaClaseService } from "../../asistencia-clase/asistencia-clase.service";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { DocentesService } from "../../docentes/docentes.service";
import { InstitucionService } from "../../institucion/institucion.service";
import { MarcacionesService } from "../../marcaciones/marcaciones.service";
import { SeccionesService } from "../../secciones/secciones.service";
import type {
  ExportarAsistenciaPersonalQueryDto,
  ExportarAsistenciaSeccionQueryDto,
  ExportarMarcacionesQueryDto,
} from "../dto";
import {
  COLUMNAS_MARCACIONES,
  ExportacionContextoHelper,
  type FilaReporte,
  type ReporteGenerado,
  columna,
  contarDiasLaborables,
  siNo,
} from "./exportacion-base.helper";

interface AcumuladorPersonal {
  personaId: string;
  tipoPersonal: string;
  documento: string | null;
  nombreCompleto: string;
  cargoEspecialidad: string | null;
  fechasEntrada: Set<string>;
  puntuales: number;
  tardanzas: number;
  minutosTardanza: number;
  tardanzasJustificadas: number;
  salidasAnticipadas: number;
}

/**
 * Servicio especializado en exportación Excel de asistencia y marcaciones:
 * registro diario de marcaciones, consolidado por sección y asistencia del personal.
 */
@Injectable()
export class ExportacionAsistenciaService {
  private readonly ctx: ExportacionContextoHelper;

  constructor(
    private readonly docentes: DocentesService,
    institucion: InstitucionService,
    @Optional() private readonly marcaciones?: MarcacionesService,
    @Optional() private readonly asistenciaClase?: AsistenciaClaseService,
    @Optional() private readonly secciones?: SeccionesService,
    @Optional() anios?: AniosAcademicosService,
    @Optional() anioLectivo?: AnioLectivoCls,
    @Optional() contexto?: ExportacionContextoHelper,
  ) {
    this.ctx = contexto ?? new ExportacionContextoHelper(institucion, anios, anioLectivo);
  }

  /** Reporte Excel de asistencia / marcaciones filtrado por bimestre o rango de fechas. */
  async marcacionesExcel(
    q: ExportarMarcacionesQueryDto,
    user: AuthenticatedUser,
  ): Promise<ReporteGenerado> {
    if (!this.marcaciones) throw new BadRequestException("Servicio de marcaciones no disponible.");

    const { anio, fechaDesde, fechaHasta, etiquetaPeriodo } = await this.ctx.resolverRangoFechas(
      q,
      "Indique un período o un rango de fechas (desde y hasta) para exportar asistencia.",
    );

    const data = await obtenerTodasLasFilas((cursor, limit) =>
      this.marcaciones!.reporte({
        desde: fechaDesde,
        hasta: fechaHasta,
        seccionId: q.seccionId,
        personaId: q.personaId,
        tipoPersona: q.tipoPersona,
        cursor,
        limit,
      }),
    );

    const filas: FilaReporte[] = data.map((m) => ({
      fecha: m.fechaHora.slice(0, 10),
      hora: m.fechaHora.slice(11, 19),
      nombreCompleto: m.nombreCompleto,
      tipoPersona: m.tipoPersona,
      tipo: m.tipo,
      origen: m.origen,
      resultado: m.resultado,
      minutosTardanza: m.minutosTardanza,
      justificada: siNo(m.justificada),
      motivoJustificacion: m.motivoJustificacion,
      observacion: m.observacion,
    }));

    return this.ctx.generar(
      user,
      "marcaciones",
      "Reporte de asistencia y marcaciones",
      COLUMNAS_MARCACIONES,
      filas,
      {
        Período: etiquetaPeriodo,
        Desde: fechaDesde,
        Hasta: fechaHasta,
        "Tipo de persona": q.tipoPersona,
      },
      { anioAcademico: anio ? String(anio.anio) : undefined },
    );
  }

  /** Asistencia consolidada (al colegio y por curso) de una sección, un grado o todo el colegio. */
  async asistenciaSeccionExcel(
    q: ExportarAsistenciaSeccionQueryDto,
    user: AuthenticatedUser,
  ): Promise<ReporteGenerado> {
    if (!this.asistenciaClase) {
      throw new BadRequestException("Servicio de asistencia en clase no disponible.");
    }

    const { anio, fechaDesde, fechaHasta, etiquetaPeriodo } = await this.ctx.resolverRangoFechas(
      q,
      "Indique un período o un rango de fechas (desde y hasta) para exportar asistencia.",
    );

    let seccionIds: string[] = [];
    let etiquetaGrado: string | undefined;

    if (q.seccionId) {
      seccionIds = [q.seccionId];
    } else if (this.secciones) {
      const lista = await this.secciones.findAll({ gradoId: q.gradoId, estado: "activa" });
      seccionIds = lista.map((s) => s.id);
      if (q.gradoId) etiquetaGrado = lista[0]?.gradoNombre;
    }

    if (seccionIds.length === 0) {
      throw new BadRequestException(
        "No se encontraron secciones activas para exportar la asistencia.",
      );
    }

    const filas: FilaReporte[] = [];
    let rangoDesde = fechaDesde;
    let rangoHasta = fechaHasta;

    for (const seccionId of seccionIds) {
      const res = await this.asistenciaClase.consultarSeccion(
        seccionId,
        { desde: fechaDesde, hasta: fechaHasta },
        user,
      );
      rangoDesde = rangoDesde ?? res.desde;
      rangoHasta = rangoHasta ?? res.hasta;

      for (const est of res.estudiantes) {
        filas.push({
          seccion: res.seccionNombre,
          estudiante: est.nombreCompleto,
          diasConClases: res.diasConClases,
          faltasColegio: est.faltasColegio,
          tardanzasColegio: est.tardanzasColegio,
          presentesClase: est.clases.presentes,
          tardanzasClase: est.clases.tardanzas,
          faltasClase: est.clases.faltas,
          faltasJustificadas: est.clases.faltasJustificadas,
        });
      }
    }

    const columnas: ColumnaReporte[] = [
      columna("Sección", "seccion", 16, "texto", true),
      columna("Estudiante", "estudiante", 36, "texto", true),
      columna("Días con clases", "diasConClases", 16, "numero"),
      columna("Faltas al colegio", "faltasColegio", 18, "numero", true),
      columna("Tardanzas al colegio", "tardanzasColegio", 20, "numero"),
      columna("Presentes en clase", "presentesClase", 18, "numero"),
      columna("Tardanzas en clase", "tardanzasClase", 18, "numero"),
      columna("Faltas en clase", "faltasClase", 16, "numero", true),
      columna("Faltas justificadas", "faltasJustificadas", 18, "numero"),
    ];

    return this.ctx.generar(
      user,
      "asistencia-seccion",
      "Asistencia consolidada por sección",
      columnas,
      filas,
      { Período: etiquetaPeriodo, Grado: etiquetaGrado, Desde: rangoDesde, Hasta: rangoHasta },
      { anioAcademico: anio ? String(anio.anio) : undefined },
    );
  }

  /** Asistencia consolidada de docentes y personal administrativo (resumen + detalle de marcaciones). */
  async asistenciaPersonalExcel(
    q: ExportarAsistenciaPersonalQueryDto,
    user: AuthenticatedUser,
  ): Promise<ReporteGenerado> {
    if (!this.marcaciones) throw new BadRequestException("Servicio de marcaciones no disponible.");

    const { anio, fechaDesde, fechaHasta, etiquetaPeriodo } = await this.ctx.resolverRangoFechas(
      q,
      "Indique un período o un rango de fechas (desde y hasta) para exportar asistencia del personal.",
    );
    const diasLaborables = contarDiasLaborables(fechaDesde, fechaHasta);

    const incluirDocentes = !q.tipoPersona || q.tipoPersona === "docentes";
    const incluirAdmins = !q.tipoPersona || q.tipoPersona === "administrativos";

    const marcacionesPersonal = [
      ...(incluirDocentes
        ? await obtenerTodasLasFilas((cursor, limit) =>
            this.marcaciones!.reporte({
              desde: fechaDesde,
              hasta: fechaHasta,
              tipoPersona: "docentes",
              cursor,
              limit,
            }),
          )
        : []),
      ...(incluirAdmins
        ? await obtenerTodasLasFilas((cursor, limit) =>
            this.marcaciones!.reporte({
              desde: fechaDesde,
              hasta: fechaHasta,
              tipoPersona: "administrativos",
              cursor,
              limit,
            }),
          )
        : []),
    ];

    const mapa = new Map<string, AcumuladorPersonal>();

    if (incluirDocentes) {
      const docentesActivos = await obtenerTodasLasFilas((cursor, limit) =>
        this.docentes.findAll({ estado: "activo", cursor, limit }),
      );
      for (const d of docentesActivos) {
        const apellidos = [d.persona.apellidoPaterno, d.persona.apellidoMaterno]
          .filter(Boolean)
          .join(" ");
        const nombreCompleto = `${apellidos}, ${d.persona.nombres}`.replace(/\s+/g, " ").trim();
        mapa.set(d.personaId, {
          personaId: d.personaId,
          tipoPersonal: "Docente",
          documento: d.persona.numeroDocumento,
          nombreCompleto,
          cargoEspecialidad: d.cargoVigente ?? d.especialidad ?? null,
          fechasEntrada: new Set(),
          puntuales: 0,
          tardanzas: 0,
          minutosTardanza: 0,
          tardanzasJustificadas: 0,
          salidasAnticipadas: 0,
        });
      }
    }

    for (const m of marcacionesPersonal) {
      const fecha = m.fechaHora.slice(0, 10);
      let acc = mapa.get(m.personaId);
      if (!acc) {
        acc = {
          personaId: m.personaId,
          tipoPersonal: m.tipoPersona === "docentes" ? "Docente" : "Administrativo",
          documento: null,
          nombreCompleto: m.nombreCompleto,
          cargoEspecialidad: null,
          fechasEntrada: new Set(),
          puntuales: 0,
          tardanzas: 0,
          minutosTardanza: 0,
          tardanzasJustificadas: 0,
          salidasAnticipadas: 0,
        };
        mapa.set(m.personaId, acc);
      }

      if (m.tipo === "entrada") {
        acc.fechasEntrada.add(fecha);
        if (m.resultado === "puntual") acc.puntuales += 1;
        else if (m.resultado === "tardanza") {
          acc.tardanzas += 1;
          acc.minutosTardanza += m.minutosTardanza;
          if (m.justificada) acc.tardanzasJustificadas += 1;
        }
      } else if (m.tipo === "salida" && m.resultado === "salida_anticipada") {
        acc.salidasAnticipadas += 1;
      }
    }

    const resumenOrdenado = Array.from(mapa.values()).sort((a, b) =>
      a.nombreCompleto.localeCompare(b.nombreCompleto, "es"),
    );

    const filasResumen: FilaReporte[] = resumenOrdenado.map((acc) => {
      const diasAsistidos = acc.fechasEntrada.size;
      const faltas = Math.max(0, diasLaborables - diasAsistidos);
      const puntualidadPct =
        diasAsistidos > 0 ? Math.round((acc.puntuales / diasAsistidos) * 100) : 0;
      return {
        tipoPersonal: acc.tipoPersonal,
        documento: acc.documento,
        nombreCompleto: acc.nombreCompleto,
        cargoEspecialidad: acc.cargoEspecialidad,
        diasLaborables,
        diasAsistidos,
        puntuales: acc.puntuales,
        tardanzas: acc.tardanzas,
        minutosTardanza: acc.minutosTardanza,
        tardanzasJustificadas: acc.tardanzasJustificadas,
        salidasAnticipadas: acc.salidasAnticipadas,
        faltas,
        puntualidadPct,
      };
    });

    const columnasResumen: ColumnaReporte[] = [
      columna("Tipo", "tipoPersonal", 16, "texto", true),
      columna("Documento", "documento", 14, "texto"),
      columna("Apellidos y nombres", "nombreCompleto", 34, "texto", true),
      columna("Cargo / Especialidad", "cargoEspecialidad", 24, "texto"),
      columna("Días laborables", "diasLaborables", 16, "numero"),
      columna("Días asistidos", "diasAsistidos", 15, "numero", true),
      columna("Puntuales", "puntuales", 13, "numero"),
      columna("Tardanzas", "tardanzas", 13, "numero", true),
      columna("Min. tardanza", "minutosTardanza", 15, "numero"),
      columna("Tard. justificadas", "tardanzasJustificadas", 18, "numero"),
      columna("Salidas anticipadas", "salidasAnticipadas", 18, "numero"),
      columna("Faltas (sin ingreso)", "faltas", 18, "numero", true),
      columna("% Puntualidad", "puntualidadPct", 15, "numero"),
    ];

    const filasDetalle: FilaReporte[] = marcacionesPersonal
      .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))
      .map((m) => ({
        fecha: m.fechaHora.slice(0, 10),
        hora: m.fechaHora.slice(11, 19),
        nombreCompleto: m.nombreCompleto,
        tipoPersona: m.tipoPersona === "docentes" ? "Docente" : "Administrativo",
        tipo: m.tipo,
        origen: m.origen,
        resultado: m.resultado,
        minutosTardanza: m.minutosTardanza,
        justificada: siNo(m.justificada),
        motivoJustificacion: m.motivoJustificacion,
        observacion: m.observacion,
      }));

    return this.ctx.generar(
      user,
      "asistencia-personal",
      "Asistencia consolidada de docentes y personal",
      columnasResumen,
      filasResumen,
      {
        Período: etiquetaPeriodo,
        Desde: fechaDesde,
        Hasta: fechaHasta,
        Personal:
          q.tipoPersona === "docentes"
            ? "Solo docentes"
            : q.tipoPersona === "administrativos"
              ? "Solo administrativos"
              : "Docentes y administrativos",
      },
      {
        anioAcademico: anio ? String(anio.anio) : undefined,
        hojasExtra: [{ nombre: "Detalle", columnas: COLUMNAS_MARCACIONES, filas: filasDetalle }],
      },
    );
  }
}
