import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { DatosSesionPdf } from "./sesion-pdf.util";

const NOMBRE_MOMENTO = { inicio: "INICIO", desarrollo: "DESARROLLO", cierre: "CIERRE" } as const;
const fechaLarga = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

const FUENTE = "Arial";
const TAMANO = 20; // 10 pt, como en la plantilla del colegio
const COLOR_ENCABEZADO = "D9E2F3";
const BORDE = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
const BORDES = { top: BORDE, bottom: BORDE, left: BORDE, right: BORDE };

const texto = (t: string, negrita = false) =>
  new TextRun({ text: t, bold: negrita, font: FUENTE, size: TAMANO });
const parrafo = (t: string, negrita = false) => new Paragraph({ children: [texto(t, negrita)] });
const vinetas = (items: string[]) =>
  items.map(
    (i) => new Paragraph({ children: [texto(i)], bullet: { level: 0 }, spacing: { after: 40 } }),
  );
/** Celda con borde; las de encabezado van sombreadas y centradas, como la plantilla. */
const celda = (hijos: Paragraph[], ancho?: number, encabezado = false) =>
  new TableCell({
    children: hijos.length > 0 ? hijos : [parrafo("—")],
    width: ancho ? { size: ancho, type: WidthType.PERCENTAGE } : undefined,
    borders: BORDES,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: encabezado
      ? { type: ShadingType.CLEAR, fill: COLOR_ENCABEZADO, color: "auto" }
      : undefined,
  });
const encabezado = (t: string, ancho?: number) =>
  celda(
    [new Paragraph({ alignment: AlignmentType.CENTER, children: [texto(t, true)] })],
    ancho,
    true,
  );
const fila = (...celdas: TableCell[]) => new TableRow({ children: celdas });
const tabla = (filas: TableRow[]) =>
  new Table({ rows: filas, width: { size: 100, type: WidthType.PERCENTAGE } });
const seccion = (t: string) =>
  new Paragraph({
    children: [new TextRun({ text: t, bold: true, font: FUENTE, size: 22 })],
    spacing: { before: 240, after: 100 },
  });
const subseccion = (t: string) =>
  new Paragraph({ children: [texto(t, true)], spacing: { before: 160, after: 80 } });

/** Sesión de aprendizaje en Word (.docx) con el modelo estándar del colegio (RF-024, HU4). */
export async function generarSesionDocx(d: DatosSesionPdf): Promise<Buffer> {
  const datos: [string, string][] = [
    ["INSTITUCIÓN EDUCATIVA", d.institucion],
    ["DIRECTOR (A)", d.director],
    ["DOCENTE", d.docente],
    ["GRADO / SECCIÓN", d.gradoSeccion],
    ["ÁREA CURRICULAR", d.area],
    ["FECHA", fechaLarga(d.fecha)],
    ...(d.unidad ? ([["UNIDAD", d.unidad]] as [string, string][]) : []),
  ];

  const hijos: (Paragraph | Table)[] = [];
  if (d.borrador) hijos.push(parrafo("BORRADOR", true));
  hijos.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `SESIÓN DE APRENDIZAJE N.º ${d.numero ?? "—"}`,
          bold: true,
          font: FUENTE,
          size: 28,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [new TextRun({ text: `“${d.titulo}”`, bold: true, font: FUENTE, size: 24 })],
    }),
    seccion("I. DATOS INFORMATIVOS"),
    tabla(datos.map(([k, v]) => fila(encabezado(k, 35), celda([parrafo(v)], 65)))),
    seccion("II. ACERCA DE LA SESIÓN DE APRENDIZAJE"),
    subseccion("2.1. PROPÓSITOS DE APRENDIZAJE"),
    parrafo(`Propósito: ${d.proposito ?? "—"}`),
    tabla([
      fila(
        encabezado("Competencia"),
        encabezado("Capacidades"),
        encabezado("Desempeños precisados"),
        encabezado("Campo temático"),
      ),
      ...d.competencias.map((c) =>
        fila(
          celda([parrafo(c.competenciaTexto)]),
          celda(vinetas(c.capacidades)),
          celda(vinetas(c.desempenos.map((x) => x.texto))),
          celda([parrafo(c.campoTematico ?? "—")]),
        ),
      ),
    ]),
    subseccion("2.2. EVALUACIÓN DE LOS APRENDIZAJES"),
    tabla([
      fila(encabezado("Evidencia"), encabezado("Criterios"), encabezado("Instrumento")),
      fila(
        celda([parrafo(d.evidencia ?? "—")]),
        celda(vinetas(d.criterios)),
        celda([parrafo(d.instrumento ?? "—")]),
      ),
    ]),
    subseccion("2.3. COMPETENCIAS TRANSVERSALES"),
    tabla([
      fila(
        encabezado("Competencia transversal"),
        encabezado("Capacidades"),
        encabezado("Desempeño precisado"),
      ),
      ...d.transversales.map((t) =>
        fila(
          celda([parrafo(t.competencia)]),
          celda(vinetas(t.capacidades)),
          celda([parrafo(t.desempeno ?? "—")]),
        ),
      ),
    ]),
    subseccion("2.4. ENFOQUES TRANSVERSALES"),
    tabla([
      fila(
        encabezado("Enfoque transversal"),
        encabezado("Valores"),
        encabezado("Acciones observables"),
      ),
      ...d.enfoques.map((e) =>
        fila(celda([parrafo(e.enfoque)]), celda(vinetas(e.valores)), celda(vinetas(e.acciones))),
      ),
    ]),
    seccion("III. SECUENCIA DIDÁCTICA"),
    subseccion("3.1. MEDIACIÓN Y MATERIALES"),
    tabla([
      fila(
        encabezado("Materiales impresos"),
        encabezado("Materiales manipulativos"),
        encabezado("Materiales digitales"),
      ),
      fila(
        celda(vinetas(d.materiales.impresos)),
        celda(vinetas(d.materiales.manipulativos)),
        celda(vinetas(d.materiales.digitales)),
      ),
    ]),
    subseccion("3.2. MOMENTOS DIDÁCTICOS"),
    tabla([
      fila(
        encabezado("MOMENTO", 15),
        encabezado("ACTIVIDADES ESTRATÉGICAS", 70),
        encabezado("TIEMPO", 15),
      ),
      ...(["inicio", "desarrollo", "cierre"] as const).map((m) => {
        const x = d.momentos.find((y) => y.momento === m);
        return fila(
          celda([parrafo(NOMBRE_MOMENTO[m], true)]),
          celda((x?.actividades ?? "—").split("\n").map((l) => parrafo(l))),
          celda([parrafo(`${x?.minutos ?? 0}`)]),
        );
      }),
    ]),
    seccion("IV. REFERENCIAS BIBLIOGRÁFICAS"),
    ...vinetas(d.referencias),
    new Paragraph({ text: "", spacing: { before: 800 } }),
    tabla([
      fila(
        celda([
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [texto("__________________________")],
          }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [texto("DOCENTE", true)] }),
        ]),
        celda([
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [texto("__________________________")],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [texto("SUBDIRECCIÓN", true)],
          }),
        ]),
      ),
    ]),
  );

  const documento = new Document({
    styles: { default: { document: { run: { font: FUENTE, size: TAMANO } } } },
    sections: [
      {
        properties: {
          page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } },
        },
        children: hijos,
      },
    ],
  });
  return await Packer.toBuffer(documento);
}
