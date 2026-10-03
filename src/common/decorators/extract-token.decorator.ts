import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

export const ExtractToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const cookieToken = cookies?.access_token;
    const authHeader = req.headers?.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined;

    return cookieToken || bearerToken;
  },
);
