import { encodeCursor, decodeCursor } from "@/common/utils/cursor.util";

describe("cursor.util", () => {
  interface TestPayload {
    registradoEn: string;
    id: number;
  }

  it("debe codificar y decodificar correctamente un payload", () => {
    const payload: TestPayload = {
      registradoEn: "2026-10-08 10:00:00",
      id: 12345,
    };

    const encoded = encodeCursor(payload);
    expect(encoded).toBeDefined();
    expect(typeof encoded).toBe("string");

    const decoded = decodeCursor<TestPayload>(encoded);
    expect(decoded).toEqual(payload);
  });

  it("debe retornar null al codificar valores nulos o indefinidos", () => {
    expect(encodeCursor(null)).toBeNull();
    expect(encodeCursor(undefined)).toBeNull();
  });

  it("debe retornar null al decodificar un cursor inválido o vacío", () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor("")).toBeNull();
    expect(decodeCursor("   ")).toBeNull();
    expect(decodeCursor("not-a-valid-base64-json-???")).toBeNull();
  });
});
