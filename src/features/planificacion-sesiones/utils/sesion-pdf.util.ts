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

    const ANCHO = 515; // A4 menos márgenes
    const PAD = 4;
    const titulo = (t: string) =>
      doc.moveDown(0.6).font("Helvetica-Bold").fontSize(11).text(t).moveDown(0.2);
    const sub = (t: string) => {
      // Un subtítulo no se queda solo al final de la página: pasa con su tabla.
      if (doc.y > doc.page.height - 140) doc.addPage();
      doc.moveDown(0.3).font("Helvetica-Bold").fontSize(10).text(t);
    };
    const puntos = (items: string[]) =>
      items.length > 0 ? items.map((i) => `• ${i}`).join("\n") : "—";

    /** Tabla con bordes: `anchos` en porcentaje; salta de página sin partir la fila. */
    const tabla = (anchos: number[], titulos: string[] | null, filas: string[][]) => {
      const px = anchos.map((a) => (ANCHO * a) / 100);
      const alto = (celdas: string[], negrita: boolean) =>
        Math.max(
          ...celdas.map((c, k) => {
            doc.font(negrita ? "Helvetica-Bold" : "Helvetica").fontSize(9);
            return doc.heightOfString(c, { width: px[k] - 2 * PAD });
          }),
        ) +
        2 * PAD;
      const dibujar = (celdas: string[], negrita: boolean, fondo?: string) => {
        const h = alto(celdas, negrita);
        if (doc.y + h > doc.page.height - 50) doc.addPage();
        const y = doc.y;
        let x = 40;
        celdas.forEach((c, k) => {
          if (fondo) doc.rect(x, y, px[k], h).fillAndStroke(fondo, "#808080");
          else doc.rect(x, y, px[k], h).stroke("#808080");
          doc
            .fillColor("#000000")
            .font(negrita ? "Helvetica-Bold" : "Helvetica")
            .fontSize(9)
            .text(c, x + PAD, y + PAD, {
              width: px[k] - 2 * PAD,
              align: fondo ? "center" : "left",
            });
          x += px[k];
        });
        doc.x = 40;
        doc.y = y + h;
      };
      doc.moveDown(0.3);
      if (titulos) dibujar(titulos, true, "#D9E2F3");
      for (const f of filas) dibujar(f, false);
      doc.moveDown(0.4);
    };

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
    doc.fontSize(12).text(`“${d.titulo}”`, { align: "center" });

    titulo("I. DATOS INFORMATIVOS");
    tabla([30, 70], null, [
      ["INSTITUCIÓN EDUCATIVA", d.institucion],
      ["DIRECTOR (A)", d.director],
      ["DOCENTE", d.docente],
      ["GRADO / SECCIÓN", d.gradoSeccion],
      ["ÁREA CURRICULAR", d.area],
      ["FECHA", fechaLarga(d.fecha)],
      ...(d.unidad ? [["UNIDAD", d.unidad]] : []),
    ]);

    titulo("II. ACERCA DE LA SESIÓN DE APRENDIZAJE");
    sub("2.1. PROPÓSITOS DE APRENDIZAJE");
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(`Propósito: ${d.proposito ?? "—"}`);
    tabla(
      [20, 22, 38, 20],
      ["Competencia", "Capacidades", "Desempeños precisados", "Campo temático"],
      d.competencias.map((c) => [
        c.competenciaTexto,
        puntos(c.capacidades),
        puntos(c.desempenos.map((x) => x.texto)),
        c.campoTematico ?? "—",
      ]),
    );
    sub("2.2. EVALUACIÓN DE LOS APRENDIZAJES");
    tabla(
      [26, 48, 26],
      ["Evidencia", "Criterios", "Instrumento"],
      [[d.evidencia ?? "—", puntos(d.criterios), d.instrumento ?? "—"]],
    );
    sub("2.3. COMPETENCIAS TRANSVERSALES");
    tabla(
      [34, 33, 33],
      ["Competencia transversal", "Capacidades", "Desempeño precisado"],
      d.transversales.map((t) => [t.competencia, puntos(t.capacidades), t.desempeno ?? "—"]),
    );
    sub("2.4. ENFOQUES TRANSVERSALES");
    tabla(
      [26, 24, 50],
      ["Enfoque transversal", "Valores", "Acciones observables"],
      d.enfoques.map((e) => [e.enfoque, puntos(e.valores), puntos(e.acciones)]),
    );

    titulo("III. SECUENCIA DIDÁCTICA");
    sub("3.1. MEDIACIÓN Y MATERIALES");
    tabla(
      [34, 33, 33],
      ["Materiales impresos", "Materiales manipulativos", "Materiales digitales"],
      [
        [
          puntos(d.materiales.impresos),
          puntos(d.materiales.manipulativos),
          puntos(d.materiales.digitales),
        ],
      ],
    );
    sub("3.2. MOMENTOS DIDÁCTICOS");
    tabla(
      [16, 70, 14],
      ["MOMENTO", "ACTIVIDADES ESTRATÉGICAS", "TIEMPO"],
      (["inicio", "desarrollo", "cierre"] as const).map((m) => {
        const x = d.momentos.find((y) => y.momento === m);
        return [NOMBRE_MOMENTO[m], x?.actividades ?? "—", `${x?.minutos ?? 0} min`];
      }),
    );

    titulo("IV. REFERENCIAS BIBLIOGRÁFICAS");
    doc.font("Helvetica").fontSize(10).text(puntos(d.referencias));

    doc.moveDown(3);
    if (doc.y > doc.page.height - 90) doc.addPage();
    const y = doc.y;
    doc.font("Helvetica").fontSize(10);
    doc.text("______________________", 60, y).text("DOCENTE", 85, y + 14);
    doc.text("______________________", 340, y).text("SUBDIRECCIÓN", 365, y + 14);
    doc.end();
  });
}
