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
import { DOCUMENTO_SESION as M, fechaDocumento } from "../constants/sesion-documento.constants";
import type { DatosSesionPdf } from "./sesion-pdf.util";

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
const lineas = (t: string | null | undefined) => (t ?? M.vacio).split("\n").map((l) => parrafo(l));
const vinetas = (items: string[]) =>
  items.map(
    (i) => new Paragraph({ children: [texto(i)], bullet: { level: 0 }, spacing: { after: 40 } }),
  );

/** Celda con borde; las de encabezado van sombreadas y centradas, como la plantilla. */
function celda(hijos: Paragraph[], porcentaje: number, esEncabezado = false): TableCell {
  return new TableCell({
    children: hijos.length > 0 ? hijos : [parrafo(M.vacio)],
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
function tabla(
  anchos: readonly number[],
  titulos: readonly string[] | null,
  filas: Paragraph[][][],
): Table {
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
  const F = M.datosInformativos.filas;
  const datos: [string, string][] = [
    [F.institucion, d.institucion],
    [F.director, d.director],
    [F.docente, d.docente],
    [F.gradoSeccion, d.gradoSeccion],
    [F.area, d.area],
    [F.fecha, fechaDocumento(d.fecha)],
    ...(d.unidad ? ([[F.unidad, d.unidad]] as [string, string][]) : []),
  ];

  const hijos: (Paragraph | Table)[] = [];
  if (d.borrador) hijos.push(parrafo(M.borrador, true));
  hijos.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${M.encabezado} ${d.numero ?? M.vacio}`,
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
    seccion(M.datosInformativos.titulo),
    tabla(
      M.datosInformativos.anchos,
      null,
      datos.map(([k, v]) => [[parrafo(k, true)], [parrafo(v)]]),
    ),
    seccion(M.acerca),
    subseccion(M.propositos.titulo),
    new Paragraph({
      spacing: { after: 80 },
      children: [texto(M.propositos.etiquetaProposito, true), texto(d.proposito ?? M.vacio)],
    }),
    tabla(
      M.propositos.anchos,
      M.propositos.columnas,
      d.competencias.map((c) => [
        [parrafo(c.competenciaTexto)],
        vinetas(c.capacidades),
        vinetas(c.desempenos.map((x) => x.texto)),
        [parrafo(c.campoTematico ?? M.vacio)],
      ]),
    ),
    subseccion(M.evaluacion.titulo),
    tabla(M.evaluacion.anchos, M.evaluacion.columnas, [
      [lineas(d.evidencia), vinetas(d.criterios), lineas(d.instrumento)],
    ]),
    subseccion(M.transversales.titulo),
    tabla(
      M.transversales.anchos,
      M.transversales.columnas,
      d.transversales.map((t) => [
        [parrafo(t.competencia)],
        vinetas(t.capacidades),
        [parrafo(t.desempeno ?? M.vacio)],
      ]),
    ),
    subseccion(M.enfoques.titulo),
    tabla(
      M.enfoques.anchos,
      M.enfoques.columnas,
      d.enfoques.map((e) => [[parrafo(e.enfoque)], vinetas(e.valores), vinetas(e.acciones)]),
    ),
    seccion(M.secuencia),
    subseccion(M.materiales.titulo),
    tabla(M.materiales.anchos, M.materiales.columnas, [
      [
        vinetas(d.materiales.impresos),
        vinetas(d.materiales.manipulativos),
        vinetas(d.materiales.digitales),
      ],
    ]),
    subseccion(M.momentos.titulo),
    tabla(
      M.momentos.anchos,
      M.momentos.columnas,
      M.momentos.orden.map((m) => {
        const x = d.momentos.find((y) => y.momento === m);
        return [
          [parrafo(M.momentos.nombres[m], true)],
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
    seccion(M.referencias),
    ...vinetas(d.referencias),
    new Paragraph({ text: "", spacing: { before: 800 } }),
    new Table({
      width: { size: ANCHO_PAGINA, type: WidthType.DXA },
      columnWidths: [dxa(50), dxa(50)],
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          children: M.firmas.roles.map(
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
                    children: [texto(M.firmas.linea)],
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
