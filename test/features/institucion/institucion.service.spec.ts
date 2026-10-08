import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { UpdateInstitucionDto } from "@/features/institucion/dto";
import { InstitucionService } from "@/features/institucion/institucion.service";
import { InstitucionRepository } from "@/features/institucion/repositories/institucion.repository";

jest.mock("fs", () => {
  const actual = jest.requireActual<typeof import("fs")>("fs");
  return {
    ...actual,
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
  };
});

describe("InstitucionService (RF-004 HU1)", () => {
  let service: InstitucionService;
  let mockRepository: jest.Mocked<Partial<InstitucionRepository>>;
  let mockAuditService: jest.Mocked<Partial<AuditService>>;

  const mockInst = {
    id: "inst-123",
    nombre: "I.E. Carmelinas de Lircay",
    codigoModular: "0543210",
    codigoLocal: null,
    tipoGestion: "publica" as const,
    ugel: "UGEL Angaraes",
    dre: "DRE Huancavelica",
    director: "Mg. Carmen Rosa Huamán",
    direccion: "Jr. Bolognesi s/n",
    distrito: "Lircay",
    provincia: "Angaraes",
    departamento: "Huancavelica",
    telefono: null,
    correo: "admin@carmelinas.edu.pe",
    logoUrl: null,
    radioGeocercaM: 120,
    creadoEn: "2026-10-06T20:30:30Z",
    actualizadoEn: "2026-10-08T07:35:17Z",
  };

  beforeEach(() => {
    mockRepository = {
      get: jest.fn().mockResolvedValue(mockInst),
      update: jest.fn().mockResolvedValue({ ...mockInst, nombre: "I.E. Carmelinas Editada" }),
      updateLogoUrl: jest
        .fn()
        .mockResolvedValue({ ...mockInst, logoUrl: "/uploads/logos/logo.png" }),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new InstitucionService(
      mockRepository as unknown as InstitucionRepository,
      mockAuditService as unknown as AuditService,
    );
  });

  describe("get", () => {
    it("debe retornar los datos de la institución", async () => {
      const result = await service.get();
      expect(result).toEqual(mockInst);
      expect(mockRepository.get).toHaveBeenCalled();
    });

    it("debe lanzar NotFoundException si no existe la institución", async () => {
      mockRepository.get = jest.fn().mockResolvedValue(null);
      await expect(service.get()).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("debe actualizar los datos y registrar en la bitácora de auditoría", async () => {
      const dto: UpdateInstitucionDto = {
        nombre: "I.E. Carmelinas Editada",
        codigoModular: "0543210",
        tipoGestion: "publica",
        direccion: "Jr. Bolognesi 456",
        correo: "contacto@carmelinas.edu.pe",
      };

      const result = await service.update(dto, "user-admin", "127.0.0.1");

      expect(mockRepository.update).toHaveBeenCalledWith(expect.objectContaining(dto));
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-admin",
          accion: "actualizar",
          tabla: "institucion",
        }),
      );
      expect(result.nombre).toBe("I.E. Carmelinas Editada");
    });
  });

  describe("uploadLogo", () => {
    it("debe rechazar si no se envía archivo", async () => {
      await expect(service.uploadLogo(undefined, "user-admin")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("debe rechazar si el archivo supera 1 MB (Escenario: Logo inválido por tamaño)", async () => {
      const largeFile = {
        size: 2 * 1024 * 1024, // 2MB
        mimetype: "image/png",
        originalname: "large.png",
        buffer: Buffer.from("fake"),
      } as Express.Multer.File;

      await expect(service.uploadLogo(largeFile, "user-admin")).rejects.toThrow(
        new BadRequestException("El logo debe ser una imagen PNG o JPG de hasta 1 MB."),
      );
    });

    it("debe rechazar si el archivo es un PDF u otro formato no permitido (Escenario: Logo inválido por formato)", async () => {
      const pdfFile = {
        size: 200 * 1024,
        mimetype: "application/pdf",
        originalname: "document.pdf",
        buffer: Buffer.from("fake"),
      } as Express.Multer.File;

      await expect(service.uploadLogo(pdfFile, "user-admin")).rejects.toThrow(
        new BadRequestException("El logo debe ser una imagen PNG o JPG de hasta 1 MB."),
      );
    });

    it("debe aceptar un archivo PNG válido y actualizar el logoUrl (Escenario: Subir el logo)", async () => {
      const validFile = {
        size: 300 * 1024, // 300 KB
        mimetype: "image/png",
        originalname: "logo.png",
        buffer: Buffer.from("fake-png-content"),
      } as Express.Multer.File;

      const result = await service.uploadLogo(validFile, "user-admin", "127.0.0.1");

      expect(mockRepository.updateLogoUrl).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-admin",
          accion: "actualizar",
          tabla: "institucion",
        }),
      );
      expect(result.logoUrl).toBeDefined();
    });
  });
});
