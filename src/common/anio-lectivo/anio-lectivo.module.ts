import { Global, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ClsMiddleware, ClsModule } from "nestjs-cls";
import { AnioLectivoCls } from "./anio-lectivo-cls.service";
import { AnioLectivoMiddleware } from "./anio-lectivo.middleware";

@Global()
@Module({
  imports: [
    // El ClsMiddleware se monta abajo, antes del de año lectivo: montado por la
    // librería (mount: true) queda solo en "/" y el año no encuentra contexto CLS.
    ClsModule.forRoot({ global: true }),
  ],
  providers: [AnioLectivoCls],
  exports: [AnioLectivoCls],
})
export class AnioLectivoModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ClsMiddleware, AnioLectivoMiddleware).forRoutes("{*splat}");
  }
}
