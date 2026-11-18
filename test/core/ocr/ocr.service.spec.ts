import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import {
  ESTRATEGIAS_OCR,
  OCR_DEFAULTS,
  TIPOS_ESTRATEGIA_OCR,
} from "../../../src/core/ocr/constants";
import { EstrategiaOcr } from "../../../src/core/ocr/interfaces";
import { OcrService } from "../../../src/core/ocr/ocr.service";

describe("OcrService", () => {
  let servicio: OcrService;
  let estrategiaMistral: jest.Mocked<EstrategiaOcr>;
  let estrategiaGlm: jest.Mocked<EstrategiaOcr>;
  let configValores: Record<string, string | number | boolean>;

  const crearModulo = async () => {
    const configServiceMock = {
      get: jest.fn(
        (clave: string, valorPorDefecto?: unknown) => configValores[clave] ?? valorPorDefecto,
      ),
    };

    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        {
          provide: ESTRATEGIAS_OCR,
          useValue: [estrategiaMistral, estrategiaGlm],
        },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    return modulo.get<OcrService>(OcrService);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    configValores = {
      OCR_HABILITADO: "true",
      OCR_ESTRATEGIA: TIPOS_ESTRATEGIA_OCR.MISTRAL,
      OCR_ESTRATEGIA_RESPALDO: TIPOS_ESTRATEGIA_OCR.GLM,
      OCR_MAX_BYTES: OCR_DEFAULTS.MAX_BYTES,
    };

    estrategiaMistral = {
      nombre: TIPOS_ESTRATEGIA_OCR.MISTRAL,
      estaConfigurada: jest.fn().mockReturnValue(true),
      soportaMime: jest.fn().mockReturnValue(true),
      extraerTexto: jest.fn(),
      extraerDatos: jest.fn(),
    };

    estrategiaGlm = {
      nombre: TIPOS_ESTRATEGIA_OCR.GLM,
      estaConfigurada: jest.fn().mockReturnValue(true),
      soportaMime: jest.fn().mockImplementation((mime) => mime !== "application/pdf"),
      extraerTexto: jest.fn(),
      extraerDatos: jest.fn(),
    };

    servicio = await crearModulo();
  });

  describe("estaHabilitado", () => {
    it("debe devolver true cuando OCR_HABILITADO es true y alguna estrategia está configurada", () => {
      expect(servicio.estaHabilitado()).toBe(true);
    });

    it("debe devolver false cuando OCR_HABILITADO es false", async () => {
      configValores.OCR_HABILITADO = "false";
      servicio = await crearModulo();

      expect(servicio.estaHabilitado()).toBe(false);
    });
  });

  describe("extraerTexto", () => {
    it("debe lanzar ServiceUnavailableException si el OCR está deshabilitado", async () => {
      configValores.OCR_HABILITADO = false;
      servicio = await crearModulo();

      await expect(
        servicio.extraerTexto({
          archivo: {
            contenido: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            mimeType: "image/png",
          },
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it("debe rechazar tipos MIME no permitidos", async () => {
      await expect(
        servicio.extraerTexto({
          archivo: {
            contenido: Buffer.from("texto"),
            mimeType: "text/plain" as never,
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe rechazar archivos vacíos o que superen OCR_MAX_BYTES", async () => {
      await expect(
        servicio.extraerTexto({
          archivo: { contenido: Buffer.alloc(0), mimeType: "image/png" },
        }),
      ).rejects.toThrow(BadRequestException);

      configValores.OCR_MAX_BYTES = 5;
      servicio = await crearModulo();

      await expect(
        servicio.extraerTexto({
          archivo: { contenido: Buffer.alloc(6, 1), mimeType: "image/png" },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe rechazar archivos cuyo contenido binario no coincida con el MIME declarado", async () => {
      await expect(
        servicio.extraerTexto({
          archivo: {
            contenido: Buffer.from("contenido-falso-no-es-png"),
            mimeType: "image/png",
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe usar la estrategia mistral por defecto", async () => {
      const esperado = {
        textoExtraido: "ACTA",
        modelo: "mistral-ocr-latest",
        estrategia: TIPOS_ESTRATEGIA_OCR.MISTRAL,
      };
      estrategiaMistral.extraerTexto.mockResolvedValue(esperado);

      const resultado = await servicio.extraerTexto({
        archivo: {
          contenido: Buffer.from("%PDF-1.4 contenido"),
          mimeType: "application/pdf",
        },
      });

      expect(estrategiaMistral.extraerTexto).toHaveBeenCalledTimes(1);
      expect(estrategiaGlm.extraerTexto).not.toHaveBeenCalled();
      expect(resultado).toEqual(esperado);
    });

    it("debe permitir seleccionar explícitamente la estrategia glm en la solicitud", async () => {
      const esperado = {
        textoExtraido: "BOLETA",
        modelo: "glm-4v-plus",
        estrategia: TIPOS_ESTRATEGIA_OCR.GLM,
      };
      estrategiaGlm.extraerTexto.mockResolvedValue(esperado);

      const resultado = await servicio.extraerTexto({
        archivo: { contenido: Buffer.from([0xff, 0xd8, 0xff, 0xe0]), mimeType: "image/jpeg" },
        estrategia: TIPOS_ESTRATEGIA_OCR.GLM,
      });

      expect(estrategiaGlm.extraerTexto).toHaveBeenCalledTimes(1);
      expect(estrategiaMistral.extraerTexto).not.toHaveBeenCalled();
      expect(resultado).toEqual(esperado);
    });

    it("debe hacer respaldo automático a glm si mistral falla en una imagen", async () => {
      estrategiaMistral.extraerTexto.mockRejectedValue(
        new BadGatewayException("Cuota gratuita agotada"),
      );
      const esperadoGlm = {
        textoExtraido: "TEXTO GLM",
        modelo: "glm-4v-plus",
        estrategia: TIPOS_ESTRATEGIA_OCR.GLM,
      };
      estrategiaGlm.extraerTexto.mockResolvedValue(esperadoGlm);

      const resultado = await servicio.extraerTexto({
        archivo: {
          contenido: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          mimeType: "image/png",
        },
      });

      expect(estrategiaMistral.extraerTexto).toHaveBeenCalledTimes(1);
      expect(estrategiaGlm.extraerTexto).toHaveBeenCalledTimes(1);
      expect(resultado).toEqual(esperadoGlm);
    });
  });

  describe("extraerDatos", () => {
    it("debe delegar la extracción estructurada a la estrategia seleccionada", async () => {
      const esperado = {
        datos: { dni: "12345678" },
        textoCrudo: '{"dni":"12345678"}',
        modelo: "mistral-ocr-latest",
        estrategia: TIPOS_ESTRATEGIA_OCR.MISTRAL,
      };
      estrategiaMistral.extraerDatos.mockResolvedValue(esperado);

      const resultado = await servicio.extraerDatos<{ dni: string }>({
        archivo: {
          contenido: Buffer.from("%PDF-1.4 contenido"),
          mimeType: "application/pdf",
        },
        instruccion: "Extrae el DNI",
      });

      expect(resultado).toEqual(esperado);
    });
  });
});
