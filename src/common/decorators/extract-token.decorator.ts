import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

function extraerTokenDesdeRequest(req: Request, priorizarRefresh: boolean): string | undefined {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const cookieAccess = cookies?.access_token;
  const cookieRefresh = cookies?.refresh_token;
  const authHeader = req.headers?.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined;

  if (priorizarRefresh) {
    return cookieRefresh || cookieAccess || bearerToken;
  }
  return cookieAccess || bearerToken;
}

export const ExtractToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return extraerTokenDesdeRequest(req, false);
  },
);

/** Extrae preferentemente la cookie HttpOnly `refresh_token` (con respaldo a `access_token` o Bearer). */
export const ExtractRefreshToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return extraerTokenDesdeRequest(req, true);
  },
);
