import { resolve } from "node:path";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { NextFunction, Request, Response } from "express";
import { getJwtSecret } from "../features/auth/utils/jwt-secret.util";

const PREFIJO_UPLOADS = "/uploads/";
const PREFIJO_LOGOS = "/uploads/logos/";

/**
 * Protege la carpeta `/uploads/` exigiendo JWT válido (por cookie `access_token` o header Bearer),
 * dejando público únicamente `/uploads/logos/`.
 */
export function crearMiddlewareUploads(configService: ConfigService) {
  const jwtService = new JwtService({
    secret: getJwtSecret(configService),
  });
  const raizUploads = resolve(process.cwd(), "uploads");

  return (req: Request, res: Response, next: NextFunction): void => {
    const ruta = req.path || "";
    if (!ruta.startsWith(PREFIJO_UPLOADS)) {
      next();
      return;
    }

    const relativo = ruta.slice(PREFIJO_UPLOADS.length);
    const destino = resolve(raizUploads, relativo);
    if (!destino.startsWith(`${raizUploads}/`) && destino !== raizUploads) {
      res.status(400).json({ message: "Ruta de archivo inválida." });
      return;
    }

    res.setHeader("X-Content-Type-Options", "nosniff");

    if (ruta.startsWith(PREFIJO_LOGOS)) {
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    const tokenBearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const token = tokenBearer || cookies?.access_token;

    if (!token) {
      res.status(401).json({ message: "No autorizado para acceder a este archivo." });
      return;
    }

    try {
      jwtService.verify(token);
      next();
    } catch {
      res.status(401).json({ message: "Sesión inválida o expirada." });
    }
  };
}
