import { BadRequestException } from "@nestjs/common";
import { MatriculasImportService } from "../../../src/features/importacion/services/matriculas-import.service";
import type { MatriculasService } from "../../../src/features/matriculas/matriculas.service";
import type { MatriculasRepository } from "../../../src/features/matriculas/repositories";

describe("MatriculasImportService", () => {
  let service: MatriculasImportService;
  let matriculasRepository: {
    findAnioParaMatricula: jest.Mock;
    listarSeccionesActivasDeAnio: jest.Mock;
    findEstudiantesPorCodigosODocumentos: jest.Mock;
    findMatriculasDeEstudiantesEnAnio: jest.Mock;
  };
  let matriculasService: {
    matricular: jest.Mock;
  };

  beforeEach(() => {
    matriculasRepository = {
      findAnioParaMatricula: jest.fn(),
      listarSeccionesActivasDeAnio: jest.fn(),
      findEstudiantesPorCodigosODocumentos: jest.fn(),
      findMatriculasDeEstudiantesEnAnio: jest.fn(),
    };
    matriculasService = {
      matricular: jest.fn(),
    };

    service = new MatriculasImportService(
      matriculasRepository as unknown as MatriculasRepository,
      matriculasService as unknown as MatriculasService,
    );
  });

  it("debe previsualizar filas válidas resolviendo grado por palabra y sección con espacios", async () => {
    matriculasRepository.findAnioParaMatricula.mockResolvedValue({
      id: "anio-2026",
      anio: 2026,
      estado: "en_curso",
    });
    matriculasRepository.listarSeccionesActivasDeAnio.mockResolvedValue([
      {
        id: "sec-2ap",
        anioAcademicoId: "anio-2026",
        anioNumero: 2026,
        gradoId: "grado-2",
        gradoNumero: 2,
        gradoNombre: "2.° Secundaria",
        nombre: "2 AP",
        vacantes: 25,
        estado: "activa",
        matriculadosCount: 0,
        vacantesDisponibles: 25,
      },
    ]);
    matriculasRepository.findEstudiantesPorCodigosODocumentos.mockResolvedValue([
      {
        id: "est-1",
        personaId: "per-1",
        codigo: "00000078360633",
        estado: "activo",
        nombres: "DANAE FERNANDA",
        apellidoPaterno: "ANCALLE",
        apellidoMaterno: "MARTINEZ",
        numeroDocumento: "78360633",
        tipoDocumento: "dni",
      },
    ]);
    matriculasRepository.findMatriculasDeEstudiantesEnAnio.mockResolvedValue([]);

    const resultado = await service.previsualizarFilas(
      [
        {
          codigoSiagie: "00000078360633",
          grado: "SEGUNDO",
          seccion: "2AP",
          tipoMatricula: "continuador",
        },
      ],
      "anio-2026",
    );

    expect(resultado.validasCount).toBe(1);
    expect(resultado.erroresCount).toBe(0);
    expect(resultado.omitidasCount).toBe(0);
    expect(resultado.filasAnalizadas[0].estado).toBe("valida");
    expect(resultado.filasAnalizadas[0].datos._seccionId).toBe("sec-2ap");
    expect(resultado.filasAnalizadas[0].datos.gradoSeccion).toBe("2.° Secundaria - 2 AP");
  });

  it("debe resolver secciones prefijadas con el número de grado en SIAGIE (ej. '2 AP' -> 'AP')", async () => {
    matriculasRepository.findAnioParaMatricula.mockResolvedValue({
      id: "anio-2026",
      anio: 2026,
      estado: "en_curso",
    });
    matriculasRepository.listarSeccionesActivasDeAnio.mockResolvedValue([
      {
        id: "sec-ap-2",
        anioAcademicoId: "anio-2026",
        anioNumero: 2026,
        gradoId: "grado-2",
        gradoNumero: 2,
        gradoNombre: "2.° de secundaria",
        nombre: "AP",
        vacantes: 30,
        estado: "activa",
        matriculadosCount: 0,
        vacantesDisponibles: 30,
      },
    ]);
    matriculasRepository.findEstudiantesPorCodigosODocumentos.mockResolvedValue([
      {
        id: "est-2",
        personaId: "per-2",
        codigo: "00000077715242",
        estado: "activo",
        nombres: "LUCERO",
        apellidoPaterno: "BELITO",
        apellidoMaterno: "VILLANUEVA",
        numeroDocumento: "77715242",
        tipoDocumento: "dni",
      },
    ]);
    matriculasRepository.findMatriculasDeEstudiantesEnAnio.mockResolvedValue([]);

    const resultado = await service.previsualizarFilas([
      { codigoSiagie: "00000077715242", grado: "SEGUNDO", seccion: "2 AP" },
    ]);

    expect(resultado.validasCount).toBe(1);
    expect(resultado.filasAnalizadas[0].datos._seccionId).toBe("sec-ap-2");
    expect(resultado.filasAnalizadas[0].datos.gradoSeccion).toBe("2.° de secundaria - AP");
  });

  it("debe marcar como ya_registrada si el estudiante ya está matriculado en el año", async () => {
    matriculasRepository.findAnioParaMatricula.mockResolvedValue({
      id: "anio-2026",
      anio: 2026,
      estado: "en_curso",
    });
    matriculasRepository.listarSeccionesActivasDeAnio.mockResolvedValue([]);
    matriculasRepository.findEstudiantesPorCodigosODocumentos.mockResolvedValue([
      {
        id: "est-1",
        personaId: "per-1",
        codigo: "00000078360633",
        estado: "activo",
        nombres: "DANAE",
        apellidoPaterno: "ANCALLE",
        apellidoMaterno: null,
        numeroDocumento: "78360633",
        tipoDocumento: "dni",
      },
    ]);
    matriculasRepository.findMatriculasDeEstudiantesEnAnio.mockResolvedValue([
      {
        estudianteId: "est-1",
        id: "mat-1",
        codigo: "2026-000001",
        estado: "matriculado",
      },
    ]);

    const resultado = await service.previsualizarFilas([
      { codigoSiagie: "00000078360633", grado: "1", seccion: "A" },
    ]);

    expect(resultado.omitidasCount).toBe(1);
    expect(resultado.filasAnalizadas[0].estado).toBe("ya_registrada");
  });

  it("debe controlar el tope de vacantes proyectadas dentro del mismo lote", async () => {
    matriculasRepository.findAnioParaMatricula.mockResolvedValue({
      id: "anio-2026",
      anio: 2026,
      estado: "en_curso",
    });
    matriculasRepository.listarSeccionesActivasDeAnio.mockResolvedValue([
      {
        id: "sec-1a",
        anioAcademicoId: "anio-2026",
        anioNumero: 2026,
        gradoId: "grado-1",
        gradoNumero: 1,
        gradoNombre: "1.° Secundaria",
        nombre: "A",
        vacantes: 1,
        estado: "activa",
        matriculadosCount: 0,
        vacantesDisponibles: 1,
      },
    ]);
    matriculasRepository.findEstudiantesPorCodigosODocumentos.mockResolvedValue([
      {
        id: "est-1",
        personaId: "per-1",
        codigo: "COD-1",
        estado: "activo",
        nombres: "UNO",
        apellidoPaterno: "A",
        apellidoMaterno: null,
        numeroDocumento: "11111111",
        tipoDocumento: "dni",
      },
      {
        id: "est-2",
        personaId: "per-2",
        codigo: "COD-2",
        estado: "activo",
        nombres: "DOS",
        apellidoPaterno: "B",
        apellidoMaterno: null,
        numeroDocumento: "22222222",
        tipoDocumento: "dni",
      },
    ]);
    matriculasRepository.findMatriculasDeEstudiantesEnAnio.mockResolvedValue([]);

    const resultado = await service.previsualizarFilas([
      { codigoSiagie: "COD-1", grado: "PRIMERO", seccion: "A" },
      { codigoSiagie: "COD-2", grado: "PRIMERO", seccion: "A" },
    ]);

    expect(resultado.validasCount).toBe(1);
    expect(resultado.erroresCount).toBe(1);
    expect(resultado.filasAnalizadas[1].mensaje).toContain("vacantes");
  });

  it("debe lanzar BadRequestException si no hay un año académico válido", async () => {
    matriculasRepository.findAnioParaMatricula.mockResolvedValue(null);

    await expect(
      service.previsualizarFilas([{ codigoSiagie: "COD-1", grado: "1", seccion: "A" }]),
    ).rejects.toThrow(BadRequestException);
  });

  it("debe procesar una fila válida delegando en MatriculasService.matricular", async () => {
    matriculasService.matricular.mockResolvedValue({ matricula: { id: "mat-1" } });

    const ok = await service.procesarFila(
      {
        _estudianteId: "est-1",
        _seccionId: "sec-1a",
        _anioAcademicoId: "anio-2026",
        tipoMatricula: "nuevo",
        fechaMatricula: "2026-03-02",
        esRepitente: "NO",
      },
      "anio-2026",
      "actor-1",
      "127.0.0.1",
    );

    expect(ok).toBe(true);
    expect(matriculasService.matricular).toHaveBeenCalledWith(
      {
        estudianteId: "est-1",
        anioAcademicoId: "anio-2026",
        seccionId: "sec-1a",
        tipo: "nuevo",
        esRepitente: false,
        colegioProcedencia: undefined,
        fechaMatricula: "2026-03-02",
        observaciones: undefined,
      },
      "actor-1",
      "127.0.0.1",
      { silenciarNotificacion: true },
    );
  });
});
