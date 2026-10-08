import { Injectable } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { CLS_ANIO_ACADEMICO_ID } from "./anio-lectivo.constants";

@Injectable()
export class AnioLectivoCls {
  constructor(private readonly cls: ClsService) {}

  id(): string | undefined {
    if (!this.cls.isActive()) return undefined;
    const value = this.cls.get<string>(CLS_ANIO_ACADEMICO_ID);
    return value || undefined;
  }
}
