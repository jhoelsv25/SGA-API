import { BadRequestException, NotFoundException } from "@nestjs/common";
import { getQueueToken } from "@nestjs/bullmq";
import { Test, TestingModule } from "@nestjs/testing";
import { QUEUES } from "@/core/queues/queues.constants";
import { AuditService } from "@/common/services/audit.service";
import { PersonasRepository } from "@/features/personas/repositories/personas.repository";
import { EstudiantesRepository } from "@/features/estudiantes/repositories/estudiantes.repository";
import { DocentesRepository } from "@/features/docentes/repositories/docentes.repository";
import { FotosImportService } from "@/features/importacion/services/fotos-import.service";
import type { Job } from "bullmq";

describe("FotosImportService", () => {
  let service: FotosImportService;
  let _personasRepo: jest.Mocked<PersonasRepository>;
  let _estudiantesRepo: jest.Mocked<EstudiantesRepository>;
  let _docentesRepo: jest.Mocked<DocentesRepository>;
  let _auditService: jest.Mocked<AuditService>;
  let mockQueue: { add: jest.Mock; getJob: jest.Mock };

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: "job-fotos-123" }),
      getJob: jest.fn(),
    };

    const mockPersonasRepo = {
      findByDocumento: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: "p-1" }),
    };

    const mockEstudiantesRepo = {
      findByCodigo: jest.fn(),
    };

    const mockDocentesRepo = {
      findByCodigo: jest.fn(),
    };

    const mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FotosImportService,
        {
          provide: getQueueToken(QUEUES.IMPORTACION),
          useValue: mockQueue,
        },
        {
          provide: PersonasRepository,
          useValue: mockPersonasRepo,
        },
        {
          provide: EstudiantesRepository,
          useValue: mockEstudiantesRepo,
        },
        {
          provide: DocentesRepository,
          useValue: mockDocentesRepo,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<FotosImportService>(FotosImportService);
    _personasRepo = module.get(PersonasRepository);
    _estudiantesRepo = module.get(EstudiantesRepository);
    _docentesRepo = module.get(DocentesRepository);
    _auditService = module.get(AuditService);
  });

  describe("validarMagicBytes", () => {
    it("debe validar correctamente un buffer JPEG", () => {
      const bufferJpeg = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      expect(service.validarMagicBytes(bufferJpeg)).toBe(true);
    });

    it("debe validar correctamente un buffer PNG", () => {
      const bufferPng = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      expect(service.validarMagicBytes(bufferPng)).toBe(true);
    });

    it("debe validar correctamente un buffer WEBP", () => {
      const bufferWebp = Buffer.from("RIFF....WEBPVP8 ");
      expect(service.validarMagicBytes(bufferWebp)).toBe(true);
    });

    it("debe rechazar buffers que no sean imágenes reales", () => {
      const bufferTexto = Buffer.from("Hola mundo archivo de texto falso");
      expect(service.validarMagicBytes(bufferTexto)).toBe(false);
    });
  });

  describe("prepararYEncolar", () => {
    it("debe lanzar BadRequestException si no se adjuntan archivos", async () => {
      await expect(service.prepararYEncolar("estudiantes", [], "u-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("debe procesar imágenes válidas y encolar trabajo en BullMQ", async () => {
      const bufferJpeg = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x00,
      ]);
      const mockFile = {
        originalname: "70123456.jpg",
        buffer: bufferJpeg,
      } as Express.Multer.File;

      const resultado = await service.prepararYEncolar(
        "estudiantes",
        [mockFile],
        "u-1",
        "127.0.0.1",
      );

      expect(resultado.jobId).toBe("job-fotos-123");
      expect(resultado.totalArchivos).toBe(1);
      expect(mockQueue.add).toHaveBeenCalledWith(
        "importar-fotos",
        expect.objectContaining({
          tipo: "estudiantes",
          totalArchivos: 1,
          usuarioId: "u-1",
        }),
        expect.any(Object),
      );
    });
  });

  describe("consultarEstadoJob", () => {
    it("debe lanzar NotFoundException si el trabajo no existe", async () => {
      mockQueue.getJob.mockResolvedValue(null);
      await expect(service.consultarEstadoJob("inexistente")).rejects.toThrow(NotFoundException);
    });

    it("debe mapear el estado y progreso del trabajo correctamente", async () => {
      const mockJob = {
        id: "job-1",
        getState: jest.fn().mockResolvedValue("active"),
        progress: 50,
        returnvalue: null,
      } as unknown as Job;

      mockQueue.getJob.mockResolvedValue(mockJob);

      const estado = await service.consultarEstadoJob("job-1");
      expect(estado.id).toBe("job-1");
      expect(estado.estado).toBe("procesando");
      expect(estado.progreso).toBe(50);
    });
  });
});
