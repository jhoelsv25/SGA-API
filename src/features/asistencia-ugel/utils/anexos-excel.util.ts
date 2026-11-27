import ExcelJS from "exceljs";
import type { ReporteUgelDto } from "../dto";
import {
  ENCABEZADO_NORMA,
  NOTA_ANEXO_04,
  TITULO_ANEXO_03,
  TITULO_ANEXO_04,
  lugarYFecha,
} from "./anexos-textos";

const BORDE: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

function hoja(libro: ExcelJS.Workbook, nombre: string): ExcelJS.Worksheet {
  return libro.addWorksheet(nombre, {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });
}

function cabecera(
  h: ExcelJS.Worksheet,
  r: ReporteUgelDto,
  titulo: string,
  columnas: number,
  derecha: number,
) {
  const centrada = (fila: number, texto: string, size: number) => {
    h.mergeCells(fila, 1, fila, columnas);
    const c = h.getCell(fila, 1);
    c.value = texto;
    c.font = { bold: true, size };
    c.alignment = { horizontal: "center", wrapText: true };
  };
  centrada(1, ENCABEZADO_NORMA, 9);
  h.getRow(1).height = 26;
  centrada(2, titulo.split("\n")[0], 12);
  centrada(3, (r.borrador ? "BORRADOR · " : "") + titulo.split("\n")[1], 11);
  const dato = (fila: number, col: number, texto: string) => (h.getCell(fila, col).value = texto);
  dato(4, 1, `DRE/UGEL: ${r.encabezado.dreUgel}`);
  dato(5, 1, `I.E.: ${r.encabezado.institucion}`);
  dato(6, 1, `Nivel/Modalidad Educativa: ${r.encabezado.nivelModalidad}`);
  dato(4, derecha, `PERIODO (mes/año): ${r.encabezado.periodo}`);
  dato(5, derecha, `Turno: ${r.encabezado.turno}`);
}

function bordear(h: ExcelJS.Worksheet, desde: number, hasta: number, columnas: number) {
  for (let f = desde; f <= hasta; f++) {
    for (let c = 1; c <= columnas; c++) {
      const celda = h.getCell(f, c);
      celda.border = BORDE;
      celda.font = { size: 9, bold: f < desde + 2 };
      celda.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    }
  }
}

function firma(h: ExcelJS.Worksheet, r: ReporteUgelDto, fila: number, columna: number) {
  h.getCell(fila, columna).value = lugarYFecha(r.encabezado.lugar);
  h.getCell(fila + 3, columna).value = "______________________________";
  h.getCell(fila + 4, columna).value = r.encabezado.director;
  h.getCell(fila + 5, columna).value = "Director";
}

const FIJAS = ["Nº", "DNI", "Apellidos y Nombres", "Cargo", "Condición", "Jor. Lab."];
const ANCHOS = [4, 10, 34, 16, 12, 5];

/** Anexo 03 (Formato 01) y Anexo 04 (Formato 02) de la RSG 326-2017-MINEDU, en un libro editable. */
export async function generarAnexosExcel(r: ReporteUgelDto): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();

  const a3 = hoja(libro, "Anexo 03");
  const dias = r.calendario.length;
  const columnas = FIJAS.length + dias;
  [...ANCHOS, ...r.calendario.map(() => 3.3)].forEach((w, i) => (a3.getColumn(i + 1).width = w));
  cabecera(a3, r, TITULO_ANEXO_03, columnas, 12);
  FIJAS.forEach((t, i) => {
    a3.mergeCells(8, i + 1, 9, i + 1);
    a3.getCell(8, i + 1).value = t;
  });
  a3.mergeCells(8, FIJAS.length + 1, 8, columnas);
  a3.getCell(8, FIJAS.length + 1).value = "DÍAS CALENDARIO";
  r.calendario.forEach((d, i) => {
    a3.getCell(9, FIJAS.length + 1 + i).value = `${d.numero}\n${d.inicial}`;
  });
  a3.getRow(9).height = 26;
  r.filas.forEach((f, i) => {
    const valores = [
      i + 1,
      f.dni,
      f.nombreCompleto,
      f.cargo,
      f.condicion,
      f.jornada ?? "",
      ...f.dias,
    ];
    valores.forEach((v, c) => (a3.getCell(10 + i, c + 1).value = v));
  });
  const fin = 9 + r.filas.length;
  bordear(a3, 8, Math.max(fin, 9), columnas);
  r.filas.forEach((_, i) => {
    a3.getCell(10 + i, 3).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  });
  a3.getCell(fin + 2, 2).value = "LEYENDA:";
  r.leyenda.forEach(([codigo, texto], i) => {
    a3.getCell(fin + 3 + i, 2).value = codigo;
    a3.getCell(fin + 3 + i, 3).value = texto;
  });
  firma(a3, r, fin + 2, 16);

  const a4 = hoja(libro, "Anexo 04");
  const anchos4 = [...ANCHOS, 12, 8, 8, 8, 8, 10, 40];
  anchos4.forEach((w, i) => (a4.getColumn(i + 1).width = w));
  cabecera(a4, r, TITULO_ANEXO_04, anchos4.length, 7);
  FIJAS.forEach((t, i) => {
    a4.mergeCells(8, i + 1, 9, i + 1);
    a4.getCell(8, i + 1).value = t;
  });
  const grupos: [number, number, string, string[]][] = [
    [7, 7, "Inasistencias", ["Días"]],
    [8, 9, "Tardanzas", ["Horas (*)", "Minutos (*)"]],
    [10, 11, "Permisos SG", ["Horas (*)", "Minutos (*)"]],
    [12, 12, "Huelga/Paro", ["Días"]],
  ];
  for (const [desde, hasta, titulo, sub] of grupos) {
    if (hasta > desde) a4.mergeCells(8, desde, 8, hasta);
    a4.getCell(8, desde).value = titulo;
    sub.forEach((t, i) => (a4.getCell(9, desde + i).value = t));
  }
  a4.mergeCells(8, 13, 9, 13);
  a4.getCell(8, 13).value = "Observaciones";
  r.filas.forEach((f, i) => {
    [
      i + 1,
      f.dni,
      f.nombreCompleto,
      f.cargo,
      f.condicion,
      f.jornada ?? "",
      f.diasInasistencia,
      f.tardanza.horas,
      f.tardanza.minutos,
      f.permisoSinGoce.horas,
      f.permisoSinGoce.minutos,
      f.diasHuelga,
      f.observaciones,
    ].forEach((v, c) => (a4.getCell(10 + i, c + 1).value = v));
  });
  const fin4 = 9 + r.filas.length;
  bordear(a4, 8, Math.max(fin4, 9), anchos4.length);
  r.filas.forEach((_, i) => {
    for (const c of [3, 13]) {
      a4.getCell(10 + i, c).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    }
  });
  a4.getCell(fin4 + 1, 1).value = NOTA_ANEXO_04;
  firma(a4, r, fin4 + 3, 7);

  return Buffer.from(await libro.xlsx.writeBuffer());
}
