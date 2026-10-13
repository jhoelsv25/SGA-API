import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { getQueueToken } from "@nestjs/bullmq";
import { Test, TestingModule } from "@nestjs/testing";
import { Queue } from "bullmq";
import { AnioLectivoModule } from "@/common/anio-lectivo";
import { DRIZZLE } from "@/core/database";
import { QUEUES } from "@/core/queues/queues.constants";
import { RedisService } from "@/core/redis/redis.service";
import {
  AulaVirtualModule,
  AulaVirtualRepository,
  AulaVirtualService,
} from "@/features/aula-virtual";
import { AulaVirtualController } from "@/features/aula-virtual/aula-virtual.controller";

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useValue: {},
    },
    {
      provide: RedisService,
      useValue: {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue("OK"),
        del: jest.fn().mockResolvedValue(1),
        getClient: jest.fn().mockReturnValue({
          keys: jest.fn().mockResolvedValue([]),
          del: jest.fn().mockResolvedValue(0),
        }),
      },
    },
  ],
  exports: [DRIZZLE, RedisService],
})
class ModuloSimulacionGlobal {}

describe("Cableado de dependencias RF-016 (Tareas, Entregas y Calificación)", () => {
  let modulo: TestingModule;

  beforeAll(async () => {
    const colaSimulada = {
      add: jest.fn().mockResolvedValue(undefined),
      process: jest.fn(),
      on: jest.fn(),
    } as unknown as Queue<unknown>;

    modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ModuloSimulacionGlobal,
        AnioLectivoModule,
        AulaVirtualModule,
      ],
    })
      .overrideProvider(getQueueToken(QUEUES.AUDIT))
      .useValue(colaSimulada)
      .overrideProvider(getQueueToken(QUEUES.ANIO_ESCOLAR))
      .useValue(colaSimulada)
      .overrideProvider(getQueueToken(QUEUES.NOTIFICATIONS))
      .useValue(colaSimulada)
      .compile();
  });

  afterAll(async () => {
    if (modulo) {
      await modulo.close();
    }
  });

  it("debe resolver AulaVirtualService, AulaVirtualController y AulaVirtualRepository para RF-016", () => {
    expect(modulo.get(AulaVirtualService)).toBeInstanceOf(AulaVirtualService);
    expect(modulo.get(AulaVirtualController)).toBeInstanceOf(AulaVirtualController);
    expect(modulo.get(AulaVirtualRepository)).toBeInstanceOf(AulaVirtualRepository);
  });
});
