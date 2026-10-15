import PDFDocument from "pdfkit";
import * as fs from "fs";

export interface DatosFichaDocentePdf {
  colegio: {
    nombre: string;
    ugel?: string | null;
    dre?: string | null;
  };
  docente: {
    nombreCompleto: string;
    numeroDocumento: string;
    firmaUrl?: string | null;
  };
  consolidado: {
    bimestre: string;
    version: number;
    estado: string;
    generadoEn: string;
    sesionesProgramadas: number;
    sesionesCumplidas: number;
    sesionesParciales: number;
    sesionesNoCumplidas: number;
    sesionesJustificadas: number;
    totalAusencias: number;
    minutosFueraAula: number;
    minutosPerdidosFirma: number;
    minutosTotalFuera: number;
    tiempoTotalFueraTexto: string;
    decision: string;
    observacion?: string | null;
  };
  sesiones: Array<{
    fecha: string;
    curso: string;
    seccion: string;
    grado: string;
    tema?: string | null;
    horaIngresoFirmada?: string | null;
    horaSalidaFirmada?: string | null;
    minutosPerdidos: number;
    estado: string;
    ausencias: Array<{
      tramoHorario: string;
      minutos: number;
      motivo: string;
      observacion?: string | null;
      descargo?: string | null;
      anulada: boolean;
    }>;
  }>;
}

const COLOR_PRIMARY = "#7A1228";
const COLOR_TEXT = "#0F172A";
const COLOR_MUTED = "#64748B";
const COLOR_BORDER = "#CBD5E1";

export async function generarFichaDocentePdf(datos: DatosFichaDocentePdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      bufferPages: true,
      autoFirstPage: true,
    });

    const buffers: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", (err: Error) => reject(err));

    // ── 1. Encabezado Institucional ──
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARY)
      .text(datos.colegio.nombre || "I.E. NUESTRA SEÑORA DEL CARMEN — SECUNDARIA", {
        align: "center",
      });

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor(COLOR_TEXT)
      .text("FICHA DE SEGUIMIENTO DOCENTE", { align: "center" });

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(COLOR_MUTED)
      .text(
        `${datos.consolidado.bimestre} · Versión ${datos.consolidado.version} (${datos.consolidado.estado.toUpperCase()})`,
        { align: "center" },
      );

    doc.moveDown(0.8);

    // Línea separadora
    doc.strokeColor(COLOR_BORDER).lineWidth(0.8).moveTo(40, doc.y).lineTo(555, doc.y).stroke();

    doc.moveDown(0.6);

    // ── 2. Datos del Docente ──
    const startY = doc.y;
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(COLOR_TEXT)
      .text("Docente: ", 40, startY, { continued: true })
      .font("Helvetica")
      .text(datos.docente.nombreCompleto)
      .font("Helvetica-Bold")
      .text("N.° Documento: ", 40, startY + 14, { continued: true })
      .font("Helvetica")
      .text(datos.docente.numeroDocumento);

    doc
      .font("Helvetica-Bold")
      .text("Fecha generación: ", 340, startY, { continued: true })
      .font("Helvetica")
      .text(
        new Date(datos.consolidado.generadoEn).toLocaleDateString("es-PE", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
      )
      .font("Helvetica-Bold")
      .text("Decisión director: ", 340, startY + 14, { continued: true })
      .font("Helvetica")
      .text(datos.consolidado.decision.replace(/_/g, " ").toUpperCase());

    doc.y = startY + 34;

    // ── 3. Resumen de Totales ──
    doc.rect(40, doc.y, 515, 45).fillAndStroke("#F8FAFC", COLOR_BORDER);

    const boxY = doc.y + 8;
    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor(COLOR_TEXT)
      .text(
        `Sesiones: ${datos.consolidado.sesionesProgramadas} Prog. | ${datos.consolidado.sesionesCumplidas} Cumpl. | ${datos.consolidado.sesionesParciales} Parc. | ${datos.consolidado.sesionesNoCumplidas} No cumpl. | ${datos.consolidado.sesionesJustificadas} Justif.`,
        48,
        boxY,
      );

    doc.text(
      `Ausencias: ${datos.consolidado.totalAusencias} vigentes (${datos.consolidado.minutosFueraAula} min fuera de aula)`,
      48,
      boxY + 13,
    );

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARY)
      .text(
        `TOTAL TIEMPO FUERA DE CLASE: ${datos.consolidado.tiempoTotalFueraTexto} (${datos.consolidado.minutosTotalFuera} min)`,
        48,
        boxY + 26,
      );

    doc.y = boxY + 45;
    doc.moveDown(0.5);

    // ── 4. Detalle de Sesiones de Clase ──
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARY)
      .text("Detalle de Sesiones y Ausencias", 40, doc.y);

    doc.moveDown(0.4);

    if (datos.sesiones.length === 0) {
      doc
        .fontSize(8.5)
        .font("Helvetica-Oblique")
        .fillColor(COLOR_MUTED)
        .text("No se registraron sesiones en este bimestre.", 40, doc.y);
    } else {
      for (const sesion of datos.sesiones) {
        if (doc.y > 700) {
          doc.addPage();
        }

        const sesionY = doc.y;
        doc.rect(40, sesionY, 515, 20).fillAndStroke("#F1F5F9", COLOR_BORDER);

        doc
          .fontSize(8)
          .font("Helvetica-Bold")
          .fillColor(COLOR_TEXT)
          .text(
            `${sesion.fecha} · ${sesion.grado} ${sesion.seccion} · ${sesion.curso}`,
            46,
            sesionY + 5,
          );

        const firmaTexto = `Ingreso: ${sesion.horaIngresoFirmada || "--:--"} | Salida: ${sesion.horaSalidaFirmada || "--:--"} | Estado: ${sesion.estado.toUpperCase()}`;
        doc
          .font("Helvetica")
          .fillColor(COLOR_MUTED)
          .text(firmaTexto, 300, sesionY + 5, { align: "right", width: 250 });

        doc.y = sesionY + 24;

        if (sesion.tema) {
          doc
            .fontSize(7.5)
            .font("Helvetica")
            .fillColor(COLOR_TEXT)
            .text(`Tema: ${sesion.tema}`, 52, doc.y);
          doc.moveDown(0.2);
        }

        // Ausencias vigentes de la sesión
        const ausenciasVigentes = sesion.ausencias.filter((a) => !a.anulada);
        if (ausenciasVigentes.length > 0) {
          for (const ausencia of ausenciasVigentes) {
            doc
              .fontSize(7.5)
              .font("Helvetica-Bold")
              .fillColor("#DC2626")
              .text(
                `  • Ausencia: ${ausencia.tramoHorario} (${ausencia.minutos} min) - Motivo: ${ausencia.motivo}`,
                56,
                doc.y,
              );
            if (ausencia.observacion) {
              doc
                .font("Helvetica")
                .fillColor(COLOR_MUTED)
                .text(`    Observación: ${ausencia.observacion}`, 60, doc.y);
            }
            if (ausencia.descargo) {
              doc
                .font("Helvetica")
                .fillColor(COLOR_MUTED)
                .text(`    Descargo: ${ausencia.descargo}`, 60, doc.y);
            }
            doc.moveDown(0.2);
          }
        }
        doc.moveDown(0.3);
      }
    }

    // ── 5. Observación del Director y Firmas ──
    if (doc.y > 660) {
      doc.addPage();
    }

    doc.moveDown(1);
    if (datos.consolidado.observacion) {
      doc
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .fillColor(COLOR_TEXT)
        .text("Observación del Director:", 40, doc.y)
        .font("Helvetica")
        .text(datos.consolidado.observacion);
      doc.moveDown(1);
    }

    const firmaY = doc.y + 40;
    // Firma Docente
    if (datos.docente.firmaUrl && fs.existsSync(datos.docente.firmaUrl)) {
      try {
        doc.image(datos.docente.firmaUrl, 90, firmaY - 35, {
          fit: [120, 35],
          align: "center",
        });
      } catch {
        // Fallback a línea
      }
    }
    doc.strokeColor(COLOR_TEXT).lineWidth(0.8).moveTo(70, firmaY).lineTo(230, firmaY).stroke();

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(COLOR_TEXT)
      .text("Firma del Docente", 70, firmaY + 5, { width: 160, align: "center" })
      .text(datos.docente.nombreCompleto, 70, firmaY + 16, {
        width: 160,
        align: "center",
      });

    // Firma Director
    doc.strokeColor(COLOR_TEXT).lineWidth(0.8).moveTo(360, firmaY).lineTo(520, firmaY).stroke();

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(COLOR_TEXT)
      .text("Firma del Director(a)", 360, firmaY + 5, {
        width: 160,
        align: "center",
      })
      .text("Dirección General", 360, firmaY + 16, {
        width: 160,
        align: "center",
      });

    doc.end();
  });
}
