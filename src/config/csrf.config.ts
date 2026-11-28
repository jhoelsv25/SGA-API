import { ConfigService } from "@nestjs/config";
import { doubleCsrf } from "csrf-csrf";
import type { Request } from "express";

const RUTAS_KIOSKO_CSRF = [
  "/api/marcaciones/kiosko",
  "/api/sesiones-clase/kiosko",
  "/api/equipos/validar-kiosko",
  "/api/solicitudes-kiosko",
] as const;

const RUTAS_BIOMETRICO_CSRF = ["/api/biometrico", "/api/marcaciones/biometrico"] as const;

function coincideConPrefijo(ruta: string, prefijos: readonly string[]): boolean {
  return prefijos.some((prefijo) => ruta === prefijo || ruta.startsWith(`${prefijo}/`));
}

export function debeOmitirCsrf(req: Request): boolean {
  const ruta = (req.originalUrl ?? req.url ?? "").split("?")[0];
  const esAuthPublica =
    ruta === "/api/auth/login" || ruta === "/api/auth/register" || ruta === "/api/auth/logout";
  if (esAuthPublica) return true;

  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const tieneCookieSesion = Boolean(cookies?.access_token || cookies?.refresh_token);
  const usaBearer = req.headers.authorization?.startsWith("Bearer ");
  const esKiosko =
    Boolean(req.headers["x-kiosk-signature"]) && coincideConPrefijo(ruta, RUTAS_KIOSKO_CSRF);
  const esBiometrico =
    Boolean(req.headers["x-biometric-token"]) && coincideConPrefijo(ruta, RUTAS_BIOMETRICO_CSRF);

  return !tieneCookieSesion || Boolean(usaBearer) || esKiosko || esBiometrico;
}

export function crearCsrfUtils(configService?: ConfigService) {
  const esProduccion =
    (configService?.get<string>("NODE_ENV") ?? process.env.NODE_ENV) === "production";
  const secretoConfigurado =
    configService?.get<string>("CSRF_SECRET")?.trim() ||
    configService?.get<string>("JWT_SECRET")?.trim() ||
    process.env.CSRF_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim();

  if (esProduccion && !secretoConfigurado) {
    throw new Error("En producción debe configurar CSRF_SECRET o JWT_SECRET.");
  }

  const secreto = secretoConfigurado || "sga-csrf-dev-secret";

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
    skipCsrfProtection: debeOmitirCsrf,
  });
}
