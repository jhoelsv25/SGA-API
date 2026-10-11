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
  AsistenciaClaseController,
  AsistenciaClaseModule,
  AsistenciaClaseRepository,
  AsistenciaClaseService,
} from "@/features/asistencia-clase";
import {
  MarcacionesController,
  MarcacionesModule,
  MarcacionesRepository,
  MarcacionesService,
} from "@/features/marcaciones";

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

describe("Cableado de dependencias RF-010", () => {
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
        MarcacionesModule,
        AsistenciaClaseModule,
      ],
    })
      .overrideProvider(getQueueToken(QUEUES.AUDIT))
      .useValue(colaSimulada)
      .overrideProvider(getQueueToken(QUEUES.ANIO_ESCOLAR))
      .useValue(colaSimulada)
      .compile();
  });

  afterAll(async () => {
    if (modulo) {
      await modulo.close();
    }
  });

  it("debe resolver MarcacionesService, MarcacionesController y MarcacionesRepository", () => {
    expect(modulo.get(MarcacionesService)).toBeInstanceOf(MarcacionesService);
    expect(modulo.get(MarcacionesController)).toBeInstanceOf(MarcacionesController);
    expect(modulo.get(MarcacionesRepository)).toBeInstanceOf(MarcacionesRepository);
  });

  it("debe resolver AsistenciaClaseService, AsistenciaClaseController y AsistenciaClaseRepository", () => {
    expect(modulo.get(AsistenciaClaseService)).toBeInstanceOf(AsistenciaClaseService);
    expect(modulo.get(AsistenciaClaseController)).toBeInstanceOf(AsistenciaClaseController);
    expect(modulo.get(AsistenciaClaseRepository)).toBeInstanceOf(AsistenciaClaseRepository);
  });
});
