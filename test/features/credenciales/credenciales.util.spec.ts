import {
  generarCodigoCredencial,
  generarPinConHash,
  generarPinCredencial,
} from "@/features/credenciales/utils";
import { hashSha256 } from "@/common/utils";

describe("credenciales.util", () => {
  describe("generarPinCredencial", () => {
    it("debe generar un PIN numérico de 4 dígitos entre 1000 y 9999", () => {
      for (let i = 0; i < 50; i++) {
        const pin = generarPinCredencial();
        expect(pin).toMatch(/^[1-9][0-9]{3}$/);
        const num = Number(pin);
        expect(num).toBeGreaterThanOrEqual(1000);
        expect(num).toBeLessThanOrEqual(9999);
      }
    });
  });

  describe("generarCodigoCredencial", () => {
    it("debe generar un código con formato CR-{numeroDocumento} si conSufijoAleatorio es false", () => {
      const codigo = generarCodigoCredencial("76543210");
      expect(codigo).toBe("CR-76543210");
    });

    it("debe recortar espacios en blanco del número de documento", () => {
      const codigo = generarCodigoCredencial("  76543210  ");
      expect(codigo).toBe("CR-76543210");
    });

    it("debe generar un código con sufijo aleatorio de 3 dígitos si conSufijoAleatorio es true", () => {
      const codigo = generarCodigoCredencial("76543210", true);
      expect(codigo).toMatch(/^CR-76543210-[1-9][0-9]{2}$/);
    });
  });

  describe("generarPinConHash", () => {
    it("debe retornar el PIN plano y su hash SHA-256 coincidente", () => {
      const { pinPlano, pinHash } = generarPinConHash();
      expect(pinPlano).toMatch(/^[1-9][0-9]{3}$/);
      expect(pinHash).toBe(hashSha256(pinPlano));
      expect(pinHash).toHaveLength(64);
    });
  });
});
