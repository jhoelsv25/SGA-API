import { Workbook, type Worksheet } from "exceljs";

/** Paleta institucional (granate de la I.E. Nuestra Señora del Carmen) de todos los reportes Excel. */
export const COLOR_OBLIGATORIO = "FF4A1220";
export const COLOR_OPCIONAL = "FF722F37";
const COLOR_FONDO_CAMPO = "FFF5E8EB";
const COLOR_BORDE = "FFE5D5DA";

export type TipoColumnaReporte = "texto" | "fecha" | "numero";

export interface ColumnaReporte {
  header: string;
  key: string;
  ancho: number;
  tipo?: TipoColumnaReporte;
  /** Obligatoria en la plantilla de importación: encabezado oscuro. */
  requerido?: boolean;
}

export type ValorCelda = string | number | Date | null | undefined;

export interface HojaReporteExtra {
  nombre: string;
  columnas: ColumnaReporte[];
  filas: Record<string, ValorCelda>[];
}

export interface OpcionesReporteExcel {
  /** Título visible en la hoja «Información». */
  titulo: string;
  /** Nombre corto del módulo, para el nombre del archivo. */
  modulo: string;
  columnas: ColumnaReporte[];
  filas: Record<string, ValorCelda>[];
  /** Filtros aplicados: etiqueta → valor. Vacío = «Sin filtros». */
  filtros?: Record<string, string | undefined>;
  generadoPor: string;
  institucion: string;
  anioAcademico?: string;
  /** Hojas de detalle adicionales (mismo estilo), entre «Reporte» e «Información». */
  hojasExtra?: HojaReporteExtra[];
  /** Datos adicionales de la institución para la hoja «Información» (UGEL, DRE, etc.). */
  datosInstitucion?: Record<string, string | null | undefined>;
}

function sinTildes(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** `sga_<modulo>_<AAAA-MM-DD>.xlsx` */
export function nombreArchivoReporte(modulo: string, fecha: Date = new Date()): string {
  const slug = sinTildes(modulo)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `sga_${slug}_${fecha.toISOString().slice(0, 10)}.xlsx`;
}

function escribirTabla(
  hoja: Worksheet,
  columnas: ColumnaReporte[],
  filas: Record<string, ValorCelda>[],
): void {
  hoja.columns = columnas.map((c) => ({
    header: c.header,
    key: c.key,
    width: Math.max(c.ancho, c.header.length + 4),
  }));
  columnas.forEach((c, i) => {
    const tipo = c.tipo ?? "texto";
    hoja.getColumn(i + 1).numFmt = tipo === "fecha" ? "dd/mm/yyyy" : tipo === "numero" ? "0" : "@";
  });

  const encabezado = hoja.getRow(1);
  encabezado.font = { bold: true, color: { argb: "FFFFFFFF" } };
  encabezado.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  encabezado.height = 30;
  columnas.forEach((c, i) => {
    encabezado.getCell(i + 1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: c.requerido ? COLOR_OBLIGATORIO : COLOR_OPCIONAL },
    };
  });

  for (const fila of filas) {
    const valores = columnas.map((c) => {
      const v = fila[c.key];
      if (v === null || v === undefined || v === "") return null;
      if (c.tipo === "fecha") {
        const d = v instanceof Date ? v : new Date(`${String(v).slice(0, 10)}T00:00:00Z`);
        return Number.isNaN(d.getTime()) ? null : d;
      }
      return v;
    });
    hoja.addRow(valores);
  }

  hoja.views = [{ state: "frozen", ySplit: 1 }];
  hoja.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: Math.max(columnas.length, 1) },
  };
}

/** Construye el Excel estándar: hoja «Reporte» (tabla desde la fila 1) + hoja «Información». */
export async function generarReporteExcel(opciones: OpcionesReporteExcel): Promise<Buffer> {
  const { columnas, filas } = opciones;
  const ahora = new Date();

  const workbook = new Workbook();
  workbook.creator = "SGA Colegio";
  workbook.created = ahora;

  const reporte = workbook.addWorksheet("Reporte");
  escribirTabla(reporte, columnas, filas);
  for (const extra of opciones.hojasExtra ?? []) {
    escribirTabla(workbook.addWorksheet(extra.nombre), extra.columnas, extra.filas);
  }
  const info = workbook.addWorksheet("Información");

  info.columns = [
    { key: "campo", width: 24 },
    { key: "valor", width: 60 },
  ];
  const filtros = Object.entries(opciones.filtros ?? {}).filter(([, v]) => v);
  const datos: [string, string | number][] = [
    ["Institución", opciones.institucion],
    ["Reporte", opciones.titulo],
    ...(opciones.anioAcademico
      ? ([["Año académico", opciones.anioAcademico]] as [string, string][])
      : []),
    [
      "Filtros aplicados",
      filtros.length ? filtros.map(([k, v]) => `${k}: ${v}`).join("; ") : "Sin filtros",
    ],
    ...Object.entries(opciones.datosInstitucion ?? {})
      .filter(([, v]) => v)
      .map(([k, v]) => [k, String(v)] as [string, string]),
    ["Generado por", opciones.generadoPor],
    ["Fecha y hora", ahora.toLocaleString("es-PE", { timeZone: "America/Lima" })],
    ["Total de filas", filas.length],
  ];
  datos.forEach(([campo, valor], i) => {
    const fila = info.getRow(i + 1);
    fila.getCell(1).value = campo;
    fila.getCell(1).font = { bold: true, color: { argb: COLOR_OBLIGATORIO } };
    fila.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR_FONDO_CAMPO },
    };
    for (const col of [1, 2]) {
      const b = { style: "thin" as const, color: { argb: COLOR_BORDE } };
      fila.getCell(col).border = { top: b, bottom: b, left: b, right: b };
    }
    fila.getCell(2).value = valor;
    fila.getCell(2).alignment = { horizontal: "left", wrapText: true };
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

const MAX_FILAS_REPORTE = 20000;

/** Recorre todas las páginas por cursor (límite 100) de un listado, con tope de seguridad. */
export async function obtenerTodasLasFilas<T>(
  pagina: (
    cursor: string | undefined,
    limit: number,
  ) => Promise<{ data: T[]; nextCursor: string | null; hasMore: boolean }>,
): Promise<T[]> {
  const todas: T[] = [];
  let cursor: string | undefined;
  do {
    const res = await pagina(cursor, 100);
    todas.push(...res.data);
    cursor = res.hasMore && res.nextCursor ? res.nextCursor : undefined;
  } while (cursor && todas.length < MAX_FILAS_REPORTE);
  return todas;
}
