import { BadRequestException, Injectable, Optional } from "@nestjs/common";
import { AnioLectivoCls } from "../../../common/anio-lectivo";
import {
  type ColumnaReporte,
  obtenerTodasLasFilas,
} from "../../../common/excel/reporte-excel.builder";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { HorariosService } from "../../horarios/horarios.service";
import { PLANTILLAS, TIPO_IMPORTACION } from "../../importacion/constants";
import { InstitucionService } from "../../institucion/institucion.service";
import { LibretasService } from "../../libretas/libretas.service";
import type { MatriculaQueryDto } from "../../matriculas/dto";
import { MatriculasService } from "../../matriculas/matriculas.service";
import { SeccionesService } from "../../secciones/secciones.service";
import type { ExportarHorariosQueryDto, ExportarLibretasQueryDto } from "../dto";
import {
  ExportacionContextoHelper,
  type FilaReporte,
  type ReporteGenerado,
  columna,
  columnasDePlantilla,
  siNo,
} from "./exportacion-base.helper";

const DIAS_SEMANA_NOMBRE: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

/**
 * Servicio especializado en exportación Excel de reportes académicos:
 * nómina de matrículas, seguimiento de libretas SIAGIE y horarios semanales.
 */
@Injectable()
export class ExportacionAcademicaService {
  private readonly ctx: ExportacionContextoHelper;

  constructor(
    institucion: InstitucionService,
    @Optional() private readonly matriculas?: MatriculasService,
    @Optional() private readonly libretas?: LibretasService,
    @Optional() private readonly secciones?: SeccionesService,
    @Optional() private readonly horarios?: HorariosService,
    @Optional() anios?: AniosAcademicosService,
    @Optional() anioLectivo?: AnioLectivoCls,
    @Optional() contexto?: ExportacionContextoHelper,
  ) {
    this.ctx = contexto ?? new ExportacionContextoHelper(institucion, anios, anioLectivo);
  }

  /** Nómina oficial de matrículas del año académico con los filtros activos. */
  async matriculasExcel(q: MatriculaQueryDto, user: AuthenticatedUser): Promise<ReporteGenerado> {
    if (!this.matriculas) throw new BadRequestException("Servicio de matrículas no disponible.");

    const anio = await this.ctx.resolverAnioDeTrabajo(q.anioAcademicoId);
    const anioAcademicoId = q.anioAcademicoId ?? anio?.id;

    const data = await obtenerTodasLasFilas((cursor, limit) =>
      this.matriculas!.findAll({ ...q, anioAcademicoId, cursor, limit }),
    );

    const columnas: ColumnaReporte[] = [
      columna("Código matrícula", "codigo", 18, "texto", true),
      columna("Año académico", "anioNumero", 14, "numero", true),
      columna("Grado", "gradoNombre", 20, "texto", true),
      columna("Sección", "seccionNombre", 12, "texto", true),
      columna("Código SIAGIE", "codigoEstudiante", 18, "texto", true),
      columna("Tipo documento", "tipoDocumento", 16, "texto", true),
      columna("Número documento", "numeroDocumento", 18, "texto", true),
      columna("Apellidos", "apellidos", 28, "texto", true),
      columna("Nombres", "nombres", 24, "texto", true),
      columna("Tipo matrícula", "tipo", 16, "texto"),
      columna("Repitente", "esRepitente", 12, "texto"),
      columna("Estado", "estado", 14, "texto"),
      columna("Fecha matrícula", "fechaMatricula", 16, "fecha"),
      columna("Fecha retiro", "fechaRetiro", 16, "fecha"),
      columna("Motivo retiro", "motivoRetiro", 28, "texto"),
      columna("Colegio procedencia", "colegioProcedencia", 28, "texto"),
    ];

    const filas: FilaReporte[] = data.map((m) => ({
      codigo: m.codigo,
      anioNumero: m.anioNumero,
      gradoNombre: m.gradoNombre,
      seccionNombre: m.seccionNombre,
      codigoEstudiante: m.estudiante.codigo,
      tipoDocumento: m.estudiante.tipoDocumento,
      numeroDocumento: m.estudiante.numeroDocumento,
      apellidos: m.estudiante.apellidos,
      nombres: m.estudiante.nombres,
      tipo: m.tipo,
      esRepitente: siNo(m.esRepitente),
      estado: m.estado,
      fechaMatricula: m.fechaMatricula,
      fechaRetiro: m.fechaRetiro,
      motivoRetiro: m.motivoRetiro,
      colegioProcedencia: m.colegioProcedencia,
    }));

    return this.ctx.generar(
      user,
      "matriculas",
      "Nómina de matrículas",
      columnas,
      filas,
      { Tipo: q.tipo, Estado: q.estado, Búsqueda: q.search },
      { anioAcademico: anio ? String(anio.anio) : undefined },
    );
  }

  /** Reporte Excel de entrega y lectura de Libretas SIAGIE (resumen + detalle por estudiante). */
  async libretasExcel(
    q: ExportarLibretasQueryDto,
    user: AuthenticatedUser,
  ): Promise<ReporteGenerado> {
    if (!this.libretas) throw new BadRequestException("Servicio de libretas no disponible.");

    const anio = await this.ctx.resolverAnioDeTrabajo();
    const bimestre = anio?.bimestres.find((b) => b.id === q.periodoId);
    const actor = { id: user.id, roleId: user.roleId, role: user.role, personaId: user.personaId };

    const seg = await this.libretas.seguimiento(q.periodoId, actor);
    let seccionesFiltradas = seg.secciones;
    let etiquetaGrado: string | undefined;

    if (q.seccionId) {
      seccionesFiltradas = seg.secciones.filter((s) => s.seccionId === q.seccionId);
    } else if (q.gradoId && this.secciones) {
      const delGrado = await this.secciones.findAll({ gradoId: q.gradoId, estado: "activa" });
      const idsGrado = new Set(delGrado.map((s) => s.id));
      seccionesFiltradas = seg.secciones.filter((s) => idsGrado.has(s.seccionId));
      etiquetaGrado = delGrado[0]?.gradoNombre;
    }

    const columnasResumen: ColumnaReporte[] = [
      columna("Grado", "gradoNombre", 22, "texto", true),
      columna("Sección", "seccionNombre", 12, "texto", true),
      columna("Programadas", "programadas", 14, "numero", true),
      columna("A tiempo", "aTiempo", 14, "numero", true),
      columna("Fuera de plazo", "fueraDePlazo", 16, "numero"),
      columna("Pendientes", "pendientes", 14, "numero"),
      columna("% A tiempo", "porcentajeATiempo", 14, "numero"),
      columna("Vistas por familia", "vistas", 18, "numero"),
    ];

    const filasResumen: FilaReporte[] = seccionesFiltradas.map((s) => ({
      gradoNombre: s.gradoNombre,
      seccionNombre: s.seccionNombre,
      programadas: s.programadas,
      aTiempo: s.aTiempo,
      fueraDePlazo: s.fueraDePlazo,
      pendientes: s.pendientes,
      porcentajeATiempo: s.porcentajeATiempo,
      vistas: s.vistas,
    }));

    const filasDetalle: FilaReporte[] = [];
    for (const sec of seccionesFiltradas) {
      const detalle = await this.libretas.detalle(sec.seccionId, q.periodoId, actor);
      for (const item of detalle) {
        filasDetalle.push({
          gradoNombre: sec.gradoNombre,
          seccionNombre: sec.seccionNombre,
          codigo: item.codigo,
          nombreCompleto: item.nombreCompleto,
          estado: item.estado,
          fechaLimite: item.fechaLimite,
          visto: siNo(Boolean(item.vistoEn)),
          vistoEn: item.vistoEn ? item.vistoEn.slice(0, 10) : null,
        });
      }
    }

    const columnasDetalle: ColumnaReporte[] = [
      columna("Grado", "gradoNombre", 22, "texto", true),
      columna("Sección", "seccionNombre", 12, "texto", true),
      columna("Código SIAGIE", "codigo", 18, "texto", true),
      columna("Estudiante", "nombreCompleto", 34, "texto", true),
      columna("Estado libreta", "estado", 16, "texto", true),
      columna("Fecha límite", "fechaLimite", 16, "fecha"),
      columna("Vista por familia", "visto", 18, "texto"),
      columna("Fecha primera vista", "vistoEn", 20, "fecha"),
    ];

    return this.ctx.generar(
      user,
      "libretas",
      "Seguimiento de libretas SIAGIE",
      columnasResumen,
      filasResumen,
      {
        Período: bimestre ? `Bimestre ${bimestre.nombre}` : q.periodoId,
        Grado: etiquetaGrado,
        Sección:
          q.seccionId && seccionesFiltradas[0]
            ? `${seccionesFiltradas[0].gradoNombre} ${seccionesFiltradas[0].seccionNombre}`
            : undefined,
      },
      {
        anioAcademico: anio ? String(anio.anio) : undefined,
        hojasExtra: [{ nombre: "Detalle", columnas: columnasDetalle, filas: filasDetalle }],
      },
    );
  }

  async horariosExcel(
    q: ExportarHorariosQueryDto,
    user: AuthenticatedUser,
  ): Promise<ReporteGenerado> {
    if (!this.horarios) throw new BadRequestException("Servicio de horarios no disponible.");

    const { anio, secciones } = await this.horarios.listarBloquesConsolidados({
      gradoId: q.gradoId,
      seccionId: q.seccionId,
    });

    const columnas: ColumnaReporte[] = [
      ...columnasDePlantilla(PLANTILLAS[TIPO_IMPORTACION.HORARIOS].campos),
      columna("Docente", "docenteNombre", 32, "texto"),
    ];

    const filas: FilaReporte[] = [];
    for (const sec of secciones) {
      for (const bloque of sec.bloques) {
        filas.push({
          grado: sec.gradoNombre,
          seccion: sec.seccionNombre,
          diaSemana: DIAS_SEMANA_NOMBRE[bloque.diaSemana] ?? String(bloque.diaSemana),
          horaInicio: bloque.horaInicio,
          horaFin: bloque.horaFin,
          tipoBloque: bloque.tipoBloque,
          curso: bloque.tipoBloque === "receso" ? null : (bloque.cursoNombre ?? null),
          aula: bloque.aula ?? null,
          docenteNombre: bloque.tipoBloque === "receso" ? null : (bloque.docenteNombre ?? null),
        });
      }
    }

    const seccionFiltrada =
      q.seccionId && secciones[0]
        ? `${secciones[0].gradoNombre} – Sección ${secciones[0].seccionNombre}`
        : undefined;
    const gradoFiltrado = q.gradoId && !q.seccionId ? secciones[0]?.gradoNombre : undefined;

    return this.ctx.generar(
      user,
      "horarios",
      "Horarios escolares semanales",
      columnas,
      filas,
      { Grado: gradoFiltrado, Sección: seccionFiltrada },
      { anioAcademico: String(anio) },
    );
  }
}
