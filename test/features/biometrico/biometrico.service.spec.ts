import { ConflictException, NotFoundException } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import {
  BiometricoRepository,
  BiometricoService,
  MENSAJES_BIOMETRICO,
} from "@/features/biometrico";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

describe("RF-022: código biométrico de las personas", () => {
  let service: BiometricoService;
  let repo: Mocks<BiometricoRepository>;
  let audit: Mocks<AuditService>;

  beforeEach(() => {
    repo = {
      findPersonaPorCodigo: jest.fn().mockResolvedValue({ id: "per-doc" }),
      findPersonaBasica: jest.fn().mockResolvedValue({
        id: "per-doc",
        nombreCompleto: "Rojas, Luis",
        codigoBiometrico: null,
      }),
      asignarCodigo: jest.fn().mockResolvedValue(undefined),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new BiometricoService(
      repo as unknown as BiometricoRepository,
      audit as unknown as AuditService,
    );
  });

  describe("HU1: reloj y código biométrico", () => {
    it("CP-RF022-03: asigna el código biométrico a una persona", async () => {
      const r = await service.asignarCodigo("per-doc", { codigo: "152" }, "u-1");
      expect(r.mensaje).toBe("Código biométrico asignado a Rojas, Luis.");
      expect(repo.asignarCodigo).toHaveBeenCalledWith("per-doc", "152");
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ tabla: "personas", registroId: "per-doc" }),
      );
    });

    it("CP-RF022-04: un código que ya es de otra persona se rechaza", async () => {
      repo.findPersonaPorCodigo!.mockResolvedValue({ id: "otra" });
      await expect(service.asignarCodigo("per-doc", { codigo: "152" }, "u-1")).rejects.toThrow(
        new ConflictException(MENSAJES_BIOMETRICO.CODIGO_REPETIDO),
      );
      expect(repo.asignarCodigo).not.toHaveBeenCalled();
    });

    it("CP-RF022-04b: reasignar el mismo código a la misma persona es válido", async () => {
      repo.findPersonaPorCodigo!.mockResolvedValue({ id: "per-doc" });
      await expect(
        service.asignarCodigo("per-doc", { codigo: "152" }, "u-1"),
      ).resolves.toBeDefined();
    });

    it("CP-RF022-04c: persona inexistente", async () => {
      repo.findPersonaBasica!.mockResolvedValue(null);
      await expect(service.asignarCodigo("x", { codigo: "152" }, "u-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("CP-RF022-03c: consulta el código biométrico actual de una persona", async () => {
      repo.findPersonaBasica!.mockResolvedValue({
        id: "per-doc",
        nombreCompleto: "Rojas, Luis",
        codigoBiometrico: "152",
      });
      const r = await service.obtenerCodigo("per-doc");
      expect(r.codigoBiometrico).toBe("152");
    });

    it("CP-RF022-03b: quita el código biométrico", async () => {
      const r = await service.quitarCodigo("per-doc", "u-1");
      expect(r.codigoBiometrico).toBeNull();
      expect(repo.asignarCodigo).toHaveBeenCalledWith("per-doc", null);
    });
  });
});
