import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { RedisService } from "@/core/redis/redis.service";
import { FirmaKioskoGuard } from "@/features/equipos/guards/firma-kiosko.guard";
import { TOLERANCIA_FIRMA_KIOSKO_MS } from "@/features/equipos/utils/firma-kiosko.util";
import { crearKioskoDePrueba } from "../../helpers/kiosko-firma";

describe("FirmaKioskoGuard", () => {
  const guard = new FirmaKioskoGuard();
  const kiosko = crearKioskoDePrueba();
  const ruta = "/marcaciones/kiosko";
  const cuerpo = { codigo: "CR-1", pin: "1234" };

  const pedirCon = async (
    instancia: FirmaKioskoGuard,
    headers: Record<string, string>,
    body: object = cuerpo,
    url = `/api${ruta}`,
  ) => {
    const req = { method: "POST", originalUrl: url, headers, body } as Record<string, unknown>;
    const contexto = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
    await instancia.canActivate(contexto);
    return req.llaveKiosko;
  };

  const pedir = (headers: Record<string, string>, body: object = cuerpo, url = `/api${ruta}`) =>
    pedirCon(guard, headers, body, url);

  it("acepta un pedido firmado y entrega la llave pública", async () => {
    await expect(pedir(kiosko.cabeceras("POST", ruta, cuerpo))).resolves.toBe(kiosko.llavePublica);
  });

  it("sin firma no entrega llave", async () => {
    await expect(pedir({})).resolves.toBeUndefined();
  });

  it("no acepta la llave pública copiada sin la privada", async () => {
    const ajeno = crearKioskoDePrueba().cabeceras("POST", ruta, cuerpo);

    await expect(pedir({ ...ajeno, "x-kiosk-key": kiosko.llavePublica })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("no acepta repetir un pedido ya usado", async () => {
    const headers = kiosko.cabeceras("POST", ruta, cuerpo);
    await pedir(headers);

    await expect(pedir(headers)).rejects.toThrow(UnauthorizedException);
  });

  it("no acepta un cuerpo o una ruta distintos a los firmados", async () => {
    const headers = () => kiosko.cabeceras("POST", ruta, cuerpo);

    await expect(pedir(headers(), { ...cuerpo, codigo: "CR-2" })).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(pedir(headers(), cuerpo, "/api/otra-ruta")).rejects.toThrow(UnauthorizedException);
  });

  it("avisa cuando la hora del equipo está desfasada", async () => {
    const antiguo = kiosko.cabeceras("POST", ruta, cuerpo, Date.now() - 10 * 60 * 1000);

    await expect(pedir(antiguo)).rejects.toThrow("La fecha u hora de este equipo no es correcta");
  });

  describe("nonces distribuidos en Redis", () => {
    it("reserva el nonce en Redis con TTL doble a la tolerancia y rechaza si ya existía", async () => {
      const setIfNotExistsPx = jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      const guardRedis = new FirmaKioskoGuard({ setIfNotExistsPx } as unknown as RedisService);
      const headers = kiosko.cabeceras("POST", ruta, cuerpo);

      await expect(pedirCon(guardRedis, headers)).resolves.toBe(kiosko.llavePublica);
      expect(setIfNotExistsPx).toHaveBeenCalledWith(
        `kiosko:nonce:${kiosko.llavePublica}:${headers["x-kiosk-nonce"]}`,
        "1",
        2 * TOLERANCIA_FIRMA_KIOSKO_MS,
      );

      await expect(pedirCon(guardRedis, headers)).rejects.toThrow(UnauthorizedException);
    });

    it("usa el respaldo en memoria si Redis falla sin tumbar el kiosko", async () => {
      const setIfNotExistsPx = jest.fn().mockRejectedValue(new Error("Redis caído"));
      const guardRedis = new FirmaKioskoGuard({ setIfNotExistsPx } as unknown as RedisService);
      const headers = kiosko.cabeceras("POST", ruta, cuerpo);

      await expect(pedirCon(guardRedis, headers)).resolves.toBe(kiosko.llavePublica);
      await expect(pedirCon(guardRedis, headers)).rejects.toThrow(UnauthorizedException);
    });
  });
});
