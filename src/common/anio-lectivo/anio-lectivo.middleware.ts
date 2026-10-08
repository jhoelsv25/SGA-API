import { BadRequestException } from "@nestjs/common";
import { isUUID } from "class-validator";
import type { Request } from "express";
import type { ClsService } from "nestjs-cls";
import { CLS_ANIO_ACADEMICO_ID, HEADER_ANIO_ACADEMICO } from "./anio-lectivo.constants";

/** Se ejecuta dentro del contexto CLS, al armar el middleware de nestjs-cls. */
export function asignarAnioLectivo(cls: ClsService, req: Request): void {
  const raw = req.headers[HEADER_ANIO_ACADEMICO];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return;
  if (!isUUID(value)) {
    throw new BadRequestException("El año lectivo indicado no es válido.");
  }
  cls.set(CLS_ANIO_ACADEMICO_ID, value);
}
