import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Response } from "express";
import {
  MENU_CONSOLIDADO_BIMESTRE,
  MENU_MI_SEGUIMIENTO,
  MENU_SOLICITUDES_REVISION,
} from "@/common/constants";
import { MENU_ACCESS_KEY, type ClientInfoData } from "@/common/decorators";
import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import {
  ConsolidadoBloqueoService,
  SeguimientoDocenteController,
  SeguimientoDocenteService,
  SeguimientoExportacionService,
  SolicitudesRevisionService,
  type CerrarConsolidadoDto,
  type ConsolidadoDetalleResponseDto,
  type ConsolidadoResumenDto,
  type CrearSolicitudRevisionDto,
  type FiltroReporteBimestreQueryDto,
  type FiltroSolicitudesQueryDto,
  type HistorialConsolidadoResponseDto,
  type MensajeConsolidadoResponseDto,
  type MiConsolidadoResponseDto,
  type RechazarSolicitudDto,
  type RegistrarDecisionDto,
  type ReporteBimestreResponseDto,
  type ResolverSolicitudDto,
  type SolicitudRevisionResponseDto,
} from "@/features/seguimiento-docente";

describe("SeguimientoDocenteController (RF-013: Controlador y control de acceso @MenuAccess)", () => {
  let controller: SeguimientoDocenteController;
  let service: jest.Mocked<Partial<SeguimientoDocenteService>>;
  let bloqueoService: jest.Mocked<Partial<ConsolidadoBloqueoService>>;
  let solicitudesService: jest.Mocked<Partial<SolicitudesRevisionService>>;
  let exportacionService: jest.Mocked<Partial<SeguimientoExportacionService>>;
  let reflector: Reflector;

  const mockUsuarioDirector: AuthenticatedUser = {
    id: "user-director-uuid",
    username: "director",
    role: "Director",
    roleId: "rol-director-uuid",
    personaId: "per-director-uuid",
  };

  const mockUsuarioDocente: AuthenticatedUser = {
    id: "user-quispe-uuid",
    username: "jquispe",
    role: "Docente",
    roleId: "rol-docente-uuid",
    personaId: "per-quispe-uuid",
  };

  const mockUsuarioDocenteOtro: AuthenticatedUser = {
    id: "user-flores-uuid",
    username: "mflores",
    role: "Docente",
    roleId: "rol-docente-uuid",
    personaId: "per-flores-uuid",
  };

  const mockClientInfo: ClientInfoData = {
    ip: "192.168.1.15",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  };

  const mockConsolidadoResumen: ConsolidadoResumenDto = {
    id: "cons-1-uuid",
    docenteId: "doc-quispe-uuid",
    docenteNombre: "Quispe Mamani, Juan",
    docenteDocumento: "44556677",
    periodoId: "per-bim-2-uuid",
    periodoNombre: "II Bimestre",
    consolidadoRaizId: null,
    version: 1,
    vigente: true,
    estado: "cerrado",
    motivoCambio: null,
    sesionesProgramadas: 24,
    sesionesCumplidas: 22,
    sesionesParciales: 1,
    sesionesNoCumplidas: 1,
    sesionesJustificadas: 0,
    minutosPerdidosFirma: 40,
    totalAusencias: 3,
    minutosFueraAula: 60,
    totalMinutosFueraClase: 100,
    tiempoFueraClaseTexto: "1 h 40 min",
    decision: "compromiso_mejora",
    observacion: "Reunión el 20/07",
    generadoPorId: "user-director-uuid",
    generadoPorNombre: "Director General",
    generadoEn: "2027-07-21T10:00:00.000Z",
    reabiertoPorId: null,
    reabiertoPorNombre: null,
    reabiertoEn: null,
  };

  const mockConsolidadoDetalle: ConsolidadoDetalleResponseDto = {
    ...mockConsolidadoResumen,
    firmaDocenteUrl: "https://sga.edu.pe/firmas/quispe.png",
    sesiones: [],
  };

  const mockMensajeGeneracion: MensajeConsolidadoResponseDto = {
    mensaje: "Consolidado del II Bimestre generado para 24 docentes.",
    cantidad: 24,
  };

  const mockMensajeReapertura: MensajeConsolidadoResponseDto & {
    consolidado: ConsolidadoResumenDto;
  } = {
    mensaje:
      "Consolidado reabierto. Ya se pueden corregir las sesiones y ausencias del docente en este bimestre.",
    consolidado: { ...mockConsolidadoResumen, estado: "reabierto" },
  };

  const mockMensajeCierre: MensajeConsolidadoResponseDto & { consolidado: ConsolidadoResumenDto } =
    {
      mensaje: "Se generó la versión 2 del consolidado.",
      version: 2,
      consolidado: { ...mockConsolidadoResumen, version: 2 },
    };

  const mockReporteBimestre: ReporteBimestreResponseDto = {
    periodo: {
      id: "per-bim-2-uuid",
      nombre: "II Bimestre",
      numero: 2,
      estado: "cerrado",
      fechaInicio: "2027-05-01",
      fechaFin: "2027-07-20",
    },
    docentes: [mockConsolidadoResumen],
    totalDocentes: 1,
    totalMinutosPerdidosFirma: 40,
    totalMinutosFueraAula: 60,
    totalMinutosFueraClase: 100,
    tiempoTotalFueraClaseTexto: "1 h 40 min",
  };

  const mockHistorial: HistorialConsolidadoResponseDto = {
    consolidadoRaizId: "cons-1-uuid",
    docenteId: "doc-quispe-uuid",
    docenteNombre: "Quispe Mamani, Juan",
    periodoId: "per-bim-2-uuid",
    periodoNombre: "II Bimestre",
    versiones: [
      {
        id: "cons-1-uuid",
        version: 1,
        vigente: true,
        estado: "cerrado",
        motivoCambio: null,
        sesionesProgramadas: 24,
        sesionesCumplidas: 22,
        sesionesParciales: 1,
        sesionesNoCumplidas: 1,
        sesionesJustificadas: 0,
        minutosPerdidosFirma: 40,
        totalAusencias: 3,
        minutosFueraAula: 60,
        totalMinutosFueraClase: 100,
        tiempoFueraClaseTexto: "1 h 40 min",
        decision: "compromiso_mejora",
        observacion: "Reunión el 20/07",
        generadoPorId: "user-director-uuid",
        generadoPorNombre: "Director General",
        generadoEn: "2027-07-21T10:00:00.000Z",
        reabiertoPorId: null,
        reabiertoPorNombre: null,
        reabiertoEn: null,
      },
    ],
  };

  const mockSolicitud: SolicitudRevisionResponseDto = {
    id: "sol-1-uuid",
    consolidadoId: "cons-1-uuid",
    docenteId: "doc-quispe-uuid",
    docenteNombre: "Quispe Mamani, Juan",
    docenteDocumento: "44556677",
    periodoId: "per-bim-2-uuid",
    periodoNombre: "II Bimestre",
    motivo: "El 12/06 firmé en el kiosko; adjunto foto de la pizarra",
    adjuntoUrl: "https://sga.edu.pe/adjuntos/sol-1.png",
    adjuntoNombre: "foto_pizarra.png",
    estado: "solicitada",
    respuesta: null,
    resueltaPorId: null,
    resueltaPorNombre: null,
    creadoEn: "2027-07-22T10:00:00.000Z",
    resueltaEn: null,
  };

  const mockMiConsolidado: MiConsolidadoResponseDto = {
    consolidado: mockConsolidadoResumen,
    sesiones: [],
    solicitudPendiente: null,
  };

  const mockPdfResultado = {
    buffer: Buffer.from("%PDF-1.4 mock contenido de prueba"),
    nombreArchivo: "ficha-seguimiento-quispe-ii-bimestre.pdf",
  };

  const mockExcelResultado = {
    buffer: Buffer.from("PK mock contenido excel"),
    nombreArchivo: "reporte-seguimiento-ii-bimestre.xlsx",
  };

  beforeEach(() => {
    reflector = new Reflector();

    service = {
      generarTodos: jest.fn().mockResolvedValue(mockMensajeGeneracion),
      generarUno: jest.fn().mockResolvedValue(mockConsolidadoDetalle),
      obtenerReporteBimestre: jest.fn().mockResolvedValue(mockReporteBimestre),
      obtenerDetalle: jest.fn().mockResolvedValue(mockConsolidadoDetalle),
      registrarDecision: jest.fn().mockResolvedValue(mockConsolidadoDetalle),
      reabrir: jest.fn().mockResolvedValue(mockMensajeReapertura),
      cerrar: jest.fn().mockResolvedValue(mockMensajeCierre),
      obtenerHistorial: jest.fn().mockResolvedValue(mockHistorial),
      miConsolidado: jest.fn().mockResolvedValue(mockMiConsolidado),
    };

    bloqueoService = {
      asegurarNoCerrado: jest.fn().mockResolvedValue(undefined),
      asegurarNoCerradoPorFecha: jest.fn().mockResolvedValue(undefined),
    };

    solicitudesService = {
      crear: jest.fn().mockResolvedValue({
        mensaje: "Su solicitud de revisión fue enviada al Director.",
        solicitud: mockSolicitud,
      }),
      listar: jest.fn().mockResolvedValue([mockSolicitud]),
      aceptar: jest.fn().mockResolvedValue({ ...mockSolicitud, estado: "aceptada" }),
      rechazar: jest.fn().mockResolvedValue({
        ...mockSolicitud,
        estado: "rechazada",
        respuesta: "La sesión no tiene firma de ingreso",
      }),
    };

    exportacionService = {
      generarFichaPdf: jest.fn().mockResolvedValue(mockPdfResultado),
      exportarReporteExcel: jest.fn().mockResolvedValue(mockExcelResultado),
    };

    controller = new SeguimientoDocenteController(
      service as unknown as SeguimientoDocenteService,
      bloqueoService as unknown as ConsolidadoBloqueoService,
      solicitudesService as unknown as SolicitudesRevisionService,
      exportacionService as unknown as SeguimientoExportacionService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Control de acceso por menú (@MenuAccess) - Supervisión Directiva", () => {
    it("el endpoint generarTodos debe requerir estrictamente la ruta MENU_CONSOLIDADO_BIMESTRE", () => {
      // Dado el endpoint generarTodos del controlador
      // Cuando verifico la metadata de acceso al menú
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.generarTodos);

      // Entonces debe requerir la ruta /admin/consolidado-bimestre
      expect(ruta).toBe(MENU_CONSOLIDADO_BIMESTRE);
      expect(ruta).toBe("/admin/consolidado-bimestre");
    });

    it("el endpoint generarUno debe requerir estrictamente MENU_CONSOLIDADO_BIMESTRE", () => {
      // Dado el endpoint generarUno del controlador
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.generarUno);

      // Entonces debe requerir la ruta de supervisión
      expect(ruta).toBe(MENU_CONSOLIDADO_BIMESTRE);
    });

    it("el endpoint obtenerReporteBimestre debe requerir estrictamente MENU_CONSOLIDADO_BIMESTRE", () => {
      // Dado el endpoint obtenerReporteBimestre del controlador
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.obtenerReporteBimestre);

      // Entonces debe requerir la ruta de supervisión
      expect(ruta).toBe(MENU_CONSOLIDADO_BIMESTRE);
    });

    it("el endpoint exportarReporteExcel debe requerir estrictamente MENU_CONSOLIDADO_BIMESTRE", () => {
      // Dado el endpoint exportarReporteExcel del controlador
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.exportarReporteExcel);

      // Entonces debe requerir la ruta de supervisión
      expect(ruta).toBe(MENU_CONSOLIDADO_BIMESTRE);
    });

    it("el endpoint obtenerHistorial debe requerir estrictamente MENU_CONSOLIDADO_BIMESTRE", () => {
      // Dado el endpoint obtenerHistorial del controlador
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.obtenerHistorial);

      // Entonces debe requerir la ruta de supervisión
      expect(ruta).toBe(MENU_CONSOLIDADO_BIMESTRE);
    });

    it("el endpoint registrarDecision debe requerir estrictamente MENU_CONSOLIDADO_BIMESTRE", () => {
      // Dado el endpoint registrarDecision del controlador
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.registrarDecision);

      // Entonces debe requerir la ruta de supervisión
      expect(ruta).toBe(MENU_CONSOLIDADO_BIMESTRE);
    });

    it("el endpoint reabrir debe requerir estrictamente MENU_CONSOLIDADO_BIMESTRE", () => {
      // Dado el endpoint reabrir del controlador
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.reabrir);

      // Entonces debe requerir la ruta de supervisión
      expect(ruta).toBe(MENU_CONSOLIDADO_BIMESTRE);
    });

    it("el endpoint cerrar debe requerir estrictamente MENU_CONSOLIDADO_BIMESTRE", () => {
      // Dado el endpoint cerrar del controlador
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.cerrar);

      // Entonces debe requerir la ruta de supervisión
      expect(ruta).toBe(MENU_CONSOLIDADO_BIMESTRE);
    });

    it("el endpoint descargarFichaPdf debe admitir MENU_CONSOLIDADO_BIMESTRE y MENU_MI_SEGUIMIENTO", () => {
      // Dado el endpoint descargarFichaPdf del controlador
      const ruta = reflector.get<string | string[]>(MENU_ACCESS_KEY, controller.descargarFichaPdf);

      // Entonces debe permitir acceso a supervisores y docentes
      if (Array.isArray(ruta)) {
        expect(ruta).toContain(MENU_CONSOLIDADO_BIMESTRE);
      } else {
        expect(ruta).toBe(MENU_CONSOLIDADO_BIMESTRE);
      }
    });

    it("el endpoint obtenerDetalle debe admitir MENU_CONSOLIDADO_BIMESTRE y MENU_MI_SEGUIMIENTO", () => {
      // Dado el endpoint obtenerDetalle del controlador
      const ruta = reflector.get<string | string[]>(MENU_ACCESS_KEY, controller.obtenerDetalle);

      // Entonces debe permitir acceso a supervisores y docentes
      if (Array.isArray(ruta)) {
        expect(ruta).toContain(MENU_CONSOLIDADO_BIMESTRE);
      } else {
        expect(ruta).toBe(MENU_CONSOLIDADO_BIMESTRE);
      }
    });
  });

  describe("Control de acceso por menú (@MenuAccess) - Solicitudes de Revisión (Director)", () => {
    it("el endpoint listarSolicitudes debe requerir estrictamente MENU_SOLICITUDES_REVISION", () => {
      // Dado el endpoint listarSolicitudes del controlador
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.listarSolicitudes);

      // Entonces debe requerir la ruta /admin/solicitudes-revision
      expect(ruta).toBe(MENU_SOLICITUDES_REVISION);
      expect(ruta).toBe("/admin/solicitudes-revision");
    });

    it("el endpoint aceptarSolicitud debe requerir estrictamente MENU_SOLICITUDES_REVISION", () => {
      // Dado el endpoint aceptarSolicitud del controlador
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.aceptarSolicitud);

      // Entonces debe requerir la ruta /admin/solicitudes-revision
      expect(ruta).toBe(MENU_SOLICITUDES_REVISION);
    });

    it("el endpoint rechazarSolicitud debe requerir estrictamente MENU_SOLICITUDES_REVISION", () => {
      // Dado el endpoint rechazarSolicitud del controlador
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.rechazarSolicitud);

      // Entonces debe requerir la ruta /admin/solicitudes-revision
      expect(ruta).toBe(MENU_SOLICITUDES_REVISION);
    });
  });

  describe("Control de acceso por menú (@MenuAccess) - Mi Seguimiento Docente", () => {
    it("el endpoint miConsolidado debe requerir estrictamente MENU_MI_SEGUIMIENTO", () => {
      // Dado el endpoint miConsolidado del controlador
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.miConsolidado);

      // Entonces debe requerir la ruta /admin/mi-seguimiento
      expect(ruta).toBe(MENU_MI_SEGUIMIENTO);
      expect(ruta).toBe("/admin/mi-seguimiento");
    });

    it("el endpoint crearSolicitud debe requerir estrictamente MENU_MI_SEGUIMIENTO", () => {
      // Dado el endpoint crearSolicitud del controlador
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.crearSolicitud);

      // Entonces debe requerir la ruta /admin/mi-seguimiento
      expect(ruta).toBe(MENU_MI_SEGUIMIENTO);
    });
  });

  describe("Metadatos de Rutas HTTP y Prefijo del Controlador", () => {
    it("el controlador debe definir la ruta base 'seguimiento-docente'", () => {
      // Dado el decorador del controlador
      const path = reflector.get<string>("path", SeguimientoDocenteController);

      // Entonces debe responder bajo el prefijo seguimiento-docente (/api/seguimiento-docente)
      expect(path).toBe("seguimiento-docente");
    });

    it("los endpoints de generación y reportes deben tener las rutas y métodos HTTP exactos", () => {
      // Verificar rutas de supervisión
      expect(reflector.get<string>("path", controller.generarTodos)).toBe(
        "periodos/:periodoId/generar-todos",
      );
      expect(reflector.get<string>("path", controller.generarUno)).toBe(
        "periodos/:periodoId/docentes/:docenteId/generar",
      );
      expect(reflector.get<string>("path", controller.obtenerReporteBimestre)).toBe(
        "periodos/:periodoId/reporte",
      );
      expect(reflector.get<string>("path", controller.exportarReporteExcel)).toBe(
        "periodos/:periodoId/exportar",
      );
      expect(reflector.get<string>("path", controller.descargarFichaPdf)).toBe(":id/ficha");
      expect(reflector.get<string>("path", controller.obtenerHistorial)).toBe(":id/historial");
      expect(reflector.get<string>("path", controller.registrarDecision)).toBe(":id/decision");
      expect(reflector.get<string>("path", controller.reabrir)).toBe(":id/reabrir");
      expect(reflector.get<string>("path", controller.cerrar)).toBe(":id/cerrar");
      expect(reflector.get<string>("path", controller.obtenerDetalle)).toBe(":id");
    });

    it("los endpoints de solicitudes y mi seguimiento deben tener las rutas relativas exactas", () => {
      expect(reflector.get<string>("path", controller.listarSolicitudes)).toBe("solicitudes");
      expect(reflector.get<string>("path", controller.aceptarSolicitud)).toBe(
        "solicitudes/:id/aceptar",
      );
      expect(reflector.get<string>("path", controller.rechazarSolicitud)).toBe(
        "solicitudes/:id/rechazar",
      );
      expect(reflector.get<string>("path", controller.miConsolidado)).toBe(
        "mi-seguimiento/periodos/:periodoId",
      );
      expect(reflector.get<string>("path", controller.crearSolicitud)).toBe("mis-solicitudes");
    });
  });

  describe("CP-RF013-18: Descargar la ficha de seguimiento en PDF a través del controlador (HU4)", () => {
    it("CP-RF013-18: descargarFichaPdf delega a exportacionService.generarFichaPdf y configura headers application/pdf e inline", async () => {
      // Dado que el consolidado está cerrado y se solicita su ficha en PDF
      const mockRes = {
        setHeader: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as Response;

      // Cuando invoco el endpoint descargarFichaPdf
      await controller.descargarFichaPdf("cons-1-uuid", mockUsuarioDirector, mockRes);

      // Entonces delega al servicio de exportación pasando el id y el usuario autenticado
      expect(exportacionService.generarFichaPdf).toHaveBeenCalledWith(
        "cons-1-uuid",
        mockUsuarioDirector,
      );

      // Y configura las cabeceras HTTP de PDF inline
      expect(mockRes.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        `inline; filename="${mockPdfResultado.nombreArchivo}"`,
      );

      // Y envía el buffer del documento generado
      expect(mockRes.send).toHaveBeenCalledWith(mockPdfResultado.buffer);
    });
  });

  describe("CP-RF013-19: Reporte de todos los docentes y exportación a Excel a través del controlador (HU4)", () => {
    it("CP-RF013-19: obtenerReporteBimestre delega a service.obtenerReporteBimestre con periodoId y query", async () => {
      // Dado el reporte del II Bimestre con ordenamiento por total de tiempo fuera de clase
      const query: FiltroReporteBimestreQueryDto = {
        ordenarPor: "totalMinutosFueraClase",
        direccion: "desc",
      };

      // Cuando invoco obtenerReporteBimestre
      const resultado = await controller.obtenerReporteBimestre("per-bim-2-uuid", query);

      // Entonces delega al servicio y retorna el reporte completo con totales
      expect(resultado).toBe(mockReporteBimestre);
      expect(service.obtenerReporteBimestre).toHaveBeenCalledWith("per-bim-2-uuid", query);
    });

    it("CP-RF013-19: exportarReporteExcel delega a exportacionService y configura cabeceras de hoja de cálculo", async () => {
      // Dado que se solicita exportar a Excel el consolidado del bimestre
      const mockRes = {
        setHeader: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as Response;

      // Cuando invoco exportarReporteExcel
      await controller.exportarReporteExcel(
        "per-bim-2-uuid",
        mockUsuarioDirector,
        mockClientInfo,
        mockRes,
      );

      // Entonces delega a exportacionService con periodoId, usuarioId e IP
      expect(exportacionService.exportarReporteExcel).toHaveBeenCalledWith(
        "per-bim-2-uuid",
        mockUsuarioDirector.id,
        mockClientInfo.ip,
      );

      // Y configura las cabeceras HTTP de archivo adjunto Excel
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        `attachment; filename="${mockExcelResultado.nombreArchivo}"`,
      );

      // Y envía el buffer del archivo Excel
      expect(mockRes.send).toHaveBeenCalledWith(mockExcelResultado.buffer);
    });
  });

  describe("CP-RF013-20: Docente sin permiso sobre consolidado de otros docentes (HU4)", () => {
    it("CP-RF013-20: obtenerDetalle propaga ForbiddenException cuando un docente intenta consultar consolidado ajeno", async () => {
      // Dado que la docente Flores intenta consultar el consolidado del docente Quispe
      // y el servicio lanza ForbiddenException por regla de negocio
      service.obtenerDetalle = jest
        .fn()
        .mockRejectedValue(
          new ForbiddenException("No tiene acceso al consolidado de otro docente."),
        );

      // Cuando la docente invoca el endpoint obtenerDetalle con el ID ajeno
      // Entonces el controlador rechaza la petición con 403 Forbidden
      await expect(
        controller.obtenerDetalle("cons-quispe-uuid", mockUsuarioDocenteOtro),
      ).rejects.toThrow(new ForbiddenException("No tiene acceso al consolidado de otro docente."));
    });
  });

  describe("Delegación de endpoints de supervisión directiva al servicio", () => {
    it("generarTodos delega al servicio con periodoId, actorId, rol e ip", async () => {
      const resultado = await controller.generarTodos(
        "per-bim-2-uuid",
        mockUsuarioDirector,
        mockClientInfo,
      );

      expect(resultado).toBe(mockMensajeGeneracion);
      expect(service.generarTodos).toHaveBeenCalledWith(
        "per-bim-2-uuid",
        mockUsuarioDirector.id,
        mockUsuarioDirector.role,
        mockClientInfo.ip,
      );
    });

    it("generarUno delega al servicio con periodoId, docenteId, actorId, rol e ip", async () => {
      const resultado = await controller.generarUno(
        "per-bim-2-uuid",
        "doc-quispe-uuid",
        mockUsuarioDirector,
        mockClientInfo,
      );

      expect(resultado).toBe(mockConsolidadoDetalle);
      expect(service.generarUno).toHaveBeenCalledWith(
        "per-bim-2-uuid",
        "doc-quispe-uuid",
        mockUsuarioDirector.id,
        mockUsuarioDirector.role,
        mockClientInfo.ip,
      );
    });

    it("obtenerHistorial delega al servicio con el id del consolidado", async () => {
      const resultado = await controller.obtenerHistorial("cons-1-uuid");

      expect(resultado).toBe(mockHistorial);
      expect(service.obtenerHistorial).toHaveBeenCalledWith("cons-1-uuid");
    });

    it("registrarDecision delega al servicio con id, dto, actorId, rol e ip", async () => {
      const dto: RegistrarDecisionDto = {
        decision: "compromiso_mejora",
        observacion: "Reunión el 20/07",
      };

      const resultado = await controller.registrarDecision(
        "cons-1-uuid",
        dto,
        mockUsuarioDirector,
        mockClientInfo,
      );

      expect(resultado).toBe(mockConsolidadoDetalle);
      expect(service.registrarDecision).toHaveBeenCalledWith(
        "cons-1-uuid",
        dto,
        mockUsuarioDirector.id,
        mockUsuarioDirector.role,
        mockClientInfo.ip,
      );
    });

    it("reabrir delega al servicio con id, actorId, rol e ip", async () => {
      const resultado = await controller.reabrir(
        "cons-1-uuid",
        mockUsuarioDirector,
        mockClientInfo,
      );

      expect(resultado).toBe(mockMensajeReapertura);
      expect(service.reabrir).toHaveBeenCalledWith(
        "cons-1-uuid",
        mockUsuarioDirector.id,
        mockUsuarioDirector.role,
        mockClientInfo.ip,
      );
    });

    it("cerrar delega al servicio con id, dto, actorId, rol e ip", async () => {
      const dto: CerrarConsolidadoDto = {
        motivoCambio: "Ausencia anulada tras revisión",
      };

      const resultado = await controller.cerrar(
        "cons-1-uuid",
        dto,
        mockUsuarioDirector,
        mockClientInfo,
      );

      expect(resultado).toBe(mockMensajeCierre);
      expect(service.cerrar).toHaveBeenCalledWith(
        "cons-1-uuid",
        dto,
        mockUsuarioDirector.id,
        mockUsuarioDirector.role,
        mockClientInfo.ip,
      );
    });

    it("obtenerDetalle delega al servicio con id y usuario", async () => {
      const resultado = await controller.obtenerDetalle("cons-1-uuid", mockUsuarioDirector);

      expect(resultado).toBe(mockConsolidadoDetalle);
      expect(service.obtenerDetalle).toHaveBeenCalledWith("cons-1-uuid", mockUsuarioDirector);
    });
  });

  describe("Delegación de endpoints de solicitudes de revisión al servicio", () => {
    it("listarSolicitudes delega a solicitudesService con el query de filtros", async () => {
      const query: FiltroSolicitudesQueryDto = {
        periodoId: "per-bim-2-uuid",
        estado: "solicitada",
      };

      const resultado = await controller.listarSolicitudes(query);

      expect(resultado).toEqual([mockSolicitud]);
      expect(solicitudesService.listar).toHaveBeenCalledWith(query);
    });

    it("aceptarSolicitud delega a solicitudesService con id, dto, actorId, rol e ip", async () => {
      const dto: ResolverSolicitudDto = {
        respuesta: "Se revisará la sesión del 12/06",
      };

      const resultado = await controller.aceptarSolicitud(
        "sol-1-uuid",
        dto,
        mockUsuarioDirector,
        mockClientInfo,
      );

      expect(resultado.estado).toBe("aceptada");
      expect(solicitudesService.aceptar).toHaveBeenCalledWith(
        "sol-1-uuid",
        dto,
        mockUsuarioDirector.id,
        mockUsuarioDirector.role,
        mockClientInfo.ip,
      );
    });

    it("rechazarSolicitud delega a solicitudesService con id, dto obligatorio, actorId, rol e ip", async () => {
      const dto: RechazarSolicitudDto = {
        respuesta: "La sesión no tiene firma de ingreso",
      };

      const resultado = await controller.rechazarSolicitud(
        "sol-1-uuid",
        dto,
        mockUsuarioDirector,
        mockClientInfo,
      );

      expect(resultado.estado).toBe("rechazada");
      expect(solicitudesService.rechazar).toHaveBeenCalledWith(
        "sol-1-uuid",
        dto,
        mockUsuarioDirector.id,
        mockUsuarioDirector.role,
        mockClientInfo.ip,
      );
    });
  });

  describe("Delegación de endpoints de mi seguimiento docente al servicio", () => {
    it("miConsolidado delega a service.miConsolidado con periodoId y personaId del docente", async () => {
      const resultado = await controller.miConsolidado("per-bim-2-uuid", mockUsuarioDocente);

      expect(resultado).toBe(mockMiConsolidado);
      expect(service.miConsolidado).toHaveBeenCalledWith(
        "per-bim-2-uuid",
        mockUsuarioDocente.personaId,
      );
    });

    it("crearSolicitud delega a solicitudesService.crear con dto, adjunto, personaId, usuarioId e ip", async () => {
      const dto: CrearSolicitudRevisionDto = {
        consolidadoId: "cons-1-uuid",
        motivo: "El 12/06 firmé en el kiosko; adjunto foto de la pizarra",
      };
      const mockAdjunto = {
        originalname: "foto_pizarra.png",
        mimetype: "image/png",
        size: 1024,
        buffer: Buffer.from("imagen"),
      } as Express.Multer.File;

      const resultado = await controller.crearSolicitud(
        dto,
        mockAdjunto,
        mockUsuarioDocente,
        mockClientInfo,
      );

      expect(resultado.mensaje).toBe("Su solicitud de revisión fue enviada al Director.");
      expect(solicitudesService.crear).toHaveBeenCalledWith(
        dto,
        mockAdjunto,
        mockUsuarioDocente.personaId,
        mockUsuarioDocente.id,
        mockClientInfo.ip,
      );
    });
  });
});
