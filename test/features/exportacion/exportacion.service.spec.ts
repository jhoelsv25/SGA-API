import { Workbook } from "exceljs";
import { ExportacionService } from "../../../src/features/exportacion/exportacion.service";

const user = { id: "u1", username: "admin", roleId: "r", role: "Administrador", personaId: "p" };

const anioMock = {
  id: "anio-2026",
  anio: 2026,
  fechaInicio: "2026-03-02",
  fechaFin: "2026-12-18",
  estado: "en_curso",
  bimestres: [
    {
      id: "bim-1",
      numero: 1,
      nombre: "I",
      fechaInicio: "2026-03-02",
      fechaFin: "2026-05-08",
      estado: "en_curso",
    },
  ],
};

function crearServicio(mocks: {
  personasFindAll?: jest.Mock;
  docentesFindAll?: jest.Mock;
  matriculasFindAll?: jest.Mock;
  marcacionesReporte?: jest.Mock;
  libretasSeguimiento?: jest.Mock;
  libretasDetalle?: jest.Mock;
  asistenciaConsultarSeccion?: jest.Mock;
  seccionesFindAll?: jest.Mock;
}) {
  const inst = { get: jest.fn().mockResolvedValue({ nombre: "I.E. Nuestra Señora del Carmen" }) };
  const anios = {
    findById: jest.fn().mockResolvedValue(anioMock),
    findEnCurso: jest.fn().mockResolvedValue(anioMock),
  };
  const anioLectivo = { id: jest.fn().mockReturnValue("anio-2026") };

  return new ExportacionService(
    { findAll: mocks.personasFindAll ?? jest.fn() } as never,
    {} as never,
    { findAll: mocks.docentesFindAll ?? jest.fn() } as never,
    {} as never,
    {} as never,
    inst as never,
    { findAll: mocks.matriculasFindAll ?? jest.fn() } as never,
    { reporte: mocks.marcacionesReporte ?? jest.fn() } as never,
    {
      seguimiento: mocks.libretasSeguimiento ?? jest.fn(),
      detalle: mocks.libretasDetalle ?? jest.fn(),
    } as never,
    anios as never,
    anioLectivo as never,
    { consultarSeccion: mocks.asistenciaConsultarSeccion ?? jest.fn() } as never,
    { findAll: mocks.seccionesFindAll ?? jest.fn() } as never,
  );
}

describe("ExportacionService (estándar de reportes Excel)", () => {
  it("personasExcel: exporta todas las páginas con columnas de la plantilla y las propias del reporte", async () => {
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

    const { buffer, nombreArchivo } = await crearServicio({
      personasFindAll: findAll,
    }).personasExcel({ search: "Quispe" }, user);

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

  it("matriculasExcel: genera nómina con fecha real, documento como texto y año académico en Información", async () => {
    const findAll = jest.fn().mockResolvedValue({
      data: [
        {
          codigo: "2026-000001",
          anioNumero: 2026,
          gradoNombre: "1.° de Secundaria",
          seccionNombre: "A",
          tipo: "continuador",
          esRepitente: false,
          estado: "matriculado",
          fechaMatricula: "2026-03-01",
          fechaRetiro: null,
          motivoRetiro: null,
          colegioProcedencia: null,
          estudiante: {
            codigo: "00123456",
            tipoDocumento: "dni",
            numeroDocumento: "00998877",
            apellidos: "Pérez Gómez",
            nombres: "Lucía",
          },
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    const { buffer, nombreArchivo } = await crearServicio({
      matriculasFindAll: findAll,
    }).matriculasExcel({ limit: 20 }, user);

    expect(nombreArchivo).toMatch(/^sga_matriculas_\d{4}-\d{2}-\d{2}\.xlsx$/);
    const wb = new Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const hoja = wb.getWorksheet("Reporte")!;
    const info = wb.getWorksheet("Información")!;
    expect(hoja.getCell("A2").value).toBe("2026-000001");
    expect(hoja.getCell("G2").value).toBe("00998877");
    expect(hoja.getCell("M2").value).toBeInstanceOf(Date);
    expect(info.getColumn(2).values).toEqual(expect.arrayContaining(["2026"]));
  });

  it("marcacionesExcel: resuelve el rango del bimestre cuando se pasa periodoId", async () => {
    const reporte = jest.fn().mockResolvedValue({
      data: [
        {
          fechaHora: "2026-03-10 07:45:12",
          nombreCompleto: "Quispe Ana",
          tipoPersona: "estudiantes",
          tipo: "entrada",
          origen: "kiosko",
          resultado: "tardanza",
          minutosTardanza: 5,
          justificada: false,
          motivoJustificacion: null,
          observacion: null,
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    const { buffer, nombreArchivo } = await crearServicio({
      marcacionesReporte: reporte,
    }).marcacionesExcel({ periodoId: "bim-1" }, user);

    expect(reporte).toHaveBeenCalledWith(
      expect.objectContaining({ desde: "2026-03-02", hasta: "2026-05-08" }),
    );
    expect(nombreArchivo).toMatch(/^sga_marcaciones_\d{4}-\d{2}-\d{2}\.xlsx$/);
    const wb = new Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const hoja = wb.getWorksheet("Reporte")!;
    expect(hoja.getCell("A2").value).toBeInstanceOf(Date);
    expect(hoja.getCell("B2").value).toBe("07:45:12");
    expect(hoja.getCell("H2").value).toBe(5);
  });

  it("libretasExcel: incluye hoja Reporte (resumen), hoja Detalle (estudiantes) e Información", async () => {
    const seguimiento = jest.fn().mockResolvedValue({
      secciones: [
        {
          seccionId: "sec-1",
          gradoNombre: "1.° de Secundaria",
          seccionNombre: "A",
          programadas: 20,
          aTiempo: 18,
          fueraDePlazo: 1,
          pendientes: 1,
          porcentajeATiempo: 90,
          vistas: 15,
        },
      ],
    });
    const detalle = jest.fn().mockResolvedValue([
      {
        libretaId: "lib-1",
        matriculaId: "mat-1",
        codigo: "00123456",
        nombreCompleto: "Pérez Lucía",
        estado: "a_tiempo",
        fechaLimite: "2026-05-15",
        vistoEn: "2026-05-14 18:00:00",
      },
    ]);

    const { buffer, nombreArchivo } = await crearServicio({
      libretasSeguimiento: seguimiento,
      libretasDetalle: detalle,
    }).libretasExcel({ periodoId: "bim-1" }, user);

    expect(nombreArchivo).toMatch(/^sga_libretas_\d{4}-\d{2}-\d{2}\.xlsx$/);
    const wb = new Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Reporte", "Detalle", "Información"]);
    const det = wb.getWorksheet("Detalle")!;
    expect(det.getCell("C2").value).toBe("00123456");
    expect(det.getCell("F2").value).toBeInstanceOf(Date);
    expect(det.getCell("G2").value).toBe("SI");
  });

  it("asistenciaSeccionExcel: exporta todas las secciones de un grado con faltas al colegio y por curso", async () => {
    const seccionesFindAll = jest.fn().mockResolvedValue([
      { id: "sec-1a", gradoNombre: "1.° de Secundaria", nombre: "A" },
      { id: "sec-1b", gradoNombre: "1.° de Secundaria", nombre: "B" },
    ]);
    const consultarSeccion = jest
      .fn()
      .mockResolvedValueOnce({
        seccionId: "sec-1a",
        seccionNombre: "1.° A",
        desde: "2026-03-02",
        hasta: "2026-05-08",
        diasConClases: 40,
        estudiantes: [
          {
            estudianteId: "e1",
            nombreCompleto: "Álvarez Ana",
            faltasColegio: 2,
            tardanzasColegio: 1,
            clases: { presentes: 35, tardanzas: 2, faltas: 3, faltasJustificadas: 1 },
          },
        ],
      })
      .mockResolvedValueOnce({
        seccionId: "sec-1b",
        seccionNombre: "1.° B",
        desde: "2026-03-02",
        hasta: "2026-05-08",
        diasConClases: 40,
        estudiantes: [
          {
            estudianteId: "e2",
            nombreCompleto: "Castro Luis",
            faltasColegio: 0,
            tardanzasColegio: 0,
            clases: { presentes: 40, tardanzas: 0, faltas: 0, faltasJustificadas: 0 },
          },
        ],
      });

    const { buffer, nombreArchivo } = await crearServicio({
      seccionesFindAll,
      asistenciaConsultarSeccion: consultarSeccion,
    }).asistenciaSeccionExcel({ gradoId: "grado-1", periodoId: "bim-1" }, user);

    expect(seccionesFindAll).toHaveBeenCalledWith({ gradoId: "grado-1", estado: "activa" });
    expect(consultarSeccion).toHaveBeenCalledTimes(2);
    expect(nombreArchivo).toMatch(/^sga_asistencia-seccion_\d{4}-\d{2}-\d{2}\.xlsx$/);
    const wb = new Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const hoja = wb.getWorksheet("Reporte")!;
    expect(hoja.rowCount).toBe(3);
    expect(hoja.getCell("A2").value).toBe("1.° A");
    expect(hoja.getCell("D2").value).toBe(2);
    expect(hoja.getCell("H2").value).toBe(3);
  });

  it("asistenciaPersonalExcel: consolida docentes activos (incluso sin marcaciones) y agrega hoja Detalle", async () => {
    const docentesFindAll = jest.fn().mockResolvedValue({
      data: [
        {
          id: "doc-1",
          personaId: "per-1",
          especialidad: "Matemática",
          cargoVigente: "Docente de aula",
          persona: {
            numeroDocumento: "40112233",
            apellidoPaterno: "Gómez",
            apellidoMaterno: "Ríos",
            nombres: "Carlos",
          },
        },
        {
          id: "doc-2",
          personaId: "per-2",
          especialidad: "Comunicación",
          cargoVigente: null,
          persona: {
            numeroDocumento: "40998877",
            apellidoPaterno: "Vargas",
            apellidoMaterno: null,
            nombres: "Elena",
          },
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
    const marcacionesReporte = jest.fn().mockResolvedValue({
      data: [
        {
          personaId: "per-1",
          nombreCompleto: "Gómez Ríos, Carlos",
          tipoPersona: "docentes",
          fechaHora: "2026-03-02 07:25:00",
          tipo: "entrada",
          origen: "biometrico",
          resultado: "puntual",
          minutosTardanza: 0,
          justificada: false,
          motivoJustificacion: null,
          observacion: null,
        },
        {
          personaId: "per-1",
          nombreCompleto: "Gómez Ríos, Carlos",
          tipoPersona: "docentes",
          fechaHora: "2026-03-03 07:42:00",
          tipo: "entrada",
          origen: "biometrico",
          resultado: "tardanza",
          minutosTardanza: 12,
          justificada: true,
          motivoJustificacion: "Trámite UGEL",
          observacion: null,
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    const { buffer, nombreArchivo, totalFilas } = await crearServicio({
      docentesFindAll,
      marcacionesReporte,
    }).asistenciaPersonalExcel(
      { desde: "2026-03-02", hasta: "2026-03-06", tipoPersona: "docentes" },
      user,
    );

    expect(nombreArchivo).toMatch(/^sga_asistencia-personal_\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(totalFilas).toBe(2);
    const wb = new Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Reporte", "Detalle", "Información"]);
    const hoja = wb.getWorksheet("Reporte")!;
    expect(hoja.getCell("C2").value).toBe("Gómez Ríos, Carlos");
    expect(hoja.getCell("F2").value).toBe(2); // días asistidos
    expect(hoja.getCell("G2").value).toBe(1); // puntuales
    expect(hoja.getCell("H2").value).toBe(1); // tardanzas
    expect(hoja.getCell("I2").value).toBe(12); // min tardanza
    expect(hoja.getCell("J2").value).toBe(1); // justificadas
    expect(hoja.getCell("M2").value).toBe(50); // % puntualidad
    expect(hoja.getCell("C3").value).toBe("Vargas, Elena"); // sin "null"
    expect(hoja.getCell("F3").value).toBe(0); // 0 días asistidos
  });
});
