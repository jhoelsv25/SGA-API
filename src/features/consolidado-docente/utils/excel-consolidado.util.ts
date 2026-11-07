import {
  generarReporteExcel,
  type ColumnaReporte,
  type ValorCelda,
} from "../../../common/excel/reporte-excel.builder";
import type { ConsolidadoResumenItem } from "../interfaces";

const COLUMNAS: ColumnaReporte[] = [
  { header: "Docente", key: "docenteNombre", ancho: 32, requerido: true },
  { header: "DNI", key: "docenteDni", ancho: 14 },
  { header: "Sesiones programadas", key: "sesionesProgramadas", ancho: 16, tipo: "numero" },
  { header: "Sesiones cumplidas", key: "sesionesCumplidas", ancho: 16, tipo: "numero" },
  { header: "Sesiones parciales", key: "sesionesParciales", ancho: 14, tipo: "numero" },
  { header: "Sesiones no cumplidas", key: "sesionesNoCumplidas", ancho: 17, tipo: "numero" },
  { header: "Sesiones justificadas", key: "sesionesJustificadas", ancho: 16, tipo: "numero" },
  { header: "Ausencias", key: "totalAusencias", ancho: 12, tipo: "numero" },
  { header: "Minutos fuera del aula", key: "minutosFueraAula", ancho: 16, tipo: "numero" },
  { header: "Minutos perdidos por firma", key: "minutosPerdidosFirma", ancho: 16, tipo: "numero" },
  { header: "Total de minutos fuera", key: "minutosTotalFuera", ancho: 16, tipo: "numero" },
  { header: "Tiempo fuera de clase", key: "tiempoTotalFueraTexto", ancho: 18 },
  { header: "Decisión", key: "decision", ancho: 18 },
  { header: "Observación", key: "observacion", ancho: 30 },
  { header: "Versión", key: "version", ancho: 10 },
  { header: "Estado", key: "estado", ancho: 12 },
];

export interface ContextoReporte {
  institucion: string;
  generadoPor: string;
}

/** Reporte Excel estándar (skill `estandar-reportes-excel`) de los consolidados de un bimestre. */
export async function generarExcelConsolidados(
  bimestre: string,
  consolidados: ConsolidadoResumenItem[],
  contexto: ContextoReporte,
): Promise<Buffer> {
  return generarReporteExcel({
    titulo: `Consolidado de docentes — ${bimestre}`,
    modulo: "consolidado-docente",
    columnas: COLUMNAS,
    filas: consolidados.map((item) => ({
      ...Object.fromEntries(
        COLUMNAS.map((c) => [c.key, (item as unknown as Record<string, ValorCelda>)[c.key]]),
      ),
      decision: item.decision.replace(/_/g, " ").toUpperCase(),
      observacion: item.observacion || null,
      version: `v${item.version}`,
      estado: item.estado.toUpperCase(),
    })),
    filtros: { Bimestre: bimestre },
    ...contexto,
  });
}
