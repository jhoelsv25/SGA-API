import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { PROVEEDOR_IA } from "../../../src/core/ia/constants";
import { IaService } from "../../../src/core/ia/ia.service";
import { ProveedorIa } from "../../../src/core/ia/interfaces";

describe("IaService", () => {
  let servicio: IaService;
  let proveedorMock: jest.Mocked<ProveedorIa>;
  let configValores: Record<string, string | number | boolean>;

  const crearModulo = async () => {
    const configServiceMock = {
      get: jest.fn(
        (clave: string, valorPorDefecto?: unknown) => configValores[clave] ?? valorPorDefecto,
      ),
    };

    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        IaService,
        { provide: PROVEEDOR_IA, useValue: proveedorMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    return modulo.get<IaService>(IaService);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    configValores = {
      IA_HABILITADA: "true",
      IA_MODELO_RESPALDO: "",
    };

    proveedorMock = {
      nombre: "gateway",
      estaConfigurado: jest.fn().mockReturnValue(true),
      generarTexto: jest.fn(),
      generarEstructurado: jest.fn(),
    };

    servicio = await crearModulo();
  });

  describe("estaHabilitada", () => {
    it("debe devolver true cuando IA_HABILITADA es true y el proveedor está configurado", () => {
      expect(servicio.estaHabilitada()).toBe(true);
    });

    it("debe devolver false cuando IA_HABILITADA es false", async () => {
      configValores.IA_HABILITADA = "false";
      servicio = await crearModulo();

      expect(servicio.estaHabilitada()).toBe(false);
    });

    it("debe devolver false cuando el proveedor no está configurado", () => {
      proveedorMock.estaConfigurado.mockReturnValue(false);

      expect(servicio.estaHabilitada()).toBe(false);
    });
  });

  describe("generarTexto", () => {
    it("debe lanzar ServiceUnavailableException si la IA no está habilitada", async () => {
      configValores.IA_HABILITADA = false;
      servicio = await crearModulo();

      await expect(servicio.generarTexto({ prompt: "Hola" })).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it("debe lanzar BadRequestException si el prompt está vacío", async () => {
      await expect(servicio.generarTexto({ prompt: "   " })).rejects.toThrow(BadRequestException);
    });

    it("debe delegar la generación al proveedor configurado", async () => {
      const respuestaEsperada = {
        texto: "Respuesta generada",
        modelo: "mistral/mistral-small-latest",
        proveedor: "gateway",
      };
      proveedorMock.generarTexto.mockResolvedValue(respuestaEsperada);

      const resultado = await servicio.generarTexto({
        prompt: "Resume la sesión de matemática",
      });

      expect(proveedorMock.generarTexto).toHaveBeenCalledWith({
        prompt: "Resume la sesión de matemática",
      });
      expect(resultado).toEqual(respuestaEsperada);
    });

    it("debe reintentar con IA_MODELO_RESPALDO si el modelo principal falla con BadGatewayException", async () => {
      configValores.IA_MODELO_RESPALDO = "zai/glm-4.5";
      servicio = await crearModulo();

      const respuestaGlm = {
        texto: "Respuesta desde GLM",
        modelo: "zai/glm-4.5",
        proveedor: "gateway",
      };

      proveedorMock.generarTexto
        .mockRejectedValueOnce(new BadGatewayException("Cuota agotada"))
        .mockResolvedValueOnce(respuestaGlm);

      const resultado = await servicio.generarTexto({
        prompt: "Genera comunicado",
      });

      expect(proveedorMock.generarTexto).toHaveBeenNthCalledWith(1, {
        prompt: "Genera comunicado",
      });
      expect(proveedorMock.generarTexto).toHaveBeenNthCalledWith(2, {
        prompt: "Genera comunicado",
        modelo: "zai/glm-4.5",
      });
      expect(resultado).toEqual(respuestaGlm);
    });
  });

  describe("generarEstructurado", () => {
    it("debe delegar la generación estructurada al proveedor", async () => {
      const respuestaEsperada = {
        datos: { titulo: "Comunicado", prioridad: "alta" },
        textoCrudo: '{"titulo":"Comunicado","prioridad":"alta"}',
        modelo: "mistral/mistral-small-latest",
        proveedor: "gateway",
      };
      proveedorMock.generarEstructurado.mockResolvedValue(respuestaEsperada);

      const resultado = await servicio.generarEstructurado<{
        titulo: string;
        prioridad: string;
      }>({
        prompt: "Clasifica este comunicado",
      });

      expect(resultado).toEqual(respuestaEsperada);
    });
  });
});
