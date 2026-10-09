import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "@/common/services/audit.service";
import { CargosRepository } from "@/features/cargos/repositories/cargos.repository";
import { APODERADO_MESSAGES } from "@/features/apoderados/constants";
import { ApoderadosService } from "@/features/apoderados/apoderados.service";
import type { CreateApoderadoDto, VincularEstudianteApoderadoDto } from "@/features/apoderados/dto";
import { ApoderadosRepository } from "@/features/apoderados/repositories/apoderados.repository";
import { PersonasRepository } from "@/features/personas/repositories/personas.repository";
import { RolesRepository } from "@/features/roles/repositories/roles.repository";
import type { PersonaResponseDto } from "@/features/personas/dto";
import type { RoleResponseDto } from "@/features/roles/dto";

describe("ApoderadosService (RF-007 Historia de Usuario 4)", () => {
  let service: ApoderadosService;
  let repository: jest.Mocked<ApoderadosRepository>;
  let personasRepository: jest.Mocked<PersonasRepository>;
  let cargosRepository: jest.Mocked<CargosRepository>;
  let rolesRepository: jest.Mocked<RolesRepository>;
  let auditService: jest.Mocked<AuditService>;

  const mockPersona: PersonaResponseDto = {
    id: "per-apod-1",
    tipoDocumento: "dni",
    numeroDocumento: "09876543",
    nombres: "María Elena",
    apellidoPaterno: "Mamani",
    apellidoMaterno: "Condori",
    nombreCompleto: "Mamani Condori, María Elena",
    sexo: "F",
    esProvisional: false,
    fichas: {
      esDocente: false,
      esEstudiante: false,
      esApoderado: true,
      tieneUsuario: true,
    },
    creadoEn: "2026-10-09T00:00:00Z",
    actualizadoEn: "2026-10-09T00:00:00Z",
  };

  const mockApoderado = {
    id: "apod-1",
    personaId: "per-apod-1",
    ocupacion: "Contadora",
    centroLaboral: "Comercializadora Sur",
    telefonoLaboral: "019876543",
    gradoInstruccion: "universitaria" as const,
    cargoVigente: "Apoderado(a)",
    usuario: { id: "usr-apod-1", nombreUsuario: "09876543", estado: "activo" },
    estudiantes: [],
    creadoEn: "2026-10-09T00:00:00Z",
    actualizadoEn: "2026-10-09T00:00:00Z",
    persona: mockPersona,
  };

  const mockRolApoderado: RoleResponseDto = {
    id: "rol-apod",
    nombre: "Apoderado",
    descripcion: "Rol apoderado",
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
      findByEstudianteId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      vincularEstudiante: jest.fn(),
      desvincularEstudiante: jest.fn(),
      getVinculo: jest.fn(),
    } as unknown as jest.Mocked<ApoderadosRepository>;

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
        ApoderadosService,
        { provide: ApoderadosRepository, useValue: repository },
        { provide: PersonasRepository, useValue: personasRepository },
        { provide: CargosRepository, useValue: cargosRepository },
        { provide: RolesRepository, useValue: rolesRepository },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<ApoderadosService>(ApoderadosService);
  });

  describe("create (Escenarios HU4)", () => {
    const createDto: CreateApoderadoDto = {
      ocupacion: "Contadora",
      centroLaboral: "Comercializadora Sur",
      telefonoLaboral: "019876543",
      gradoInstruccion: "universitaria",
      nuevaPersona: {
        tipoDocumento: "dni",
        numeroDocumento: "09876543",
        nombres: "María Elena",
        apellidoPaterno: "Mamani",
        apellidoMaterno: "Condori",
        sexo: "F",
      },
    };

    it("debe crear un apoderado exitosamente con nueva persona, cargo y cuenta", async () => {
      personasRepository.findByDocumento.mockResolvedValue(null);
      cargosRepository.findByName.mockResolvedValue({ id: "cargo-apod" });
      rolesRepository.findByName.mockResolvedValue(mockRolApoderado);
      repository.create.mockResolvedValue({
        apoderado: mockApoderado,
        tempPassword: "TempPassword123*",
        vinculo: null,
      });

      const result = await service.create(createDto, "admin-1");

      expect(result.apoderado.id).toBe("apod-1");
      expect(result.tempPassword).toBeDefined();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "crear", tabla: "apoderados" }),
      );
    });

    it("debe reutilizar persona existente en padrón si no tenía ficha de apoderado", async () => {
      personasRepository.findByDocumento.mockResolvedValue(mockPersona);
      repository.findByPersonaId.mockResolvedValue(null);
      cargosRepository.findByName.mockResolvedValue({ id: "cargo-apod" });
      rolesRepository.findByName.mockResolvedValue(mockRolApoderado);
      repository.create.mockResolvedValue({
        apoderado: mockApoderado,
        tempPassword: null,
        vinculo: null,
      });

      const result = await service.create(createDto, "admin-1");

      expect(result.apoderado).toBeDefined();
      expect(repository.create).toHaveBeenCalled();
    });

    it("debe rechazar si la persona ya cuenta con ficha de apoderado", async () => {
      personasRepository.findById.mockResolvedValue(mockPersona);
      repository.findByPersonaId.mockResolvedValue(mockApoderado);

      await expect(
        service.create(
          { ...createDto, personaId: "per-apod-1", nuevaPersona: undefined },
          "admin-1",
        ),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.create(
          { ...createDto, personaId: "per-apod-1", nuevaPersona: undefined },
          "admin-1",
        ),
      ).rejects.toThrow(APODERADO_MESSAGES.PERSONA_YA_APODERADO);
    });

    it("debe rechazar si no se envía personaId ni nuevaPersona", async () => {
      await expect(
        service.create({ ...createDto, personaId: undefined, nuevaPersona: undefined }, "admin-1"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("vincularEstudiante (Escenarios HU4)", () => {
    const vinculoDto: VincularEstudianteApoderadoDto = {
      estudianteId: "est-1",
      apoderadoId: "apod-1",
      parentesco: "madre",
      esPrincipal: true,
      viveConEstudiante: true,
      autorizadoRecoger: true,
      contactoEmergencia: true,
    };

    it("debe vincular al apoderado con el estudiante y registrar auditoría", async () => {
      repository.vincularEstudiante.mockResolvedValue({
        estudianteId: "est-1",
        apoderadoId: "apod-1",
        parentesco: "madre",
        esPrincipal: true,
        viveConEstudiante: true,
        autorizadoRecoger: true,
        contactoEmergencia: true,
        creadoEn: "2026-10-09T00:00:00Z",
      });

      const result = await service.vincularEstudiante(vinculoDto, "admin-1");

      expect(result.parentesco).toBe("madre");
      expect(result.esPrincipal).toBe(true);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "crear", tabla: "estudiante_apoderados" }),
      );
    });
  });

  describe("desvincularEstudiante (Escenarios HU4)", () => {
    it("debe retirar el vínculo familiar si existe", async () => {
      repository.getVinculo.mockResolvedValue({
        estudianteId: "est-1",
        apoderadoId: "apod-1",
        parentesco: "madre",
        esPrincipal: true,
        viveConEstudiante: true,
        autorizadoRecoger: true,
        contactoEmergencia: true,
        creadoEn: "2026-10-09T00:00:00Z",
      });
      repository.desvincularEstudiante.mockResolvedValue(true);

      const result = await service.desvincularEstudiante("est-1", "apod-1", "admin-1");

      expect(result.message).toBe(APODERADO_MESSAGES.DESVINCULADO_SUCCESS);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "eliminar", tabla: "estudiante_apoderados" }),
      );
    });

    it("debe rechazar si el vínculo familiar no existe", async () => {
      repository.getVinculo.mockResolvedValue(null);

      await expect(
        service.desvincularEstudiante("est-1", "apod-non-existent", "admin-1"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("update & delete", () => {
    it("debe actualizar los datos laborales del apoderado", async () => {
      repository.findById.mockResolvedValue(mockApoderado);
      repository.update.mockResolvedValue({
        ...mockApoderado,
        ocupacion: "Auditora Financiera",
      });

      const result = await service.update(
        "apod-1",
        { ocupacion: "Auditora Financiera" },
        "admin-1",
      );

      expect(result.ocupacion).toBe("Auditora Financiera");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "actualizar", tabla: "apoderados" }),
      );
    });

    it("debe dar de baja la ficha de apoderado", async () => {
      repository.findById.mockResolvedValue(mockApoderado);
      repository.delete.mockResolvedValue(true);

      const result = await service.delete("apod-1", "admin-1");

      expect(result.message).toBe(APODERADO_MESSAGES.DELETED_SUCCESS);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "eliminar", tabla: "apoderados" }),
      );
    });
  });
});
