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
  ComparacionRepository,
  ComparacionService,
  ExportacionService,
  IndicadoresCalculoRepository,
  IndicadoresCalculoService,
  IndicadoresController,
  IndicadoresModule,
  IndicadoresService,
  MedicionRepository,
  MedicionService,
  PanelRepository,
  PanelService,
  PretestRepository,
  PretestService,
  type CerrarMedicionDto,
  type ComparacionBimestreResponseDto,
  type ExportarIndicadoresQueryDto,
  type FiltroIndicadoresQueryDto,
  type HistorialMedicionResponseDto,
  type MedicionBimestreResponseDto,
  type MensajeIndicadoresResponseDto,
  type MisIndicadoresDocenteResponseDto,
  type NuevaVersionMedicionDto,
  type PanelGeneralResponseDto,
  type PretestResponseDto,
  type RegistrarPretestDto,
  type TableroIndicadoresResponseDto,
} from "@/features/indicadores";

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

describe("Cableado de dependencias RF-020 (Indicadores de la Tesis y Panel)", () => {
  let modulo: TestingModule;
  let fachada: IndicadoresService;
  let controlador: IndicadoresController;
  let calculoService: IndicadoresCalculoService;
  let pretestService: PretestService;
  let comparacionService: ComparacionService;
  let medicionService: MedicionService;
  let panelService: PanelService;
  let exportacionService: ExportacionService;

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
        IndicadoresModule,
      ],
    })
      .overrideProvider(getQueueToken(QUEUES.AUDIT))
      .useValue(colaSimulada)
      .overrideProvider(getQueueToken(QUEUES.ANIO_ESCOLAR))
      .useValue(colaSimulada)
      .overrideProvider(getQueueToken(QUEUES.NOTIFICATIONS))
      .useValue(colaSimulada)
      .compile();

    fachada = modulo.get<IndicadoresService>(IndicadoresService);
    controlador = modulo.get<IndicadoresController>(IndicadoresController);
    calculoService = modulo.get<IndicadoresCalculoService>(IndicadoresCalculoService);
    pretestService = modulo.get<PretestService>(PretestService);
    comparacionService = modulo.get<ComparacionService>(ComparacionService);
    medicionService = modulo.get<MedicionService>(MedicionService);
    panelService = modulo.get<PanelService>(PanelService);
    exportacionService = modulo.get<ExportacionService>(ExportacionService);
  });

  afterAll(async () => {
    if (modulo) {
      await modulo.close();
    }
  });

  describe("Resolución e inyección de dependencias", () => {
    it("debe resolver IndicadoresService, IndicadoresController y repositorios de RF-020", () => {
      expect(fachada).toBeInstanceOf(IndicadoresService);
      expect(controlador).toBeInstanceOf(IndicadoresController);
      expect(modulo.get(IndicadoresCalculoRepository)).toBeInstanceOf(IndicadoresCalculoRepository);
      expect(modulo.get(PretestRepository)).toBeInstanceOf(PretestRepository);
      expect(modulo.get(ComparacionRepository)).toBeInstanceOf(ComparacionRepository);
      expect(modulo.get(MedicionRepository)).toBeInstanceOf(MedicionRepository);
      expect(modulo.get(PanelRepository)).toBeInstanceOf(PanelRepository);
    });

    it("debe resolver todos los subservicios especializados", () => {
      expect(calculoService).toBeInstanceOf(IndicadoresCalculoService);
      expect(pretestService).toBeInstanceOf(PretestService);
      expect(comparacionService).toBeInstanceOf(ComparacionService);
      expect(medicionService).toBeInstanceOf(MedicionService);
      expect(panelService).toBeInstanceOf(PanelService);
      expect(exportacionService).toBeInstanceOf(ExportacionService);
    });
  });

  describe("Delegación de la fachada IndicadoresService a subservicios", () => {
    it("obtenerTablero() debe delegar en IndicadoresCalculoService", async () => {
      const query: FiltroIndicadoresQueryDto = { periodoId: "per-1" };
      const respuestaEsperada = { periodoId: "per-1" } as TableroIndicadoresResponseDto;
      const spy = jest
        .spyOn(calculoService, "obtenerTablero")
        .mockResolvedValueOnce(respuestaEsperada);

      const resultado = await fachada.obtenerTablero(query);

      expect(spy).toHaveBeenCalledWith(query);
      expect(resultado).toBe(respuestaEsperada);
    });

    it("obtenerMisIndicadores() debe delegar en IndicadoresCalculoService", async () => {
      const personaId = "per-docente-uuid";
      const periodoId = "per-1";
      const respuestaEsperada = { docenteId: "doc-1" } as MisIndicadoresDocenteResponseDto;
      const spy = jest
        .spyOn(calculoService, "obtenerMisIndicadores")
        .mockResolvedValueOnce(respuestaEsperada);

      const resultado = await fachada.obtenerMisIndicadores(personaId, periodoId);

      expect(spy).toHaveBeenCalledWith(personaId, periodoId);
      expect(resultado).toBe(respuestaEsperada);
    });

    it("registrarPretest() debe delegar en PretestService", async () => {
      const dto: RegistrarPretestDto = {
        indicador: "CSP",
        periodoDescrito: "I Bimestre",
        fechaInicio: "2026-03-01",
        fechaFin: "2026-05-08",
        numerador: 942,
        denominador: 1200,
        fuente: "Hojas de firma",
      };
      const respuestaEsperada = {
        mensaje: "Registrado",
        pretest: {} as PretestResponseDto,
      } as MensajeIndicadoresResponseDto & { pretest: PretestResponseDto };
      const spy = jest.spyOn(pretestService, "registrar").mockResolvedValueOnce(respuestaEsperada);

      const resultado = await fachada.registrarPretest(dto, "user-id", "Director", "127.0.0.1");

      expect(spy).toHaveBeenCalledWith(dto, "user-id", "Director", "127.0.0.1");
      expect(resultado).toBe(respuestaEsperada);
    });

    it("obtenerPretestVigente() debe delegar en PretestService", async () => {
      const respuestaEsperada = { indicador: "CSP" } as PretestResponseDto;
      const spy = jest
        .spyOn(pretestService, "obtenerVigente")
        .mockResolvedValueOnce(respuestaEsperada);

      const resultado = await fachada.obtenerPretestVigente("CSP");

      expect(spy).toHaveBeenCalledWith("CSP");
      expect(resultado).toBe(respuestaEsperada);
    });

    it("listarPretests() debe delegar en PretestService", async () => {
      const respuestaEsperada: PretestResponseDto[] = [];
      const spy = jest
        .spyOn(pretestService, "listarTodos")
        .mockResolvedValueOnce(respuestaEsperada);

      const resultado = await fachada.listarPretests();

      expect(spy).toHaveBeenCalled();
      expect(resultado).toBe(respuestaEsperada);
    });

    it("cerrarMedicion() debe delegar en MedicionService", async () => {
      const dto: CerrarMedicionDto = { periodoId: "per-1" };
      const respuestaEsperada = {
        mensaje: "Cerrada",
        medicion: {} as MedicionBimestreResponseDto,
      } as MensajeIndicadoresResponseDto & { medicion: MedicionBimestreResponseDto };
      const spy = jest.spyOn(medicionService, "cerrar").mockResolvedValueOnce(respuestaEsperada);

      const resultado = await fachada.cerrarMedicion(dto, "user-id", "Director", "127.0.0.1");

      expect(spy).toHaveBeenCalledWith(dto, "user-id", "Director", "127.0.0.1");
      expect(resultado).toBe(respuestaEsperada);
    });

    it("crearNuevaVersionMedicion() debe delegar en MedicionService", async () => {
      const dto: NuevaVersionMedicionDto = { motivoCambio: "Ajuste justificado" };
      const respuestaEsperada = {
        mensaje: "Nueva versión",
        medicion: {} as MedicionBimestreResponseDto,
      } as MensajeIndicadoresResponseDto & { medicion: MedicionBimestreResponseDto };
      const spy = jest
        .spyOn(medicionService, "crearNuevaVersion")
        .mockResolvedValueOnce(respuestaEsperada);

      const resultado = await fachada.crearNuevaVersionMedicion(
        "med-id",
        dto,
        "user-id",
        "Director",
        "127.0.0.1",
      );

      expect(spy).toHaveBeenCalledWith("med-id", dto, "user-id", "Director", "127.0.0.1");
      expect(resultado).toBe(respuestaEsperada);
    });

    it("obtenerMedicionPeriodo() debe delegar en MedicionService", async () => {
      const respuestaEsperada = { id: "med-1" } as MedicionBimestreResponseDto;
      const spy = jest
        .spyOn(medicionService, "obtenerPorPeriodo")
        .mockResolvedValueOnce(respuestaEsperada);

      const resultado = await fachada.obtenerMedicionPeriodo("per-1");

      expect(spy).toHaveBeenCalledWith("per-1");
      expect(resultado).toBe(respuestaEsperada);
    });

    it("obtenerHistorialMediciones() debe delegar en MedicionService", async () => {
      const respuestaEsperada = { versiones: [] } as unknown as HistorialMedicionResponseDto;
      const spy = jest
        .spyOn(medicionService, "obtenerHistorial")
        .mockResolvedValueOnce(respuestaEsperada);

      const resultado = await fachada.obtenerHistorialMediciones("per-1");

      expect(spy).toHaveBeenCalledWith("per-1");
      expect(resultado).toBe(respuestaEsperada);
    });

    it("obtenerComparacion() debe delegar en ComparacionService", async () => {
      const respuestaEsperada = { periodoId: "per-1" } as ComparacionBimestreResponseDto;
      const spy = jest
        .spyOn(comparacionService, "obtenerComparacion")
        .mockResolvedValueOnce(respuestaEsperada);

      const resultado = await fachada.obtenerComparacion("per-1");

      expect(spy).toHaveBeenCalledWith("per-1");
      expect(resultado).toBe(respuestaEsperada);
    });

    it("obtenerPanel() debe delegar en PanelService", async () => {
      const respuestaEsperada = { fecha: "2026-10-16" } as PanelGeneralResponseDto;
      const spy = jest.spyOn(panelService, "obtenerPanel").mockResolvedValueOnce(respuestaEsperada);

      const resultado = await fachada.obtenerPanel();

      expect(spy).toHaveBeenCalled();
      expect(resultado).toBe(respuestaEsperada);
    });

    it("exportarExcel() debe delegar en ExportacionService", async () => {
      const query: ExportarIndicadoresQueryDto = { periodoId: "per-1" };
      const respuestaEsperada = {
        buffer: Buffer.from("excel"),
        nombreArchivo: "reporte.xlsx",
      };
      const spy = jest
        .spyOn(exportacionService, "exportarExcel")
        .mockResolvedValueOnce(respuestaEsperada);

      const resultado = await fachada.exportarExcel(query, "user-id", "admin", "127.0.0.1");

      expect(spy).toHaveBeenCalledWith(query, "user-id", "admin", "127.0.0.1");
      expect(resultado).toBe(respuestaEsperada);
    });

    it("exportarPdf() debe delegar en ExportacionService", async () => {
      const query: ExportarIndicadoresQueryDto = { periodoId: "per-1" };
      const respuestaEsperada = {
        buffer: Buffer.from("pdf"),
        nombreArchivo: "informe.pdf",
      };
      const spy = jest
        .spyOn(exportacionService, "exportarPdf")
        .mockResolvedValueOnce(respuestaEsperada);

      const resultado = await fachada.exportarPdf(query, "user-id", "Director", "127.0.0.1");

      expect(spy).toHaveBeenCalledWith(query, "user-id", "Director", "127.0.0.1");
      expect(resultado).toBe(respuestaEsperada);
    });
  });
});
