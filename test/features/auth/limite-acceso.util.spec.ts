import { rastreadorDeAcceso } from "@/features/auth/utils/limite-acceso.util";

describe("Límite de intentos de acceso", () => {
  const ip = "10.0.0.1";

  it("separa a los usuarios que comparten la misma IP", () => {
    expect(rastreadorDeAcceso({ ip, body: { username: "ana" } })).not.toBe(
      rastreadorDeAcceso({ ip, body: { username: "luis" } }),
    );
  });

  it("no se evita cambiando mayúsculas ni agregando espacios", () => {
    expect(rastreadorDeAcceso({ ip, body: { username: " ANA " } })).toBe(
      rastreadorDeAcceso({ ip, body: { username: "ana" } }),
    );
  });

  it("tolera un cuerpo ausente o con otro tipo", () => {
    expect(rastreadorDeAcceso({ ip })).toBe(`${ip}|`);
    expect(rastreadorDeAcceso({ ip, body: { username: 123 } })).toBe(`${ip}|`);
  });
});
