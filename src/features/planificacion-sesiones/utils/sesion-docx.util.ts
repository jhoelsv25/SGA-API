import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
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
const ANCHO_PAGINA = 9906; // A4 con márgenes de 1000 twips
const BORDE = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
const BORDES = { top: BORDE, bottom: BORDE, left: BORDE, right: BORDE };

const dxa = (porcentaje: number) => Math.round((ANCHO_PAGINA * porcentaje) / 100);
const texto = (t: string, negrita = false) =>
  new TextRun({ text: t, bold: negrita, font: FUENTE, size: TAMANO });
const parrafo = (t: string, negrita = false) => new Paragraph({ children: [texto(t, negrita)] });
const lineas = (t: string | null | undefined) => (t ?? "—").split("\n").map((l) => parrafo(l));
const vinetas = (items: string[]) =>
  items.map(
    (i) => new Paragraph({ children: [texto(i)], bullet: { level: 0 }, spacing: { after: 40 } }),
  );

/** Celda con borde; las de encabezado van sombreadas y centradas, como la plantilla. */
function celda(hijos: Paragraph[], porcentaje: number, esEncabezado = false): TableCell {
  return new TableCell({
    children: hijos.length > 0 ? hijos : [parrafo("—")],
    width: { size: dxa(porcentaje), type: WidthType.DXA },
    borders: BORDES,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: esEncabezado
      ? { type: ShadingType.CLEAR, fill: COLOR_ENCABEZADO, color: "auto" }
      : undefined,
  });
}
const encabezado = (t: string, porcentaje: number) =>
  celda(
    [new Paragraph({ alignment: AlignmentType.CENTER, children: [texto(t, true)] })],
    porcentaje,
    true,
  );

/** Tabla de ancho completo: `anchos` en porcentaje, `filas` con una lista de párrafos por celda. */
function tabla(anchos: number[], titulos: string[] | null, filas: Paragraph[][][]): Table {
  const cabecera = titulos
    ? [
        new TableRow({
          tableHeader: true,
          children: titulos.map((t, i) => encabezado(t, anchos[i])),
        }),
      ]
    : [];
  return new Table({
    width: { size: ANCHO_PAGINA, type: WidthType.DXA },
    columnWidths: anchos.map(dxa),
    layout: TableLayoutType.FIXED,
    rows: [
      ...cabecera,
      ...filas.map(
        (f) => new TableRow({ cantSplit: false, children: f.map((c, i) => celda(c, anchos[i])) }),
      ),
    ],
  });
}

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
    tabla(
      [30, 70],
      null,
      datos.map(([k, v]) => [[parrafo(k, true)], [parrafo(v)]]),
    ),
    seccion("II. ACERCA DE LA SESIÓN DE APRENDIZAJE"),
    subseccion("2.1. PROPÓSITOS DE APRENDIZAJE"),
    new Paragraph({
      spacing: { after: 80 },
      children: [texto("Propósito: ", true), texto(d.proposito ?? "—")],
    }),
    tabla(
      [20, 22, 38, 20],
      ["Competencia", "Capacidades", "Desempeños precisados", "Campo temático"],
      d.competencias.map((c) => [
        [parrafo(c.competenciaTexto)],
        vinetas(c.capacidades),
        vinetas(c.desempenos.map((x) => x.texto)),
        [parrafo(c.campoTematico ?? "—")],
      ]),
    ),
    subseccion("2.2. EVALUACIÓN DE LOS APRENDIZAJES"),
    tabla(
      [26, 48, 26],
      ["Evidencia", "Criterios", "Instrumento"],
      [[lineas(d.evidencia), vinetas(d.criterios), lineas(d.instrumento)]],
    ),
    subseccion("2.3. COMPETENCIAS TRANSVERSALES"),
    tabla(
      [34, 33, 33],
      ["Competencia transversal", "Capacidades", "Desempeño precisado"],
      d.transversales.map((t) => [
        [parrafo(t.competencia)],
        vinetas(t.capacidades),
        [parrafo(t.desempeno ?? "—")],
      ]),
    ),
    subseccion("2.4. ENFOQUES TRANSVERSALES"),
    tabla(
      [26, 24, 50],
      ["Enfoque transversal", "Valores", "Acciones observables"],
      d.enfoques.map((e) => [[parrafo(e.enfoque)], vinetas(e.valores), vinetas(e.acciones)]),
    ),
    seccion("III. SECUENCIA DIDÁCTICA"),
    subseccion("3.1. MEDIACIÓN Y MATERIALES"),
    tabla(
      [34, 33, 33],
      ["Materiales impresos", "Materiales manipulativos", "Materiales digitales"],
      [
        [
          vinetas(d.materiales.impresos),
          vinetas(d.materiales.manipulativos),
          vinetas(d.materiales.digitales),
        ],
      ],
    ),
    subseccion("3.2. MOMENTOS DIDÁCTICOS"),
    tabla(
      [16, 70, 14],
      ["MOMENTO", "ACTIVIDADES ESTRATÉGICAS", "TIEMPO"],
      (["inicio", "desarrollo", "cierre"] as const).map((m) => {
        const x = d.momentos.find((y) => y.momento === m);
        return [
          [parrafo(NOMBRE_MOMENTO[m], true)],
          lineas(x?.actividades),
          [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [texto(`${x?.minutos ?? 0} min`)],
            }),
          ],
        ];
      }),
    ),
    seccion("IV. REFERENCIAS BIBLIOGRÁFICAS"),
    ...vinetas(d.referencias),
    new Paragraph({ text: "", spacing: { before: 800 } }),
    new Table({
      width: { size: ANCHO_PAGINA, type: WidthType.DXA },
      columnWidths: [dxa(50), dxa(50)],
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          children: ["DOCENTE", "SUBDIRECCIÓN"].map(
            (rol) =>
              new TableCell({
                width: { size: dxa(50), type: WidthType.DXA },
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [texto("__________________________")],
                  }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [texto(rol, true)] }),
                ],
              }),
          ),
        }),
      ],
    }),
  );

  const documento = new Document({
    styles: { default: { document: { run: { font: FUENTE, size: TAMANO } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
        children: hijos,
      },
    ],
  });
  return await Packer.toBuffer(documento);
}
