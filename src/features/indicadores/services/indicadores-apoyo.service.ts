import { sinFichaDocente } from "../../../common/utils/ficha-docente.util";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import { DRIZZLE, type Database } from "@/core/database";
import { ahoraEnColegio } from "../../marcaciones/utils";
import { AVISO_DIAS_POR_DEFECTO, MENSAJES_APOYO, MENSAJES_INDICADORES } from "../constants";
import type { EvolucionApoyoDto, FiltroApoyoQueryDto, IndicadoresApoyoResponseDto } from "../dto";
import type { FiltrosApoyo, PeriodoResumen } from "../interfaces";
import { IndicadoresApoyoRepository } from "../repositories/indicadores-apoyo.repository";
import { IndicadoresCalculoRepository } from "../repositories/indicadores-calculo.repository";
import {
  type ContextoApoyo,
  calcularApoyo,
  generarExcelApoyo,
  ordenarRanking,
  rankingDeDocentes,
  type DatosInstitucionReporte,
} from "../utils";

interface DatosApoyo {
  response: IndicadoresApoyoResponseDto;
  ctx: ContextoApoyo;
  periodo: PeriodoResumen | null;
  filas: Awaited<ReturnType<IndicadoresApoyoService["cargarFilas"]>>;
  filtros: FiltrosApoyo;
}

/**
 * Indicadores de apoyo del seguimiento docente (RF-020 V2). Solo lectura y en vivo: no se
 * congelan al cerrar la medición ni entran al pretest, postest o comparación.
 */
@Injectable()
export class IndicadoresApoyoService {
  constructor(
    private readonly repository: IndicadoresApoyoRepository,
    private readonly calculoRepository: IndicadoresCalculoRepository,
    private readonly anioLectivoCls: AnioLectivoCls,
    private readonly auditService: AuditService,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  /** Director y Subdirector: indicadores del colegio (o de un docente) con ranking. */
  async consultar(query: FiltroApoyoQueryDto): Promise<IndicadoresApoyoResponseDto> {
    return (await this.armar(query, { conRanking: true })).response;
  }

  /** Docente con alcance propio: solo sus indicadores, sin ranking ni datos de otros. */
  async consultarMios(
    personaId: string,
    query: FiltroApoyoQueryDto,
  ): Promise<IndicadoresApoyoResponseDto> {
    const docente = await this.calculoRepository.obtenerDocentePorPersonaId(personaId);
    if (!docente) throw sinFichaDocente();
    return (await this.armar({ ...query, docenteId: docente.id }, { conRanking: false })).response;
  }

  async exportarExcel(
    query: FiltroApoyoQueryDto,
    actorId: string,
    actorNombre: string,
    ip?: string,
  ): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    const datos = await this.armar(query, { conRanking: true });
    const buffer = await generarExcelApoyo({
      generadoPor: actorNombre,
      institucion: await this.datosInstitucion(),
      periodoNombre: datos.response.periodoNombre,
      ctx: datos.ctx,
      resumenPorDocente: ordenarRanking(
        rankingDeDocentes(
          datos.filas.sesiones,
          datos.filas.ausencias,
          datos.filas.justificaciones,
          datos.ctx,
        ),
        query.ordenarPor ?? "jornadasEfectivas",
        query.orden ?? "desc",
      ),
      sesiones: datos.filas.sesiones,
      ausencias: datos.filas.ausencias,
      justificaciones: datos.filas.justificaciones,
    });
    const slug = (datos.response.periodoNombre ?? "general")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "exportaciones_indicadores_apoyo_excel",
      direccionIp: ip,
    });
    return { buffer, nombreArchivo: `indicadores-apoyo-${slug}.xlsx` };
  }

  private async armar(
    query: FiltroApoyoQueryDto,
    opciones: { conRanking: boolean },
  ): Promise<DatosApoyo> {
    if (query.fechaInicio && query.fechaFin && query.fechaFin < query.fechaInicio) {
      throw new BadRequestException(MENSAJES_INDICADORES.FECHAS_INCOHERENTES);
    }
    const anioAcademicoId = this.anioLectivoCls.id() ?? "";
    const periodos = await this.repository.listarPeriodos(anioAcademicoId);
    const hoy = ahoraEnColegio().fecha;

    // Rango consultado: bimestre elegido, fechas, o el bimestre en curso; si no hay, todo el año.
    let periodo: PeriodoResumen | null = null;
    if (query.periodoId) {
      periodo = periodos.find((p) => p.id === query.periodoId) ?? null;
      if (!periodo) throw new NotFoundException(MENSAJES_INDICADORES.PERIODO_NO_ENCONTRADO);
    } else if (!query.fechaInicio && !query.fechaFin) {
      periodo = periodos.find((p) => p.estado === "en_curso") ?? null;
    }
    const inicioAnio = periodos[0]?.fechaInicio ?? hoy;
    const finAnio = periodos[periodos.length - 1]?.fechaFin ?? hoy;
    const desde = periodo?.fechaInicio ?? query.fechaInicio ?? inicioAnio;
    const hasta = periodo?.fechaFin ?? query.fechaFin ?? finAnio;

    // Se cargan las filas de todo el año una sola vez: sirven al resumen, al ranking y a la evolución.
    const filtros: FiltrosApoyo = {
      anioAcademicoId,
      desde: inicioAnio < desde ? inicioAnio : desde,
      hasta: finAnio > hasta ? finAnio : hasta,
      docenteId: query.docenteId,
      cursoId: query.cursoId,
      seccionId: query.seccionId,
    };
    const filas = await this.cargarFilas(filtros);
    const avisoDias = (await this.repository.avisoDiasJustificacion()) ?? AVISO_DIAS_POR_DEFECTO;
    const diasSinClases = new Set(
      await this.repository.diasSinClases(filtros.desde, filtros.hasta > hoy ? filtros.hasta : hoy),
    );
    const ctx: ContextoApoyo = { desde, hasta, hoy, diasSinClases, avisoDias };

    const enCurso = desde <= hoy && hoy <= hasta;
    const ranking = opciones.conRanking
      ? ordenarRanking(
          rankingDeDocentes(filas.sesiones, filas.ausencias, filas.justificaciones, ctx),
          query.ordenarPor ?? "jornadasEfectivas",
          query.orden ?? "desc",
        )
      : null;

    const evolucion: EvolucionApoyoDto[] = periodos.map((p) => {
      const enCursoP = p.fechaInicio <= hoy && hoy <= p.fechaFin;
      return {
        periodoId: p.id,
        periodoNombre: p.nombre,
        enCurso: enCursoP,
        mensajeEnCurso: enCursoP ? MENSAJES_APOYO.EN_CURSO : null,
        resumen: calcularApoyo(filas.sesiones, filas.ausencias, filas.justificaciones, {
          ...ctx,
          desde: p.fechaInicio,
          hasta: p.fechaFin,
        }),
      };
    });

    const response: IndicadoresApoyoResponseDto = {
      titulo: "Indicadores de apoyo",
      mensaje: MENSAJES_APOYO.SECCION,
      etiquetaSinDatos: MENSAJES_APOYO.SIN_DATOS,
      periodoId: periodo?.id ?? null,
      periodoNombre: periodo?.nombre ?? null,
      desde,
      hasta,
      enCurso,
      mensajeEnCurso: enCurso ? MENSAJES_APOYO.EN_CURSO : null,
      resumen: calcularApoyo(filas.sesiones, filas.ausencias, filas.justificaciones, ctx),
      ranking,
      evolucion,
    };
    return { response, ctx, periodo, filas, filtros };
  }

  private async cargarFilas(filtros: FiltrosApoyo) {
    const [sesiones, ausencias, justificaciones] = await Promise.all([
      this.repository.sesiones(filtros),
      this.repository.ausencias(filtros),
      this.repository.justificaciones(filtros),
    ]);
    return { sesiones, ausencias, justificaciones };
  }

  private async datosInstitucion(): Promise<DatosInstitucionReporte> {
    const porDefecto: DatosInstitucionReporte = { nombre: "I.E." };
    try {
      const registro = await this.db.query?.institucion?.findFirst?.();
      if (registro) {
        return {
          nombre: registro.nombre || porDefecto.nombre,
          codigoModular: registro.codigoModular,
          ugel: registro.ugel,
          dre: registro.dre,
          direccion: registro.direccion,
        };
      }
    } catch {
      // Se usan los datos por defecto.
    }
    return porDefecto;
  }
}
