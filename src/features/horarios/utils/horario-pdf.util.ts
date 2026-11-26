import PDFDocument from "pdfkit";

import {
  COLOR_MUTED,
  dibujarPaginaHorario,
  resolverLogoPath,
  type DatosHorarioPdf,
} from "./horario-pdf.draw";

export type { DatosHorarioPdf };

/** Genera un PDF apaisado (A4) multipágina con uno o varios horarios semanales. */
export async function generarHorariosPdfBuffer(listaDatos: DatosHorarioPdf[]): Promise<Buffer> {
  const logoPath = resolverLogoPath();

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 28 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    if (listaDatos.length === 0) {
      doc
        .fillColor(COLOR_MUTED)
        .font("Helvetica")
        .fontSize(12)
        .text("No hay horarios registrados para los filtros seleccionados.", 28, 120, {
          width: doc.page.width - 56,
          align: "center",
        });
      doc.end();
      return;
    }

    listaDatos.forEach((datos, idx) => {
      if (idx > 0) {
        doc.addPage({ size: "A4", layout: "landscape", margin: 28 });
      }
      dibujarPaginaHorario(doc, datos, logoPath);
    });

    doc.end();
  });
}

/** Genera el PDF apaisado (A4) del horario semanal de una sección. */
export async function generarHorarioPdfBuffer(datos: DatosHorarioPdf): Promise<Buffer> {
  return generarHorariosPdfBuffer([datos]);
}
