import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { NextFunction, Request, Response } from "express";
import { crearMiddlewareUploads } from "../../src/config/uploads-proteccion.config";

interface MockRes {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  setHeader: jest.Mock;
  status: jest.Mock;
  json: jest.Mock;
}

describe("crearMiddlewareUploads", () => {
  const secreto = "secreto-de-prueba-para-uploads-123";
  const configService = {
    get: jest.fn((clave: string) => (clave === "JWT_SECRET" ? secreto : undefined)),
  } as unknown as ConfigService;

  const middleware = crearMiddlewareUploads(configService);
  const jwtService = new JwtService({ secret: secreto });

  const crearRes = (): MockRes => {
    const res: MockRes = {
      statusCode: 200,
      body: undefined,
      headers: {},
      setHeader: jest.fn((k: string, v: string) => {
        res.headers[k] = v;
      }),
      status: jest.fn((code: number) => {
        res.statusCode = code;
        return res;
      }),
      json: jest.fn((payload: unknown) => {
        res.body = payload;
        return res;
      }),
    };
    return res;
  };

  it("permite /uploads/logos/ sin autenticación", () => {
    const req = {
      path: "/uploads/logos/colegio.png",
      headers: {},
      cookies: {},
    } as unknown as Request;
    const res = crearRes();
    const next = jest.fn() as NextFunction;

    middleware(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.headers["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("rechaza con 401 archivos privados sin token", () => {
    const req = {
      path: "/uploads/libretas/boleta.pdf",
      headers: {},
      cookies: {},
    } as unknown as Request;
    const res = crearRes();
    const next = jest.fn() as NextFunction;

    middleware(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("permite archivos privados cuando la cookie access_token es válida", () => {
    const token = jwtService.sign({ sub: "user-1" });
    const req = {
      path: "/uploads/ausencias/evidencia.png",
      headers: {},
      cookies: { access_token: token },
    } as unknown as Request;
    const res = crearRes();
    const next = jest.fn() as NextFunction;

    middleware(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.headers["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("rechaza con 400 intentos de path traversal", () => {
    const req = {
      path: "/uploads/../.env",
      headers: {},
      cookies: {},
    } as unknown as Request;
    const res = crearRes();
    const next = jest.fn() as NextFunction;

    middleware(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
