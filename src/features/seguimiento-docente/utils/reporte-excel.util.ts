import { Workbook } from "exceljs";
import { NOMBRE_INSTITUCION_DEFECTO } from "../constants";
import { formatearTiempoMinutos } from "./tiempo.util";

export interface FilaReporteDocenteExcel {
  docenteId: string;
  nombreCompleto: string;
  numeroDocumento: string;
  sesionesProgramadas: number;
  sesionesCumplidas: number;
  sesionesParciales: number;
  sesionesNoCumplidas: number;
  sesionesJustificadas: number;
  minutosPerdidosFirma: number;
  totalAusencias: number;
  minutosFueraAula: number;
  totalMinutosFueraClase: number;
  tiempoFueraClaseTexto: string;
  decision: string;
  observacion: string | null;
  version: number;
  estado: string;
}

export interface DatosReporteExcel {
  periodoNombre: string;
  docentes: FilaReporteDocenteExcel[];
  nombreInstitucion?: string;
}

function formatearDecisionTexto(decision: string): string {
  switch (decision) {
    case "llamada_atencion":
      return "Llamada de atención";
    case "compromiso_mejora":
      return "Compromiso de mejora";
    case "derivado":
      return "Derivado";
    case "ninguna":
    default:
      return "Ninguna";
  }
}

/**
 * Genera la hoja de cálculo oficial en Excel (.xlsx) con el reporte consolidado
 * de todos los docentes del bimestre (RF-013 HU4, CP-RF013-19).
 */
export async function generarReporteExcel(datos: DatosReporteExcel): Promise<Buffer> {
  const workbook = new Workbook();
  workbook.creator = "SGA Colegio";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Consolidado Docente", {
    views: [{ showGridLines: true }],
  });

  // Título e información institucional (Fila 1 y 2)
  worksheet.mergeCells("A1:Q1");
  const cellTitulo = worksheet.getCell("A1");
  cellTitulo.value = `REPORTE CONSOLIDADO DE SEGUIMIENTO DOCENTE - ${datos.periodoNombre.toUpperCase()}`;
  cellTitulo.font = { bold: true, size: 13, color: { argb: "FF1E293B" } };
  cellTitulo.alignment = { vertical: "middle", horizontal: "left" };

  worksheet.mergeCells("A2:Q2");
  const cellSubtitulo = worksheet.getCell("A2");
  cellSubtitulo.value = `${datos.nombreInstitucion || NOMBRE_INSTITUCION_DEFECTO} · Fecha de reporte: ${new Date().toLocaleDateString("es-PE")}`;
  cellSubtitulo.font = { italic: true, size: 9.5, color: { argb: "FF64748B" } };
  cellSubtitulo.alignment = { vertical: "middle", horizontal: "left" };

  worksheet.addRow([]); // Fila 3 en blanco

  // Cabeceras de columnas (Fila 4)
  const cabeceras = [
    "N.°",
    "Docente",
    "Documento",
    "Ses. Prog.",
    "Cumplidas",
    "Parciales",
    "No Cumpl.",
    "Justificadas",
    "Min. Firma",
    "Ausencias",
    "Min. Aula",
    "Total Minutos",
    "Tiempo Fuera Clase",
    "Decisión",
    "Observación",
    "Versión",
    "Estado",
  ];

  const headerRow = worksheet.addRow(cabeceras);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9.5 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" }, // Azul institucional oscuro
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  let sumProgramadas = 0;
  let sumCumplidas = 0;
  let sumParciales = 0;
  let sumNoCumplidas = 0;
  let sumJustificadas = 0;
  let sumMinutosFirma = 0;
  let sumAusencias = 0;
  let sumMinutosAula = 0;
  let sumTotalMinutos = 0;

  // Filas por cada docente
  datos.docentes.forEach((d, index) => {
    sumProgramadas += d.sesionesProgramadas;
    sumCumplidas += d.sesionesCumplidas;
    sumParciales += d.sesionesParciales;
    sumNoCumplidas += d.sesionesNoCumplidas;
    sumJustificadas += d.sesionesJustificadas;
    sumMinutosFirma += d.minutosPerdidosFirma;
    sumAusencias += d.totalAusencias;
    sumMinutosAula += d.minutosFueraAula;
    sumTotalMinutos += d.totalMinutosFueraClase;

    const filaValores: Array<string | number> = [
      index + 1,
      d.nombreCompleto,
      d.numeroDocumento,
      d.sesionesProgramadas,
      d.sesionesCumplidas,
      d.sesionesParciales,
      d.sesionesNoCumplidas,
      d.sesionesJustificadas,
      d.minutosPerdidosFirma,
      d.totalAusencias,
      d.minutosFueraAula,
      d.totalMinutosFueraClase,
      d.tiempoFueraClaseTexto,
      formatearDecisionTexto(d.decision),
      d.observacion || "—",
      `v${d.version}`,
      d.estado.toUpperCase(),
    ];

    const row = worksheet.addRow(filaValores);
    row.height = 20;
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      if (colNumber === 2 || colNumber === 15) {
        // Docente y Observación alineados a la izquierda
        cell.alignment = { vertical: "middle", horizontal: "left" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
      if (colNumber === 13) {
        // Columna de Tiempo Fuera de Clase resaltada
        cell.font = { bold: true };
      }
    });
  });

  // Fila de totales si hay al menos un docente
  if (datos.docentes.length > 0) {
    const filaTotales: Array<string | number> = [
      "—",
      "TOTAL GENERAL",
      "—",
      sumProgramadas,
      sumCumplidas,
      sumParciales,
      sumNoCumplidas,
      sumJustificadas,
      sumMinutosFirma,
      sumAusencias,
      sumMinutosAula,
      sumTotalMinutos,
      formatearTiempoMinutos(sumTotalMinutos),
      "—",
      "—",
      "—",
      "—",
    ];

    const totalRow = worksheet.addRow(filaTotales);
    totalRow.height = 22;
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, size: 9.5 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" }, // Fondo gris tenue para fila de totales
      };
      cell.border = {
        top: { style: "medium" },
        left: { style: "thin" },
        bottom: { style: "medium" },
        right: { style: "thin" },
      };
      if (colNumber === 2) {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
      if (colNumber === 13) {
        cell.font = { bold: true, color: { argb: "FFB91C1C" } };
      }
    });
  }

  // Ajuste automático de anchos de columna
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const val = cell.value;
      const columnLength =
        val === null || val === undefined ? 0 : typeof val === "object" ? 12 : String(val).length;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.max(maxLength + 3, 11);
  });

  // Anchos específicos para columnas de texto amplio
  if (worksheet.getColumn(2)) worksheet.getColumn(2).width = 30; // Docente
  if (worksheet.getColumn(13)) worksheet.getColumn(13).width = 18; // Tiempo Fuera Clase
  if (worksheet.getColumn(15)) worksheet.getColumn(15).width = 25; // Observación

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
