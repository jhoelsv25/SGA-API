import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "@/common/services/audit.service";
import { MATRICULA_MESSAGES } from "@/features/matriculas/constants";
import { MatriculasService } from "@/features/matriculas/matriculas.service";
import { MatriculasRepository } from "@/features/matriculas/repositories";
import {
  MatriculaMasivaService,
  MatriculaOperacionesService,
} from "@/features/matriculas/services";

describe("MatriculasService (RF-009: HU1 Matrícula individual y orquestación)", () => {
  let service: MatriculasService;
  let repo: jest.Mocked<MatriculasRepository>;
  let audit: jest.Mocked<AuditService>;

  const mockEstudiante = {
    id: "est-1",
    personaId: "per-1",
    codigo: "EST-001",
    estado: "activo",
    nombres: "Juan",
    apellidoPaterno: "Perez",
    apellidoMaterno: "Gomez",
    tipoDocumento: "dni",
    numeroDocumento: "70123456",
  };

  const mockAnio = {
    id: "anio-2027",
    anio: 2027,
    estado: "en_curso",
  };

  const mockSeccion = {
    id: "sec-1",
    anioAcademicoId: "anio-2027",
    anioNumero: 2027,
    gradoId: "grado-1",
    gradoNumero: 1,
    gradoNombre: "1.° de Secundaria",
    nombre: "A",
    vacantes: 35,
    estado: "activa",
    matriculadosCount: 20,
    vacantesDisponibles: 15,
  };

  const mockMatricula = {
    id: "mat-1",
    codigo: "2027-000001",
    fechaMatricula: "2027-03-01",
    tipo: "nuevo",
    estado: "matriculado",
    esRepitente: false,
    colegioProcedencia: null,
    fechaRetiro: null,
    motivoRetiro: null,
    observaciones: null,
    anioAcademicoId: "anio-2027",
    anioNumero: 2027,
    gradoId: "grado-1",
    gradoNumero: 1,
    gradoNombre: "1.° de Secundaria",
    seccionId: "sec-1",
    seccionNombre: "A",
    estudiante: {
      id: "est-1",
      codigo: "EST-001",
      nombres: "Juan",
      apellidos: "Perez Gomez",
      tipoDocumento: "dni",
      numeroDocumento: "70123456",
      estado: "activo",
    },
    creadoEn: "2027-03-01T00:00:00Z",
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepo = {
      findEstudianteById: jest.fn().mockResolvedValue(mockEstudiante),
      findAnioById: jest.fn().mockResolvedValue(mockAnio),
      findSeccionById: jest.fn().mockResolvedValue(mockSeccion),
      findMatriculaByEstudianteYAnio: jest.fn().mockResolvedValue(null),
      getNextCorrelativo: jest.fn().mockResolvedValue(1),
      hasApoderadoPrincipal: jest.fn().mockResolvedValue(true),
      create: jest.fn().mockResolvedValue("mat-1"),
      findMatriculaById: jest.fn().mockResolvedValue(mockMatricula),
      findMatriculas: jest.fn().mockResolvedValue({ items: [mockMatricula], total: 1 }),
      getDatosConstancia: jest.fn().mockResolvedValue({
        codigoMatricula: "2027-000001",
        fechaMatricula: "2027-03-01",
        tipoMatricula: "nuevo",
        anioEscolar: 2027,
        gradoNumero: 1,
        gradoNombre: "1.° de Secundaria",
        seccionNombre: "A",
        estudiante: {
          codigo: "EST-001",
          nombres: "Juan",
          apellidos: "Perez Gomez",
          tipoDocumento: "dni",
          numeroDocumento: "70123456",
        },
        institucion: {
          nombre: "Colegio Nacional San Juan",
        },
      }),
    };

    const mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const mockOperaciones = {
      retirar: jest.fn(),
      trasladar: jest.fn(),
      cambiarSeccion: jest.fn(),
      anular: jest.fn(),
    };

    const mockMasiva = {
      matricularMasivamente: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatriculasService,
        { provide: MatriculasRepository, useValue: mockRepo },
        { provide: MatriculaOperacionesService, useValue: mockOperaciones },
        { provide: MatriculaMasivaService, useValue: mockMasiva },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<MatriculasService>(MatriculasService);
    repo = module.get(MatriculasRepository);
    audit = module.get(AuditService);
  });

  describe("matricular (HU1)", () => {
    it("debe rechazar si el estudiante no está en estado activo", async () => {
      repo.findEstudianteById.mockResolvedValueOnce({
        ...mockEstudiante,
        estado: "egresado",
      });

      await expect(
        service.matricular(
          {
            estudianteId: "est-1",
            anioAcademicoId: "anio-2027",
            seccionId: "sec-1",
            tipo: "nuevo",
          },
          "admin-1",
        ),
      ).rejects.toThrow(MATRICULA_MESSAGES.ESTUDIANTE_NO_ACTIVO);
    });

    it("debe rechazar si el estudiante ya tiene matrícula en el año", async () => {
      repo.findMatriculaByEstudianteYAnio.mockResolvedValueOnce({
        id: "mat-existente",
        codigo: "2027-000001",
        estado: "matriculado",
      });

      await expect(
        service.matricular(
          {
            estudianteId: "est-1",
            anioAcademicoId: "anio-2027",
            seccionId: "sec-1",
            tipo: "nuevo",
          },
          "admin-1",
        ),
      ).rejects.toThrow(ConflictException);
    });

    it("debe rechazar si la sección no tiene vacantes disponibles", async () => {
      repo.findSeccionById.mockResolvedValueOnce({
        ...mockSeccion,
        vacantesDisponibles: 0,
      });

      await expect(
        service.matricular(
          {
            estudianteId: "est-1",
            anioAcademicoId: "anio-2027",
            seccionId: "sec-1",
            tipo: "nuevo",
          },
          "admin-1",
        ),
      ).rejects.toThrow(ConflictException);
    });

    it("debe rechazar si es traslado y falta colegio de procedencia", async () => {
      await expect(
        service.matricular(
          {
            estudianteId: "est-1",
            anioAcademicoId: "anio-2027",
            seccionId: "sec-1",
            tipo: "traslado",
            colegioProcedencia: "",
          },
          "admin-1",
        ),
      ).rejects.toThrow(MATRICULA_MESSAGES.FALTA_COLEGIO_PROCEDENCIA);
    });

    it("debe matricular y avisar si no tiene apoderado principal registrado", async () => {
      repo.hasApoderadoPrincipal.mockResolvedValueOnce(false);

      const res = await service.matricular(
        {
          estudianteId: "est-1",
          anioAcademicoId: "anio-2027",
          seccionId: "sec-1",
          tipo: "nuevo",
        },
        "admin-1",
      );

      expect(res.matricula).toBeDefined();
      expect(res.advertencia).toBe(MATRICULA_MESSAGES.SIN_APODERADO_PRINCIPAL);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          codigo: "2027-000001",
          tipo: "nuevo",
        }),
      );
      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe("generarConstanciaPdf", () => {
    it("debe generar un buffer PDF para una matrícula válida", async () => {
      const buffer = await service.generarConstanciaPdf("mat-1");
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("debe lanzar NotFoundException si la matrícula no existe", async () => {
      repo.getDatosConstancia.mockResolvedValueOnce(null);
      await expect(service.generarConstanciaPdf("nonexistent")).rejects.toThrow(NotFoundException);
    });
  });
});
