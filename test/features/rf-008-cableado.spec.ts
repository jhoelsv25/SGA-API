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
  CargaAcademicaController,
  CargaAcademicaModule,
  CargaAcademicaRepository,
  CargaAcademicaService,
} from "@/features/carga-academica";
import {
  HorariosController,
  HorariosModule,
  HorariosRepository,
  HorariosService,
} from "@/features/horarios";
import {
  SeccionesController,
  SeccionesModule,
  SeccionesRepository,
  SeccionesService,
} from "@/features/secciones";

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

describe("Cableado de dependencias RF-008", () => {
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
        SeccionesModule,
        CargaAcademicaModule,
        HorariosModule,
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

  it("debe resolver SeccionesService, SeccionesController y SeccionesRepository", () => {
    const servicio = modulo.get<SeccionesService>(SeccionesService);
    const controlador = modulo.get<SeccionesController>(SeccionesController);
    const repositorio = modulo.get<SeccionesRepository>(SeccionesRepository);

    expect(servicio).toBeDefined();
    expect(controlador).toBeDefined();
    expect(repositorio).toBeDefined();
    expect(servicio).toBeInstanceOf(SeccionesService);
    expect(controlador).toBeInstanceOf(SeccionesController);
    expect(repositorio).toBeInstanceOf(SeccionesRepository);
  });

  it("debe resolver CargaAcademicaService, CargaAcademicaController y CargaAcademicaRepository", () => {
    const servicio = modulo.get<CargaAcademicaService>(CargaAcademicaService);
    const controlador = modulo.get<CargaAcademicaController>(CargaAcademicaController);
    const repositorio = modulo.get<CargaAcademicaRepository>(CargaAcademicaRepository);

    expect(servicio).toBeDefined();
    expect(controlador).toBeDefined();
    expect(repositorio).toBeDefined();
    expect(servicio).toBeInstanceOf(CargaAcademicaService);
    expect(controlador).toBeInstanceOf(CargaAcademicaController);
    expect(repositorio).toBeInstanceOf(CargaAcademicaRepository);
  });

  it("debe resolver HorariosService, HorariosController y HorariosRepository", () => {
    const servicio = modulo.get<HorariosService>(HorariosService);
    const controlador = modulo.get<HorariosController>(HorariosController);
    const repositorio = modulo.get<HorariosRepository>(HorariosRepository);

    expect(servicio).toBeDefined();
    expect(controlador).toBeDefined();
    expect(repositorio).toBeDefined();
    expect(servicio).toBeInstanceOf(HorariosService);
    expect(controlador).toBeInstanceOf(HorariosController);
    expect(repositorio).toBeInstanceOf(HorariosRepository);
  });
});
