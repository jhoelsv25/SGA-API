import { Reflector } from "@nestjs/core";
import { MENU_AUSENCIAS_DOCENTES, MENU_MIS_AUSENCIAS } from "@/common/constants";
import { MENU_ACCESS_KEY, type ClientInfoData } from "@/common/decorators";
import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import {
  AusenciasDocenteController,
  AusenciasDocenteService,
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

describe("AusenciasDocenteController (RF-012: Controlador y control de acceso @MenuAccess)", () => {
  let controller: AusenciasDocenteController;
  let service: jest.Mocked<Partial<AusenciasDocenteService>>;
  let reflector: Reflector;

  const mockUsuarioDirector: AuthenticatedUser = {
    id: "user-director-uuid",
    username: "director",
    role: "Director",
    roleId: "rol-director-uuid",
    personaId: "per-director-uuid",
  };

  const mockUsuarioCoordinador: AuthenticatedUser = {
    id: "user-coordinador-uuid",
    username: "coordinador",
    role: "Coordinador",
    roleId: "rol-coordinador-uuid",
    personaId: "per-coordinador-uuid",
  };

  const mockUsuarioDocente: AuthenticatedUser = {
    id: "user-docente-uuid",
    username: "docente",
    role: "Docente",
    roleId: "rol-docente-uuid",
    personaId: "per-docente-uuid",
  };

  const mockClientInfo: ClientInfoData = {
    ip: "192.168.1.15",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  };

  const mockAusenciaResponse: AusenciaResponseDto = {
    id: "aus-1-uuid",
    ausenciaRaizId: "aus-1-uuid",
    sesionClaseId: "ses-mate-5a",
    sesion: {
      id: "ses-mate-5a",
      fecha: "2027-05-13",
      horaInicio: "08:30",
      horaFin: "10:00",
      cursoNombre: "Matemática",
      seccionNombre: "5.° A",
      docenteId: "doc-quispe-uuid",
      docenteNombre: "Quispe, Juan",
    },
    horaDesde: "08:50",
    horaHasta: "09:10",
    minutos: 20,
    motivo: "desayunando",
    observacion: "En la cafetería",
    version: 1,
    vigente: true,
    anulada: false,
    anuladaEn: null,
    motivoAnulacion: null,
    descargo: null,
    descargoEn: null,
    fechaLimiteDescargo: "2027-05-20T23:59:59.000Z",
    fechaLimiteDescargoFormateada: "20/05/2027",
    puedeDescargar: true,
    puedeCorregir: true,
    puedeAnular: true,
    fotos: [],
    registradoPor: {
      id: "user-director-uuid",
      nombreCompleto: "Director General",
    },
    registradoEn: "2027-05-13T09:15:00.000Z",
  };

  const mockMensajeRegistro: MensajeAusenciaResponseDto & { ausencia: AusenciaResponseDto } = {
    mensaje: "Ausencia registrada: 20 minutos. Se notificó al docente.",
    id: "aus-1-uuid",
    minutos: 20,
    ausencia: mockAusenciaResponse,
  };

  const mockHistorialResponse: HistorialAusenciaResponseDto = {
    ausenciaRaizId: "aus-1-uuid",
    versiones: [
      {
        version: 1,
        vigente: true,
        horaDesde: "08:50",
        horaHasta: "09:10",
        minutos: 20,
        motivo: "desayunando",
        observacion: "En cafetería",
        motivoCambio: null,
        registradoPor: {
          id: "user-director-uuid",
          nombreCompleto: "Director General",
        },
        registradoEn: "2027-05-13T09:15:00.000Z",
        fotos: [],
      },
    ],
  };

  const mockResumenSupervisor: ResumenAusenciasSupervisorResponseDto = {
    data: [mockAusenciaResponse],
    totalMinutos: 20,
    totalAusencias: 1,
    totalAnuladas: 0,
  };

  beforeEach(() => {
    reflector = new Reflector();

    service = {
      registrar: jest.fn().mockResolvedValue(mockMensajeRegistro),
      corregir: jest.fn().mockResolvedValue(mockAusenciaResponse),
      anular: jest.fn().mockResolvedValue(mockAusenciaResponse),
      obtenerHistorial: jest.fn().mockResolvedValue(mockHistorialResponse),
      listarSupervisor: jest.fn().mockResolvedValue(mockResumenSupervisor),
      misAusencias: jest.fn().mockResolvedValue([mockAusenciaResponse]),
      obtenerDetalleDocente: jest.fn().mockResolvedValue(mockAusenciaResponse),
      presentarDescargo: jest.fn().mockResolvedValue({ mensaje: "Su descargo fue registrado." }),
    };

    controller = new AusenciasDocenteController(service as unknown as AusenciasDocenteService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("CP-RF012-09: Control de acceso por menú para supervisor (@MenuAccess)", () => {
    it("el endpoint registrar debe requerir estrictamente la ruta de menú MENU_AUSENCIAS_DOCENTES", () => {
      // Dado el endpoint registrar del controlador
      // Cuando verifico la metadata de acceso a menú
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.registrar);

      // Entonces debe requerir la ruta /admin/ausencias-docentes
      expect(ruta).toBe(MENU_AUSENCIAS_DOCENTES);
      expect(ruta).toBe("/admin/ausencias-docentes");
    });

    it("el endpoint corregir debe requerir estrictamente MENU_AUSENCIAS_DOCENTES", () => {
      // Dado el endpoint corregir del controlador
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.corregir);

      // Entonces debe requerir la ruta de supervisor
      expect(ruta).toBe(MENU_AUSENCIAS_DOCENTES);
    });

    it("el endpoint anular debe requerir estrictamente MENU_AUSENCIAS_DOCENTES", () => {
      // Dado el endpoint anular del controlador
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.anular);

      // Entonces debe requerir la ruta de supervisor
      expect(ruta).toBe(MENU_AUSENCIAS_DOCENTES);
    });

    it("el endpoint obtenerHistorial debe requerir estrictamente MENU_AUSENCIAS_DOCENTES", () => {
      // Dado el endpoint obtenerHistorial del controlador
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.obtenerHistorial);

      // Entonces debe requerir la ruta de supervisor
      expect(ruta).toBe(MENU_AUSENCIAS_DOCENTES);
    });

    it("el endpoint listarSupervisor debe requerir estrictamente MENU_AUSENCIAS_DOCENTES", () => {
      // Dado el endpoint listarSupervisor del controlador
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.listarSupervisor);

      // Entonces debe requerir la ruta de supervisor
      expect(ruta).toBe(MENU_AUSENCIAS_DOCENTES);
    });
  });

  describe("Control de acceso por menú para docente (@MenuAccess)", () => {
    it("el endpoint misAusencias debe requerir estrictamente la ruta de menú MENU_MIS_AUSENCIAS", () => {
      // Dado el endpoint misAusencias del controlador
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.misAusencias);

      // Entonces debe requerir la ruta /admin/mis-ausencias
      expect(ruta).toBe(MENU_MIS_AUSENCIAS);
      expect(ruta).toBe("/admin/mis-ausencias");
    });

    it("el endpoint obtenerDetalleDocente debe requerir estrictamente MENU_MIS_AUSENCIAS", () => {
      // Dado el endpoint obtenerDetalleDocente del controlador
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.obtenerDetalleDocente);

      // Entonces debe requerir la ruta de docente
      expect(ruta).toBe(MENU_MIS_AUSENCIAS);
    });

    it("el endpoint presentarDescargo debe requerir estrictamente MENU_MIS_AUSENCIAS", () => {
      // Dado el endpoint presentarDescargo del controlador
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.presentarDescargo);

      // Entonces debe requerir la ruta de docente
      expect(ruta).toBe(MENU_MIS_AUSENCIAS);
    });
  });

  describe("CP-RF012-25: Otro perfil con permiso de registro (v2.0) a nivel de controlador", () => {
    it("un rol con permiso (ej. Coordinador) registra una ausencia y el controlador delega pasando su usuarioId", async () => {
      // Dado que el usuario autenticado es un Coordinador con permiso
      const dto: RegistrarAusenciaDto = {
        sesionClaseId: "ses-mate-5a",
        horaDesde: "08:50",
        horaHasta: "09:10",
        motivo: "fuera_del_aula",
      };

      // Cuando invoca el endpoint registrar
      const resultado = await controller.registrar(
        dto,
        undefined,
        mockUsuarioCoordinador,
        mockClientInfo,
      );

      // Entonces el controlador procesa y delega la llamada pasando el ID del Coordinador y la IP
      expect(resultado).toBe(mockMensajeRegistro);
      expect(service.registrar).toHaveBeenCalledWith(
        dto,
        undefined,
        mockUsuarioCoordinador.id,
        mockClientInfo.ip,
      );
    });
  });

  describe("Delegación de endpoints del supervisor al servicio", () => {
    it("registrar() delega al servicio con dto, fotos, usuario.id e ip", async () => {
      const dto: RegistrarAusenciaDto = {
        sesionClaseId: "ses-mate-5a",
        horaDesde: "08:50",
        horaHasta: "09:10",
        motivo: "desayunando",
      };
      const fotosSimuladas: Express.Multer.File[] = [];

      const resultado = await controller.registrar(
        dto,
        fotosSimuladas,
        mockUsuarioDirector,
        mockClientInfo,
      );

      expect(resultado).toBe(mockMensajeRegistro);
      expect(service.registrar).toHaveBeenCalledWith(
        dto,
        fotosSimuladas,
        mockUsuarioDirector.id,
        mockClientInfo.ip,
      );
    });

    it("corregir() delega al servicio con id, dto, fotos, usuario.id e ip", async () => {
      const dto: CorregirAusenciaDto = {
        horaHasta: "09:05",
        motivoCambio: "Ajuste de hora",
      };

      const resultado = await controller.corregir(
        "aus-1-uuid",
        dto,
        undefined,
        mockUsuarioDirector,
        mockClientInfo,
      );

      expect(resultado).toBe(mockAusenciaResponse);
      expect(service.corregir).toHaveBeenCalledWith(
        "aus-1-uuid",
        dto,
        undefined,
        mockUsuarioDirector.id,
        mockClientInfo.ip,
      );
    });

    it("anular() delega al servicio con id, dto, usuario.id e ip", async () => {
      const dto: AnularAusenciaDto = {
        motivoAnulacion: "Error al registrar",
      };

      const resultado = await controller.anular(
        "aus-1-uuid",
        dto,
        mockUsuarioDirector,
        mockClientInfo,
      );

      expect(resultado).toBe(mockAusenciaResponse);
      expect(service.anular).toHaveBeenCalledWith(
        "aus-1-uuid",
        dto,
        mockUsuarioDirector.id,
        mockClientInfo.ip,
      );
    });

    it("obtenerHistorial() delega al servicio con id", async () => {
      const resultado = await controller.obtenerHistorial("aus-1-uuid");

      expect(resultado).toBe(mockHistorialResponse);
      expect(service.obtenerHistorial).toHaveBeenCalledWith("aus-1-uuid");
    });

    it("listarSupervisor() delega al servicio con query", async () => {
      const query: FiltroAusenciasQueryDto = {
        periodoId: "per-bimestre-2",
      };

      const resultado = await controller.listarSupervisor(query);

      expect(resultado).toBe(mockResumenSupervisor);
      expect(service.listarSupervisor).toHaveBeenCalledWith(query);
    });
  });

  describe("Delegación de endpoints del docente al servicio", () => {
    it("misAusencias() delega al servicio con usuario.personaId", async () => {
      const resultado = await controller.misAusencias(mockUsuarioDocente);

      expect(resultado).toEqual([mockAusenciaResponse]);
      expect(service.misAusencias).toHaveBeenCalledWith(mockUsuarioDocente.personaId);
    });

    it("obtenerDetalleDocente() delega al servicio con id y usuario.personaId", async () => {
      const resultado = await controller.obtenerDetalleDocente("aus-1-uuid", mockUsuarioDocente);

      expect(resultado).toBe(mockAusenciaResponse);
      expect(service.obtenerDetalleDocente).toHaveBeenCalledWith(
        "aus-1-uuid",
        mockUsuarioDocente.personaId,
      );
    });

    it("presentarDescargo() delega al servicio con id, dto, usuario.personaId, usuario.id e ip", async () => {
      const dto: RegistrarDescargoDto = {
        descargo: "Estaba en dirección recogiendo material",
      };

      const resultado = await controller.presentarDescargo(
        "aus-1-uuid",
        dto,
        mockUsuarioDocente,
        mockClientInfo,
      );

      expect(resultado).toEqual({ mensaje: "Su descargo fue registrado." });
      expect(service.presentarDescargo).toHaveBeenCalledWith(
        "aus-1-uuid",
        dto,
        mockUsuarioDocente.personaId,
        mockUsuarioDocente.id,
        mockClientInfo.ip,
      );
    });
  });
});
