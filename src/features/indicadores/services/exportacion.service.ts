import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE, type Database } from "@/core/database";
import { AuditService } from "@/common/services/audit.service";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import type { ExportarIndicadoresQueryDto, FiltroIndicadoresQueryDto } from "../dto";
import { IndicadoresCalculoService } from "./indicadores-calculo.service";
import { ComparacionService } from "./comparacion.service";
import { MedicionService } from "./medicion.service";
import {
  type DatosInstitucionReporte,
  generarExcelIndicadores,
  generarPdfIndicadores,
} from "../utils";

@Injectable()
export class ExportacionService {
  constructor(
    private readonly calculoService: IndicadoresCalculoService,
    private readonly comparacionService: ComparacionService,
    private readonly medicionService: MedicionService,
    private readonly auditService: AuditService,
    private readonly anioLectivoCls: AnioLectivoCls,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  /**
   * HU3: Exportar datos crudos a Excel (hojas de detalle por sesión, libreta o material).
   * Traza: CP-RF020-18.
   */
  async exportarExcel(
    query: ExportarIndicadoresQueryDto,
    actorId: string,
    actorNombre: string,
    ip?: string,
  ): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    if (!query.periodoId) {
      this.anioLectivoCls.id();
    }

    const filtrosTablero: FiltroIndicadoresQueryDto = {};
    if (query.periodoId) {
      filtrosTablero.periodoId = query.periodoId;
    }
    if (query.fechaInicio) {
      filtrosTablero.fechaInicio = query.fechaInicio;
    }
    if (query.fechaFin) {
      filtrosTablero.fechaFin = query.fechaFin;
    }
    if (query.docenteId) {
      filtrosTablero.docenteId = query.docenteId;
    }

    const tablero = await this.calculoService.obtenerTablero(filtrosTablero);
    const institucionDatos = await this.obtenerDatosInstitucion();

    const buffer = await generarExcelIndicadores({
      institucion: institucionDatos,
      tablero,
      filtroIndicador: query.indicador,
      filtroDocenteId: query.docenteId,
      generadoPor: actorNombre,
    });

    const slugPeriodo = (tablero.periodoNombre || query.periodoId || "general")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    const nombreArchivo = `reporte-indicadores-${slugPeriodo}.xlsx`;

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "exportaciones_indicadores_excel",
      direccionIp: ip,
    });

    return { buffer, nombreArchivo };
  }

  /**
   * HU3: Exportar informe formal en PDF con gráfico de barras dibujado con pdfkit.
   * Traza: CP-RF020-19.
   */
  async exportarPdf(
    query: ExportarIndicadoresQueryDto,
    actorId: string,
    actorNombre: string,
    ip?: string,
  ): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    if (!query.periodoId) {
      this.anioLectivoCls.id();
    }

    const periodoIdConsulta = query.periodoId || "";
    const comparacion = await this.comparacionService.obtenerComparacion(periodoIdConsulta);

    const medicion = query.periodoId
      ? await this.medicionService.obtenerPorPeriodo(query.periodoId).catch(() => null)
      : null;

    const institucionDatos = await this.obtenerDatosInstitucion();

    const buffer = await generarPdfIndicadores({
      institucion: institucionDatos,
      comparacion,
      medicion,
      actorNombre,
    });

    const slugPeriodo = (comparacion?.periodoNombre || query.periodoId || "general")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    const nombreArchivo = `informe-indicadores-tesis-${slugPeriodo}.pdf`;

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "exportaciones_indicadores_pdf",
      direccionIp: ip,
    });

    return { buffer, nombreArchivo };
  }

  private async obtenerDatosInstitucion(): Promise<DatosInstitucionReporte> {
    const defaultInstitucion: DatosInstitucionReporte = {
      nombre: "I.E. Simón Bolívar",
      codigoModular: "0345678",
      ugel: "UGEL 03",
      dre: "DRE Lima Metropolitana",
      direccion: "Av. La Marina 123",
    };

    try {
      const registro = await this.db.query?.institucion?.findFirst?.();
      if (registro) {
        return {
          nombre: registro.nombre || defaultInstitucion.nombre,
          codigoModular: registro.codigoModular || defaultInstitucion.codigoModular,
          ugel: registro.ugel || defaultInstitucion.ugel,
          dre: registro.dre || defaultInstitucion.dre,
          direccion: registro.direccion || defaultInstitucion.direccion,
        };
      }
    } catch {
      // Usar metadatos por defecto
    }

    return defaultInstitucion;
  }
}
