import { Workbook } from "exceljs";
import { ExportacionService } from "../../../src/features/exportacion/exportacion.service";

const user = { id: "u1", username: "admin", roleId: "r", role: "Administrador", personaId: "p" };

function crear(findAll: jest.Mock) {
  const inst = { get: jest.fn().mockResolvedValue({ nombre: "Colegio X" }) };
  return new ExportacionService(
    { findAll } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    inst as never,
  );
}

describe("ExportacionService.personasExcel", () => {
  it("exporta todas las páginas con columnas de la plantilla y las propias del reporte", async () => {
    const persona = (n: string) => ({
      tipoDocumento: "dni",
      numeroDocumento: n,
      apellidoPaterno: "Quispe",
      apellidoMaterno: null,
      nombres: "Ana",
      sexo: "F",
      fechaNacimiento: "2010-05-15",
      esProvisional: false,
      fichas: { esDocente: true, esEstudiante: false, esApoderado: false },
      creadoEn: "2026-01-02T10:00:00Z",
    });
    const findAll = jest
      .fn()
      .mockResolvedValueOnce({ data: [persona("00000001")], nextCursor: "c", hasMore: true })
      .mockResolvedValueOnce({ data: [persona("00000002")], nextCursor: null, hasMore: false });

    const { buffer, nombreArchivo } = await crear(findAll).personasExcel(
      { search: "Quispe" },
      user,
    );

    expect(findAll).toHaveBeenCalledTimes(2);
    expect(nombreArchivo).toMatch(/^sga_personas_\d{4}-\d{2}-\d{2}\.xlsx$/);
    const wb = new Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const hoja = wb.getWorksheet("Reporte")!;
    expect(hoja.rowCount).toBe(3);
    expect(hoja.getCell("A1").value).toBe("Tipo de documento");
    expect(hoja.getCell("B3").value).toBe("00000002");
    expect(hoja.getRow(1).values).toEqual(
      expect.arrayContaining(["Condición en el padrón", "Fichas", "Registrado el"]),
    );
  });
});
