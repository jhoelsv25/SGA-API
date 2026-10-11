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
  SesionesClaseController,
  SesionesClaseModule,
  SesionesClaseRepository,
  SesionesClaseService,
} from "@/features/sesiones-clase";

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

describe("Cableado de dependencias RF-011", () => {
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
        SesionesClaseModule,
      ],
    })
      .overrideProvider(getQueueToken(QUEUES.AUDIT))
      .useValue(colaSimulada)
      .overrideProvider(getQueueToken(QUEUES.ANIO_ESCOLAR))
      .useValue(colaSimulada)
      .overrideProvider(getQueueToken(QUEUES.SESIONES_CLASE))
      .useValue(colaSimulada)
      .compile();
  });

  afterAll(async () => {
    if (modulo) {
      await modulo.close();
    }
  });

  it("debe resolver SesionesClaseService, SesionesClaseController y SesionesClaseRepository", () => {
    expect(modulo.get(SesionesClaseService)).toBeInstanceOf(SesionesClaseService);
    expect(modulo.get(SesionesClaseController)).toBeInstanceOf(SesionesClaseController);
    expect(modulo.get(SesionesClaseRepository)).toBeInstanceOf(SesionesClaseRepository);
  });
});
