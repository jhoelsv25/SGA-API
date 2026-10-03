import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

export interface ClientInfoData {
  ip?: string;
  userAgent?: string;
}

export const ClientInfo = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClientInfoData => {
    const req = ctx.switchToHttp().getRequest<Request>();

    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : undefined) ||
      req.ip ||
      req.socket?.remoteAddress;

    const userAgent = req.headers["user-agent"];

    return {
      ip,
      userAgent,
    };
  },
);
