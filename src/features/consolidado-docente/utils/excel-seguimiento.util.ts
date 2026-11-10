import {
  generarReporteExcel,
  type ColumnaReporte,
  type ValorCelda,
} from "../../../common/excel/reporte-excel.builder";
import type { PendienteItem } from "../interfaces";

export interface FilaInformeHoras {
  docenteNombre: string;
  docenteDni: string;
  nivel: string;
  jornadaHoras: number;
  horasProgramadas: number | null;
  horasDictadas: number | null;
  justificadas: number;
  injustificadas: number;
  tardanzas: number;
  minutosPerdidosFirma: number;
  minutosFueraAula: number;
}

const COLUMNAS_INFORME: ColumnaReporte[] = [
  { header: "Docente", key: "docenteNombre", ancho: 34, requerido: true },
  { header: "DNI", key: "docenteDni", ancho: 14 },
  { header: "Nivel", key: "nivel", ancho: 14 },
  { header: "Jornada (horas)", key: "jornadaHoras", ancho: 14, tipo: "numero" },
  { header: "Horas programadas", key: "horasProgramadas", ancho: 16, tipo: "numero" },
  { header: "Horas efectivas dictadas", key: "horasDictadas", ancho: 18, tipo: "numero" },
  { header: "Inasistencias justificadas (J)", key: "justificadas", ancho: 18, tipo: "numero" },
  { header: "Inasistencias injustificadas (I)", key: "injustificadas", ancho: 18, tipo: "numero" },
  { header: "Tardanzas", key: "tardanzas", ancho: 12, tipo: "numero" },
  { header: "Minutos perdidos por firma", key: "minutosPerdidosFirma", ancho: 16, tipo: "numero" },
  { header: "Minutos fuera del aula", key: "minutosFueraAula", ancho: 16, tipo: "numero" },
];

const COLUMNAS_PENDIENTES: ColumnaReporte[] = [
  { header: "Tipo", key: "tipoEtiqueta", ancho: 32, requerido: true },
  { header: "Docente", key: "docenteNombre", ancho: 34 },
  { header: "Bimestre", key: "periodoNombre", ancho: 18 },
  { header: "Fecha de origen", key: "fechaOrigen", ancho: 16 },
  { header: "Días de atraso", key: "diasAtraso", ancho: 14, tipo: "numero" },
];

/** Informe mensual de horas efectivas, parecido al Formato 02 de los Lineamientos del MINEDU. */
export async function generarExcelInformeMensual(
  filas: FilaInformeHoras[],
  contexto: { mes: string; institucion: string; generadoPor: string },
): Promise<Buffer> {
  return await generarReporteExcel({
    titulo: `Informe mensual de horas efectivas ${contexto.mes}`,
    modulo: "informe-horas-efectivas",
    columnas: COLUMNAS_INFORME,
    filas: filas as unknown as Record<string, ValorCelda>[],
    filtros: { Mes: contexto.mes, Nivel: "Sin definir" },
    institucion: contexto.institucion,
    generadoPor: contexto.generadoPor,
  });
}

export async function generarExcelPendientes(
  items: PendienteItem[],
  contexto: {
    institucion: string;
    generadoPor: string;
    filtros: Record<string, string | undefined>;
  },
): Promise<Buffer> {
  return await generarReporteExcel({
    titulo: "Pendientes de seguimiento docente",
    modulo: "pendientes-seguimiento",
    columnas: COLUMNAS_PENDIENTES,
    filas: items as unknown as Record<string, ValorCelda>[],
    filtros: contexto.filtros,
    institucion: contexto.institucion,
    generadoPor: contexto.generadoPor,
  });
}
