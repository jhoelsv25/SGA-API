import PDFDocument from "pdfkit";
import { DatosConstanciaMatricula } from "../interfaces";

/**
 * Genera el documento PDF de la Constancia Oficial de Matrícula (RF-009 HU1)
 */
export async function generarConstanciaMatriculaPdf(
  datos: DatosConstanciaMatricula,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    const institucion = datos.institucion.nombre.toUpperCase();
    const hoy = new Date().toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    // ── Encabezado Institucional ──
    doc.fontSize(14).font("Helvetica-Bold").text(institucion, { align: "center" });

    if (datos.institucion.codigoModular) {
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`CÓDIGO MODULAR: ${datos.institucion.codigoModular}`, { align: "center" });
    }

    if (datos.institucion.direccion) {
      doc.fontSize(9).font("Helvetica").text(datos.institucion.direccion, { align: "center" });
    }

    doc.moveDown(2);

    // ── Título del Documento ──
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("CONSTANCIA DE MATRÍCULA", { align: "center", underline: true });

    doc.moveDown(0.5);

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text(`N.° ${datos.codigoMatricula}`, { align: "center" });

    doc.moveDown(2);

    // ── Texto Certificatorio ──
    const textoCertifica = `La Dirección de la Institución Educativa "${datos.institucion.nombre}", hace constar que el/la estudiante cuyos datos se detallan a continuación, se encuentra legalmente MATRICULADO(A) en este centro educativo para el presente Año Escolar:`;

    doc.fontSize(11).font("Helvetica").text(textoCertifica, { align: "justify", lineGap: 4 });

    doc.moveDown(1.5);

    // ── Cuadro de Datos del Estudiante y Matrícula ──
    const leftMargin = 70;
    const rightMargin = 525;
    const yStart = doc.y;

    doc.rect(leftMargin, yStart, rightMargin - leftMargin, 190).stroke();

    let curY = yStart + 15;
    const addRow = (label: string, value: string) => {
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(label, leftMargin + 15, curY, { width: 150 });
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(value, leftMargin + 170, curY, { width: 250 });
      curY += 22;
    };

    addRow("Estudiante:", `${datos.estudiante.apellidos}, ${datos.estudiante.nombres}`);
    addRow(
      "Documento de Identidad:",
      `${datos.estudiante.tipoDocumento.toUpperCase()}: ${datos.estudiante.numeroDocumento}`,
    );
    addRow("Código de Estudiante:", datos.estudiante.codigo || "—");
    addRow("Año Lectivo:", `${datos.anioEscolar}`);
    addRow("Grado y Sección:", `${datos.gradoNombre} - Sección "${datos.seccionNombre}"`);
    addRow("Tipo de Matrícula:", datos.tipoMatricula.toUpperCase());
    addRow("Fecha de Matrícula:", datos.fechaMatricula);

    doc.y = curY + 40;

    // ── Declaración final ──
    const textoFinal = `Se expide la presente constancia a solicitud de la parte interesada para los fines correspondientes.`;

    doc.fontSize(11).font("Helvetica").text(textoFinal, leftMargin, doc.y, { align: "justify" });

    doc.moveDown(1);
    doc.text(`Expedido el ${hoy}.`, { align: "right" });

    doc.moveDown(5);

    // ── Líneas de Firma ──
    const firmaY = doc.y;
    doc.moveTo(100, firmaY).lineTo(260, firmaY).stroke();

    doc.moveTo(335, firmaY).lineTo(495, firmaY).stroke();

    doc
      .fontSize(9)
      .font("Helvetica")
      .text("Secretaría Académica", 100, firmaY + 8, { width: 160, align: "center" });

    doc
      .fontSize(9)
      .font("Helvetica")
      .text("Dirección General", 335, firmaY + 8, { width: 160, align: "center" });

    doc.end();
  });
}
