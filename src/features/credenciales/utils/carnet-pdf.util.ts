import PDFDocument from "pdfkit";
import * as QRCode from "qrcode";
import * as fs from "fs";
import * as path from "path";

export interface DatosCarnePdf {
  nombreCompleto: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fotoUrl?: string | null;
  tipoRol: string;
  codigoCredencial: string;
  codigoInstitucional?: string | null;
  emitidaEn: string;
  institucion: {
    nombre: string;
    codigoModular?: string | null;
    distrito?: string | null;
    provincia?: string | null;
    departamento?: string | null;
    ugel?: string | null;
    dre?: string | null;
    logoUrl?: string | null;
  };
}

// ── Paleta de Colores Institucional (I.E. De Mujeres Nuestra Señora del Carmen) ──
const COLOR_PRIMARY = "#7A1228"; // Guindo institucional (color oficial del colegio)
const COLOR_ACCENT = "#D97706"; // Dorado / Ámbar
const COLOR_TEXT_MAIN = "#0F172A"; // Slate muy oscuro
const COLOR_TEXT_MUTED = "#64748B"; // Slate medio
const COLOR_BORDER = "#CBD5E1"; // Gris suave

/**
 * Genera el documento PDF del Carnet Oficial de Marcación (RF-007 HU5)
 * en formato PVC estándar CR80 (85.6 mm x 54 mm = 242.65 pt x 153.07 pt).
 */
export async function generarCarnetPdf(datos: DatosCarnePdf): Promise<Buffer> {
  const qrBuffer = await QRCode.toBuffer(datos.codigoCredencial, {
    errorCorrectionLevel: "M",
    margin: 0,
    width: 130,
    color: {
      dark: COLOR_PRIMARY,
      light: "#FFFFFF",
    },
  });

  // Localizar logo institucional
  const candidateLogos = [
    datos.institucion.logoUrl
      ? path.resolve(process.cwd(), datos.institucion.logoUrl.replace(/^\//, ""))
      : null,
    path.resolve(process.cwd(), "src/assets/logo.png"),
    path.resolve(process.cwd(), "public/logo.png"),
    path.resolve(process.cwd(), "../sga-web/public/logo.png"),
  ].filter(Boolean) as string[];

  let logoPath: string | null = null;
  for (const candidate of candidateLogos) {
    if (fs.existsSync(candidate)) {
      logoPath = candidate;
      break;
    }
  }

  // Localizar foto si existe en local
  let fotoPath: string | null = null;
  if (datos.fotoUrl) {
    const candidateFoto = path.resolve(process.cwd(), datos.fotoUrl.replace(/^\//, ""));
    if (fs.existsSync(candidateFoto)) {
      fotoPath = candidateFoto;
    }
  }

  // Medidas exactas PVC CR80 en puntos Tipográficos
  const cardWidth = 242.65;
  const cardHeight = 153.07;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [cardWidth, cardHeight],
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    // Fondo blanco limpio
    doc.rect(0, 0, cardWidth, cardHeight).fill("#FFFFFF");

    // ── 1. Franjas Institucionales Superiores ──
    doc.rect(0, 0, cardWidth, 4).fill(COLOR_PRIMARY);
    doc.rect(0, 4, cardWidth, 1.5).fill(COLOR_ACCENT);

    // ── 2. Cabecera Institucional ──
    const headerTop = 9;
    const headerLeft = 8;

    // Logo
    if (logoPath) {
      try {
        doc.image(logoPath, headerLeft, headerTop, {
          fit: [24, 24],
          align: "center",
          valign: "center",
        });
      } catch {
        // En caso de error omitir silenciosamente
      }
    }

    const titleLeft = logoPath ? headerLeft + 27 : headerLeft;
    const titleWidth = cardWidth - titleLeft - 48;

    doc
      .fontSize(6.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARY)
      .text(datos.institucion.nombre.toUpperCase(), titleLeft, headerTop + 1, {
        width: titleWidth,
        ellipsis: true,
      });

    const subtitulo = [
      datos.institucion.distrito || "Lircay",
      datos.institucion.ugel ? datos.institucion.ugel.split("/")[0].trim() : "UGEL Angaraes",
    ].join(" · ");

    doc
      .fontSize(5)
      .font("Helvetica")
      .fillColor(COLOR_TEXT_MUTED)
      .text(subtitulo, titleLeft, doc.y + 1, {
        width: titleWidth,
        ellipsis: true,
      });

    // Badge del Rol (Estudiante / Docente)
    const isEstudiante = datos.tipoRol.toLowerCase() === "estudiante";
    const badgeColor = isEstudiante ? COLOR_PRIMARY : "#059669";
    const badgeBg = isEstudiante ? "#FDF2F4" : "#ECFDF5";
    const badgeWidth = 42;
    const badgeHeight = 11;
    const badgeX = cardWidth - badgeWidth - 8;
    const badgeY = headerTop + 3;

    doc
      .roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 2.5)
      .fillAndStroke(badgeBg, badgeColor);

    doc
      .fontSize(5.5)
      .font("Helvetica-Bold")
      .fillColor(badgeColor)
      .text(datos.tipoRol.toUpperCase(), badgeX, badgeY + 2.5, {
        width: badgeWidth,
        align: "center",
      });

    // Línea divisoria bajo el header
    const sepY = 36;
    doc
      .strokeColor(COLOR_BORDER)
      .lineWidth(0.5)
      .moveTo(8, sepY)
      .lineTo(cardWidth - 8, sepY)
      .stroke();

    // ── 3. Cuerpo del Carné ──
    const bodyTop = sepY + 5;

    // Recuadro de Fotografía / Avatar
    const fotoSize = 46;
    const fotoX = 8;
    const fotoY = bodyTop;

    doc
      .roundedRect(fotoX, fotoY, fotoSize, fotoSize + 6, 3)
      .strokeColor(COLOR_BORDER)
      .lineWidth(0.5)
      .stroke();

    if (fotoPath) {
      try {
        doc.image(fotoPath, fotoX + 1, fotoY + 1, {
          fit: [fotoSize - 2, fotoSize + 4],
          align: "center",
          valign: "center",
        });
      } catch {
        // Fallback gráfico
      }
    } else {
      // Silueta o iniciales
      const iniciales = datos.nombreCompleto
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase();

      doc.rect(fotoX + 1, fotoY + 1, fotoSize - 2, fotoSize + 4).fill("#F1F5F9");
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor(COLOR_PRIMARY)
        .text(iniciales, fotoX + 1, fotoY + 18, {
          width: fotoSize - 2,
          align: "center",
        });
    }

    doc
      .fontSize(4)
      .font("Helvetica-Bold")
      .fillColor(COLOR_TEXT_MUTED)
      .text("OFICIAL", fotoX, fotoY + fotoSize + 7.5, {
        width: fotoSize,
        align: "center",
      });

    // Columna Central: Datos Personales
    const dataX = fotoX + fotoSize + 6;
    const dataWidth = 115;
    let curY = bodyTop + 1;

    doc
      .fontSize(7.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_TEXT_MAIN)
      .text(datos.nombreCompleto, dataX, curY, {
        width: dataWidth,
        lineGap: 1,
        ellipsis: true,
      });

    curY = doc.y + 3;

    doc
      .fontSize(5.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_TEXT_MUTED)
      .text(`${datos.tipoDocumento.toUpperCase()}: `, dataX, curY, { continued: true });
    doc.font("Helvetica-Bold").fillColor(COLOR_TEXT_MAIN).text(datos.numeroDocumento);

    curY += 8;

    if (datos.codigoInstitucional) {
      const labelId = isEstudiante ? "SIAGIE: " : "CÓDIGO: ";
      doc
        .fontSize(5.5)
        .font("Helvetica-Bold")
        .fillColor(COLOR_TEXT_MUTED)
        .text(labelId, dataX, curY, { continued: true });
      doc.font("Helvetica").fillColor(COLOR_TEXT_MAIN).text(datos.codigoInstitucional);
      curY += 8;
    }

    // Código de Marcación
    doc
      .fontSize(4.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_TEXT_MUTED)
      .text("CÓDIGO DE MARCACIÓN", dataX, curY);

    curY += 6;

    doc
      .fontSize(7.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARY)
      .text(datos.codigoCredencial, dataX, curY);

    // Columna Derecha: Código QR
    const qrSize = 52;
    const qrX = cardWidth - qrSize - 8;
    const qrY = bodyTop + 1;

    doc.image(qrBuffer, qrX, qrY, {
      fit: [qrSize, qrSize],
    });

    doc
      .fontSize(4.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_TEXT_MUTED)
      .text("ESCANEABLE", qrX, qrY + qrSize + 2, {
        width: qrSize,
        align: "center",
      });

    // ── 4. Pie Institucional ──
    const footerY = cardHeight - 12;
    doc
      .strokeColor(COLOR_BORDER)
      .lineWidth(0.5)
      .moveTo(8, footerY)
      .lineTo(cardWidth - 8, footerY)
      .stroke();

    const emisionFecha = new Date(datos.emitidaEn).toLocaleDateString("es-PE");
    doc
      .fontSize(4.5)
      .font("Helvetica")
      .fillColor(COLOR_TEXT_MUTED)
      .text("Válido para marcación en kiosko escolar", 8, footerY + 2.5);

    doc
      .fontSize(4.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_TEXT_MUTED)
      .text(`Emisión: ${emisionFecha}`, 8, footerY + 2.5, {
        width: cardWidth - 16,
        align: "right",
      });

    doc.end();
  });
}

export const generarCarnePdf = generarCarnetPdf;
