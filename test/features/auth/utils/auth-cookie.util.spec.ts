import type { Response } from "express";
import { clearAuthCookie, setAuthCookie } from "@/features/auth/utils/auth-cookie.util";

describe("auth-cookie.util (RF-001: Cookies de Sesión)", () => {
  let mockResponse: {
    cookie: jest.Mock;
    clearCookie: jest.Mock;
  };

  beforeEach(() => {
    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  });

  describe("setAuthCookie", () => {
    it("debe configurar la cookie con duración de 30 días si rememberMe es true", () => {
      setAuthCookie({
        res: mockResponse as unknown as Response,
        token: "sample_token",
        rememberMe: true,
        isProduction: false,
      });

      expect(mockResponse.cookie).toHaveBeenCalledWith("access_token", "sample_token", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });
    });

    it("debe configurar la cookie con duración de 1 día si rememberMe es false", () => {
      setAuthCookie({
        res: mockResponse as unknown as Response,
        token: "sample_token",
        rememberMe: false,
        isProduction: false,
      });

      expect(mockResponse.cookie).toHaveBeenCalledWith("access_token", "sample_token", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 1 * 24 * 60 * 60 * 1000,
        path: "/",
      });
    });

    it("debe aplicar flags secure y sameSite none en ambiente de producción", () => {
      setAuthCookie({
        res: mockResponse as unknown as Response,
        token: "sample_token",
        rememberMe: false,
        isProduction: true,
      });

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "access_token",
        "sample_token",
        expect.objectContaining({
          secure: true,
          sameSite: "none",
        }),
      );
    });

    it("no debe configurar ninguna cookie si el token no está definido", () => {
      setAuthCookie({
        res: mockResponse as unknown as Response,
        token: undefined,
      });

      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });
  });

  describe("clearAuthCookie", () => {
    it("debe limpiar la cookie access_token con opciones de desarrollo", () => {
      clearAuthCookie(mockResponse as unknown as Response, false);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith("access_token", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
      });
    });

    it("debe limpiar la cookie con las mismas opciones secure/sameSite que setAuthCookie en producción", () => {
      clearAuthCookie(mockResponse as unknown as Response, true);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith("access_token", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
      });
    });
  });
});
