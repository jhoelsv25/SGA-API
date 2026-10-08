import { Global, Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import type { Request } from "express";
import { AnioLectivoCls } from "./anio-lectivo-cls.service";
import { asignarAnioLectivo } from "./anio-lectivo.middleware";

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: (cls, req) => asignarAnioLectivo(cls, req as Request),
      },
    }),
  ],
  providers: [AnioLectivoCls],
  exports: [AnioLectivoCls],
})
export class AnioLectivoModule {}
