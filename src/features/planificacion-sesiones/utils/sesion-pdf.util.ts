import PDFDocument from "pdfkit";
import { DOCUMENTO_SESION as M, fechaDocumento } from "../constants/sesion-documento.constants";
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
      items.length > 0 ? items.map((i) => `• ${i}`).join("\n") : M.vacio;

    /** Tabla con bordes: `anchos` en porcentaje; salta de página sin partir la fila. */
    const tabla = (
      anchos: readonly number[],
      titulos: readonly string[] | null,
      filas: string[][],
    ) => {
      const px = anchos.map((a) => (ANCHO * a) / 100);
      const alto = (celdas: readonly string[], negrita: boolean) =>
        Math.max(
          ...celdas.map((c, k) => {
            doc.font(negrita ? "Helvetica-Bold" : "Helvetica").fontSize(9);
            return doc.heightOfString(c, { width: px[k] - 2 * PAD });
          }),
        ) +
        2 * PAD;
      const dibujar = (celdas: readonly string[], negrita: boolean, fondo?: string) => {
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
        .text(M.borrador, { align: "right" })
        .fillColor("#000000");
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(`${M.encabezado} ${d.numero ?? M.vacio}`, { align: "center" });
    doc.fontSize(12).text(`“${d.titulo}”`, { align: "center" });

    const F = M.datosInformativos.filas;
    titulo(M.datosInformativos.titulo);
    tabla(M.datosInformativos.anchos, null, [
      [F.institucion, d.institucion],
      [F.director, d.director],
      [F.docente, d.docente],
      [F.gradoSeccion, d.gradoSeccion],
      [F.area, d.area],
      [F.fecha, fechaDocumento(d.fecha)],
      ...(d.unidad ? [[F.unidad, d.unidad]] : []),
    ]);

    titulo(M.acerca);
    sub(M.propositos.titulo);
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(`${M.propositos.etiquetaProposito}${d.proposito ?? M.vacio}`);
    tabla(
      M.propositos.anchos,
      M.propositos.columnas,
      d.competencias.map((c) => [
        c.competenciaTexto,
        puntos(c.capacidades),
        puntos(c.desempenos.map((x) => x.texto)),
        c.campoTematico ?? M.vacio,
      ]),
    );
    sub(M.evaluacion.titulo);
    tabla(M.evaluacion.anchos, M.evaluacion.columnas, [
      [d.evidencia ?? M.vacio, puntos(d.criterios), d.instrumento ?? M.vacio],
    ]);
    sub(M.transversales.titulo);
    tabla(
      M.transversales.anchos,
      M.transversales.columnas,
      d.transversales.map((t) => [t.competencia, puntos(t.capacidades), t.desempeno ?? M.vacio]),
    );
    sub(M.enfoques.titulo);
    tabla(
      M.enfoques.anchos,
      M.enfoques.columnas,
      d.enfoques.map((e) => [e.enfoque, puntos(e.valores), puntos(e.acciones)]),
    );

    titulo(M.secuencia);
    sub(M.materiales.titulo);
    tabla(M.materiales.anchos, M.materiales.columnas, [
      [
        puntos(d.materiales.impresos),
        puntos(d.materiales.manipulativos),
        puntos(d.materiales.digitales),
      ],
    ]);
    sub(M.momentos.titulo);
    tabla(
      M.momentos.anchos,
      M.momentos.columnas,
      M.momentos.orden.map((m) => {
        const x = d.momentos.find((y) => y.momento === m);
        return [M.momentos.nombres[m], x?.actividades ?? M.vacio, `${x?.minutos ?? 0} min`];
      }),
    );

    titulo(M.referencias);
    doc.font("Helvetica").fontSize(10).text(puntos(d.referencias));

    doc.moveDown(3);
    if (doc.y > doc.page.height - 90) doc.addPage();
    const y = doc.y;
    doc.font("Helvetica").fontSize(10);
    const [rolDocente, rolSubdireccion] = M.firmas.roles;
    doc.text("______________________", 60, y).text(rolDocente, 85, y + 14);
    doc.text("______________________", 340, y).text(rolSubdireccion, 365, y + 14);
    doc.end();
  });
}
