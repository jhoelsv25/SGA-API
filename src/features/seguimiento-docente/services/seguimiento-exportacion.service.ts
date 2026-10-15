import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { MENSAJES_CONSOLIDADO } from "../constants";
import { SeguimientoDocenteRepository } from "../repositories";
import { formatearTiempoMinutos } from "../utils/tiempo.util";
import { generarFichaSeguimientoPdf } from "../utils/ficha-pdf.util";
import { generarReporteExcel, type FilaReporteDocenteExcel } from "../utils/reporte-excel.util";

/**
 * Servicio de exportación de reporte Excel y ficha de seguimiento docente oficial en PDF (HU4).
 * Cumple con los requerimientos de seguridad y centralización en backend.
 */
@Injectable()
export class SeguimientoExportacionService {
  constructor(private readonly repository: SeguimientoDocenteRepository) {}

  /**
   * Genera la ficha oficial de seguimiento docente en formato PDF (RF-013 HU4, CP-RF013-18).
   * Restricciones de acceso:
   * - Director y Subdirector pueden consultar y descargar la ficha de cualquier docente.
   * - Un Docente solo puede descargar su propia ficha (CP-RF013-20).
   */
  async generarFichaPdf(
    consolidadoId: string,
    usuario: AuthenticatedUser,
  ): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    const detalle = await this.repository.buscarConsolidadoConDetalle(consolidadoId);
    if (!detalle) {
      throw new NotFoundException(MENSAJES_CONSOLIDADO.CONSOLIDADO_NO_ENCONTRADO);
    }

    const rolNormalizado = (usuario.role || "").toLowerCase();
    if (rolNormalizado === "docente") {
      const docenteActual = await this.repository.docentePorPersonaId(usuario.personaId);
      if (!docenteActual) {
        throw new ForbiddenException("El usuario no tiene un registro de docente asociado.");
      }
      if (docenteActual.id !== detalle.docente.id) {
        throw new ForbiddenException("No tiene acceso al consolidado de otro docente.");
      }
    }

    const buffer = await generarFichaSeguimientoPdf(detalle);

    const slugDocente = this.limpiarSlug(
      detalle.docente.nombreCompleto ||
        `${detalle.docente.apellidoPaterno} ${detalle.docente.apellidoMaterno} ${detalle.docente.nombres}`,
    );
    const slugPeriodo = this.limpiarSlug(detalle.periodo.nombre);

    return {
      buffer,
      nombreArchivo: `ficha-seguimiento-${slugDocente}-${slugPeriodo}.pdf`,
    };
  }

  /**
   * Exporta el reporte consolidado de todos los docentes del bimestre a una hoja de cálculo Excel (RF-013 HU4, CP-RF013-19).
   * Obtiene la totalidad de los datos en una única consulta optimizada mediante listarConsolidadosVigentesPorPeriodo.
   */
  async exportarReporteExcel(
    periodoId: string,
    _actorId?: string,
    _ip?: string,
  ): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    const periodo = await this.repository.buscarPeriodoPorId(periodoId);
    if (!periodo) {
      throw new NotFoundException("Período académico no encontrado.");
    }

    const consolidados = await this.repository.listarConsolidadosVigentesPorPeriodo(periodoId);

    const filasDocentes: FilaReporteDocenteExcel[] = consolidados.map((c) => {
      const totalMinutos = (c.minutosPerdidosFirma || 0) + (c.minutosFueraAula || 0);
      return {
        docenteId: c.docente.id,
        nombreCompleto:
          c.docente.nombreCompleto ||
          `${c.docente.apellidoPaterno} ${c.docente.apellidoMaterno}, ${c.docente.nombres}`,
        numeroDocumento: c.docente.numeroDocumento,
        sesionesProgramadas: c.sesionesProgramadas,
        sesionesCumplidas: c.sesionesCumplidas,
        sesionesParciales: c.sesionesParciales,
        sesionesNoCumplidas: c.sesionesNoCumplidas,
        sesionesJustificadas: c.sesionesJustificadas,
        minutosPerdidosFirma: c.minutosPerdidosFirma,
        totalAusencias: c.totalAusencias,
        minutosFueraAula: c.minutosFueraAula,
        totalMinutosFueraClase: totalMinutos,
        tiempoFueraClaseTexto: formatearTiempoMinutos(totalMinutos),
        decision: c.decision,
        observacion: c.observacion,
        version: c.version,
        estado: c.estado,
      };
    });

    const buffer = await generarReporteExcel({
      periodoNombre: periodo.nombre,
      docentes: filasDocentes,
    });

    const slugPeriodo = this.limpiarSlug(periodo.nombre);

    return {
      buffer,
      nombreArchivo: `reporte-seguimiento-${slugPeriodo}.xlsx`,
    };
  }

  /**
   * Genera un identificador normalizado seguro para nombres de archivo descargables.
   */
  private limpiarSlug(texto: string): string {
    const slug = (texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || "documento";
  }
}
