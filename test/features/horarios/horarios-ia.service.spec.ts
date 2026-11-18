import { HorariosService } from "../../../src/features/horarios/horarios.service";

describe("HorariosService - proponerConIa (híbrido IA + validador)", () => {
  const crearServicio = (iaServiceMock?: {
    estaHabilitada: jest.Mock;
    generarEstructurado: jest.Mock;
  }) => {
    const horariosRepoMock = {
      obtenerParametrosJornada: jest.fn().mockResolvedValue({
        minutosHoraPedagogica: 45,
        horasPedagogicasDia: 2,
        recreoDespuesDeHora: 1,
        minutosRecreo: 15,
      }),
      horaEntradaEstudiantes: jest.fn().mockResolvedValue("08:00"),
      cursosSeccionPorSeccion: jest.fn().mockResolvedValue([
        {
          cursoSeccionId: "cs-mat",
          cursoId: "cur-mat",
          cursoNombre: "Matemática",
          docenteId: "doc-1",
        },
        {
          cursoSeccionId: "cs-com",
          cursoId: "cur-com",
          cursoNombre: "Comunicación",
          docenteId: "doc-2",
        },
      ]),
      horasPlanPorCurso: jest.fn().mockResolvedValue({
        "cur-mat": { cursoNombre: "Matemática", horasPlan: 2 },
        "cur-com": { cursoNombre: "Comunicación", horasPlan: 2 },
      }),
      findBySeccion: jest.fn().mockResolvedValue([]),
      findByDocente: jest.fn().mockImplementation((_anioId: string, docenteId: string) => {
        if (docenteId === "doc-1") {
          return Promise.resolve([
            {
              id: "ocupado-otra-seccion",
              diaSemana: 1,
              horaInicio: "08:00",
              horaFin: "08:45",
            },
          ]);
        }
        return Promise.resolve([]);
      }),
    };

    const seccionesRepoMock = {
      findById: jest.fn().mockResolvedValue({ id: "sec-1", estado: "activa" }),
    };

    const aniosServiceMock = {
      findById: jest.fn().mockResolvedValue({ id: "anio-1", estado: "en_curso" }),
      findEnCurso: jest.fn().mockResolvedValue({ id: "anio-1", estado: "en_curso" }),
    };

    const anioLectivoClsMock = {
      id: jest.fn().mockReturnValue("anio-1"),
    };

    return new HorariosService(
      horariosRepoMock as never,
      seccionesRepoMock as never,
      {} as never,
      aniosServiceMock as never,
      anioLectivoClsMock as never,
      {} as never,
      undefined,
      iaServiceMock as never,
    );
  };

  it("rechaza asignaciones de IA que cruzan a un docente ocupado y completa determinísticamente sin cruces", async () => {
    const iaMock = {
      estaHabilitada: jest.fn().mockReturnValue(true),
      generarEstructurado: jest.fn().mockResolvedValue({
        datos: {
          asignaciones: [
            // doc-1 está ocupado el día 1 a las 08:00 en otra sección -> debe rechazarse
            { diaSemana: 1, horaInicio: "08:00", cursoSeccionId: "cs-mat" },
            // doc-2 está libre el día 1 a las 08:00 -> debe aceptarse
            { diaSemana: 1, horaInicio: "08:00", cursoSeccionId: "cs-com" },
          ],
        },
        textoCrudo: "{}",
        modelo: "mistral/mistral-small-latest",
        proveedor: "gateway",
      }),
    };

    const service = crearServicio(iaMock);
    const resultado = await service.proponerConIa("sec-1", {
      preferencias: "Matemática temprano",
    });

    expect(resultado.usandoIa).toBe(true);
    expect(resultado.horaEntrada).toBe("08:00");

    const bloquesMat = resultado.bloques.filter((b) => b.cursoSeccionId === "cs-mat");
    const bloquesCom = resultado.bloques.filter((b) => b.cursoSeccionId === "cs-com");

    expect(bloquesMat).toHaveLength(2);
    expect(bloquesCom).toHaveLength(2);
    // Ningún bloque de Matemática puede quedar el día 1 a las 08:00
    expect(bloquesMat.some((b) => b.diaSemana === 1 && b.horaInicio === "08:00")).toBe(false);
    // El bloque válido sugerido por la IA para Comunicación sí se respetó
    expect(bloquesCom.some((b) => b.diaSemana === 1 && b.horaInicio === "08:00")).toBe(true);
    expect(resultado.advertencias).toEqual([]);
  });

  it("funciona de forma determinista cuando IaService no está habilitado", async () => {
    const service = crearServicio();
    const resultado = await service.proponerConIa("sec-1", {});

    expect(resultado.usandoIa).toBe(false);
    expect(resultado.bloques.filter((b) => b.cursoSeccionId === "cs-mat")).toHaveLength(2);
    expect(resultado.bloques.filter((b) => b.cursoSeccionId === "cs-com")).toHaveLength(2);
    expect(resultado.advertencias).toEqual([]);
  });
});
