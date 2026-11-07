import { Workbook } from "exceljs";
import {
  PLANTILLAS,
  TIPO_IMPORTACION,
  type TipoImportacion,
} from "@/features/importacion/constants";
import {
  generarPlantillaExcel,
  normalizarFechaIso,
  normalizarSexo,
  normalizarSiNo,
  normalizarTipoDocumento,
  validarCamposApoderadoFila,
  validarCamposDocenteFila,
  validarCamposEstudianteFila,
} from "@/features/importacion/utils";

async function leer(tipo: TipoImportacion): Promise<Workbook> {
  const buffer = await generarPlantillaExcel(tipo);
  const wb = new Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  return wb;
}

describe("plantillas Excel estándar", () => {
  it.each(Object.values(TIPO_IMPORTACION))(
    "%s: hojas Datos, Instrucciones y Listas, en ese orden",
    async (tipo) => {
      const wb = await leer(tipo);
      expect(wb.worksheets.map((w) => w.name)).toEqual(["Datos", "Instrucciones", "Listas"]);
    },
  );

  it.each(Object.values(TIPO_IMPORTACION))(
    "%s: encabezados limpios, * solo en obligatorios y sin filas de ejemplo",
    async (tipo) => {
      const datos = (await leer(tipo)).getWorksheet("Datos")!;
      const encabezados = (datos.getRow(1).values as string[]).slice(1);

      expect(encabezados).toEqual(
        PLANTILLAS[tipo].campos.map((c) => (c.requerido ? `${c.header} *` : c.header)),
      );
      encabezados.forEach((h) => expect(h).not.toMatch(/\(|\//)); // sin instrucciones dentro del nombre
      expect(datos.getRow(2).getCell(1).value).toBeNull();
    },
  );

  it("todas las plantillas comparten el mismo bloque de datos de la persona", () => {
    const persona = [
      "tipoDocumento",
      "numeroDocumento",
      "apellidoPaterno",
      "apellidoMaterno",
      "nombres",
      "sexo",
      "fechaNacimiento",
      "celular",
      "correo",
      "direccion",
      "distrito",
    ];
    Object.values(PLANTILLAS).forEach(({ campos }) => {
      const keys = campos.map((c) => c.key);
      persona.forEach((k) => expect(keys).toContain(k));
    });
  });

  it("estudiantes y docentes incluyen sus datos de ficha", () => {
    const est = PLANTILLAS.estudiantes.campos.map((c) => c.key);
    const doc = PLANTILLAS.docentes.campos.map((c) => c.key);
    expect(est).toEqual(
      expect.arrayContaining([
        "lenguaMaterna",
        "religion",
        "tieneDiscapacidad",
        "detalleDiscapacidad",
      ]),
    );
    expect(doc).toEqual(
      expect.arrayContaining(["especialidad", "tituloProfesional", "tipoContrato", "jornada"]),
    );
  });

  it("las columnas de lista tienen desplegable con los valores del sistema", async () => {
    const wb = await leer("docentes");
    const datos = wb.getWorksheet("Datos")!;
    const campos = PLANTILLAS.docentes.campos;
    const colContrato = campos.findIndex((c) => c.key === "tipoContrato") + 1;

    const validacion = datos.getRow(2).getCell(colContrato).dataValidation;
    expect(validacion.type).toBe("list");
    expect(validacion.formulae?.[0]).toMatch(/^=Listas!/);

    const listas = wb.getWorksheet("Listas")!;
    const valores = listas.getColumn(3).values as unknown[]; // tipoContrato es la 3.ª lista
    expect(valores).toEqual(expect.arrayContaining(["nombrado", "contratado", "practicante"]));
  });

  it("los códigos y documentos van como texto para no perder ceros iniciales", async () => {
    const datos = (await leer("estudiantes")).getWorksheet("Datos")!;
    const campos = PLANTILLAS.estudiantes.campos;
    const col = campos.findIndex((c) => c.key === "numeroDocumento") + 1;
    expect(datos.getColumn(col).numFmt).toBe("@");
  });
});

describe("normalizadores y validadores de fila", () => {
  it("tipo de documento: acepta alias, rechaza lo desconocido y asume dni si está vacío", () => {
    expect(normalizarTipoDocumento("DNI")).toBe("dni");
    expect(normalizarTipoDocumento("ce")).toBe("carne_extranjeria");
    expect(normalizarTipoDocumento("Carné de Extranjería")).toBe("carne_extranjeria");
    expect(normalizarTipoDocumento("")).toBe("dni");
    expect(normalizarTipoDocumento("licencia")).toBeNull();
  });

  it("sexo: M/F o masculino/femenino; vacío o inválido es null", () => {
    expect(normalizarSexo("f")).toBe("F");
    expect(normalizarSexo("Masculino")).toBe("M");
    expect(normalizarSexo("")).toBeNull();
    expect(normalizarSexo("X")).toBeNull();
  });

  it("SI/NO: vacío es NO y un valor raro es null", () => {
    expect(normalizarSiNo("Sí")).toBe(true);
    expect(normalizarSiNo("no")).toBe(false);
    expect(normalizarSiNo("")).toBe(false);
    expect(normalizarSiNo("quizás")).toBeNull();
  });

  it("fecha ISO: solo fechas reales", () => {
    expect(normalizarFechaIso("2027-03-01")).toBe("2027-03-01");
    expect(normalizarFechaIso("2027-02-30")).toBeNull();
    expect(normalizarFechaIso("01/03/2027")).toBeNull();
  });

  it("docente: ya no corrige en silencio contrato, jornada ni fecha de ingreso", () => {
    const ok = { tipoContrato: "nombrado", jornada: "30", fechaIngreso: "2027-03-01" };
    expect(validarCamposDocenteFila(ok).esValida).toBe(true);
    expect(validarCamposDocenteFila({ ...ok, tipoContrato: "" }).esValida).toBe(false);
    expect(validarCamposDocenteFila({ ...ok, tipoContrato: "interino" }).esValida).toBe(false);
    expect(validarCamposDocenteFila({ ...ok, jornada: "35" }).esValida).toBe(false);
    expect(validarCamposDocenteFila({ ...ok, fechaIngreso: "" }).esValida).toBe(false);
  });

  it("estudiante: fecha de ingreso obligatoria y detalle solo con discapacidad", () => {
    const ok = { fechaIngreso: "2026-03-01" };
    expect(validarCamposEstudianteFila(ok).esValida).toBe(true);
    expect(validarCamposEstudianteFila({}).esValida).toBe(false);
    expect(
      validarCamposEstudianteFila({
        ...ok,
        tieneDiscapacidad: "NO",
        detalleDiscapacidad: "Usa lentes",
      }).esValida,
    ).toBe(false);
    expect(
      validarCamposEstudianteFila({
        ...ok,
        tieneDiscapacidad: "SI",
        detalleDiscapacidad: "Usa lentes",
      }).esValida,
    ).toBe(true);
  });

  it("apoderado: parentesco de la lista y principal SI/NO", () => {
    expect(validarCamposApoderadoFila({ parentesco: "madre", esPrincipal: "SI" }).esValida).toBe(
      true,
    );
    expect(validarCamposApoderadoFila({}).esValida).toBe(false);
    expect(validarCamposApoderadoFila({ parentesco: "vecino" }).esValida).toBe(false);
    expect(
      validarCamposApoderadoFila({ parentesco: "madre", esPrincipal: "tal vez" }).esValida,
    ).toBe(false);
  });
});
