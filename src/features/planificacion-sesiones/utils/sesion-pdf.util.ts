import PDFDocument from "pdfkit";
import { DOCUMENTO_SESION as M } from "../constants/sesion-documento.constants";
import {
  anchosListaCotejo,
  type DatosSesion,
  filasInformativas,
  filasListaCotejo,
  lineasDe,
  numeroSesion,
} from "./sesion-documento.util";

const MARGEN = 40;
const ANCHO = 515; // A4 menos márgenes
const PAD = 4;
const FONDO = "#D9E2F3";

/** Sesión de aprendizaje en PDF con el modelo del colegio (RF-024 V2, HU4). */
export async function generarSesionPdf(d: DatosSesion): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGEN, bottom: MARGEN, left: MARGEN, right: MARGEN },
    });
    const partes: Buffer[] = [];
    doc.on("data", (c: Buffer) => partes.push(c));
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);

    const puntos = (items: string[]) =>
      items.length > 0 ? items.map((i) => `• ${i}`).join("\n") : M.vacio;
    const centrado = (t: string, tamano: number) =>
      doc.font("Helvetica-Bold").fontSize(tamano).text(t, MARGEN, doc.y, {
        width: ANCHO,
        align: "center",
      });

    interface OpcionesTabla {
      titulo?: string;
      columnas?: readonly string[];
      /** Columnas en negrita (etiquetas). */
      negritas?: number[];
    }
    /** Tabla con bordes: `anchos` en porcentaje; salta de página sin partir la fila. */
    const tabla = (anchos: readonly number[], filas: string[][], o: OpcionesTabla = {}) => {
      const px = anchos.map((a) => (ANCHO * a) / 100);
      const dibujar = (
        celdas: readonly string[],
        anchosFila: number[],
        negrita: (k: number) => boolean,
        fondo: boolean,
        centrar: boolean,
      ) => {
        const fuente = (k: number) =>
          doc.font(negrita(k) ? "Helvetica-Bold" : "Helvetica").fontSize(8.5);
        const h =
          Math.max(
            ...celdas.map((c, k) => {
              fuente(k);
              return doc.heightOfString(c || " ", { width: anchosFila[k] - 2 * PAD });
            }),
          ) +
          2 * PAD;
        if (doc.y + h > doc.page.height - 50) doc.addPage();
        const y = doc.y;
        let x = MARGEN;
        celdas.forEach((c, k) => {
          if (fondo) doc.rect(x, y, anchosFila[k], h).fillAndStroke(FONDO, "#808080");
          else doc.rect(x, y, anchosFila[k], h).stroke("#808080");
          fuente(k);
          doc.fillColor("#000000").text(c, x + PAD, y + PAD, {
            width: anchosFila[k] - 2 * PAD,
            align: centrar ? "center" : "left",
          });
          x += anchosFila[k];
        });
        doc.x = MARGEN;
        doc.y = y + h;
      };
      // El título de una tabla no se queda solo al final de la página
      if (o.titulo && doc.y > doc.page.height - 140) doc.addPage();
      if (o.titulo) dibujar([o.titulo], [ANCHO], () => true, true, false);
      if (o.columnas) dibujar(o.columnas, px, () => true, true, true);
      for (const f of filas) dibujar(f, px, (k) => o.negritas?.includes(k) ?? false, false, false);
      doc.moveDown(0.6);
    };

    if (d.borrador)
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#B91C1C")
        .text(M.borrador, { align: "right" })
        .fillColor("#000000");
    if (d.lema) centrado(`"${d.lema}"`, 10);
    centrado(d.institucion, 12);
    centrado(`"${M.encabezado} ${numeroSesion(d.numero)}"`, 14);
    doc.moveDown(0.6);

    tabla(M.datosInformativos.anchos, filasInformativas(d), {
      titulo: M.datosInformativos.titulo,
      negritas: [0, 2],
    });
    tabla(M.tituloSesion.anchos, [[M.tituloSesion.titulo, d.titulo]], { negritas: [0] });
    tabla(
      M.propositos.anchos,
      d.competencias.map((c) => [
        c.competenciaTexto,
        puntos(c.capacidades),
        puntos(c.desempenos.map((x) => x.texto)),
        c.campoTematico ?? M.vacio,
      ]),
      { titulo: M.propositos.titulo, columnas: M.propositos.columnas },
    );
    tabla(
      M.enfoques.anchos,
      d.enfoques.map((e) => [e.enfoque, puntos(e.valores), puntos(e.acciones)]),
      { titulo: M.enfoques.titulo, columnas: M.enfoques.columnas },
    );
    tabla(
      M.transversales.anchos,
      d.transversales.map((t) => [t.competencia, puntos(t.capacidades), t.actividad ?? M.vacio]),
      { titulo: M.transversales.titulo, columnas: M.transversales.columnas },
    );
    tabla(
      M.momentos.anchos,
      M.momentos.orden.map((m) => {
        const x = d.momentos.find((y) => y.momento === m);
        const lineas = lineasDe(x?.actividades ?? null);
        if (m === "inicio" && d.proposito)
          lineas.push(`${M.momentos.etiquetaProposito}${d.proposito}`);
        if (m === "desarrollo" && d.mapaVisual.length > 0) {
          lineas.push(
            "",
            M.momentos.mapaVisual,
            ...d.mapaVisual.map((c) => `• ${c.concepto}: ${c.definicion}`),
          );
        }
        return [M.momentos.nombres[m], lineas.join("\n") || M.vacio, `${x?.minutos ?? 0} min`];
      }),
      { titulo: M.momentos.titulo, columnas: M.momentos.columnas, negritas: [0] },
    );
    tabla(
      M.evaluacion.anchos,
      [
        [
          puntos(d.criterios),
          puntos(lineasDe(d.evidencia)),
          d.producto ?? M.vacio,
          d.instrumento ?? M.vacio,
        ],
      ],
      { titulo: M.evaluacion.titulo, columnas: M.evaluacion.columnas },
    );
    tabla(M.acuerdos.anchos, [[puntos(d.acuerdos)]], { titulo: M.acuerdos.titulo });
    tabla(M.materiales.anchos, [[puntos(d.materiales.recursos), puntos(d.materiales.comunidad)]], {
      titulo: M.materiales.titulo,
      columnas: M.materiales.columnas,
    });

    doc.moveDown(3);
    if (doc.y > doc.page.height - 100) doc.addPage();
    const y = doc.y;
    [d.docente, d.coordinador ?? ""].forEach((nombre, i) => {
      const x = MARGEN + (i * ANCHO) / 2;
      const opciones = { width: ANCHO / 2, align: "center" as const };
      doc.font("Helvetica").fontSize(9).text(M.firmas.linea, x, y, opciones);
      if (nombre) doc.text(nombre, x, doc.y, opciones);
      doc.font("Helvetica-Bold").text(M.firmas.roles[i], x, doc.y, opciones);
    });

    const L = M.listaCotejo;
    d.listasCotejo.forEach((lista, n) => {
      doc.addPage();
      tabla(L.anchos, filasListaCotejo(d, lista.seccion), {
        titulo: `${L.anexo} ${n + 1}: ${L.titulo}`,
        negritas: [0, 2],
      });
      doc.font("Helvetica").fontSize(9).text(L.instrucciones, MARGEN, doc.y, { width: ANCHO });
      doc.moveDown(0.4);
      tabla(
        anchosListaCotejo(d.criterios.length),
        lista.estudiantes.map((nombre, i) => [String(i + 1), nombre, ...d.criterios.map(() => "")]),
        { columnas: [...L.columnas, ...d.criterios] },
      );
    });
    doc.end();
  });
}
