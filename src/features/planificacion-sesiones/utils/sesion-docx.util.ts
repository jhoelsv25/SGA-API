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
import { DOCUMENTO_SESION as M } from "../constants/sesion-documento.constants";
import {
  anchosListaCotejo,
  type DatosSesion,
  filasInformativas,
  filasListaCotejo,
  lineasDe,
  numeroSesion,
} from "./sesion-documento.util";

const FUENTE = "Arial";
const TAMANO = 20; // 10 pt, como en la plantilla del colegio
const COLOR_ENCABEZADO = "D9E2F3";
const ANCHO_PAGINA = 9906; // A4 con márgenes de 1000 twips
const BORDE = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
const BORDES = { top: BORDE, bottom: BORDE, left: BORDE, right: BORDE };
const SIN_BORDE = { style: BorderStyle.NONE };
const SIN_BORDES = { top: SIN_BORDE, bottom: SIN_BORDE, left: SIN_BORDE, right: SIN_BORDE };

type Bloque = Paragraph | Table;

const texto = (t: string, negrita = false, size = TAMANO) =>
  new TextRun({ text: t, bold: negrita, font: FUENTE, size });
const parrafo = (t: string, negrita = false) => new Paragraph({ children: [texto(t, negrita)] });
const centrado = (t: string, negrita = false, size = TAMANO) =>
  new Paragraph({ alignment: AlignmentType.CENTER, children: [texto(t, negrita, size)] });
const vinetas = (items: string[]) =>
  items.map(
    (i) => new Paragraph({ children: [texto(i)], bullet: { level: 0 }, spacing: { after: 40 } }),
  );
const separador = () => new Paragraph({ spacing: { after: 80 } });

interface OpcionesCelda {
  encabezado?: boolean;
  columnas?: number;
}

/** Celda con borde; las de encabezado van sombreadas. `twips` es su ancho. */
function celda(hijos: Bloque[], twips: number, opciones: OpcionesCelda = {}): TableCell {
  return new TableCell({
    children: hijos.length > 0 ? hijos : [parrafo(M.vacio)],
    width: { size: twips, type: WidthType.DXA },
    columnSpan: opciones.columnas,
    borders: BORDES,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: opciones.encabezado
      ? { type: ShadingType.CLEAR, fill: COLOR_ENCABEZADO, color: "auto" }
      : undefined,
  });
}

interface OpcionesTabla {
  /** Título de la sección: fila sombreada que abarca toda la tabla. */
  titulo?: string;
  columnas?: readonly string[];
  ancho?: number;
}

/** Tabla: `anchos` en porcentaje y cada fila con una lista de bloques por celda. */
function tabla(anchos: readonly number[], filas: Bloque[][][], o: OpcionesTabla = {}): Table {
  const total = o.ancho ?? ANCHO_PAGINA;
  const twips = anchos.map((a) => Math.round((total * a) / 100));
  const cabeceras: TableRow[] = [];
  if (o.titulo) {
    cabeceras.push(
      new TableRow({
        tableHeader: true,
        children: [
          celda([parrafo(o.titulo, true)], total, { encabezado: true, columnas: anchos.length }),
        ],
      }),
    );
  }
  if (o.columnas) {
    cabeceras.push(
      new TableRow({
        tableHeader: true,
        children: o.columnas.map((t, i) =>
          celda([centrado(t, true)], twips[i], { encabezado: true }),
        ),
      }),
    );
  }
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: twips,
    layout: TableLayoutType.FIXED,
    rows: [
      ...cabeceras,
      ...filas.map(
        (f) => new TableRow({ cantSplit: false, children: f.map((c, i) => celda(c, twips[i])) }),
      ),
    ],
  });
}

const pares = (filas: [string, string, string, string][]) =>
  filas.map(([a, b, c, d]) => [[parrafo(a, true)], [parrafo(b)], [parrafo(c, true)], [parrafo(d)]]);

/** Actividades de un momento; el inicio cierra con el propósito y el desarrollo con el mapa visual. */
function actividades(d: DatosSesion, momento: string): Bloque[] {
  const hijos: Bloque[] = lineasDe(
    d.momentos.find((x) => x.momento === momento)?.actividades ?? null,
  ).map((l) => parrafo(l));
  if (momento === "inicio" && d.proposito) {
    hijos.push(
      new Paragraph({
        children: [texto(M.momentos.etiquetaProposito, true), texto(d.proposito)],
      }),
    );
  }
  if (momento === "desarrollo" && d.mapaVisual.length > 0) {
    const ancho = Math.round((ANCHO_PAGINA * M.momentos.anchos[1]) / 100) - 220;
    const columnas = d.mapaVisual.length;
    hijos.push(
      separador(),
      tabla(
        Array<number>(columnas).fill(100 / columnas),
        [d.mapaVisual.map((c) => [centrado(c.concepto, true), centrado(c.definicion)])],
        { titulo: M.momentos.mapaVisual, ancho },
      ),
      // Word exige que la celda termine en un párrafo
      new Paragraph({}),
    );
  }
  return hijos;
}

function firmas(d: DatosSesion): Table {
  const nombres = [d.docente, d.coordinador ?? ""];
  const mitad = ANCHO_PAGINA / 2;
  return new Table({
    width: { size: ANCHO_PAGINA, type: WidthType.DXA },
    columnWidths: [mitad, mitad],
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        cantSplit: true,
        children: M.firmas.roles.map(
          (rol, i) =>
            new TableCell({
              width: { size: mitad, type: WidthType.DXA },
              borders: SIN_BORDES,
              children: [
                centrado(M.firmas.linea),
                ...(nombres[i] ? [centrado(nombres[i])] : []),
                centrado(rol, true),
              ],
            }),
        ),
      }),
    ],
  });
}

function anexos(d: DatosSesion): Bloque[] {
  const L = M.listaCotejo;
  return d.listasCotejo.flatMap((lista, n) => [
    new Paragraph({ pageBreakBefore: true }),
    tabla(L.anchos, pares(filasListaCotejo(d, lista.seccion)), {
      titulo: `${L.anexo} ${n + 1}: ${L.titulo}`,
    }),
    new Paragraph({
      children: [texto(L.instrucciones)],
      spacing: { before: 100, after: 100 },
    }),
    tabla(
      anchosListaCotejo(d.criterios.length),
      lista.estudiantes.map((nombre, i) => [
        [centrado(String(i + 1))],
        [parrafo(nombre)],
        ...d.criterios.map(() => [new Paragraph({})]),
      ]),
      { columnas: [...L.columnas, ...d.criterios] },
    ),
  ]);
}

/** Sesión de aprendizaje en Word (.docx) con el modelo del colegio (RF-024 V2, HU4). */
export async function generarSesionDocx(d: DatosSesion): Promise<Buffer> {
  const hijos: Bloque[] = [];
  if (d.borrador) hijos.push(parrafo(M.borrador, true));
  if (d.lema) hijos.push(centrado(`"${d.lema}"`, true));
  hijos.push(
    centrado(d.institucion, true, 24),
    centrado(`"${M.encabezado} ${numeroSesion(d.numero)}"`, true, 28),
    separador(),
    tabla(M.datosInformativos.anchos, pares(filasInformativas(d)), {
      titulo: M.datosInformativos.titulo,
    }),
    separador(),
    tabla(M.tituloSesion.anchos, [[[parrafo(M.tituloSesion.titulo, true)], [parrafo(d.titulo)]]]),
    separador(),
    tabla(
      M.propositos.anchos,
      d.competencias.map((c) => [
        [parrafo(c.competenciaTexto)],
        vinetas(c.capacidades),
        vinetas(c.desempenos.map((x) => x.texto)),
        [parrafo(c.campoTematico ?? M.vacio)],
      ]),
      { titulo: M.propositos.titulo, columnas: M.propositos.columnas },
    ),
    separador(),
    tabla(
      M.enfoques.anchos,
      d.enfoques.map((e) => [[parrafo(e.enfoque)], vinetas(e.valores), vinetas(e.acciones)]),
      { titulo: M.enfoques.titulo, columnas: M.enfoques.columnas },
    ),
    separador(),
    tabla(
      M.transversales.anchos,
      d.transversales.map((t) => [
        [parrafo(t.competencia)],
        vinetas(t.capacidades),
        [parrafo(t.actividad ?? M.vacio)],
      ]),
      { titulo: M.transversales.titulo, columnas: M.transversales.columnas },
    ),
    separador(),
    tabla(
      M.momentos.anchos,
      M.momentos.orden.map((m) => [
        [parrafo(M.momentos.nombres[m], true)],
        actividades(d, m),
        [centrado(`${d.momentos.find((x) => x.momento === m)?.minutos ?? 0} min`)],
      ]),
      { titulo: M.momentos.titulo, columnas: M.momentos.columnas },
    ),
    separador(),
    tabla(
      M.evaluacion.anchos,
      [
        [
          vinetas(d.criterios),
          vinetas(lineasDe(d.evidencia)),
          lineasDe(d.producto).map((l) => parrafo(l)),
          [parrafo(d.instrumento ?? M.vacio)],
        ],
      ],
      { titulo: M.evaluacion.titulo, columnas: M.evaluacion.columnas },
    ),
    separador(),
    tabla(M.acuerdos.anchos, [[vinetas(d.acuerdos)]], { titulo: M.acuerdos.titulo }),
    separador(),
    tabla(
      M.materiales.anchos,
      [[vinetas(d.materiales.recursos), vinetas(d.materiales.comunidad)]],
      { titulo: M.materiales.titulo, columnas: M.materiales.columnas },
    ),
    new Paragraph({ spacing: { before: 800 } }),
    firmas(d),
    ...anexos(d),
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
