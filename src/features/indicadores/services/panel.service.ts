import { Injectable } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { fechaHoyLima } from "@/common/utils/fecha-lima.util";
import type { PanelGeneralResponseDto } from "../dto/panel-general-response.dto";
import { PanelRepository } from "../repositories/panel.repository";
import { IndicadoresCalculoService } from "./indicadores-calculo.service";

@Injectable()
export class PanelService {
  constructor(
    private readonly repository: PanelRepository,
    private readonly calculoService: IndicadoresCalculoService,
    private readonly anioLectivoCls: AnioLectivoCls,
  ) {}

  /**
   * HU4: Obtener el resumen del panel general con métricas del día y los 3 indicadores.
   * Traza: CP-RF020-20.
   */
  async obtenerPanel(): Promise<PanelGeneralResponseDto> {
    const fecha = fechaHoyLima();
    const anioAcademicoId = this.anioLectivoCls.id() ?? "";

    const [
      totalEstudiantesMatriculados,
      estudiantesConIngreso,
      totalTardanzas,
      sesionesPorEstado,
      libretasPendientesConteo,
      tablero,
    ] = await Promise.all([
      this.repository.contarEstudiantesMatriculadosActivos(anioAcademicoId),
      this.repository.contarEstudiantesConMarcacionIngresoHoy(fecha),
      this.repository.contarTardanzasHoy(fecha),
      this.repository.contarSesionesHoyPorEstado(fecha),
      this.repository.contarLibretasPendientes(anioAcademicoId, fecha),
      this.calculoService.obtenerTablero({}),
    ]);

    const porcentajeAsistencia =
      totalEstudiantesMatriculados > 0
        ? Math.round((estudiantesConIngreso / totalEstudiantesMatriculados) * 100 * 100) / 100
        : 0;

    const totalSesiones =
      sesionesPorEstado.cumplidas +
      sesionesPorEstado.enCurso +
      sesionesPorEstado.pendientes +
      sesionesPorEstado.noCumplidas +
      sesionesPorEstado.justificadas;

    const totalPendientes = libretasPendientesConteo.vencidas + libretasPendientesConteo.porVencer;

    return {
      fecha,
      asistenciaHoy: {
        totalEstudiantesMatriculados,
        estudiantesConIngreso,
        porcentajeAsistencia,
        porcentajeAsistenciaTexto: `${porcentajeAsistencia.toFixed(2)} %`,
      },
      tardanzasHoy: {
        totalTardanzas,
      },
      sesionesHoy: {
        totalSesiones,
        cumplidas: sesionesPorEstado.cumplidas,
        enCurso: sesionesPorEstado.enCurso,
        pendientes: sesionesPorEstado.pendientes,
        noCumplidas: sesionesPorEstado.noCumplidas,
        justificadas: sesionesPorEstado.justificadas,
      },
      libretasPendientes: {
        totalPendientes,
        vencidas: libretasPendientesConteo.vencidas,
        porVencer: libretasPendientesConteo.porVencer,
      },
      indicadoresBimestreActual: {
        periodoId: tablero.periodoId ?? null,
        periodoNombre: tablero.periodoNombre ?? null,
        enCurso: tablero.enCurso,
        cspPorcentaje: tablero.csp?.porcentaje ?? null,
        isaPorcentaje: tablero.isa?.porcentaje ?? null,
        igmPorcentaje: tablero.igm?.porcentaje ?? null,
      },
    };
  }
}
