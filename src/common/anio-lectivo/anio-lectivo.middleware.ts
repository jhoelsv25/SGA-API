import { BadRequestException, Injectable, NestMiddleware } from "@nestjs/common";
import { isUUID } from "class-validator";
import type { NextFunction, Request, Response } from "express";
import { ClsService } from "nestjs-cls";
import { CLS_ANIO_ACADEMICO_ID, HEADER_ANIO_ACADEMICO } from "./anio-lectivo.constants";

@Injectable()
export class AnioLectivoMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const raw = req.headers[HEADER_ANIO_ACADEMICO];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value) {
      next();
      return;
    }
    if (!isUUID(value)) {
      next(new BadRequestException("El año lectivo indicado no es válido."));
      return;
    }
    this.cls.set(CLS_ANIO_ACADEMICO_ID, value);
    next();
  }
}
