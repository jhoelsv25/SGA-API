import { Workbook } from "exceljs";
import type { ConsolidadoResumenItem } from "../interfaces";

export async function generarExcelConsolidados(
  bimestre: string,
  consolidados: ConsolidadoResumenItem[],
): Promise<Buffer> {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet(`Consolidado ${bimestre}`);

  // Encabezados
  worksheet.columns = [
    { header: "Docente", key: "docenteNombre", width: 32 },
    { header: "DNI", key: "docenteDni", width: 14 },
    { header: "Ses. Programadas", key: "sesionesProgramadas", width: 16 },
    { header: "Ses. Cumplidas", key: "sesionesCumplidas", width: 16 },
    { header: "Ses. Parciales", key: "sesionesParciales", width: 14 },
    { header: "Ses. No Cumplidas", key: "sesionesNoCumplidas", width: 17 },
    { header: "Ses. Justificadas", key: "sesionesJustificadas", width: 16 },
    { header: "Ausencias", key: "totalAusencias", width: 12 },
    { header: "Min. Fuera Aula", key: "minutosFueraAula", width: 16 },
    { header: "Min. Firma", key: "minutosPerdidosFirma", width: 14 },
    { header: "Total Min. Fuera", key: "minutosTotalFuera", width: 16 },
    { header: "Tiempo Fuera Clase", key: "tiempoTotalFueraTexto", width: 18 },
    { header: "Decisión", key: "decision", width: 18 },
    { header: "Observación", key: "observacion", width: 30 },
    { header: "Versión", key: "version", width: 10 },
    { header: "Estado", key: "estado", width: 12 },
  ];

  // Estilo de encabezados
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF7A1228" }, // Guindo institucional
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  for (const item of consolidados) {
    worksheet.addRow({
      docenteNombre: item.docenteNombre,
      docenteDni: item.docenteDni,
      sesionesProgramadas: item.sesionesProgramadas,
      sesionesCumplidas: item.sesionesCumplidas,
      sesionesParciales: item.sesionesParciales,
      sesionesNoCumplidas: item.sesionesNoCumplidas,
      sesionesJustificadas: item.sesionesJustificadas,
      totalAusencias: item.totalAusencias,
      minutosFueraAula: item.minutosFueraAula,
      minutosPerdidosFirma: item.minutosPerdidosFirma,
      minutosTotalFuera: item.minutosTotalFuera,
      tiempoTotalFueraTexto: item.tiempoTotalFueraTexto,
      decision: item.decision.replace(/_/g, " ").toUpperCase(),
      observacion: item.observacion || "",
      version: `v${item.version}`,
      estado: item.estado.toUpperCase(),
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
