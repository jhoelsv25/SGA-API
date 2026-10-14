import { Global, Module, RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { ConfigModule } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { getQueueToken } from "@nestjs/bullmq";
import { Test, TestingModule } from "@nestjs/testing";
import { Queue } from "bullmq";
import { AnioLectivoModule } from "@/common/anio-lectivo";
import { MENU_AUSENCIAS_DOCENTES, MENU_MIS_AUSENCIAS } from "@/common/constants";
import { MENU_ACCESS_KEY } from "@/common/decorators";
import { DRIZZLE } from "@/core/database";
import { QUEUES } from "@/core/queues/queues.constants";
import { RedisService } from "@/core/redis/redis.service";
import {
  AusenciasConsultaService,
  AusenciasCorreccionService,
  AusenciasDocenteController,
  AusenciasDocenteModule,
  AusenciasDocenteRepository,
  AusenciasDocenteService,
  AusenciasRegistroService,
  type AnularAusenciaDto,
  type AusenciaResponseDto,
  type CorregirAusenciaDto,
  type FiltroAusenciasQueryDto,
  type HistorialAusenciaResponseDto,
  type MensajeAusenciaResponseDto,
  type RegistrarAusenciaDto,
  type RegistrarDescargoDto,
  type ResumenAusenciasSupervisorResponseDto,
} from "@/features/ausencias-docente";

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

describe("Cableado de dependencias RF-012", () => {
  let modulo: TestingModule;
  let reflector: Reflector;
  let controlador: AusenciasDocenteController;
  let fachada: AusenciasDocenteService;
  let servicioRegistro: AusenciasRegistroService;
  let servicioCorreccion: AusenciasCorreccionService;
  let servicioConsulta: AusenciasConsultaService;

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
        AusenciasDocenteModule,
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
    controlador = modulo.get<AusenciasDocenteController>(AusenciasDocenteController);
    fachada = modulo.get<AusenciasDocenteService>(AusenciasDocenteService);
    servicioRegistro = modulo.get<AusenciasRegistroService>(AusenciasRegistroService);
    servicioCorreccion = modulo.get<AusenciasCorreccionService>(AusenciasCorreccionService);
    servicioConsulta = modulo.get<AusenciasConsultaService>(AusenciasConsultaService);
  });

  afterAll(async () => {
    if (modulo) {
      await modulo.close();
    }
  });

  it("debe compilar el módulo y resolver AusenciasDocenteService, AusenciasDocenteController y AusenciasDocenteRepository", () => {
    expect(fachada).toBeDefined();
    expect(controlador).toBeDefined();
    expect(modulo.get(AusenciasDocenteRepository)).toBeDefined();

    expect(fachada).toBeInstanceOf(AusenciasDocenteService);
    expect(controlador).toBeInstanceOf(AusenciasDocenteController);
    expect(modulo.get(AusenciasDocenteRepository)).toBeInstanceOf(AusenciasDocenteRepository);
  });

  it("debe resolver los subservicios internos AusenciasRegistroService, AusenciasCorreccionService y AusenciasConsultaService", () => {
    expect(servicioRegistro).toBeDefined();
    expect(servicioCorreccion).toBeDefined();
    expect(servicioConsulta).toBeDefined();

    expect(servicioRegistro).toBeInstanceOf(AusenciasRegistroService);
    expect(servicioCorreccion).toBeInstanceOf(AusenciasCorreccionService);
    expect(servicioConsulta).toBeInstanceOf(AusenciasConsultaService);
  });

  it("debe exponer las rutas REST de supervisión con @MenuAccess(MENU_AUSENCIAS_DOCENTES)", () => {
    const prefijoControlador = reflector.get<string>(PATH_METADATA, AusenciasDocenteController);
    expect(prefijoControlador).toBe("ausencias-docente");

    // Registrar (POST /)
    expect(reflector.get<string>(PATH_METADATA, controlador.registrar)).toBe("/");
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.registrar)).toBe(
      RequestMethod.POST,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.registrar)).toBe(
      MENU_AUSENCIAS_DOCENTES,
    );

    // Corregir (PATCH :id)
    expect(reflector.get<string>(PATH_METADATA, controlador.corregir)).toBe(":id");
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.corregir)).toBe(
      RequestMethod.PATCH,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.corregir)).toBe(
      MENU_AUSENCIAS_DOCENTES,
    );

    // Anular (PATCH :id/anular)
    expect(reflector.get<string>(PATH_METADATA, controlador.anular)).toBe(":id/anular");
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.anular)).toBe(
      RequestMethod.PATCH,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.anular)).toBe(
      MENU_AUSENCIAS_DOCENTES,
    );

    // Historial (GET :id/historial)
    expect(reflector.get<string>(PATH_METADATA, controlador.obtenerHistorial)).toBe(
      ":id/historial",
    );
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.obtenerHistorial)).toBe(
      RequestMethod.GET,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.obtenerHistorial)).toBe(
      MENU_AUSENCIAS_DOCENTES,
    );

    // Listar supervisor (GET /)
    expect(reflector.get<string>(PATH_METADATA, controlador.listarSupervisor)).toBe("/");
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.listarSupervisor)).toBe(
      RequestMethod.GET,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.listarSupervisor)).toBe(
      MENU_AUSENCIAS_DOCENTES,
    );
  });

  it("debe exponer las rutas REST del docente con @MenuAccess(MENU_MIS_AUSENCIAS)", () => {
    // Mis ausencias (GET mis-ausencias)
    expect(reflector.get<string>(PATH_METADATA, controlador.misAusencias)).toBe("mis-ausencias");
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.misAusencias)).toBe(
      RequestMethod.GET,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.misAusencias)).toBe(
      MENU_MIS_AUSENCIAS,
    );

    // Detalle de ausencia del docente (GET mis-ausencias/:id)
    expect(reflector.get<string>(PATH_METADATA, controlador.obtenerDetalleDocente)).toBe(
      "mis-ausencias/:id",
    );
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.obtenerDetalleDocente)).toBe(
      RequestMethod.GET,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.obtenerDetalleDocente)).toBe(
      MENU_MIS_AUSENCIAS,
    );

    // Presentar descargo (POST mis-ausencias/:id/descargo)
    expect(reflector.get<string>(PATH_METADATA, controlador.presentarDescargo)).toBe(
      "mis-ausencias/:id/descargo",
    );
    expect(reflector.get<RequestMethod>(METHOD_METADATA, controlador.presentarDescargo)).toBe(
      RequestMethod.POST,
    );
    expect(reflector.get<string>(MENU_ACCESS_KEY, controlador.presentarDescargo)).toBe(
      MENU_MIS_AUSENCIAS,
    );
  });

  it("AusenciasDocenteService debe delegar el registro en AusenciasRegistroService", async () => {
    const mockDto: RegistrarAusenciaDto = {
      sesionClaseId: "ses-1-uuid",
      horaDesde: "08:30",
      horaHasta: "09:15",
      motivo: "fuera_del_aula",
    };
    const mockRespuesta: MensajeAusenciaResponseDto & { ausencia: AusenciaResponseDto } = {
      mensaje: "Ausencia registrada: 45 minutos. Se notificó al docente.",
      minutos: 45,
      ausencia: {
        id: "aus-1-uuid",
        ausenciaRaizId: "aus-1-uuid",
        sesionClaseId: "ses-1-uuid",
        sesion: {
          id: "ses-1-uuid",
          fecha: "2027-05-13",
          horaInicio: "08:30",
          horaFin: "10:00",
          seccionNombre: "5.° A",
          cursoNombre: "Matemática",
          docenteId: "doc-1-uuid",
          docenteNombre: "Profesor Prueba",
        },
        horaDesde: "08:30",
        horaHasta: "09:15",
        minutos: 45,
        motivo: "fuera_del_aula",
        observacion: null,
        version: 1,
        vigente: true,
        anulada: false,
        anuladaEn: null,
        motivoAnulacion: null,
        descargo: null,
        descargoEn: null,
        fechaLimiteDescargo: null,
        fechaLimiteDescargoFormateada: null,
        puedeDescargar: false,
        puedeCorregir: true,
        puedeAnular: true,
        fotos: [],
        registradoPor: { id: "user-1-uuid", nombreCompleto: "Supervisor" },
        registradoEn: new Date().toISOString(),
      },
    };

    const spyRegistro = jest
      .spyOn(servicioRegistro, "registrar")
      .mockResolvedValueOnce(mockRespuesta);

    const resultado = await fachada.registrar(mockDto, undefined, "user-1-uuid", "192.168.1.1");

    expect(spyRegistro).toHaveBeenCalledWith(mockDto, undefined, "user-1-uuid", "192.168.1.1");
    expect(resultado).toBe(mockRespuesta);
  });

  it("AusenciasDocenteService debe delegar corrección, anulación e historial en AusenciasCorreccionService", async () => {
    const mockAusencia: AusenciaResponseDto = {
      id: "aus-2-uuid",
      ausenciaRaizId: "aus-1-uuid",
      sesionClaseId: "ses-1-uuid",
      sesion: {
        id: "ses-1-uuid",
        fecha: "2027-05-13",
        horaInicio: "08:30",
        horaFin: "10:00",
        seccionNombre: "5.° A",
        cursoNombre: "Matemática",
        docenteId: "doc-1-uuid",
        docenteNombre: "Profesor Prueba",
      },
      horaDesde: "08:30",
      horaHasta: "09:30",
      minutos: 60,
      motivo: "fuera_del_aula",
      observacion: "Ajuste",
      version: 2,
      vigente: true,
      anulada: false,
      anuladaEn: null,
      motivoAnulacion: null,
      descargo: null,
      descargoEn: null,
      fechaLimiteDescargo: null,
      fechaLimiteDescargoFormateada: null,
      puedeDescargar: false,
      puedeCorregir: true,
      puedeAnular: true,
      fotos: [],
      registradoPor: { id: "user-1-uuid", nombreCompleto: "Supervisor" },
      registradoEn: new Date().toISOString(),
    };

    const mockDtoCorregir: CorregirAusenciaDto = {
      horaHasta: "09:30",
      motivoCambio: "Corrección de tramo acordado",
    };
    const spyCorregir = jest
      .spyOn(servicioCorreccion, "corregir")
      .mockResolvedValueOnce(mockAusencia);

    const resCorregir = await fachada.corregir(
      "aus-1-uuid",
      mockDtoCorregir,
      undefined,
      "user-1-uuid",
      "192.168.1.1",
    );
    expect(spyCorregir).toHaveBeenCalledWith(
      "aus-1-uuid",
      mockDtoCorregir,
      undefined,
      "user-1-uuid",
      "192.168.1.1",
    );
    expect(resCorregir).toBe(mockAusencia);

    const mockDtoAnular: AnularAusenciaDto = {
      motivoAnulacion: "Error involuntario en verificación de asistencia",
    };
    const spyAnular = jest.spyOn(servicioCorreccion, "anular").mockResolvedValueOnce(mockAusencia);

    const resAnular = await fachada.anular(
      "aus-1-uuid",
      mockDtoAnular,
      "user-1-uuid",
      "192.168.1.1",
    );
    expect(spyAnular).toHaveBeenCalledWith(
      "aus-1-uuid",
      mockDtoAnular,
      "user-1-uuid",
      "192.168.1.1",
    );
    expect(resAnular).toBe(mockAusencia);

    const mockHistorial: HistorialAusenciaResponseDto = {
      ausenciaRaizId: "aus-1-uuid",
      versiones: [],
    };
    const spyHistorial = jest
      .spyOn(servicioCorreccion, "obtenerHistorial")
      .mockResolvedValueOnce(mockHistorial);

    const resHistorial = await fachada.obtenerHistorial("aus-1-uuid");
    expect(spyHistorial).toHaveBeenCalledWith("aus-1-uuid");
    expect(resHistorial).toBe(mockHistorial);
  });

  it("AusenciasDocenteService debe delegar consultas y descargo en AusenciasConsultaService", async () => {
    const mockFiltros: FiltroAusenciasQueryDto = {
      fechaDesde: "2027-05-01",
      fechaHasta: "2027-05-31",
    };
    const mockResumen: ResumenAusenciasSupervisorResponseDto = {
      data: [],
      totalMinutos: 0,
      totalAusencias: 0,
      totalAnuladas: 0,
    };
    const spyListar = jest
      .spyOn(servicioConsulta, "listarSupervisor")
      .mockResolvedValueOnce(mockResumen);

    const resListar = await fachada.listarSupervisor(mockFiltros);
    expect(spyListar).toHaveBeenCalledWith(mockFiltros);
    expect(resListar).toBe(mockResumen);

    const spyMisAusencias = jest.spyOn(servicioConsulta, "misAusencias").mockResolvedValueOnce([]);

    const resMis = await fachada.misAusencias("persona-docente-uuid");
    expect(spyMisAusencias).toHaveBeenCalledWith("persona-docente-uuid");
    expect(resMis).toEqual([]);

    const mockDetalleAusencia: AusenciaResponseDto = {
      id: "aus-1-uuid",
      ausenciaRaizId: "aus-1-uuid",
      sesionClaseId: "ses-1-uuid",
      sesion: {
        id: "ses-1-uuid",
        fecha: "2027-05-13",
        horaInicio: "08:30",
        horaFin: "10:00",
        seccionNombre: "5.° A",
        cursoNombre: "Matemática",
        docenteId: "doc-1-uuid",
        docenteNombre: "Profesor Prueba",
      },
      horaDesde: "08:30",
      horaHasta: "09:15",
      minutos: 45,
      motivo: "desayunando",
      observacion: null,
      version: 1,
      vigente: true,
      anulada: false,
      anuladaEn: null,
      motivoAnulacion: null,
      descargo: null,
      descargoEn: null,
      fechaLimiteDescargo: null,
      fechaLimiteDescargoFormateada: null,
      puedeDescargar: true,
      puedeCorregir: false,
      puedeAnular: false,
      fotos: [],
      registradoPor: { id: "user-1-uuid", nombreCompleto: "Supervisor" },
      registradoEn: new Date().toISOString(),
    };
    const spyDetalle = jest
      .spyOn(servicioConsulta, "obtenerDetalleDocente")
      .mockResolvedValueOnce(mockDetalleAusencia);

    const resDetalle = await fachada.obtenerDetalleDocente("aus-1-uuid", "persona-docente-uuid");
    expect(spyDetalle).toHaveBeenCalledWith("aus-1-uuid", "persona-docente-uuid");
    expect(resDetalle).toBe(mockDetalleAusencia);

    const mockDtoDescargo: RegistrarDescargoDto = {
      descargo: "Presento descargo formal por motivo de atención médica de urgencia.",
    };
    const mockMensajeDescargo: MensajeAusenciaResponseDto = {
      mensaje: "Descargo registrado exitosamente.",
    };
    const spyDescargo = jest
      .spyOn(servicioConsulta, "presentarDescargo")
      .mockResolvedValueOnce(mockMensajeDescargo);

    const resDescargo = await fachada.presentarDescargo(
      "aus-1-uuid",
      mockDtoDescargo,
      "persona-docente-uuid",
      "user-docente-uuid",
      "192.168.1.50",
    );
    expect(spyDescargo).toHaveBeenCalledWith(
      "aus-1-uuid",
      mockDtoDescargo,
      "persona-docente-uuid",
      "user-docente-uuid",
      "192.168.1.50",
    );
    expect(resDescargo).toBe(mockMensajeDescargo);
  });
});
