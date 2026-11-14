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
  gradoNombre?: string | null;
  seccionNombre?: string | null;
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

// Medidas exactas PVC CR80 en puntos Tipográficos (85.6 mm x 54 mm)
const CARD_WIDTH = 242.65;
const CARD_HEIGHT = 153.07;

function resolverLogoPath(logoUrl?: string | null): string | null {
  const candidateLogos = [
    logoUrl ? path.resolve(process.cwd(), logoUrl.replace(/^\//, "")) : null,
    path.resolve(process.cwd(), "src/assets/logo.png"),
    path.resolve(process.cwd(), "public/logo.png"),
    path.resolve(process.cwd(), "../sga-web/public/logo.png"),
  ].filter(Boolean) as string[];

  for (const candidate of candidateLogos) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function resolverFotoPath(fotoUrl?: string | null): string | null {
  if (!fotoUrl) return null;
  const candidateFoto = path.resolve(process.cwd(), fotoUrl.replace(/^\//, ""));
  return fs.existsSync(candidateFoto) ? candidateFoto : null;
}

/**
 * Dibuja un carné en coordenadas específicas dentro de un PDFDocument.
 */
function dibujarCarneEnDoc(
  doc: PDFKit.PDFDocument,
  datos: DatosCarnePdf,
  originX: number,
  originY: number,
  qrBuffer: Buffer,
  logoPath: string | null,
  conGuiaCorte = false,
): void {
  doc.save();

  if (conGuiaCorte) {
    // Guía tenue de corte
    doc
      .save()
      .strokeColor(COLOR_BORDER)
      .lineWidth(0.5)
      .dash(3, { space: 2 })
      .rect(originX - 1.5, originY - 1.5, CARD_WIDTH + 3, CARD_HEIGHT + 3)
      .stroke()
      .restore();
  }

  // Fondo blanco limpio
  doc.rect(originX, originY, CARD_WIDTH, CARD_HEIGHT).fill("#FFFFFF");

  // ── 1. Franjas Institucionales Superiores ──
  doc.rect(originX, originY, CARD_WIDTH, 4).fill(COLOR_PRIMARY);
  doc.rect(originX, originY + 4, CARD_WIDTH, 1.5).fill(COLOR_ACCENT);

  // ── 2. Cabecera Institucional ──
  const headerTop = originY + 9;
  const headerLeft = originX + 8;

  if (logoPath) {
    try {
      doc.image(logoPath, headerLeft, headerTop, {
        fit: [24, 24],
        align: "center",
        valign: "center",
      });
    } catch {
      // Ignorar fallback si el logo falla
    }
  }

  const titleLeft = logoPath ? headerLeft + 27 : headerLeft;
  const titleWidth = CARD_WIDTH - (titleLeft - originX) - 48;

  doc
    .fontSize(6)
    .font("Helvetica-Bold")
    .fillColor(COLOR_PRIMARY)
    .text(datos.institucion.nombre.toUpperCase(), titleLeft, headerTop + 1, {
      width: titleWidth,
      lineGap: 0.5,
    });

  const subtitulo = [
    datos.institucion.distrito || "Lircay",
    datos.institucion.ugel ? datos.institucion.ugel.split("/")[0].trim() : "UGEL Angaraes",
  ].join(" · ");

  const subtituloY = doc.y + 1;

  doc
    .fontSize(4.5)
    .font("Helvetica")
    .fillColor(COLOR_TEXT_MUTED)
    .text(subtitulo, titleLeft, subtituloY, {
      width: titleWidth,
      ellipsis: true,
    });

  // Badge del Rol (Estudiante / Docente / Personal)
  const isEstudiante = datos.tipoRol.toLowerCase() === "estudiante";
  const badgeColor = isEstudiante ? COLOR_PRIMARY : "#059669";
  const badgeBg = isEstudiante ? "#FDF2F4" : "#ECFDF5";
  const badgeWidth = 42;
  const badgeHeight = 11;
  const badgeX = originX + CARD_WIDTH - badgeWidth - 8;
  const badgeY = headerTop + 3;

  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 2.5).fillAndStroke(badgeBg, badgeColor);

  doc
    .fontSize(5.5)
    .font("Helvetica-Bold")
    .fillColor(badgeColor)
    .text(datos.tipoRol.toUpperCase(), badgeX, badgeY + 2.5, {
      width: badgeWidth,
      align: "center",
    });

  // Línea divisoria bajo el header
  const sepY = originY + 36;
  doc
    .strokeColor(COLOR_BORDER)
    .lineWidth(0.5)
    .moveTo(originX + 8, sepY)
    .lineTo(originX + CARD_WIDTH - 8, sepY)
    .stroke();

  // ── 3. Cuerpo del Carné ──
  const bodyTop = sepY + 5;

  // Recuadro de Fotografía / Avatar
  const fotoSize = 46;
  const fotoX = originX + 8;
  const fotoY = bodyTop;

  doc
    .roundedRect(fotoX, fotoY, fotoSize, fotoSize + 6, 3)
    .strokeColor(COLOR_BORDER)
    .lineWidth(0.5)
    .stroke();

  const fotoPath = resolverFotoPath(datos.fotoUrl);
  if (fotoPath) {
    try {
      doc.image(fotoPath, fotoX + 1, fotoY + 1, {
        fit: [fotoSize - 2, fotoSize + 4],
        align: "center",
        valign: "center",
      });
    } catch {
      // Ignorar fallback
    }
  } else {
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

  // Columna Central: Datos Personales
  const dataX = fotoX + fotoSize + 6;
  const dataWidth = 115;
  const startY = bodyTop + 1;

  doc
    .fontSize(7.5)
    .font("Helvetica-Bold")
    .fillColor(COLOR_TEXT_MAIN)
    .text(datos.nombreCompleto, dataX, startY, {
      width: dataWidth,
      lineGap: 0.5,
      ellipsis: true,
    });

  let curY = doc.y + 2.5;

  doc
    .fontSize(5.5)
    .font("Helvetica-Bold")
    .fillColor(COLOR_TEXT_MUTED)
    .text(`${datos.tipoDocumento.toUpperCase()}: `, dataX, curY, { continued: true });
  doc.font("Helvetica-Bold").fillColor(COLOR_TEXT_MAIN).text(datos.numeroDocumento);

  curY = doc.y + 2;

  if (datos.codigoInstitucional) {
    const labelId = isEstudiante ? "SIAGIE: " : "CÓDIGO: ";
    doc
      .fontSize(5.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_TEXT_MUTED)
      .text(labelId, dataX, curY, { continued: true });
    doc.font("Helvetica").fillColor(COLOR_TEXT_MAIN).text(datos.codigoInstitucional);
    curY = doc.y + 1.5;
  } else {
    curY = doc.y + 2;
  }

  if (datos.gradoNombre && datos.seccionNombre) {
    doc
      .fontSize(5.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARY)
      .text(`${datos.gradoNombre} · Secc. ${datos.seccionNombre}`, dataX, curY, {
        width: dataWidth,
        ellipsis: true,
      });
    curY = doc.y + 2;
  }

  // Código de Marcación
  doc
    .fontSize(4.5)
    .font("Helvetica-Bold")
    .fillColor(COLOR_TEXT_MUTED)
    .text("CÓDIGO DE MARCACIÓN", dataX, curY);

  curY = doc.y + 1;

  doc
    .fontSize(7.5)
    .font("Helvetica-Bold")
    .fillColor(COLOR_PRIMARY)
    .text(datos.codigoCredencial, dataX, curY);

  // Columna Derecha: Código QR
  const qrSize = 52;
  const qrX = originX + CARD_WIDTH - qrSize - 8;
  const qrY = bodyTop + 1;

  doc.image(qrBuffer, qrX, qrY, {
    fit: [qrSize, qrSize],
  });

  // ── 4. Pie Institucional ──
  const footerY = originY + CARD_HEIGHT - 12;
  doc
    .strokeColor(COLOR_BORDER)
    .lineWidth(0.5)
    .moveTo(originX + 8, footerY)
    .lineTo(originX + CARD_WIDTH - 8, footerY)
    .stroke();

  const emisionFecha = new Date(datos.emitidaEn).toLocaleDateString("es-PE");
  doc
    .fontSize(4.5)
    .font("Helvetica")
    .fillColor(COLOR_TEXT_MUTED)
    .text("Válido para marcación en kiosko escolar", originX + 8, footerY + 2.5);

  doc
    .fontSize(4.5)
    .font("Helvetica-Bold")
    .fillColor(COLOR_TEXT_MUTED)
    .text(`Emisión: ${emisionFecha}`, originX + 8, footerY + 2.5, {
      width: CARD_WIDTH - 16,
      align: "right",
    });

  doc.restore();
}

/**
 * Genera el documento PDF del Carnet Oficial de Marcación individual (RF-007 HU5)
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

  const logoPath = resolverLogoPath(datos.institucion.logoUrl);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [CARD_WIDTH, CARD_HEIGHT],
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    dibujarCarneEnDoc(doc, datos, 0, 0, qrBuffer, logoPath, false);

    doc.end();
  });
}

/**
 * Genera una plantilla en hoja A4 con múltiples carnés organizados en cuadrícula
 * (2 columnas x 4 filas = 8 carnés por hoja) listos para impresión y corte masivo.
 */
export async function generarCarnetsA4Pdf(
  carnes: DatosCarnePdf[],
  subtituloHeader?: string,
): Promise<Buffer> {
  const qrBuffers = await Promise.all(
    carnes.map((c) =>
      QRCode.toBuffer(c.codigoCredencial, {
        errorCorrectionLevel: "M",
        margin: 0,
        width: 130,
        color: {
          dark: COLOR_PRIMARY,
          light: "#FFFFFF",
        },
      }),
    ),
  );

  const logoPath = resolverLogoPath(carnes[0]?.institucion.logoUrl);

  const PAGE_WIDTH = 595.28;
  const MARGIN_LEFT = 35;
  const GAP_X = 40;
  const MARGIN_TOP = 45;
  const GAP_Y = 34;
  const CARDS_PER_PAGE = 8;
  const totalPages = Math.ceil(carnes.length / CARDS_PER_PAGE);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 20, bottom: 20, left: 20, right: 20 },
      autoFirstPage: false,
    });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      doc.addPage();

      // Cabecera superior de la hoja
      doc
        .fontSize(7.5)
        .font("Helvetica-Bold")
        .fillColor(COLOR_PRIMARY)
        .text("I.E. DE MUJERES NUESTRA SEÑORA DEL CARMEN · PLANILLA OFICIAL DE CARNÉS", 35, 18);

      if (subtituloHeader) {
        doc
          .fontSize(7.5)
          .font("Helvetica-Bold")
          .fillColor(COLOR_ACCENT)
          .text(subtituloHeader.toUpperCase(), 35, 18, {
            width: PAGE_WIDTH - 70,
            align: "right",
          });
      }

      doc
        .strokeColor(COLOR_BORDER)
        .lineWidth(0.5)
        .moveTo(35, 30)
        .lineTo(PAGE_WIDTH - 35, 30)
        .stroke();

      // Dibujar hasta 8 carnés por página
      const startIdx = pageIdx * CARDS_PER_PAGE;
      const endIdx = Math.min(startIdx + CARDS_PER_PAGE, carnes.length);

      for (let i = startIdx; i < endIdx; i++) {
        const pos = i % CARDS_PER_PAGE;
        const col = pos % 2;
        const row = Math.floor(pos / 2);

        const x = MARGIN_LEFT + col * (CARD_WIDTH + GAP_X);
        const y = MARGIN_TOP + row * (CARD_HEIGHT + GAP_Y);

        dibujarCarneEnDoc(doc, carnes[i], x, y, qrBuffers[i], logoPath, true);
      }

      // Pie inferior de la hoja
      doc
        .strokeColor(COLOR_BORDER)
        .lineWidth(0.5)
        .moveTo(35, 805)
        .lineTo(PAGE_WIDTH - 35, 805)
        .stroke();

      doc
        .fontSize(6)
        .font("Helvetica")
        .fillColor(COLOR_TEXT_MUTED)
        .text(
          "Líneas punteadas indican guías de corte · Imprimir en papel A4 / cartulina sin escala (100%)",
          35,
          812,
        );

      doc
        .fontSize(6)
        .font("Helvetica-Bold")
        .fillColor(COLOR_TEXT_MUTED)
        .text(`Página ${pageIdx + 1} de ${totalPages} · Total: ${carnes.length} carnés`, 35, 812, {
          width: PAGE_WIDTH - 70,
          align: "right",
        });
    }

    doc.end();
  });
}

export const generarCarnePdf = generarCarnetPdf;
