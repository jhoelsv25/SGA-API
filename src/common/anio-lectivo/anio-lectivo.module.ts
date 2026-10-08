import { Global, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { AnioLectivoCls } from "./anio-lectivo-cls.service";
import { AnioLectivoMiddleware } from "./anio-lectivo.middleware";

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
  ],
  providers: [AnioLectivoCls],
  exports: [AnioLectivoCls],
})
export class AnioLectivoModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AnioLectivoMiddleware).forRoutes("{*splat}");
  }
}
