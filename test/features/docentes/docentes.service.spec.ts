import { BadRequestException, ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "@/common/services/audit.service";
import { CargosRepository } from "@/features/cargos/repositories/cargos.repository";
import { DOCENTE_MESSAGES } from "@/features/docentes/constants";
import { DocentesService } from "@/features/docentes/docentes.service";
import type { CreateDocenteDto } from "@/features/docentes/dto";
import { DocentesRepository } from "@/features/docentes/repositories/docentes.repository";
import { PersonasRepository } from "@/features/personas/repositories/personas.repository";
import { RolesRepository } from "@/features/roles/repositories/roles.repository";
import type { PersonaResponseDto } from "@/features/personas/dto";
import type { RoleResponseDto } from "@/features/roles/dto";

describe("DocentesService (RF-007 Historia de Usuario 1)", () => {
  let service: DocentesService;
  let repository: jest.Mocked<DocentesRepository>;
  let personasRepository: jest.Mocked<PersonasRepository>;
  let cargosRepository: jest.Mocked<CargosRepository>;
  let rolesRepository: jest.Mocked<RolesRepository>;
  let auditService: jest.Mocked<AuditService>;

  const mockDocente = {
    id: "doc-1",
    codigo: "DOC015",
    personaId: "per-1",
    especialidad: "Matemáticas",
    tituloProfesional: "Licenciado en Educación",
    tipoContrato: "nombrado" as const,
    jornadaHoras: 30,
    fechaIngreso: "2026-03-01",
    fechaCese: null,
    estado: "activo" as const,
    firmaUrl: null,
    cargoVigente: "Docente de aula",
    usuario: { id: "usr-1", nombreUsuario: "45678912", estado: "activo" },
    credencial: { id: "cred-1", codigo: "CR-45678912", activa: true },
    creadoEn: "2026-10-09T00:00:00Z",
    actualizadoEn: "2026-10-09T00:00:00Z",
    persona: {
      id: "per-1",
      tipoDocumento: "dni" as const,
      numeroDocumento: "45678912",
      nombres: "Diego",
      apellidoPaterno: "Ramos",
      apellidoMaterno: "Flores",
      nombreCompleto: "Ramos Flores, Diego",
      sexo: "M",
      esProvisional: false,
      fichas: {
        esDocente: true,
        esEstudiante: false,
        esApoderado: false,
        tieneUsuario: true,
      },
      creadoEn: "2026-10-09T00:00:00Z",
      actualizadoEn: "2026-10-09T00:00:00Z",
    },
  };

  const mockPersona: PersonaResponseDto = mockDocente.persona;
  const mockRolDocente: RoleResponseDto = {
    id: "rol-doc",
    nombre: "Docente",
    descripcion: "Rol docente",
    esSistema: true,
    activo: true,
    creadoEn: "2026-10-09T00:00:00Z",
    actualizadoEn: "2026-10-09T00:00:00Z",
  };

  beforeEach(async () => {
    repository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByPersonaId: jest.fn(),
      findByCodigo: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      cesar: jest.fn(),
    } as unknown as jest.Mocked<DocentesRepository>;

    personasRepository = {
      findById: jest.fn(),
      findByDocumento: jest.fn(),
    } as unknown as jest.Mocked<PersonasRepository>;

    cargosRepository = {
      findById: jest.fn(),
      findByName: jest.fn(),
    } as unknown as jest.Mocked<CargosRepository>;

    rolesRepository = {
      findByName: jest.fn(),
    } as unknown as jest.Mocked<RolesRepository>;

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocentesService,
        { provide: DocentesRepository, useValue: repository },
        { provide: PersonasRepository, useValue: personasRepository },
        { provide: CargosRepository, useValue: cargosRepository },
        { provide: RolesRepository, useValue: rolesRepository },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<DocentesService>(DocentesService);
  });

  describe("create", () => {
    const createDto: CreateDocenteDto = {
      codigo: "DOC015",
      tipoContrato: "nombrado",
      jornadaHoras: 30,
      fechaIngreso: "2026-03-01",
      nuevaPersona: {
        tipoDocumento: "dni",
        numeroDocumento: "45678912",
        nombres: "Diego",
        apellidoPaterno: "Ramos",
        apellidoMaterno: "Flores",
        sexo: "M",
      },
    };

    it("debe crear un docente exitosamente con persona nueva, cargo, cuenta y credencial", async () => {
      repository.findByCodigo.mockResolvedValue(null);
      personasRepository.findByDocumento.mockResolvedValue(null);
      cargosRepository.findByName.mockResolvedValue({ id: "cargo-doc-aula" });
      rolesRepository.findByName.mockResolvedValue(mockRolDocente);
      repository.create.mockResolvedValue({
        docente: mockDocente,
        tempPassword: "TempPassword123*",
        credencial: { codigo: "CR-45678912", pin: "1234" },
      });

      const result = await service.create(createDto, "admin-1");

      expect(result.docente.codigo).toBe("DOC015");
      expect(result.tempPassword).toBeDefined();
      expect(result.credencial.pin).toBe("1234");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "crear", tabla: "docentes" }),
      );
    });

    it("debe reutilizar persona existente en padrón si ya existía sin ficha docente", async () => {
      repository.findByCodigo.mockResolvedValue(null);
      personasRepository.findByDocumento.mockResolvedValue(mockPersona);
      repository.findByPersonaId.mockResolvedValue(null);
      cargosRepository.findByName.mockResolvedValue({ id: "cargo-doc-aula" });
      rolesRepository.findByName.mockResolvedValue(mockRolDocente);
      repository.create.mockResolvedValue({
        docente: mockDocente,
        tempPassword: null,
        credencial: { codigo: "CR-45678912", pin: "1234" },
      });

      const result = await service.create(createDto, "admin-1");

      expect(result.docente).toBeDefined();
      expect(repository.create).toHaveBeenCalled();
    });

    it("debe rechazar si el código de docente ya existe", async () => {
      repository.findByCodigo.mockResolvedValue(mockDocente);

      await expect(service.create(createDto, "admin-1")).rejects.toThrow(ConflictException);
      await expect(service.create(createDto, "admin-1")).rejects.toThrow(
        DOCENTE_MESSAGES.CODIGO_DUPLICADO,
      );
    });

    it("debe rechazar si la persona ya cuenta con ficha de docente", async () => {
      repository.findByCodigo.mockResolvedValue(null);
      personasRepository.findById.mockResolvedValue(mockPersona);
      repository.findByPersonaId.mockResolvedValue(mockDocente);

      await expect(
        service.create({ ...createDto, personaId: "per-1", nuevaPersona: undefined }, "admin-1"),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.create({ ...createDto, personaId: "per-1", nuevaPersona: undefined }, "admin-1"),
      ).rejects.toThrow(DOCENTE_MESSAGES.PERSONA_YA_DOCENTE);
    });
  });

  describe("update", () => {
    it("debe actualizar datos de la ficha docente", async () => {
      repository.findById.mockResolvedValue(mockDocente);
      repository.update.mockResolvedValue({
        ...mockDocente,
        especialidad: "Física y Química",
      });

      const result = await service.update("doc-1", { especialidad: "Física y Química" }, "admin-1");

      expect(result.especialidad).toBe("Física y Química");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "actualizar", tabla: "docentes" }),
      );
    });

    it("debe rechazar si la fecha de cese es anterior o igual a la de ingreso", async () => {
      repository.findById.mockResolvedValue(mockDocente);

      await expect(service.update("doc-1", { fechaCese: "2026-02-15" }, "admin-1")).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update("doc-1", { fechaCese: "2026-02-15" }, "admin-1")).rejects.toThrow(
        DOCENTE_MESSAGES.FECHA_CESE_INVALIDA,
      );
    });
  });

  describe("cesar", () => {
    it("debe cesar al docente y registrar auditoría", async () => {
      repository.findById.mockResolvedValue(mockDocente);
      repository.cesar.mockResolvedValue({
        docente: { ...mockDocente, estado: "cesado", fechaCese: "2026-12-31" },
        mantuvoCuentaActiva: false,
      });

      const result = await service.cesar(
        "doc-1",
        { fechaCese: "2026-12-31", motivo: "Término de contrato" },
        "admin-1",
      );

      expect(result.docente.estado).toBe("cesado");
      expect(result.message).toBe(DOCENTE_MESSAGES.CESADO_SUCCESS);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "actualizar", tabla: "docentes" }),
      );
    });

    it("debe indicar mensaje especial si mantuvo su cuenta activa por tener otras fichas", async () => {
      repository.findById.mockResolvedValue(mockDocente);
      repository.cesar.mockResolvedValue({
        docente: { ...mockDocente, estado: "cesado", fechaCese: "2026-12-31" },
        mantuvoCuentaActiva: true,
      });

      const result = await service.cesar("doc-1", { fechaCese: "2026-12-31" }, "admin-1");

      expect(result.message).toContain("cuenta sigue activa");
    });

    it("debe rechazar cesar a un docente que ya se encuentra cesado", async () => {
      repository.findById.mockResolvedValue({ ...mockDocente, estado: "cesado" });

      await expect(service.cesar("doc-1", { fechaCese: "2026-12-31" }, "admin-1")).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.cesar("doc-1", { fechaCese: "2026-12-31" }, "admin-1")).rejects.toThrow(
        DOCENTE_MESSAGES.ALREADY_CESADO,
      );
    });
  });
});
