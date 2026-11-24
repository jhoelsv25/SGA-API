import PDFDocument from "pdfkit";
import type { CompetenciaPlanificada, MomentoPlanificado } from "../interfaces";

export interface DatosSesionPdf {
  institucion: string;
  director: string;
  docente: string;
  gradoSeccion: string;
  area: string;
  fecha: string;
  numero: number | null;
  unidad: string | null;
  titulo: string;
  proposito: string | null;
  competencias: CompetenciaPlanificada[];
  evidencia: string | null;
  criterios: string[];
  instrumento: string | null;
  transversales: { competencia: string; capacidades: string[]; desempeno: string | null }[];
  enfoques: { enfoque: string; valores: string[]; acciones: string[] }[];
  materiales: { impresos: string[]; manipulativos: string[]; digitales: string[] };
  momentos: MomentoPlanificado[];
  referencias: string[];
  borrador: boolean;
}

const NOMBRE_MOMENTO = { inicio: "INICIO", desarrollo: "DESARROLLO", cierre: "CIERRE" } as const;
const fechaLarga = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

/** Sesión de aprendizaje con el modelo estándar del colegio (RF-024, HU4): secciones I a IV y firmas. */
export async function generarSesionPdf(d: DatosSesionPdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
    });
    const partes: Buffer[] = [];
    doc.on("data", (c: Buffer) => partes.push(c));
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);

    const titulo = (t: string) =>
      doc.moveDown(0.6).font("Helvetica-Bold").fontSize(11).text(t).moveDown(0.2);
    const sub = (t: string) => doc.moveDown(0.3).font("Helvetica-Bold").fontSize(10).text(t);
    const texto = (t: string) => doc.font("Helvetica").fontSize(10).text(t);
    const lista = (items: string[]) =>
      items.forEach((i) => doc.font("Helvetica").fontSize(10).text(`• ${i}`, { indent: 8 }));

    if (d.borrador)
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#B91C1C")
        .text("BORRADOR", { align: "right" })
        .fillColor("#000000");
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(`SESIÓN DE APRENDIZAJE N.º ${d.numero ?? "—"}`, { align: "center" });
    doc.fontSize(12).text(d.titulo, { align: "center" });

    titulo("I. DATOS INFORMATIVOS");
    for (const [k, v] of [
      ["Institución educativa", d.institucion],
      ["Director(a)", d.director],
      ["Docente", d.docente],
      ["Grado / Sección", d.gradoSeccion],
      ["Área curricular", d.area],
      ["Fecha", fechaLarga(d.fecha)],
      ...(d.unidad ? [["Unidad", d.unidad]] : []),
    ]) {
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(`${k}: `, { continued: true })
        .font("Helvetica")
        .text(v ?? "—");
    }

    titulo("II. ACERCA DE LA SESIÓN DE APRENDIZAJE");
    sub("2.1 Propósitos de aprendizaje");
    texto(`Propósito: ${d.proposito ?? "—"}`);
    for (const c of d.competencias) {
      sub(`Competencia: ${c.competenciaTexto}`);
      texto("Capacidades:");
      lista(c.capacidades);
      texto("Desempeños precisados:");
      lista(c.desempenos.map((x) => x.texto));
      if (c.campoTematico) texto(`Campo temático: ${c.campoTematico}`);
    }
    sub("2.2 Evaluación de los aprendizajes");
    texto(`Evidencia: ${d.evidencia ?? "—"}`);
    texto("Criterios:");
    lista(d.criterios);
    texto(`Instrumento: ${d.instrumento ?? "—"}`);
    sub("2.3 Competencias transversales");
    for (const t of d.transversales) {
      texto(t.competencia);
      lista(t.capacidades);
      if (t.desempeno) texto(`Desempeño precisado: ${t.desempeno}`);
    }
    sub("2.4 Enfoques transversales");
    for (const e of d.enfoques) {
      texto(e.enfoque);
      texto(`Valores: ${e.valores.join(", ")}`);
      lista(e.acciones);
    }

    titulo("III. SECUENCIA DIDÁCTICA");
    sub("3.1 Mediación y materiales");
    texto(`Impresos: ${d.materiales.impresos.join("; ") || "—"}`);
    texto(`Manipulativos: ${d.materiales.manipulativos.join("; ") || "—"}`);
    texto(`Digitales: ${d.materiales.digitales.join("; ") || "—"}`);
    sub("3.2 Momentos didácticos");
    for (const m of ["inicio", "desarrollo", "cierre"] as const) {
      const x = d.momentos.find((y) => y.momento === m);
      sub(`${NOMBRE_MOMENTO[m]} (${x?.minutos ?? 0} min)`);
      texto(x?.actividades ?? "—");
    }

    titulo("IV. REFERENCIAS BIBLIOGRÁFICAS");
    lista(d.referencias);

    doc.moveDown(3);
    const y = doc.y;
    doc.font("Helvetica").fontSize(10);
    doc.text("______________________", 60, y).text("DOCENTE", 85, y + 14);
    doc.text("______________________", 340, y).text("SUBDIRECCIÓN", 365, y + 14);
    doc.end();
  });
}
