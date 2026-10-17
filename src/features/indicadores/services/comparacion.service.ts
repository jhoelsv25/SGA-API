import { Injectable } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import {
  DIMENSIONES_INDICADORES,
  INDICADORES_LISTA,
  MENSAJES_INDICADORES,
  NOMBRES_INDICADORES,
} from "../constants";
import type {
  ComparacionBimestreResponseDto,
  ComparacionIndicadorItemDto,
  ComparacionItemPostestDto,
  ComparacionItemPretestDto,
  EvolucionBimestreItemDto,
} from "../dto";
import { ComparacionRepository } from "../repositories/comparacion.repository";
import { MedicionService } from "./medicion.service";
import { PretestService } from "./pretest.service";

@Injectable()
export class ComparacionService {
  constructor(
    private readonly pretestService: PretestService,
    private readonly medicionService: MedicionService,
    private readonly comparacionRepo: ComparacionRepository,
    private readonly anioLectivoCls: AnioLectivoCls,
  ) {}

  /**
   * HU2: Obtener la comparación pretest vs postest vigente y la evolución por bimestre.
   * Traza: CP-RF020-16, CP-RF020-17.
   */
  async obtenerComparacion(periodoId: string): Promise<ComparacionBimestreResponseDto> {
    const anioAcademicoId = this.anioLectivoCls.id() ?? "";

    // 1. Obtener la medición postest congelada del período
    const medicionPostest = await this.medicionService.obtenerPorPeriodo(periodoId);

    // 2. Para cada indicador canónico (CSP, ISA, IGM), armar la comparación
    const comparaciones: ComparacionIndicadorItemDto[] = [];

    for (const indicador of INDICADORES_LISTA) {
      const pretestVigente = await this.pretestService.obtenerVigente(indicador);
      const postestItem = medicionPostest?.indicadores?.find((ind) => ind.indicador === indicador);

      // Pretest
      let pretestDto: ComparacionItemPretestDto;
      if (pretestVigente) {
        pretestDto = {
          registrado: true,
          porcentaje: pretestVigente.porcentaje,
          porcentajeTexto: `${pretestVigente.porcentaje.toFixed(2)} %`,
          fuente: pretestVigente.fuente,
          periodoDescrito: pretestVigente.periodoDescrito,
        };
      } else {
        pretestDto = {
          registrado: false,
          porcentaje: null,
          porcentajeTexto: "Sin pretest",
          mensaje: MENSAJES_INDICADORES.SIN_PRETEST,
        };
      }

      // Postest
      let postestDto: ComparacionItemPostestDto;
      if (medicionPostest && postestItem) {
        postestDto = {
          medido: true,
          porcentaje: postestItem.porcentaje,
          porcentajeTexto: `${postestItem.porcentaje.toFixed(2)} %`,
          version: medicionPostest.version,
          cerradaEn: medicionPostest.cerradaEn,
        };
      } else {
        postestDto = {
          medido: false,
          porcentaje: null,
          porcentajeTexto: "Sin medición",
        };
      }

      // Variación en puntos porcentuales
      let variacionPuntos: number | null = null;
      let variacionPuntosTexto: string;

      if (!postestDto.medido || postestDto.porcentaje === null) {
        variacionPuntos = null;
        variacionPuntosTexto = "Sin postest";
      } else if (!pretestDto.registrado || pretestDto.porcentaje === null) {
        variacionPuntos = null;
        variacionPuntosTexto = "Sin pretest";
      } else {
        const dif = Number((postestDto.porcentaje - pretestDto.porcentaje).toFixed(2));
        variacionPuntos = dif;
        const signo = dif >= 0 ? "+" : "";
        variacionPuntosTexto = `${signo}${dif.toFixed(2)} pp`;
      }

      comparaciones.push({
        indicador,
        nombre: NOMBRES_INDICADORES[indicador],
        dimension: DIMENSIONES_INDICADORES[indicador],
        pretest: pretestDto,
        postest: postestDto,
        variacionPuntos,
        variacionPuntosTexto,
      });
    }

    // 3. Obtener la serie de evolución por bimestres
    const filasEvolucion =
      await this.comparacionRepo.obtenerMedicionesVigentesPorAnio(anioAcademicoId);

    // Agrupar filas por período
    const mapaPeriodos = new Map<
      string,
      {
        periodoId: string;
        periodoNombre: string;
        numero: number;
        csp: number | null;
        isa: number | null;
        igm: number | null;
      }
    >();

    for (const fila of filasEvolucion) {
      if (!mapaPeriodos.has(fila.periodoId)) {
        mapaPeriodos.set(fila.periodoId, {
          periodoId: fila.periodoId,
          periodoNombre: fila.periodoNombre,
          numero: fila.numeroPeriodo,
          csp: null,
          isa: null,
          igm: null,
        });
      }
      const item = mapaPeriodos.get(fila.periodoId)!;
      if (fila.indicador === "CSP") item.csp = fila.porcentaje;
      if (fila.indicador === "ISA") item.isa = fila.porcentaje;
      if (fila.indicador === "IGM") item.igm = fila.porcentaje;
    }

    const evolucionBimestres: EvolucionBimestreItemDto[] = Array.from(mapaPeriodos.values()).sort(
      (a, b) => a.numero - b.numero,
    );

    return {
      periodoId,
      periodoNombre: medicionPostest?.periodoNombre ?? "",
      comparaciones,
      evolucionBimestres,
    };
  }
}
