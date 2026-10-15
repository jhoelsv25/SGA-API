import { Global, Injectable, Module, RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { ConfigModule } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { getQueueToken } from "@nestjs/bullmq";
import { Test, TestingModule } from "@nestjs/testing";
import { Queue } from "bullmq";
import { AnioLectivoModule } from "@/common/anio-lectivo";
import {
  MENU_CONSOLIDADO_BIMESTRE,
  MENU_MI_SEGUIMIENTO,
  MENU_SOLICITUDES_REVISION,
} from "@/common/constants";
import { MENU_ACCESS_KEY } from "@/common/decorators";
import { DRIZZLE } from "@/core/database";
import { QUEUES } from "@/core/queues/queues.constants";
import { RedisService } from "@/core/redis/redis.service";
import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import {
  AusenciasDocenteModule,
  AusenciasDocenteService,
  AusenciasRegistroService,
} from "@/features/ausencias-docente";
import {
  ConsolidadoBloqueoService,
  ConsolidadoGeneracionService,
  ConsolidadoVersionadoService,
  SeguimientoDocenteController,
  SeguimientoDocenteModule,
  SeguimientoDocenteRepository,
  SeguimientoDocenteService,
  SeguimientoExportacionService,
  SolicitudesRevisionService,
  type HistorialConsolidadoResponseDto,
  type MensajeConsolidadoResponseDto,
  type MiConsolidadoResponseDto,
  type ConsolidadoResumenDto,
} from "@/features/seguimiento-docente";

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

@Injectable()
class ConsumidorSesionesSimulado {
  constructor(public readonly bloqueo: ConsolidadoBloqueoService) {}
}

@Module({
  imports: [SeguimientoDocenteModule],
  providers: [ConsumidorSesionesSimulado],
  exports: [ConsumidorSesionesSimulado],
})
class ModuloConsumidorSesiones {}

describe("Cableado de dependencias RF-013 (Consolidado y Ficha de Seguimiento Docente)", () => {
  let modulo: TestingModule;
  let reflector: Reflector;
  let controlador: SeguimientoDocenteController;
  let fachada: SeguimientoDocenteService;
  let repositorio: SeguimientoDocenteRepository;
  let servicioBloqueo: ConsolidadoBloqueoService;
  let servicioGeneracion: ConsolidadoGeneracionService;
  let servicioVersionado: ConsolidadoVersionadoService;
  let servicioSolicitudes: SolicitudesRevisionService;
  let servicioExportacion: SeguimientoExportacionService;
  let servicioAusencias: AusenciasDocenteService;
  let registroAusencias: AusenciasRegistroService;
  let consumidorSesiones: ConsumidorSesionesSimulado;

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
        SeguimientoDocenteModule,
        AusenciasDocenteModule,
        ModuloConsumidorSesiones,
      ],
    })
      .overrideProvider(getQueueToken(QUEUES.AUDIT))
      .useValue(colaSimulada)
      .overrideProvider(getQueueToken(QUEUES.ANIO_ESCOLAR))
      .useValue(colaSimulada)
      .overrideProvider(getQueueToken(QUEUES.NOTIFICATIONS))
      .useValue(colaSimulada)
      .compile();

    reflector = new Reflector();
    controlador = modulo.get<SeguimientoDocenteController>(SeguimientoDocenteController);
    fachada = modulo.get<SeguimientoDocenteService>(SeguimientoDocenteService);
    repositorio = modulo.get<SeguimientoDocenteRepository>(SeguimientoDocenteRepository);
    servicioBloqueo = modulo.get<ConsolidadoBloqueoService>(ConsolidadoBloqueoService);
    servicioGeneracion = modulo.get<ConsolidadoGeneracionService>(ConsolidadoGeneracionService);
    servicioVersionado = modulo.get<ConsolidadoVersionadoService>(ConsolidadoVersionadoService);
    servicioSolicitudes = modulo.get<SolicitudesRevisionService>(SolicitudesRevisionService);
    servicioExportacion = modulo.get<SeguimientoExportacionService>(SeguimientoExportacionService);
    servicioAusencias = modulo.get<AusenciasDocenteService>(AusenciasDocenteService);
    registroAusencias = modulo.get<AusenciasRegistroService>(AusenciasRegistroService);
    consumidorSesiones = modulo.get<ConsumidorSesionesSimulado>(ConsumidorSesionesSimulado);
  });

  afterAll(async () => {
    if (modulo) {
      await modulo.close();
    }
  });

  it("debe compilar el módulo y resolver SeguimientoDocenteService, SeguimientoDocenteController y SeguimientoDocenteRepository", () => {
    expect(fachada).toBeDefined();
    expect(controlador).toBeDefined();
    expect(repositorio).toBeDefined();

    expect(fachada).toBeInstanceOf(SeguimientoDocenteService);
    expect(controlador).toBeInstanceOf(SeguimientoDocenteController);
    expect(repositorio).toBeInstanceOf(SeguimientoDocenteRepository);
  });

  it("debe resolver todos los subservicios de HU1-HU4 del módulo seguimiento-docente", () => {
    expect(servicioBloqueo).toBeDefined();
    expect(servicioGeneracion).toBeDefined();
    expect(servicioVersionado).toBeDefined();
    expect(servicioSolicitudes).toBeDefined();
    expect(servicioExportacion).toBeDefined();

    expect(servicioBloqueo).toBeInstanceOf(ConsolidadoBloqueoService);
    expect(servicioGeneracion).toBeInstanceOf(ConsolidadoGeneracionService);
    expect(servicioVersionado).toBeInstanceOf(ConsolidadoVersionadoService);
    expect(servicioSolicitudes).toBeInstanceOf(SolicitudesRevisionService);
    expect(servicioExportacion).toBeInstanceOf(SeguimientoExportacionService);
  });

  it("el bloqueo ConsolidadoBloqueoService debe ser inyectable en ausencias-docente y sesiones-clase", () => {
    expect(servicioAusencias).toBeDefined();
    expect(registroAusencias).toBeDefined();
    expect(consumidorSesiones).toBeDefined();
    expect(consumidorSesiones.bloqueo).toBeDefined();
    expect(consumidorSesiones.bloqueo).toBeInstanceOf(ConsolidadoBloqueoService);
    expect(consumidorSesiones.bloqueo).toBe(servicioBloqueo);
  });

  it("debe exponer las rutas REST de supervisión directiva con @MenuAccess(MENU_CONSOLIDADO_BIMESTRE)", () => {
    const prefijo = reflector.get<string>(PATH_METADATA, SeguimientoDocenteController);
    expect(prefijo).toBe("seguimiento-docente");

    // generarTodos (POST periodos/:periodoId/generar-todos)
    expect(reflector.get<string>(PATH_METADATA, controlador.generarTodos)).toBe(
      "periodos/:periodoId/generar-todos",
    );
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.generarTodos)).toBe(
      RequestMethod.POST,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.generarTodos)).toBe(
      MENU_CONSOLIDADO_BIMESTRE,
    );

    // generarUno (POST periodos/:periodoId/docentes/:docenteId/generar)
    expect(reflector.get<string>(PATH_METADATA, controlador.generarUno)).toBe(
      "periodos/:periodoId/docentes/:docenteId/generar",
    );
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.generarUno)).toBe(
      RequestMethod.POST,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.generarUno)).toBe(
      MENU_CONSOLIDADO_BIMESTRE,
    );

    // obtenerReporteBimestre (GET periodos/:periodoId/reporte)
    expect(reflector.get<string>(PATH_METADATA, controlador.obtenerReporteBimestre)).toBe(
      "periodos/:periodoId/reporte",
    );
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.obtenerReporteBimestre)).toBe(
      RequestMethod.GET,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.obtenerReporteBimestre)).toBe(
      MENU_CONSOLIDADO_BIMESTRE,
    );

    // exportarReporteExcel (GET periodos/:periodoId/exportar)
    expect(reflector.get<string>(PATH_METADATA, controlador.exportarReporteExcel)).toBe(
      "periodos/:periodoId/exportar",
    );
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.exportarReporteExcel)).toBe(
      RequestMethod.GET,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.exportarReporteExcel)).toBe(
      MENU_CONSOLIDADO_BIMESTRE,
    );

    // descargarFichaPdf (GET :id/ficha)
    expect(reflector.get<string>(PATH_METADATA, controlador.descargarFichaPdf)).toBe(":id/ficha");
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.descargarFichaPdf)).toBe(
      RequestMethod.GET,
    );
    expect(reflector.get<string[]>(MENU_ACCESS_KEY, controlador.descargarFichaPdf)).toEqual([
      MENU_CONSOLIDADO_BIMESTRE,
      MENU_MI_SEGUIMIENTO,
    ]);

    // obtenerHistorial (GET :id/historial)
    expect(reflector.get<string>(PATH_METADATA, controlador.obtenerHistorial)).toBe(
      ":id/historial",
    );
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.obtenerHistorial)).toBe(
      RequestMethod.GET,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.obtenerHistorial)).toBe(
      MENU_CONSOLIDADO_BIMESTRE,
    );

    // registrarDecision (PATCH :id/decision)
    expect(reflector.get<string>(PATH_METADATA, controlador.registrarDecision)).toBe(
      ":id/decision",
    );
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.registrarDecision)).toBe(
      RequestMethod.PATCH,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.registrarDecision)).toBe(
      MENU_CONSOLIDADO_BIMESTRE,
    );

    // reabrir (POST :id/reabrir)
    expect(reflector.get<string>(PATH_METADATA, controlador.reabrir)).toBe(":id/reabrir");
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.reabrir)).toBe(
      RequestMethod.POST,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.reabrir)).toBe(
      MENU_CONSOLIDADO_BIMESTRE,
    );

    // cerrar (POST :id/cerrar)
    expect(reflector.get<string>(PATH_METADATA, controlador.cerrar)).toBe(":id/cerrar");
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.cerrar)).toBe(
      RequestMethod.POST,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.cerrar)).toBe(
      MENU_CONSOLIDADO_BIMESTRE,
    );

    // obtenerDetalle (GET :id)
    expect(reflector.get<string>(PATH_METADATA, controlador.obtenerDetalle)).toBe(":id");
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.obtenerDetalle)).toBe(
      RequestMethod.GET,
    );
    expect(reflector.get<string[]>(MENU_ACCESS_KEY, controlador.obtenerDetalle)).toEqual([
      MENU_CONSOLIDADO_BIMESTRE,
      MENU_MI_SEGUIMIENTO,
    ]);
  });

  it("debe exponer las rutas REST de solicitudes con @MenuAccess(MENU_SOLICITUDES_REVISION)", () => {
    // listarSolicitudes (GET solicitudes)
    expect(reflector.get<string>(PATH_METADATA, controlador.listarSolicitudes)).toBe("solicitudes");
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.listarSolicitudes)).toBe(
      RequestMethod.GET,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.listarSolicitudes)).toBe(
      MENU_SOLICITUDES_REVISION,
    );

    // aceptarSolicitud (PATCH solicitudes/:id/aceptar)
    expect(reflector.get<string>(PATH_METADATA, controlador.aceptarSolicitud)).toBe(
      "solicitudes/:id/aceptar",
    );
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.aceptarSolicitud)).toBe(
      RequestMethod.PATCH,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.aceptarSolicitud)).toBe(
      MENU_SOLICITUDES_REVISION,
    );

    // rechazarSolicitud (PATCH solicitudes/:id/rechazar)
    expect(reflector.get<string>(PATH_METADATA, controlador.rechazarSolicitud)).toBe(
      "solicitudes/:id/rechazar",
    );
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.rechazarSolicitud)).toBe(
      RequestMethod.PATCH,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.rechazarSolicitud)).toBe(
      MENU_SOLICITUDES_REVISION,
    );
  });

  it("debe exponer las rutas REST de mi seguimiento docente con @MenuAccess(MENU_MI_SEGUIMIENTO)", () => {
    // miConsolidado (GET mi-seguimiento/periodos/:periodoId)
    expect(reflector.get<string>(PATH_METADATA, controlador.miConsolidado)).toBe(
      "mi-seguimiento/periodos/:periodoId",
    );
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.miConsolidado)).toBe(
      RequestMethod.GET,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.miConsolidado)).toBe(
      MENU_MI_SEGUIMIENTO,
    );

    // crearSolicitud (POST mis-solicitudes)
    expect(reflector.get<string>(PATH_METADATA, controlador.crearSolicitud)).toBe(
      "mis-solicitudes",
    );
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.crearSolicitud)).toBe(
      RequestMethod.POST,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.crearSolicitud)).toBe(
      MENU_MI_SEGUIMIENTO,
    );
  });

  it("SeguimientoDocenteService debe delegar HU1 (generación y reporte) en ConsolidadoGeneracionService", async () => {
    const mockResGenerar: MensajeConsolidadoResponseDto = {
      mensaje: "Consolidado generado para 20 docentes.",
      cantidad: 20,
    };
    const spyTodos = jest
      .spyOn(
        (fachada as unknown as { generacionService: ConsolidadoGeneracionService })
          .generacionService,
        "generarTodos",
      )
      .mockResolvedValueOnce(mockResGenerar);

    const res = await fachada.generarTodos("per-1-uuid", "user-1", "Director", "127.0.0.1");
    expect(spyTodos).toHaveBeenCalledWith("per-1-uuid", "user-1", "Director", "127.0.0.1");
    expect(res).toBe(mockResGenerar);
  });

  it("SeguimientoDocenteService debe delegar HU2 (versionado e historial) en ConsolidadoVersionadoService", async () => {
    const mockHistorial: HistorialConsolidadoResponseDto = {
      consolidadoRaizId: "cons-1",
      docenteId: "doc-1",
      docenteNombre: "Profesor Prueba",
      periodoId: "per-1",
      periodoNombre: "I Bimestre",
      versiones: [],
    };
    const spyHistorial = jest
      .spyOn(
        (fachada as unknown as { versionadoService: ConsolidadoVersionadoService })
          .versionadoService,
        "obtenerHistorial",
      )
      .mockResolvedValueOnce(mockHistorial);

    const res = await fachada.obtenerHistorial("cons-1");
    expect(spyHistorial).toHaveBeenCalledWith("cons-1");
    expect(res).toBe(mockHistorial);
  });

  it("SeguimientoDocenteService debe delegar HU3 (solicitudes) en SolicitudesRevisionService", async () => {
    const mockMiConsolidado: MiConsolidadoResponseDto = {
      consolidado: {} as ConsolidadoResumenDto,
      sesiones: [],
      solicitudPendiente: null,
    };
    const spyMiConsolidado = jest
      .spyOn(servicioSolicitudes, "miConsolidado")
      .mockResolvedValueOnce(mockMiConsolidado);

    const res = await fachada.miConsolidado("per-1", "per-persona");
    expect(spyMiConsolidado).toHaveBeenCalledWith("per-1", "per-persona");
    expect(res).toBe(mockMiConsolidado);
  });

  it("SeguimientoDocenteService debe delegar HU4 (exportación y ficha) en SeguimientoExportacionService", async () => {
    const mockPdf = { buffer: Buffer.from("pdf"), nombreArchivo: "ficha.pdf" };
    const mockUser: AuthenticatedUser = {
      id: "u1",
      username: "director",
      role: "Director",
      roleId: "r1",
      personaId: "p1",
    };
    const spyPdf = jest
      .spyOn(servicioExportacion, "generarFichaPdf")
      .mockResolvedValueOnce(mockPdf);

    const res = await fachada.generarFichaPdf("cons-1", mockUser);
    expect(spyPdf).toHaveBeenCalledWith("cons-1", mockUser);
    expect(res).toBe(mockPdf);
  });

  it("SeguimientoDocenteService debe delegar el bloqueo en ConsolidadoBloqueoService", async () => {
    const spyBloqueo = jest
      .spyOn(servicioBloqueo, "asegurarNoCerrado")
      .mockResolvedValueOnce(undefined);

    await fachada.asegurarNoCerrado("doc-1", "per-1");
    expect(spyBloqueo).toHaveBeenCalledWith("doc-1", "per-1");
  });
});
