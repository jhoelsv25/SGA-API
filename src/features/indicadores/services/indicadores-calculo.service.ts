import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { MENSAJES_INDICADORES } from "../constants";
import type {
  DesgloseCspDto,
  DesgloseIgmDto,
  DesgloseIsaDto,
  DetalleCursoDocenteIndicadorDto,
  FiltroIndicadoresQueryDto,
  IndicadorCalculadoDto,
  MisIndicadoresDocenteResponseDto,
  TableroIndicadoresResponseDto,
} from "../dto";
import type { FiltrosConsultaCalculo, PeriodoResumen } from "../interfaces";
import { IndicadoresCalculoRepository } from "../repositories/indicadores-calculo.repository";
import { estructurarCsp, estructurarIgm, estructurarIsa } from "../utils/calculo-indicadores.util";

@Injectable()
export class IndicadoresCalculoService {
  constructor(
    private readonly repository: IndicadoresCalculoRepository,
    private readonly anioLectivoCls: AnioLectivoCls,
  ) {}

  /**
   * HU1: Calcula el tablero de indicadores CSP, ISA, IGM para el colegio o con filtros.
   * Traza: CP-RF020-01, CP-RF020-02, CP-RF020-03, CP-RF020-04, CP-RF020-05, CP-RF020-06.
   */
  async obtenerTablero(query: FiltroIndicadoresQueryDto): Promise<TableroIndicadoresResponseDto> {
    if (query.fechaInicio && query.fechaFin && query.fechaFin < query.fechaInicio) {
      throw new BadRequestException("La fecha de fin no puede ser anterior a la fecha de inicio.");
    }

    const anioAcademicoId = this.anioLectivoCls.id() ?? "";
    let periodo: PeriodoResumen | null = null;

    if (query.periodoId) {
      periodo = await this.repository.obtenerPeriodoPorId(query.periodoId);
      if (!periodo) {
        throw new NotFoundException(MENSAJES_INDICADORES.PERIODO_NO_ENCONTRADO);
      }
    } else if (!query.fechaInicio && !query.fechaFin) {
      periodo = await this.repository.obtenerPeriodoEnCurso(anioAcademicoId);
    }

    const enCurso = periodo?.estado === "en_curso";

    const filtros: FiltrosConsultaCalculo = {
      anioAcademicoId,
      periodoId: periodo?.id,
      fechaInicio: query.fechaInicio,
      fechaFin: query.fechaFin,
      docenteId: query.docenteId,
      cursoId: query.cursoId,
      seccionId: query.seccionId,
    };

    const conteoSesiones = await this.repository.contarSesiones(filtros);
    const conteoLibretas = await this.repository.contarLibretas(filtros);
    const conteoMateriales = await this.repository.contarMateriales(filtros);

    const csp = estructurarCsp(conteoSesiones, enCurso);
    const isa = estructurarIsa(conteoLibretas, enCurso);
    const igm = estructurarIgm(conteoMateriales, enCurso);

    let detallePorCursos: DetalleCursoDocenteIndicadorDto[] | undefined;

    if (query.docenteId) {
      const cursosDocente = await this.repository.listarCursosDeDocente(
        query.docenteId,
        anioAcademicoId,
        periodo?.id,
      );

      detallePorCursos = [];

      for (const curso of cursosDocente) {
        const filtrosCurso: FiltrosConsultaCalculo = {
          ...filtros,
          docenteId: query.docenteId,
          cursoId: curso.cursoId,
          seccionId: curso.seccionId,
        };

        const sesionesCurso = await this.repository.contarSesiones(filtrosCurso);
        const materialesCurso = await this.repository.contarMateriales(filtrosCurso);

        detallePorCursos.push({
          cursoId: curso.cursoId,
          cursoNombre: curso.cursoNombre,
          seccionId: curso.seccionId,
          seccionNombre: curso.seccionNombre,
          gradoNombre: curso.gradoNombre,
          csp: estructurarCsp(sesionesCurso, enCurso),
          igm: estructurarIgm(materialesCurso, enCurso),
        });
      }
    }

    const respuesta: TableroIndicadoresResponseDto = {
      periodoId: periodo?.id ?? null,
      periodoNombre: periodo?.nombre ?? null,
      enCurso,
      csp,
      isa,
      igm,
    };

    if (detallePorCursos !== undefined) {
      respuesta.detallePorCursos = detallePorCursos;
    }

    return respuesta;
  }

  /**
   * HU1: Calcula el CSP del período o rango especificado.
   * Traza: CP-RF020-01, CP-RF020-04, CP-RF020-05.
   */
  async calcularCsp(
    filtros: FiltrosConsultaCalculo,
  ): Promise<IndicadorCalculadoDto<DesgloseCspDto>> {
    let enCurso = false;
    if (filtros.periodoId) {
      const periodo = await this.repository.obtenerPeriodoPorId(filtros.periodoId);
      enCurso = periodo?.estado === "en_curso";
    }

    const conteo = await this.repository.contarSesiones(filtros);
    return estructurarCsp(conteo, enCurso);
  }

  /**
   * HU1: Calcula el ISA del período o rango especificado.
   * Traza: CP-RF020-02, CP-RF020-05.
   */
  async calcularIsa(
    filtros: FiltrosConsultaCalculo,
  ): Promise<IndicadorCalculadoDto<DesgloseIsaDto>> {
    let enCurso = false;
    if (filtros.periodoId) {
      const periodo = await this.repository.obtenerPeriodoPorId(filtros.periodoId);
      enCurso = periodo?.estado === "en_curso";
    }

    const conteo = await this.repository.contarLibretas(filtros);
    return estructurarIsa(conteo, enCurso);
  }

  /**
   * HU1: Calcula el IGM del período o rango especificado.
   * Traza: CP-RF020-03, CP-RF020-04, CP-RF020-05.
   */
  async calcularIgm(
    filtros: FiltrosConsultaCalculo,
  ): Promise<IndicadorCalculadoDto<DesgloseIgmDto>> {
    let enCurso = false;
    if (filtros.periodoId) {
      const periodo = await this.repository.obtenerPeriodoPorId(filtros.periodoId);
      enCurso = periodo?.estado === "en_curso";
    }

    const conteo = await this.repository.contarMateriales(filtros);
    return estructurarIgm(conteo, enCurso);
  }

  /**
   * HU1: Consulta de indicadores para el docente autenticado (alcance propio).
   * Traza: CP-RF020-07.
   */
  async obtenerMisIndicadores(
    personaId: string,
    periodoId?: string,
  ): Promise<MisIndicadoresDocenteResponseDto> {
    const docente = await this.repository.obtenerDocentePorPersonaId(personaId);
    if (!docente) {
      throw new NotFoundException(
        "No se encontró el registro de docente correspondiente al usuario autenticado.",
      );
    }

    const anioAcademicoId = this.anioLectivoCls.id() ?? "";
    let periodo: PeriodoResumen | null = null;

    if (periodoId) {
      periodo = await this.repository.obtenerPeriodoPorId(periodoId);
      if (!periodo) {
        throw new NotFoundException(MENSAJES_INDICADORES.PERIODO_NO_ENCONTRADO);
      }
    } else {
      periodo = await this.repository.obtenerPeriodoEnCurso(anioAcademicoId);
    }

    const enCurso = periodo?.estado === "en_curso";

    const filtrosGlobales: FiltrosConsultaCalculo = {
      anioAcademicoId,
      periodoId: periodo?.id,
      docenteId: docente.id,
    };

    const sesionesGlobal = await this.repository.contarSesiones(filtrosGlobales);
    const materialesGlobal = await this.repository.contarMateriales(filtrosGlobales);

    const csp = estructurarCsp(sesionesGlobal, enCurso);
    const igm = estructurarIgm(materialesGlobal, enCurso);

    const cursosDocente = await this.repository.listarCursosDeDocente(
      docente.id,
      anioAcademicoId,
      periodo?.id,
    );

    const cursos: DetalleCursoDocenteIndicadorDto[] = [];

    for (const curso of cursosDocente) {
      const filtrosCurso: FiltrosConsultaCalculo = {
        ...filtrosGlobales,
        cursoId: curso.cursoId,
        seccionId: curso.seccionId,
      };

      const sesionesCurso = await this.repository.contarSesiones(filtrosCurso);
      const materialesCurso = await this.repository.contarMateriales(filtrosCurso);

      cursos.push({
        cursoId: curso.cursoId,
        cursoNombre: curso.cursoNombre,
        seccionId: curso.seccionId,
        seccionNombre: curso.seccionNombre,
        gradoNombre: curso.gradoNombre,
        csp: estructurarCsp(sesionesCurso, enCurso),
        igm: estructurarIgm(materialesCurso, enCurso),
      });
    }

    const docenteNombre = [docente.nombres, docente.apellidoPaterno, docente.apellidoMaterno]
      .filter(Boolean)
      .join(" ");

    return {
      docenteId: docente.id,
      docenteNombre,
      periodoId: periodo?.id ?? null,
      periodoNombre: periodo?.nombre ?? null,
      enCurso,
      csp,
      igm,
      cursos,
    };
  }
}
