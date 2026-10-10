import { generarCodigoMatricula } from "@/features/matriculas/utils";

describe("generarCodigoMatricula (RF-009)", () => {
  it("debe generar código con año y correlativo de 6 dígitos con ceros", () => {
    expect(generarCodigoMatricula(2027, 1)).toBe("2027-000001");
    expect(generarCodigoMatricula(2027, 123)).toBe("2027-000123");
    expect(generarCodigoMatricula(2026, 9999)).toBe("2026-009999");
  });
});
