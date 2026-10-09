import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "@/common/services/audit.service";
import { hashSha256 } from "@/common/utils";
import { PersonasRepository } from "@/features/personas/repositories/personas.repository";
import type { PersonaResponseDto } from "@/features/personas/dto";
import { CREDENCIAL_MESSAGES } from "@/features/credenciales/constants";
import { CredencialesRepository } from "@/features/credenciales/repositories/credenciales.repository";
import { CredencialesService } from "@/features/credenciales/credenciales.service";

describe("CredencialesService", () => {
  let service: CredencialesService;
  let repository: jest.Mocked<CredencialesRepository>;
  let personasRepository: jest.Mocked<PersonasRepository>;
  let auditService: jest.Mocked<AuditService>;

  const mockPersonaId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const mockActorId = "u0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99";

  const mockCredencial = {
    id: "c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
    personaId: mockPersonaId,
    codigo: "CR-45678912-101",
    pinHash: hashSha256("1234"),
    activa: true,
    emitidaEn: "2026-10-09T16:00:00Z",
    venceEn: null,
    anuladaEn: null,
    motivoAnulacion: null,
  };

  beforeEach(async () => {
    const mockRepo = {
      findActivaByPersonaId: jest.fn(),
      findPersonaForCarne: jest.fn(),
      reemitir: jest.fn(),
      actualizarPin: jest.fn(),
    };

    const mockPersonasRepo = {
      findById: jest.fn(),
    };

    const mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredencialesService,
        { provide: CredencialesRepository, useValue: mockRepo },
        { provide: PersonasRepository, useValue: mockPersonasRepo },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<CredencialesService>(CredencialesService);
    repository = module.get(CredencialesRepository);
    personasRepository = module.get(PersonasRepository);
    auditService = module.get(AuditService);
  });

  describe("reemitir", () => {
    it("debe lanzar NotFoundException si la persona no existe", async () => {
      personasRepository.findById.mockResolvedValue(null);

      await expect(
        service.reemitir({ personaId: mockPersonaId, motivo: "Carné extraviado" }, mockActorId),
      ).rejects.toThrow(NotFoundException);
    });

    it("debe anular la credencial anterior, generar nueva con PIN y auditar", async () => {
      personasRepository.findById.mockResolvedValue({
        id: mockPersonaId,
        numeroDocumento: "45678912",
        nombreCompleto: "Carlos Quispe",
      } as unknown as PersonaResponseDto);

      const nuevaCred = {
        id: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
        personaId: mockPersonaId,
        codigo: "CR-45678912-888",
        activa: true,
        emitidaEn: "2026-10-09T17:00:00Z",
        venceEn: null,
        anuladaEn: null,
        motivoAnulacion: null,
        pinHash: "hash-algo",
      };

      repository.reemitir.mockResolvedValue({
        nuevaCredencial: nuevaCred,
        anteriorId: mockCredencial.id,
      });

      const res = await service.reemitir(
        { personaId: mockPersonaId, motivo: "Pérdida de carné" },
        mockActorId,
        "127.0.0.1",
      );

      expect(res.id).toBe(nuevaCred.id);
      expect(res.codigo).toBe(nuevaCred.codigo);
      expect(res.pin).toMatch(/^[0-9]{4}$/);
      expect(res.mensaje).toBe(CREDENCIAL_MESSAGES.REEMITIDA_EXITO);
      expect(repository.reemitir).toHaveBeenCalledWith(
        expect.objectContaining({
          personaId: mockPersonaId,
          motivo: "Pérdida de carné",
        }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: "crear",
          tabla: "credenciales",
        }),
      );
    });
  });

  describe("cambiarPin", () => {
    it("debe lanzar NotFoundException si no hay credencial activa", async () => {
      repository.findActivaByPersonaId.mockResolvedValue(null);

      await expect(
        service.cambiarPin({ nuevoPin: "5678" }, mockPersonaId, mockActorId),
      ).rejects.toThrow(NotFoundException);
    });

    it("debe lanzar BadRequestException si el pinActual no coincide", async () => {
      repository.findActivaByPersonaId.mockResolvedValue(mockCredencial);

      await expect(
        service.cambiarPin({ pinActual: "9999", nuevoPin: "5678" }, mockPersonaId, mockActorId),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe actualizar el PIN correctamente y auditar si pinActual coincide", async () => {
      repository.findActivaByPersonaId.mockResolvedValue(mockCredencial);
      repository.actualizarPin.mockResolvedValue(undefined);

      const res = await service.cambiarPin(
        { pinActual: "1234", nuevoPin: "5678" },
        mockPersonaId,
        mockActorId,
        "127.0.0.1",
      );

      expect(res.mensaje).toBe(CREDENCIAL_MESSAGES.PIN_ACTUALIZADO);
      expect(repository.actualizarPin).toHaveBeenCalledWith(mockCredencial.id, hashSha256("5678"));
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: "actualizar",
          tabla: "credenciales",
        }),
      );
    });
  });

  describe("obtenerCarne", () => {
    it("debe lanzar NotFoundException si no se encuentran datos para el carné", async () => {
      repository.findPersonaForCarne.mockResolvedValue(null);

      await expect(service.obtenerCarne(mockPersonaId)).rejects.toThrow(NotFoundException);
    });

    it("debe retornar datos de carné con código institucional y tipo de rol", async () => {
      const mockCarne = {
        personaId: mockPersonaId,
        nombreCompleto: "Carlos Quispe Flores",
        tipoDocumento: "dni",
        numeroDocumento: "45678912",
        fotoUrl: null,
        tipoRol: "Estudiante",
        codigoCredencial: "CR-45678912-101",
        codigoInstitucional: "12345678",
        emitidaEn: "2026-10-09T16:00:00Z",
      };
      repository.findPersonaForCarne.mockResolvedValue(mockCarne);

      const res = await service.obtenerCarne(mockPersonaId);
      expect(res.nombreCompleto).toBe("Carlos Quispe Flores");
      expect(res.tipoRol).toBe("Estudiante");
      expect(res.codigoCredencial).toBe("CR-45678912-101");
    });
  });

  describe("obtenerActiva", () => {
    it("debe retornar la credencial activa sin PIN", async () => {
      repository.findActivaByPersonaId.mockResolvedValue(mockCredencial);

      const res = await service.obtenerActiva(mockPersonaId);
      expect(res.id).toBe(mockCredencial.id);
      expect(res.codigo).toBe(mockCredencial.codigo);
      expect(res.activa).toBe(true);
      expect((res as unknown as Record<string, unknown>)["pinHash"]).toBeUndefined();
    });
  });
});
