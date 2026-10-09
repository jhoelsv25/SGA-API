import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "../../../src/common/services/audit.service";
import type { AuthenticatedUser } from "../../../src/features/auth/interfaces/jwt-payload.interface";
import { PERSONA_MESSAGES } from "../../../src/features/personas/constants";
import type {
  CreatePersonaDto,
  PersonaResponseDto,
  UpdatePersonaDto,
} from "../../../src/features/personas/dto";
import { PersonasService } from "../../../src/features/personas/personas.service";
import { PersonasRepository } from "../../../src/features/personas/repositories";

describe("PersonasService (RF-007 Core Base)", () => {
  let service: PersonasService;
  let repository: jest.Mocked<Partial<PersonasRepository>>;
  let auditService: jest.Mocked<Partial<AuditService>>;

  const mockAdminUser: AuthenticatedUser = {
    id: "admin-uuid",
    username: "admin",
    roleId: "role-admin",
    role: "Administrador",
    personaId: "persona-admin",
  };

  const mockSecretariaUser: AuthenticatedUser = {
    id: "sec-uuid",
    username: "secretaria",
    roleId: "role-sec",
    role: "Secretaria",
    personaId: "persona-sec",
  };

  const mockPersonaProvisional: PersonaResponseDto = {
    id: "p-prov-1",
    tipoDocumento: "dni",
    numeroDocumento: "71234567",
    nombres: "Luis",
    apellidoPaterno: "Quispe",
    apellidoMaterno: "Mamani",
    nombreCompleto: "Quispe Mamani, Luis",
    sexo: "M",
    fechaNacimiento: "2005-04-12",
    direccion: "Av. Las Flores 123",
    distrito: "Los Olivos",
    telefono: null,
    celular: "987654321",
    correo: "luis.quispe@gmail.com",
    fotoUrl: null,
    esProvisional: true,
    fichas: {
      esDocente: false,
      esEstudiante: false,
      esApoderado: false,
      tieneUsuario: false,
    },
    cargoVigente: null,
    creadoEn: "2026-10-09T10:00:00Z",
    actualizadoEn: "2026-10-09T10:00:00Z",
  };

  const mockPersonaConFicha: PersonaResponseDto = {
    ...mockPersonaProvisional,
    id: "p-doc-1",
    esProvisional: false,
    fichas: {
      esDocente: true,
      esEstudiante: false,
      esApoderado: false,
      tieneUsuario: true,
    },
    cargoVigente: "Docente de aula",
  };

  beforeEach(async () => {
    repository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByDocumento: jest.fn(),
      findByCorreo: jest.fn(),
      search: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      hasActiveRelations: jest.fn(),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonasService,
        { provide: PersonasRepository, useValue: repository },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<PersonasService>(PersonasService);
  });

  describe("create", () => {
    const createDto: CreatePersonaDto = {
      tipoDocumento: "dni",
      numeroDocumento: "71234567",
      nombres: "Luis",
      apellidoPaterno: "Quispe",
      apellidoMaterno: "Mamani",
      sexo: "M",
      fechaNacimiento: "2005-04-12",
      correo: "luis.quispe@gmail.com",
    };

    it("debe crear una persona provisional y registrar auditoría", async () => {
      (repository.findByDocumento as jest.Mock).mockResolvedValue(null);
      (repository.findByCorreo as jest.Mock).mockResolvedValue(null);
      (repository.create as jest.Mock).mockResolvedValue(mockPersonaProvisional);

      const result = await service.create(createDto, "actor-1", "127.0.0.1");

      expect(result).toEqual(mockPersonaProvisional);
      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: "crear",
          tabla: "personas",
          registroId: mockPersonaProvisional.id,
        }),
      );
    });

    it("debe rechazar si la fecha de nacimiento es futura", async () => {
      const dtoFutura: CreatePersonaDto = {
        ...createDto,
        fechaNacimiento: "2099-01-01",
      };

      await expect(service.create(dtoFutura, "actor-1")).rejects.toThrow(BadRequestException);
      await expect(service.create(dtoFutura, "actor-1")).rejects.toThrow(
        PERSONA_MESSAGES.FECHA_NACIMIENTO_FUTURA,
      );
    });

    it("debe rechazar si ya existe una persona con el mismo documento", async () => {
      (repository.findByDocumento as jest.Mock).mockResolvedValue(mockPersonaProvisional);

      await expect(service.create(createDto, "actor-1")).rejects.toThrow(ConflictException);
      await expect(service.create(createDto, "actor-1")).rejects.toThrow(
        PERSONA_MESSAGES.DOCUMENTO_DUPLICADO,
      );
    });

    it("debe rechazar si el correo ya está registrado para otra persona", async () => {
      (repository.findByDocumento as jest.Mock).mockResolvedValue(null);
      (repository.findByCorreo as jest.Mock).mockResolvedValue(mockPersonaProvisional);

      await expect(service.create(createDto, "actor-1")).rejects.toThrow(ConflictException);
      await expect(service.create(createDto, "actor-1")).rejects.toThrow(
        PERSONA_MESSAGES.CORREO_DUPLICADO,
      );
    });
  });

  describe("search (búsqueda preventiva)", () => {
    it("debe indicar no encontrada si no hay resultados", async () => {
      (repository.search as jest.Mock).mockResolvedValue([]);

      const result = await service.search({ search: "99999999" });

      expect(result.encontrada).toBe(false);
      expect(result.persona).toBeNull();
    });

    it("debe indicar que ya existe y sugerir reutilizar datos si no tiene la ficha", async () => {
      (repository.search as jest.Mock).mockResolvedValue([mockPersonaProvisional]);

      const result = await service.search({ search: "71234567", destinoFicha: "docente" });

      expect(result.encontrada).toBe(true);
      expect(result.yaTieneFicha).toBe(false);
      expect(result.mensaje).toBe(PERSONA_MESSAGES.DOCUMENTO_DUPLICADO);
    });

    it("debe indicar yaTieneFicha: true si ya cuenta con la ficha consultada", async () => {
      (repository.search as jest.Mock).mockResolvedValue([mockPersonaConFicha]);

      const result = await service.search({ search: "71234567", destinoFicha: "docente" });

      expect(result.encontrada).toBe(true);
      expect(result.yaTieneFicha).toBe(true);
      expect(result.mensaje).toBe("Esta persona ya está registrada como docente.");
    });
  });

  describe("update (datos libres y críticos)", () => {
    it("debe permitir editar datos libres a cualquier usuario autorizado", async () => {
      (repository.findById as jest.Mock).mockResolvedValue(mockPersonaConFicha);
      const updatedPersona = { ...mockPersonaConFicha, celular: "911222333" };
      (repository.update as jest.Mock).mockResolvedValue(updatedPersona);

      const updateDto: UpdatePersonaDto = { celular: "911222333" };
      const result = await service.update("p-doc-1", updateDto, mockSecretariaUser);

      expect(result.celular).toBe("911222333");
      expect(repository.update).toHaveBeenCalledWith("p-doc-1", { celular: "911222333" });
    });

    it("debe permitir editar datos críticos sin motivo si la persona es PROVISIONAL", async () => {
      (repository.findById as jest.Mock).mockResolvedValue(mockPersonaProvisional);
      const updatedPersona = { ...mockPersonaProvisional, nombres: "Luis Alberto" };
      (repository.update as jest.Mock).mockResolvedValue(updatedPersona);

      const updateDto: UpdatePersonaDto = { nombres: "Luis Alberto" };
      const result = await service.update("p-prov-1", updateDto, mockSecretariaUser);

      expect(result.nombres).toBe("Luis Alberto");
      expect(repository.update).toHaveBeenCalled();
    });

    it("debe RECHAZAR la edición de datos críticos si no es provisional y el usuario no es Administrador", async () => {
      (repository.findById as jest.Mock).mockResolvedValue(mockPersonaConFicha);

      const updateDto: UpdatePersonaDto = {
        apellidoMaterno: "Nuevo",
        motivo: "Corrección legal de apellido",
      };

      await expect(service.update("p-doc-1", updateDto, mockSecretariaUser)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update("p-doc-1", updateDto, mockSecretariaUser)).rejects.toThrow(
        PERSONA_MESSAGES.CRITICAL_DATA_UNAUTHORIZED,
      );
    });

    it("debe RECHAZAR la edición de datos críticos si es Administrador pero no envía motivo", async () => {
      (repository.findById as jest.Mock).mockResolvedValue(mockPersonaConFicha);

      const updateDto: UpdatePersonaDto = {
        nombres: "Luis Fernando",
        // Sin motivo
      };

      await expect(service.update("p-doc-1", updateDto, mockAdminUser)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update("p-doc-1", updateDto, mockAdminUser)).rejects.toThrow(
        PERSONA_MESSAGES.CRITICAL_DATA_MOTIVO_REQUIRED,
      );
    });

    it("debe PERMITIR la edición de datos críticos si es Administrador y envía motivo", async () => {
      (repository.findById as jest.Mock).mockResolvedValue(mockPersonaConFicha);
      const updatedPersona = { ...mockPersonaConFicha, nombres: "Luis Fernando" };
      (repository.update as jest.Mock).mockResolvedValue(updatedPersona);

      const updateDto: UpdatePersonaDto = {
        nombres: "Luis Fernando",
        motivo: "Rectificación según resolución judicial",
      };

      const result = await service.update("p-doc-1", updateDto, mockAdminUser, "192.168.1.1");

      expect(result.nombres).toBe("Luis Fernando");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: "actualizar",
          tabla: "personas",
        }),
      );
    });
  });

  describe("delete", () => {
    it("debe permitir eliminar una persona provisional sin relaciones", async () => {
      (repository.findById as jest.Mock).mockResolvedValue(mockPersonaProvisional);
      (repository.hasActiveRelations as jest.Mock).mockResolvedValue({
        hasRelations: false,
        details: mockPersonaProvisional.fichas,
      });
      (repository.softDelete as jest.Mock).mockResolvedValue(true);

      const result = await service.delete("p-prov-1", "admin-1");

      expect(result.success).toBe(true);
      expect(repository.softDelete).toHaveBeenCalledWith("p-prov-1");
    });

    it("debe impedir eliminar una persona con fichas o cuenta asociadas", async () => {
      (repository.findById as jest.Mock).mockResolvedValue(mockPersonaConFicha);
      (repository.hasActiveRelations as jest.Mock).mockResolvedValue({
        hasRelations: true,
        details: mockPersonaConFicha.fichas,
      });

      await expect(service.delete("p-doc-1", "admin-1")).rejects.toThrow(ConflictException);
      await expect(service.delete("p-doc-1", "admin-1")).rejects.toThrow(
        PERSONA_MESSAGES.DELETE_WITH_RELATIONS_CONFLICT,
      );
    });
  });
});
