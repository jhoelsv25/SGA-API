import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import { crearCsrfUtils, debeOmitirCsrf } from "@/config/csrf.config";

function crearReq(
  url: string,
  headers: Record<string, string> = {},
  cookies: Record<string, string> = { access_token: "jwt-cookie" },
): Request {
  return {
    originalUrl: url,
    url,
    headers,
    cookies,
  } as unknown as Request;
}

describe("csrf.config", () => {
  it("exige CSRF en rutas protegidas aunque se envíe x-kiosk-signature o x-biometric-token falso", () => {
    expect(debeOmitirCsrf(crearReq("/api/users", { "x-kiosk-signature": "falsa" }))).toBe(false);
    expect(
      debeOmitirCsrf(crearReq("/api/libretas/publicar", { "x-biometric-token": "falso" })),
    ).toBe(false);
  });

  it("omite CSRF en rutas legítimas de kiosko y biométrico cuando traen su cabecera", () => {
    expect(
      debeOmitirCsrf(crearReq("/api/marcaciones/kiosko", { "x-kiosk-signature": "firma-valida" })),
    ).toBe(true);
    expect(
      debeOmitirCsrf(
        crearReq("/api/sesiones-clase/kiosko/firmar", { "x-kiosk-signature": "firma-valida" }),
      ),
    ).toBe(true);
    expect(
      debeOmitirCsrf(crearReq("/api/biometrico/marcaciones", { "x-biometric-token": "tok" })),
    ).toBe(true);
  });

  it("falla al arrancar en producción si faltan CSRF_SECRET y JWT_SECRET", () => {
    const envAnteriorCsrf = process.env.CSRF_SECRET;
    const envAnteriorJwt = process.env.JWT_SECRET;
    delete process.env.CSRF_SECRET;
    delete process.env.JWT_SECRET;
    try {
      const configSinSecreto = {
        get: (clave: string) => (clave === "NODE_ENV" ? "production" : undefined),
      } as unknown as ConfigService;
      expect(() => crearCsrfUtils(configSinSecreto)).toThrow(
        "En producción debe configurar CSRF_SECRET o JWT_SECRET.",
      );
    } finally {
      if (envAnteriorCsrf !== undefined) process.env.CSRF_SECRET = envAnteriorCsrf;
      if (envAnteriorJwt !== undefined) process.env.JWT_SECRET = envAnteriorJwt;
    }
  });
});
