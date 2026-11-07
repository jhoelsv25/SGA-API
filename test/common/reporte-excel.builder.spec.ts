import { Workbook } from "exceljs";
import {
  generarReporteExcel,
  nombreArchivoReporte,
  obtenerTodasLasFilas,
} from "../../src/common/excel/reporte-excel.builder";

describe("reporte-excel.builder", () => {
  it("genera hojas Reporte e Información con el formato estándar", async () => {
    const buffer = await generarReporteExcel({
      titulo: "Padrón de personas",
      modulo: "personas",
      columnas: [
        { header: "Número de documento", key: "doc", ancho: 20, requerido: true },
        { header: "Fecha de nacimiento", key: "nac", ancho: 18, tipo: "fecha" },
        { header: "Correo", key: "correo", ancho: 20 },
      ],
      filas: [{ doc: "00123456", nac: "2010-05-15", correo: null }],
      filtros: { Búsqueda: "Quispe" },
      generadoPor: "admin",
      institucion: "Colegio X",
    });

    const wb = new Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Reporte", "Información"]);

    const rep = wb.getWorksheet("Reporte")!;
    expect(rep.getRow(1).getCell(1).value).toBe("Número de documento");
    expect(rep.getCell("A2").value).toBe("00123456");
    expect(rep.getCell("B2").value).toBeInstanceOf(Date);
    expect(rep.getCell("C2").value).toBeNull();
    expect(rep.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(rep.autoFilter).toBeTruthy();

    const info = wb.getWorksheet("Información")!;
    const textos = info.getSheetValues().flat().map(String);
    expect(textos).toContain("Colegio X");
    expect(textos).toContain("Búsqueda: Quispe");
  });

  it("arma el nombre del archivo sga_<modulo>_<fecha>.xlsx", () => {
    expect(nombreArchivoReporte("Matrículas", new Date("2026-11-07T10:00:00Z"))).toBe(
      "sga_matriculas_2026-11-07.xlsx",
    );
  });

  it("recorre todas las páginas por cursor", async () => {
    const paginas = [
      { data: [1, 2], nextCursor: "a", hasMore: true },
      { data: [3], nextCursor: null, hasMore: false },
    ];
    let i = 0;
    const todas = await obtenerTodasLasFilas(() => Promise.resolve(paginas[i++]));
    expect(todas).toEqual([1, 2, 3]);
  });
});
