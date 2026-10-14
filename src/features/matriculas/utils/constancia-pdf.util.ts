import PDFDocument from "pdfkit";
import * as QRCode from "qrcode";
import * as fs from "fs";
import * as path from "path";
import { DatosConstanciaMatricula } from "../interfaces";

// ── Paleta de Colores Sobria y Oficial (Documento Escolar MINEDU / I.E. Nuestra Señora del Carmen) ──
const COLOR_PRIMARY = "#6B1124"; // Guindo institucional sobrio (para títulos y líneas oficiales)
const COLOR_PRIMARY_DARK = "#1E293B"; // Antracita oscuro para texto formal
const COLOR_TEXT_MAIN = "#0F172A"; // Negro suave para valores y párrafos
const COLOR_TEXT_MUTED = "#475569"; // Gris medio para etiquetas
const COLOR_BORDER = "#CBD5E1"; // Borde formal de documentos impresos
const COLOR_SURFACE = "#F8FAFC"; // Fondo gris muy tenue para tablas oficiales

/**
 * Genera el documento PDF de la Constancia Oficial de Matrícula (RF-009 HU1)
 * con formato formal, solemne y realista de institución educativa pública peruana.
 */
export async function generarConstanciaMatriculaPdf(
  datos: DatosConstanciaMatricula,
): Promise<Buffer> {
  // Generar código QR de validación digital institucional
  const qrData = JSON.stringify({
    tipo: "CONSTANCIA_MATRICULA",
    codigoMatricula: datos.codigoMatricula,
    estudiante: `${datos.estudiante.apellidos}, ${datos.estudiante.nombres}`,
    documento: `${datos.estudiante.tipoDocumento.toUpperCase()} ${datos.estudiante.numeroDocumento}`,
    grado: datos.gradoNombre,
    seccion: datos.seccionNombre,
    anioEscolar: datos.anioEscolar,
    institucion: datos.institucion.nombre,
    codigoModular: datos.institucion.codigoModular,
  });

  const qrBuffer = await QRCode.toBuffer(qrData, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 140,
    color: {
      dark: "#0F172A",
      light: "#FFFFFF",
    },
  });

  // Localizar logotipo oficial de la institución
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

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 35, bottom: 35, left: 50, right: 50 },
    });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const leftMargin = 50;
    const rightMargin = pageWidth - 50;
    const contentWidth = rightMargin - leftMargin;

    // ── 1. Filete Superior Oficial (Muy fino y sobrio) ──
    doc.rect(0, 0, pageWidth, 4).fill(COLOR_PRIMARY);

    // ── 2. Membrete Institucional Oficial ──
    const headerTopY = 32;
    let textStartX = leftMargin;

    if (logoPath) {
      try {
        doc.image(logoPath, leftMargin, headerTopY, {
          fit: [56, 56],
          align: "center",
          valign: "center",
        });
        textStartX = leftMargin + 68;
      } catch {
        textStartX = leftMargin;
      }
    }

    const instWidth = rightMargin - textStartX;

    doc
      .fontSize(7.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_TEXT_MUTED)
      .text("REPÚBLICA DEL PERÚ · MINISTERIO DE EDUCACIÓN", textStartX, headerTopY + 2, {
        width: instWidth,
        align: "left",
      });

    let ugelLimpia = datos.institucion.ugel || "";
    if (ugelLimpia.includes("/")) {
      ugelLimpia = ugelLimpia.split("/")[0].trim();
    }
    const dreTexto = datos.institucion.dre || "DRE Huancavelica";
    const ugelTexto = ugelLimpia || "UGEL Angaraes";
    const dreUgel = `${dreTexto}  |  ${ugelTexto}`;

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(COLOR_TEXT_MUTED)
      .text(dreUgel, textStartX, doc.y + 2, { width: instWidth, align: "left" });

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARY)
      .text(datos.institucion.nombre.toUpperCase(), textStartX, doc.y + 3, {
        width: instWidth,
        align: "left",
      });

    const datosContacto = [
      datos.institucion.codigoModular ? `CÓD. MODULAR: ${datos.institucion.codigoModular}` : null,
      datos.institucion.direccion ? datos.institucion.direccion : null,
    ]
      .filter(Boolean)
      .join(" · ");

    if (datosContacto) {
      doc
        .fontSize(7.5)
        .font("Helvetica")
        .fillColor(COLOR_TEXT_MUTED)
        .text(datosContacto, textStartX, doc.y + 2, {
          width: instWidth,
          align: "left",
        });
    }

    // Doble filete institucional bajo el membrete
    const headerBottomY = Math.max(doc.y + 8, headerTopY + 64);
    doc
      .strokeColor(COLOR_PRIMARY)
      .lineWidth(1)
      .moveTo(leftMargin, headerBottomY)
      .lineTo(rightMargin, headerBottomY)
      .stroke();

    doc
      .strokeColor(COLOR_BORDER)
      .lineWidth(0.5)
      .moveTo(leftMargin, headerBottomY + 2)
      .lineTo(rightMargin, headerBottomY + 2)
      .stroke();

    // ── 3. Título Oficial del Documento ──
    const titleStartY = headerBottomY + 20;
    doc.y = titleStartY;

    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARY)
      .text("CONSTANCIA OFICIAL DE MATRÍCULA", leftMargin, doc.y, {
        align: "center",
        width: contentWidth,
        characterSpacing: 0.5,
      });

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARY_DARK)
      .text(`AÑO LECTIVO ESCOLAR ${datos.anioEscolar}`, leftMargin, doc.y + 3, {
        align: "center",
        width: contentWidth,
      });

    // Marco sobrio con N.° de Registro (Diseño administrativo limpio)
    const badgeWidth = 200;
    const badgeHeight = 20;
    const badgeX = leftMargin + (contentWidth - badgeWidth) / 2;
    const badgeY = doc.y + 8;

    doc
      .roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 3)
      .fillAndStroke(COLOR_SURFACE, COLOR_BORDER);

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARY)
      .text(`N.° DE REGISTRO: ${datos.codigoMatricula}`, badgeX, badgeY + 5.5, {
        width: badgeWidth,
        align: "center",
      });

    // ── 4. Texto Certificatorio (Interlineado generoso line-height) ──
    doc.y = badgeY + badgeHeight + 22;
    const textoCertifica = `La Dirección y Secretaría Académica de la Institución Educativa "${datos.institucion.nombre}", que suscribe al pie, hace constar conforme a las normas vigentes del Sistema de Información de Apoyo a la Gestión de la Institución Educativa (SIAGIE) y las directivas del Ministerio de Educación, que el/la estudiante cuyos datos se detallan a continuación se encuentra legalmente MATRICULADO(A) para el presente periodo lectivo:`;

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(COLOR_TEXT_MAIN)
      .text(textoCertifica, leftMargin, doc.y, {
        width: contentWidth,
        align: "justify",
        lineGap: 6, // Interlineado cómodo y formal
      });

    // ── 5. Cuadro Oficial de Datos del Estudiante y Matrícula ──
    const tableStartY = doc.y + 18;
    const tableHeaderHeight = 24;
    const rowHeight = 26; // Altura de fila amplia para evitar solapamientos

    const gradoLimpio = datos.gradoNombre.toLowerCase().includes("secundaria")
      ? datos.gradoNombre
      : `${datos.gradoNombre} de Secundaria`;

    const tableRows = [
      {
        col1Label: "Apellidos y Nombres:",
        col1Val: `${datos.estudiante.apellidos}, ${datos.estudiante.nombres}`,
        col2Label: "Código de Estudiante:",
        col2Val: datos.estudiante.codigo || "—",
      },
      {
        col1Label: "Documento de Identidad:",
        col1Val: `${datos.estudiante.tipoDocumento.toUpperCase()} ${datos.estudiante.numeroDocumento}`,
        col2Label: "Fecha de Nacimiento:",
        col2Val: datos.estudiante.fechaNacimiento
          ? new Date(datos.estudiante.fechaNacimiento).toLocaleDateString("es-PE")
          : "—",
      },
      {
        col1Label: "Grado y Nivel:",
        col1Val: gradoLimpio,
        col2Label: "Sección Asignada:",
        col2Val: `Sección "${datos.seccionNombre}"`,
      },
      {
        col1Label: "Modalidad de Matrícula:",
        col1Val: datos.tipoMatricula.toUpperCase(),
        col2Label: "Fecha de Registro:",
        col2Val: datos.fechaMatricula,
      },
    ];

    const tableTotalHeight = tableHeaderHeight + tableRows.length * rowHeight;

    // Fondo y borde del cuadro
    doc
      .roundedRect(leftMargin, tableStartY, contentWidth, tableTotalHeight, 4)
      .fillAndStroke("#FFFFFF", COLOR_BORDER);

    // Cabecera del cuadro (Fondo gris tenue con filete guindo superior)
    doc
      .roundedRect(leftMargin, tableStartY, contentWidth, tableHeaderHeight, 4)
      .fill(COLOR_SURFACE);

    doc
      .strokeColor(COLOR_PRIMARY)
      .lineWidth(1.5)
      .moveTo(leftMargin, tableStartY)
      .lineTo(rightMargin, tableStartY)
      .stroke();

    doc
      .strokeColor(COLOR_BORDER)
      .lineWidth(0.5)
      .moveTo(leftMargin, tableStartY + tableHeaderHeight)
      .lineTo(rightMargin, tableStartY + tableHeaderHeight)
      .stroke();

    doc
      .fontSize(8.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARY)
      .text("INFORMACIÓN ACADÉMICA Y ASIGNACIÓN DE MATRÍCULA", leftMargin + 12, tableStartY + 7.5, {
        width: contentWidth - 24,
        align: "left",
      });

    // Filas de la tabla
    let currentY = tableStartY + tableHeaderHeight;
    const midX = leftMargin + contentWidth / 2;

    tableRows.forEach((row, idx) => {
      // Línea divisoria entre filas
      if (idx > 0) {
        doc
          .strokeColor(COLOR_BORDER)
          .lineWidth(0.5)
          .moveTo(leftMargin, currentY)
          .lineTo(rightMargin, currentY)
          .stroke();
      }

      // Columna 1
      doc
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .fillColor(COLOR_TEXT_MUTED)
        .text(row.col1Label, leftMargin + 12, currentY + 7.5, { width: 110 });

      doc
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .fillColor(COLOR_TEXT_MAIN)
        .text(row.col1Val, leftMargin + 125, currentY + 7.5, {
          width: midX - leftMargin - 130,
          ellipsis: true,
        });

      // Divisor vertical sutil
      doc
        .strokeColor(COLOR_BORDER)
        .lineWidth(0.5)
        .moveTo(midX, currentY + 3)
        .lineTo(midX, currentY + rowHeight - 3)
        .stroke();

      // Columna 2
      doc
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .fillColor(COLOR_TEXT_MUTED)
        .text(row.col2Label, midX + 12, currentY + 7.5, { width: 105 });

      doc
        .fontSize(8.5)
        .font("Helvetica")
        .fillColor(COLOR_TEXT_MAIN)
        .text(row.col2Val, midX + 120, currentY + 7.5, {
          width: rightMargin - midX - 125,
          ellipsis: true,
        });

      currentY += rowHeight;
    });

    // ── 6. Declaración Legal y Fecha (Con interlineado y aire) ──
    doc.y = tableStartY + tableTotalHeight + 20;

    const hoy = new Date().toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const textoFinal = `Se expide la presente constancia a solicitud de los padres de familia o apoderados para los fines y trámites que estimen convenientes. Documento oficial válido para acreditar la vinculación escolar y regularización de matrícula en los fueros correspondientes.`;

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(COLOR_TEXT_MUTED)
      .text(textoFinal, leftMargin, doc.y, {
        width: contentWidth,
        align: "justify",
        lineGap: 5, // Interlineado formal
      });

    const ciudad = datos.institucion.distrito || "Lircay";
    doc
      .fontSize(9.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARY_DARK)
      .text(`${ciudad}, ${hoy}.`, leftMargin, doc.y + 12, {
        width: contentWidth,
        align: "right",
      });

    // ── 7. Validación Digital y Firmas ──
    const validationBoxY = pageHeight - 165;

    // Caja de Validación con Código QR (Sobrio y limpio)
    doc.roundedRect(leftMargin, validationBoxY, 230, 82, 4).fillAndStroke("#FFFFFF", COLOR_BORDER);

    // Estampar Código QR
    doc.image(qrBuffer, leftMargin + 8, validationBoxY + 7, {
      fit: [68, 68],
    });

    const qrTextX = leftMargin + 82;
    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARY)
      .text("VALIDACIÓN DIGITAL", qrTextX, validationBoxY + 10, {
        width: 140,
      });

    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor(COLOR_TEXT_MUTED)
      .text(
        "Documento con trazabilidad oficial en el Sistema de Gestión Académica. Escanee el código QR para autenticar su vigencia y validez.",
        qrTextX,
        validationBoxY + 22,
        { width: 140, lineGap: 2 },
      );

    doc
      .fontSize(6.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARY)
      .text(`REGISTRO: ${datos.codigoMatricula.toUpperCase()}`, qrTextX, validationBoxY + 66, {
        width: 140,
      });

    // ── 8. Bloque de Firma Oficial ──
    const firma1X = rightMargin - 200;
    const firmaLineY = validationBoxY + 50;

    doc
      .strokeColor(COLOR_PRIMARY_DARK)
      .lineWidth(0.8)
      .moveTo(firma1X, firmaLineY)
      .lineTo(rightMargin, firmaLineY)
      .stroke();

    const directorNombre = datos.institucion.director || "DIRECCIÓN GENERAL";

    doc
      .fontSize(8.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARY_DARK)
      .text(directorNombre.toUpperCase(), firma1X, firmaLineY + 6, {
        width: 200,
        align: "center",
      });

    doc
      .fontSize(7.5)
      .font("Helvetica")
      .fillColor(COLOR_TEXT_MUTED)
      .text("Dirección General / Secretaría", firma1X, firmaLineY + 18, {
        width: 200,
        align: "center",
      });

    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor(COLOR_TEXT_MUTED)
      .text(datos.institucion.nombre, firma1X, firmaLineY + 28, {
        width: 200,
        align: "center",
      });

    // ── 9. Pie de Página Institucional (Línea sobria sin bloques saturados) ──
    const footerY = pageHeight - 32;
    doc
      .strokeColor(COLOR_BORDER)
      .lineWidth(0.5)
      .moveTo(leftMargin, footerY)
      .lineTo(rightMargin, footerY)
      .stroke();

    const contactText = [
      datos.institucion.direccion ? datos.institucion.direccion : null,
      datos.institucion.telefono ? `Teléf: ${datos.institucion.telefono}` : null,
      datos.institucion.correo ? `Correo: ${datos.institucion.correo}` : null,
    ]
      .filter(Boolean)
      .join("  |  ");

    if (contactText) {
      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor(COLOR_TEXT_MUTED)
        .text(contactText, leftMargin, footerY + 5, {
          width: contentWidth,
          align: "center",
        });
    }

    doc.end();
  });
}
