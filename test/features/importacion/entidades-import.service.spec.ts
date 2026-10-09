import { Test, TestingModule } from "@nestjs/testing";
import { ApoderadosService } from "@/features/apoderados/apoderados.service";
import { DocentesService } from "@/features/docentes/docentes.service";
import { DocentesRepository } from "@/features/docentes/repositories/docentes.repository";
import { EstudiantesService } from "@/features/estudiantes/estudiantes.service";
import { EstudiantesRepository } from "@/features/estudiantes/repositories/estudiantes.repository";
import type { CreatePersonaDto, PersonaResponseDto } from "@/features/personas/dto";
import { PersonasService } from "@/features/personas/personas.service";
import {
  ApoderadosImportService,
  DocentesImportService,
  EstudiantesImportService,
  PersonasImportService,
} from "@/features/importacion/services";

describe("EntidadesImportServices (Especializados)", () => {
  let personasImportService: PersonasImportService;
  let estudiantesImportService: EstudiantesImportService;
  let docentesImportService: DocentesImportService;
  let apoderadosImportService: ApoderadosImportService;

  let mockPersonasService: { create: jest.Mock };
  let mockEstudiantesRepo: { findByCodigo: jest.Mock; findByPersonaId: jest.Mock };
  let mockEstudiantesService: { create: jest.Mock };
  let mockDocentesRepo: { findByCodigo: jest.Mock; findByPersonaId: jest.Mock };
  let mockDocentesService: { create: jest.Mock };
  let mockApoderadosService: { create: jest.Mock };

  beforeEach(async () => {
    mockPersonasService = { create: jest.fn() };
    mockEstudiantesRepo = { findByCodigo: jest.fn(), findByPersonaId: jest.fn() };
    mockEstudiantesService = { create: jest.fn() };
    mockDocentesRepo = { findByCodigo: jest.fn(), findByPersonaId: jest.fn() };
    mockDocentesService = { create: jest.fn() };
    mockApoderadosService = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonasImportService,
        EstudiantesImportService,
        DocentesImportService,
        ApoderadosImportService,
        { provide: PersonasService, useValue: mockPersonasService },
        { provide: EstudiantesRepository, useValue: mockEstudiantesRepo },
        { provide: EstudiantesService, useValue: mockEstudiantesService },
        { provide: DocentesRepository, useValue: mockDocentesRepo },
        { provide: DocentesService, useValue: mockDocentesService },
        { provide: ApoderadosService, useValue: mockApoderadosService },
      ],
    }).compile();

    personasImportService = module.get(PersonasImportService);
    estudiantesImportService = module.get(EstudiantesImportService);
    docentesImportService = module.get(DocentesImportService);
    apoderadosImportService = module.get(ApoderadosImportService);
  });

  describe("PersonasImportService", () => {
    it("debe retornar ya_registrada si la persona ya existe", () => {
      const res = personasImportService.analizar({
        numeroFila: 2,
        datos: { nombres: "Ana" },
        personaExistente: { id: "p-1" } as unknown as PersonaResponseDto,
        codigosEnLote: new Set(),
        principalesPorEstudiante: new Set(),
      });
      expect(res.estado).toBe("ya_registrada");
      expect(res.accion).toBe("omitir");
    });

    it("debe retornar valida y accion crear si la persona no existe", () => {
      const res = personasImportService.analizar({
        numeroFila: 2,
        datos: { nombres: "Ana" },
        personaExistente: null,
        codigosEnLote: new Set(),
        principalesPorEstudiante: new Set(),
      });
      expect(res.estado).toBe("valida");
      expect(res.accion).toBe("crear");
    });

    it("no debe crear persona si ya existe al procesar", async () => {
      const res = await personasImportService.procesar({
        datos: {},
        basePersona: {} as unknown as CreatePersonaDto,
        personaExistente: { id: "p-1" } as unknown as PersonaResponseDto,
        actorId: "admin-1",
      });
      expect(res).toBeNull();
      expect(mockPersonasService.create).not.toHaveBeenCalled();
    });
  });

  describe("EstudiantesImportService", () => {
    it("debe rechazar fila sin codigoSiagie", async () => {
      const res = await estudiantesImportService.analizar({
        numeroFila: 2,
        datos: {},
        personaExistente: null,
        codigosEnLote: new Set(),
        principalesPorEstudiante: new Set(),
      });
      expect(res.estado).toBe("error");
      expect(res.mensaje).toContain("código SIAGIE es obligatorio");
    });

    it("debe reutilizar persona si ya existe pero no como estudiante", async () => {
      mockEstudiantesRepo.findByCodigo.mockResolvedValue(null);
      mockEstudiantesRepo.findByPersonaId.mockResolvedValue(null);

      const res = await estudiantesImportService.analizar({
        numeroFila: 2,
        datos: { codigoSiagie: "SIAGIE001" },
        personaExistente: { id: "p-1" } as unknown as PersonaResponseDto,
        codigosEnLote: new Set(),
        principalesPorEstudiante: new Set(),
      });

      expect(res.estado).toBe("valida");
      expect(res.accion).toBe("reutilizar");
    });
  });

  describe("DocentesImportService", () => {
    it("debe rechazar fila sin codigoDocente", async () => {
      const res = await docentesImportService.analizar({
        numeroFila: 2,
        datos: {},
        personaExistente: null,
        codigosEnLote: new Set(),
        principalesPorEstudiante: new Set(),
      });
      expect(res.estado).toBe("error");
      expect(res.mensaje).toContain("código de docente es obligatorio");
    });
  });

  describe("ApoderadosImportService", () => {
    it("debe rechazar si el estudiante no existe", async () => {
      mockEstudiantesRepo.findByCodigo.mockResolvedValue(null);

      const res = await apoderadosImportService.analizar({
        numeroFila: 2,
        datos: { codigoSiagieEstudiante: "SIAGIE999" },
        personaExistente: null,
        codigosEnLote: new Set(),
        principalesPorEstudiante: new Set(),
      });

      expect(res.estado).toBe("error");
      expect(res.mensaje).toContain("No existe un estudiante con ese código");
    });
  });
});
