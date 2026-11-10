import PDFDocument from "pdfkit";

export interface DatosProtocoloPdf {
  colegio: {
    nombre: string;
    codigoModular?: string | null;
    ugel?: string | null;
    dre?: string | null;
  };
  docente: { nombre: string; documento: string };
  curso: { curso: string; grado: string; seccion: string };
  visita: {
    fecha: string;
    horaInicio: string | null;
    horaFin: string | null;
    minutos: number | null;
    estudiantes: number | null;
    observador: string;
    instrumento: string;
  };
  reunion: {
    fecha: string | null;
    horaInicio: string | null;
    horaFin: string | null;
    resumen: string | null;
  };
  /** Matriz de evidencias: notas por desempeño. */
  desempenos: Array<{
    numero: number;
    nombre: string;
    nivelRomano: string;
    nivelNombre: string;
    fundamento: string;
    notas: string[];
  }>;
  compromisos: Array<{ desempeno: number; descripcion: string; fechaRevision: string }>;
}

const COLOR_PRIMARY = "#7A1228";
const COLOR_TEXT = "#0F172A";
const COLOR_MUTED = "#64748B";
const IZQ = 40;
const ANCHO = 515;

const fecha = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
const hora = (h: string | null) => (h ? h.slice(0, 5) : "—");

/**
 * Protocolo de retroalimentación (formulario de MINEDU, adaptado): datos de la visita, matriz de
 * evidencias, niveles, compromisos y espacio para las firmas físicas del docente y del observador.
 */
export async function generarProtocoloPdf(d: DatosProtocoloPdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
    });
    const partes: Buffer[] = [];
    doc.on("data", (c: Buffer) => partes.push(c));
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", (e: Error) => reject(e));

    const titulo = (texto: string) => {
      if (doc.y > 720) doc.addPage();
      doc
        .moveDown(0.6)
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(COLOR_PRIMARY)
        .text(texto, IZQ);
      doc.moveDown(0.2);
    };
    const linea = (etiqueta: string, valor: string) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(COLOR_TEXT)
        .text(`${etiqueta}: `, IZQ, doc.y, { continued: true, width: ANCHO })
        .font("Helvetica")
        .text(valor, { width: ANCHO });
    };
    const parrafo = (texto: string) => {
      if (doc.y > 740) doc.addPage();
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(COLOR_TEXT)
        .text(texto, IZQ, doc.y, { width: ANCHO });
    };

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(COLOR_PRIMARY)
      .text(d.colegio.nombre, { align: "center" });
    doc
      .fontSize(11)
      .fillColor(COLOR_TEXT)
      .text("PROTOCOLO DE RETROALIMENTACIÓN", { align: "center" });
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLOR_MUTED)
      .text("Herramienta interna de mejora. No es la evaluación del desempeño docente oficial.", {
        align: "center",
      });

    titulo("1. Datos de la institución");
    linea("Institución", d.colegio.nombre);
    if (d.colegio.codigoModular) linea("Código modular", d.colegio.codigoModular);
    if (d.colegio.ugel) linea("UGEL", d.colegio.ugel);
    if (d.colegio.dre) linea("DRE", d.colegio.dre);

    titulo("2. Docente observado");
    linea("Nombres", d.docente.nombre);
    linea("Documento", d.docente.documento);
    linea("Curso", d.curso.curso);
    linea("Grado y sección", `${d.curso.grado} ${d.curso.seccion}`);

    titulo("3. Datos de la visita");
    linea("Fecha", fecha(d.visita.fecha));
    linea("Hora de inicio y término", `${hora(d.visita.horaInicio)} a ${hora(d.visita.horaFin)}`);
    linea("Tiempo total", d.visita.minutos === null ? "—" : `${d.visita.minutos} minutos`);
    linea(
      "Estudiantes presentes",
      d.visita.estudiantes === null ? "—" : String(d.visita.estudiantes),
    );
    linea("Observador", d.visita.observador);
    linea("Instrumento", d.visita.instrumento);

    titulo("4. Reunión de retroalimentación");
    linea("Fecha", fecha(d.reunion.fecha));
    linea("Hora de inicio y término", `${hora(d.reunion.horaInicio)} a ${hora(d.reunion.horaFin)}`);
    if (d.reunion.resumen) parrafo(d.reunion.resumen);

    titulo("5. Matriz de evidencias y niveles");
    for (const p of d.desempenos) {
      if (doc.y > 690) doc.addPage();
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(COLOR_TEXT)
        .text(`Desempeño ${p.numero}: ${p.nombre}`, IZQ, doc.y, { width: ANCHO });
      parrafo(`Nivel ${p.nivelRomano} — ${p.nivelNombre}`);
      parrafo(`Fundamento: ${p.fundamento}`);
      if (p.notas.length === 0) parrafo("Evidencias: sin notas en este desempeño.");
      for (const n of p.notas) parrafo(`• ${n}`);
      doc.moveDown(0.4);
    }

    titulo("6. Compromisos de mejora");
    if (d.compromisos.length === 0) parrafo("Sin compromisos registrados.");
    for (const c of d.compromisos) {
      parrafo(`Desempeño ${c.desempeno}: ${c.descripcion} (revisión: ${fecha(c.fechaRevision)})`);
    }

    // Espacio para firmas físicas; el escaneo firmado se sube al sistema como sustento.
    if (doc.y > 650) doc.addPage();
    titulo("7. Conformidad y firmas");
    parrafo("Ambas partes declaran conformidad con la reunión de retroalimentación.");
    const y = doc.y + 60;
    doc.strokeColor(COLOR_MUTED).lineWidth(0.8);
    doc
      .moveTo(IZQ, y)
      .lineTo(IZQ + 220, y)
      .stroke();
    doc
      .moveTo(IZQ + 295, y)
      .lineTo(IZQ + 515, y)
      .stroke();
    doc.font("Helvetica").fontSize(8).fillColor(COLOR_MUTED);
    doc.text("Firma del docente", IZQ, y + 4, { width: 220, align: "center" });
    doc.text(d.docente.nombre, IZQ, y + 14, { width: 220, align: "center" });
    doc.text("Firma del observador", IZQ + 295, y + 4, { width: 220, align: "center" });
    doc.text(d.visita.observador, IZQ + 295, y + 14, { width: 220, align: "center" });
    doc.end();
  });
}
