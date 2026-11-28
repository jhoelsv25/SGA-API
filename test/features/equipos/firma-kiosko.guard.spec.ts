import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { FirmaKioskoGuard } from "@/features/equipos/guards/firma-kiosko.guard";
import { crearKioskoDePrueba } from "../../helpers/kiosko-firma";

describe("FirmaKioskoGuard", () => {
  const guard = new FirmaKioskoGuard();
  const kiosko = crearKioskoDePrueba();
  const ruta = "/marcaciones/kiosko";
  const cuerpo = { codigo: "CR-1", pin: "1234" };

  const pedir = (headers: Record<string, string>, body: object = cuerpo, url = `/api${ruta}`) => {
    const req = { method: "POST", originalUrl: url, headers, body } as Record<string, unknown>;
    const contexto = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
    guard.canActivate(contexto);
    return req.llaveKiosko;
  };

  it("acepta un pedido firmado y entrega la llave pública", () => {
    expect(pedir(kiosko.cabeceras("POST", ruta, cuerpo))).toBe(kiosko.llavePublica);
  });

  it("sin firma no entrega llave", () => {
    expect(pedir({})).toBeUndefined();
  });

  it("no acepta la llave pública copiada sin la privada", () => {
    const ajeno = crearKioskoDePrueba().cabeceras("POST", ruta, cuerpo);

    expect(() => pedir({ ...ajeno, "x-kiosk-key": kiosko.llavePublica })).toThrow(
      UnauthorizedException,
    );
  });

  it("no acepta repetir un pedido ya usado", () => {
    const headers = kiosko.cabeceras("POST", ruta, cuerpo);
    pedir(headers);

    expect(() => pedir(headers)).toThrow(UnauthorizedException);
  });

  it("no acepta un cuerpo o una ruta distintos a los firmados", () => {
    const headers = () => kiosko.cabeceras("POST", ruta, cuerpo);

    expect(() => pedir(headers(), { ...cuerpo, codigo: "CR-2" })).toThrow(UnauthorizedException);
    expect(() => pedir(headers(), cuerpo, "/api/otra-ruta")).toThrow(UnauthorizedException);
  });

  it("avisa cuando la hora del equipo está desfasada", () => {
    const antiguo = kiosko.cabeceras("POST", ruta, cuerpo, Date.now() - 10 * 60 * 1000);

    expect(() => pedir(antiguo)).toThrow("La fecha u hora de este equipo no es correcta");
  });
});
