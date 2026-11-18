import { ConfigService } from "@nestjs/config";
import { doubleCsrf } from "csrf-csrf";
import type { Request } from "express";

export function crearCsrfUtils(configService?: ConfigService) {
  const esProduccion =
    (configService?.get<string>("NODE_ENV") ?? process.env.NODE_ENV) === "production";
  const secreto =
    configService?.get<string>("CSRF_SECRET")?.trim() ||
    configService?.get<string>("JWT_SECRET")?.trim() ||
    process.env.CSRF_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    "sga-csrf-dev-secret";

  return doubleCsrf({
    getSecret: () => secreto,
    getSessionIdentifier: (req: Request) => {
      const cookies = req.cookies as Record<string, string | undefined> | undefined;
      return cookies?.access_token ?? cookies?.refresh_token ?? "anon";
    },
    cookieName: "sga_csrf_token",
    cookieOptions: {
      httpOnly: true,
      sameSite: esProduccion ? "none" : "lax",
      secure: esProduccion,
      path: "/",
    },
    getCsrfTokenFromRequest: (req: Request): string | undefined => {
      const header = req.headers["x-csrf-token"];
      if (typeof header === "string") return header;
      if (Array.isArray(header) && typeof header[0] === "string") return header[0];
      return undefined;
    },
    skipCsrfProtection: (req: Request) => {
      const cookies = req.cookies as Record<string, string | undefined> | undefined;
      const tieneCookieSesion = Boolean(cookies?.access_token || cookies?.refresh_token);
      const usaBearer = req.headers.authorization?.startsWith("Bearer ");
      const esKioskoOBiometrico = Boolean(
        req.headers["x-kiosk-token"] || req.headers["x-biometric-token"],
      );
      return !tieneCookieSesion || Boolean(usaBearer) || esKioskoOBiometrico;
    },
  });
}
