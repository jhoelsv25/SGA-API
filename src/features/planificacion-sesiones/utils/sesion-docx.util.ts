import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { DatosSesionPdf } from "./sesion-pdf.util";

const NOMBRE_MOMENTO = { inicio: "INICIO", desarrollo: "DESARROLLO", cierre: "CIERRE" } as const;
const fechaLarga = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

const parrafo = (texto: string, negrita = false) =>
  new Paragraph({ children: [new TextRun({ text: texto, bold: negrita })] });
const vinetas = (items: string[]) =>
  items.map((i) => new Paragraph({ text: i, bullet: { level: 0 } }));
const celda = (hijos: Paragraph[], ancho?: number) =>
  new TableCell({
    children: hijos.length > 0 ? hijos : [parrafo("—")],
    width: ancho ? { size: ancho, type: WidthType.PERCENTAGE } : undefined,
  });
const fila = (...celdas: TableCell[]) => new TableRow({ children: celdas });
const tabla = (filas: TableRow[]) =>
  new Table({ rows: filas, width: { size: 100, type: WidthType.PERCENTAGE } });
const seccion = (texto: string) =>
  new Paragraph({ text: texto, heading: HeadingLevel.HEADING_2, spacing: { before: 240 } });

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
      heading: HeadingLevel.HEADING_1,
      text: `SESIÓN DE APRENDIZAJE N.º ${d.numero ?? "—"}`,
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: d.titulo, bold: true })],
    }),
    seccion("I. DATOS INFORMATIVOS"),
    tabla(datos.map(([k, v]) => fila(celda([parrafo(k, true)], 35), celda([parrafo(v)], 65)))),
    seccion("II. ACERCA DE LA SESIÓN DE APRENDIZAJE"),
    parrafo("2.1. PROPÓSITOS DE APRENDIZAJE", true),
    parrafo(`Propósito: ${d.proposito ?? "—"}`),
    tabla([
      fila(
        celda([parrafo("Competencia", true)]),
        celda([parrafo("Capacidades", true)]),
        celda([parrafo("Desempeños precisados", true)]),
        celda([parrafo("Campo temático", true)]),
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
    parrafo("2.2. EVALUACIÓN DE LOS APRENDIZAJES", true),
    tabla([
      fila(
        celda([parrafo("Evidencia", true)]),
        celda([parrafo("Criterios", true)]),
        celda([parrafo("Instrumento", true)]),
      ),
      fila(
        celda([parrafo(d.evidencia ?? "—")]),
        celda(vinetas(d.criterios)),
        celda([parrafo(d.instrumento ?? "—")]),
      ),
    ]),
    parrafo("2.3. COMPETENCIAS TRANSVERSALES", true),
    tabla([
      fila(
        celda([parrafo("Competencia transversal", true)]),
        celda([parrafo("Capacidades", true)]),
        celda([parrafo("Desempeño precisado", true)]),
      ),
      ...d.transversales.map((t) =>
        fila(
          celda([parrafo(t.competencia)]),
          celda(vinetas(t.capacidades)),
          celda([parrafo(t.desempeno ?? "—")]),
        ),
      ),
    ]),
    parrafo("2.4. ENFOQUES TRANSVERSALES", true),
    tabla([
      fila(
        celda([parrafo("Enfoque transversal", true)]),
        celda([parrafo("Valores", true)]),
        celda([parrafo("Acciones observables", true)]),
      ),
      ...d.enfoques.map((e) =>
        fila(celda([parrafo(e.enfoque)]), celda(vinetas(e.valores)), celda(vinetas(e.acciones))),
      ),
    ]),
    seccion("III. SECUENCIA DIDÁCTICA"),
    parrafo("3.1. MEDIACIÓN Y MATERIALES", true),
    tabla([
      fila(
        celda([parrafo("Materiales impresos", true)]),
        celda([parrafo("Materiales manipulativos", true)]),
        celda([parrafo("Materiales digitales", true)]),
      ),
      fila(
        celda(vinetas(d.materiales.impresos)),
        celda(vinetas(d.materiales.manipulativos)),
        celda(vinetas(d.materiales.digitales)),
      ),
    ]),
    parrafo("3.2. MOMENTOS DIDÁCTICOS", true),
    tabla([
      fila(
        celda([parrafo("MOMENTO", true)], 15),
        celda([parrafo("ACTIVIDADES ESTRATÉGICAS", true)], 70),
        celda([parrafo("TIEMPO", true)], 15),
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
          new Paragraph({ alignment: AlignmentType.CENTER, text: "__________________________" }),
          new Paragraph({ alignment: AlignmentType.CENTER, text: "DOCENTE" }),
        ]),
        celda([
          new Paragraph({ alignment: AlignmentType.CENTER, text: "__________________________" }),
          new Paragraph({ alignment: AlignmentType.CENTER, text: "SUBDIRECCIÓN" }),
        ]),
      ),
    ]),
  );

  const documento = new Document({ sections: [{ children: hijos }] });
  return await Packer.toBuffer(documento);
}
