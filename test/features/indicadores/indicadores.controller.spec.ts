import { Reflector } from "@nestjs/core";
import type { Response } from "express";
import { ForbiddenException } from "@nestjs/common";
import { MENU_INDICADORES, MENU_MIS_INDICADORES } from "@/common/constants/menu-rutas.constants";
import { MENU_ACCESS_KEY, type ClientInfoData } from "@/common/decorators";
import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import {
  IndicadoresController,
  IndicadoresService,
  MENSAJES_INDICADORES,
  type CerrarMedicionDto,
  type ComparacionBimestreResponseDto,
  type ExportarIndicadoresQueryDto,
  type FiltroIndicadoresQueryDto,
  type MedicionBimestreResponseDto,
  type MisIndicadoresDocenteResponseDto,
  type NuevaVersionMedicionDto,
  type PanelGeneralResponseDto,
  type PretestResponseDto,
  type RegistrarPretestDto,
  type TableroIndicadoresResponseDto,
} from "@/features/indicadores";

describe("IndicadoresController (RF-020: Controlador, @MenuAccess, Roles y Delegación)", () => {
  let controller: IndicadoresController;
  let service: {
    obtenerTablero: jest.Mock;
    obtenerMisIndicadores: jest.Mock;
    registrarPretest: jest.Mock;
    listarPretests: jest.Mock;
    obtenerPretestVigente: jest.Mock;
    cerrarMedicion: jest.Mock;
    crearNuevaVersionMedicion: jest.Mock;
    obtenerMedicionPeriodo: jest.Mock;
    obtenerHistorialMediciones: jest.Mock;
    obtenerComparacion: jest.Mock;
    obtenerPanel: jest.Mock;
    exportarExcel: jest.Mock;
    exportarPdf: jest.Mock;
  };
  let reflector: Reflector;

  const mockUsuarioDirector: AuthenticatedUser = {
    id: "user-director-uuid",
    username: "director",
    role: "Director",
    roleId: "rol-director-uuid",
    personaId: "per-director-uuid",
  };

  const mockUsuarioSubdirector: AuthenticatedUser = {
    id: "user-subdirector-uuid",
    username: "subdirector",
    role: "Subdirector",
    roleId: "rol-subdirector-uuid",
    personaId: "per-subdirector-uuid",
  };

  const mockUsuarioDocente: AuthenticatedUser = {
    id: "user-docente-uuid",
    username: "cquispe",
    role: "Docente",
    roleId: "rol-docente-uuid",
    personaId: "per-quispe-uuid",
  };

  const mockClientInfo: ClientInfoData = {
    ip: "192.168.1.15",
    userAgent: "Mozilla/5.0",
  };

  const mockTablero: TableroIndicadoresResponseDto = {
    periodoId: "per-ii-bim-uuid",
    periodoNombre: "II Bimestre",
    enCurso: false,
    csp: {
      indicador: "CSP",
      nombre: "Cumplimiento de sesiones planificadas",
      dimension: "Prácticas pedagógicas",
      formula: "(cumplidas + parciales) ÷ (planificadas − justificadas) × 100",
      numerador: 1140,
      denominador: 1180,
      porcentaje: 96.61,
      porcentajeTexto: "96.61 %",
      enCurso: false,
      sinDatos: false,
      desglose: {
        planificadas: 1200,
        cumplidas: 1080,
        parciales: 60,
        noCumplidas: 40,
        justificadas: 20,
        denominadorEfectivo: 1180,
      },
    },
    isa: {
      indicador: "ISA",
      nombre: "Informes de seguimiento académico",
      dimension: "Seguimiento académico",
      formula: "libretas publicadas a tiempo ÷ libretas programadas × 100",
      numerador: 160,
      denominador: 168,
      porcentaje: 95.24,
      porcentajeTexto: "95.24 %",
      enCurso: false,
      sinDatos: false,
      desglose: {
        programadas: 168,
        publicadasATiempo: 160,
        publicadasFueraDePlazo: 5,
        pendientes: 3,
        vistasPorFamilia: 142,
        porcentajeVistasFamilia: 84.52,
      },
    },
    igm: {
      indicador: "IGM",
      nombre: "Gestión de materiales",
      dimension: "Aula virtual",
      formula: "materiales planificados publicados a tiempo ÷ materiales planificados × 100",
      numerador: 220,
      denominador: 250,
      porcentaje: 88.0,
      porcentajeTexto: "88.00 %",
      enCurso: false,
      sinDatos: false,
      desglose: {
        planificados: 250,
        publicadosATiempo: 220,
        publicadosFueraDePlazo: 20,
        pendientes: 10,
        extras: 30,
      },
    },
  };

  const mockMisIndicadores: MisIndicadoresDocenteResponseDto = {
    docenteId: "doc-quispe-uuid",
    docenteNombre: "Carlos Quispe",
    periodoId: "per-ii-bim-uuid",
    periodoNombre: "II Bimestre",
    enCurso: false,
    csp: mockTablero.csp,
    igm: mockTablero.igm,
    cursos: [],
  };

  const mockPretest: PretestResponseDto = {
    id: "pretest-1-uuid",
    indicador: "CSP",
    periodoDescrito: "I Bimestre 2026",
    fechaInicio: "2026-03-01",
    fechaFin: "2026-05-08",
    numerador: 942,
    denominador: 1200,
    porcentaje: 78.5,
    porcentajeTexto: "78.50 %",
    fuente: "Hojas físicas de firma de la subdirección",
    vigente: true,
    registradoPorId: mockUsuarioDirector.id,
    creadoEn: "2026-05-09T10:00:00.000Z",
  };

  const mockMedicion: MedicionBimestreResponseDto = {
    id: "medicion-1-uuid",
    periodoId: "per-ii-bim-uuid",
    periodoNombre: "II Bimestre",
    version: 1,
    vigente: true,
    motivoCambio: null,
    cerradaPorId: mockUsuarioDirector.id,
    cerradaEn: "2026-07-25T18:00:00.000Z",
    indicadores: [
      {
        indicador: "CSP",
        numerador: 1140,
        denominador: 1180,
        porcentaje: 96.61,
        porcentajeTexto: "96.61 %",
        desglose: mockTablero.csp.desglose,
      },
      {
        indicador: "ISA",
        numerador: 160,
        denominador: 168,
        porcentaje: 95.24,
        porcentajeTexto: "95.24 %",
        desglose: mockTablero.isa.desglose,
      },
      {
        indicador: "IGM",
        numerador: 220,
        denominador: 250,
        porcentaje: 88.0,
        porcentajeTexto: "88.00 %",
        desglose: mockTablero.igm.desglose,
      },
    ],
  };

  const mockComparacion: ComparacionBimestreResponseDto = {
    periodoId: "per-ii-bim-uuid",
    periodoNombre: "II Bimestre",
    comparaciones: [],
    evolucionBimestres: [],
  };

  const mockPanel: PanelGeneralResponseDto = {
    fecha: "2026-10-16",
    asistenciaHoy: {
      totalEstudiantesMatriculados: 350,
      estudiantesConIngreso: 336,
      porcentajeAsistencia: 96.0,
      porcentajeAsistenciaTexto: "96.00 %",
    },
    tardanzasHoy: { totalTardanzas: 14 },
    sesionesHoy: {
      totalSesiones: 28,
      cumplidas: 20,
      enCurso: 4,
      pendientes: 2,
      noCumplidas: 1,
      justificadas: 1,
    },
    libretasPendientes: { totalPendientes: 8, vencidas: 3, porVencer: 5 },
    indicadoresBimestreActual: {
      periodoId: "per-ii-bim-uuid",
      periodoNombre: "II Bimestre",
      enCurso: true,
      cspPorcentaje: 96.61,
      isaPorcentaje: 95.24,
      igmPorcentaje: 88.0,
    },
  };

  const crearMockRespuestaHttp = () => {
    const res: Partial<Response> = {};
    res.setHeader = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  beforeEach(() => {
    reflector = new Reflector();

    service = {
      obtenerTablero: jest.fn().mockResolvedValue(mockTablero),
      obtenerMisIndicadores: jest.fn().mockResolvedValue(mockMisIndicadores),
      registrarPretest: jest.fn().mockResolvedValue({
        mensaje: MENSAJES_INDICADORES.PRETEST_REGISTRADO("CSP", 78.5),
        pretest: mockPretest,
      }),
      listarPretests: jest.fn().mockResolvedValue([mockPretest]),
      obtenerPretestVigente: jest.fn().mockResolvedValue(mockPretest),
      cerrarMedicion: jest.fn().mockResolvedValue({
        mensaje: MENSAJES_INDICADORES.MEDICION_CERRADA("II Bimestre", 94.2, 97.1, 88.0),
        medicion: mockMedicion,
      }),
      crearNuevaVersionMedicion: jest.fn().mockResolvedValue({
        mensaje: "Nueva versión de la medición generada.",
        medicion: { ...mockMedicion, version: 2 },
      }),
      obtenerMedicionPeriodo: jest.fn().mockResolvedValue(mockMedicion),
      obtenerHistorialMediciones: jest.fn().mockResolvedValue({
        periodoId: "per-ii-bim-uuid",
        periodoNombre: "II Bimestre",
        versiones: [mockMedicion],
      }),
      obtenerComparacion: jest.fn().mockResolvedValue(mockComparacion),
      obtenerPanel: jest.fn().mockResolvedValue(mockPanel),
      exportarExcel: jest.fn().mockResolvedValue({
        buffer: Buffer.from("simulated-excel-content"),
        nombreArchivo: "reporte-indicadores-II-Bimestre.xlsx",
      }),
      exportarPdf: jest.fn().mockResolvedValue({
        buffer: Buffer.from("simulated-pdf-content"),
        nombreArchivo: "informe-indicadores-tesis-II-Bimestre.pdf",
      }),
    };

    controller = new IndicadoresController(service as unknown as IndicadoresService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Control de Acceso por Menú (@MenuAccess) y Rutas
  // =========================================================================
  describe("Control de Acceso por Menú (@MenuAccess)", () => {
    it("el controlador debe definir el prefijo base 'indicadores'", () => {
      // Dado el controlador IndicadoresController
      const path = reflector.get<string>("path", IndicadoresController);

      // Entonces el path debe ser 'indicadores'
      expect(path).toBe("indicadores");
    });

    it("todos los endpoints directivos deben requerir MENU_INDICADORES (/admin/indicadores)", () => {
      // Dado cada endpoint directivo del controlador
      const endpointsDirectivos = [
        controller.obtenerTablero,
        controller.registrarPretest,
        controller.listarPretests,
        controller.obtenerPretestVigente,
        controller.cerrarMedicion,
        controller.nuevaVersionMedicion,
        controller.obtenerMedicionPeriodo,
        controller.obtenerHistorialMediciones,
        controller.obtenerComparacion,
        controller.obtenerPanel,
        controller.exportarExcel,
        controller.exportarPdf,
      ];

      // Entonces todos exigen estrictamente MENU_INDICADORES
      for (const endpoint of endpointsDirectivos) {
        const ruta = reflector.get<string>(MENU_ACCESS_KEY, endpoint);
        expect(ruta).toBe(MENU_INDICADORES);
        expect(ruta).toBe("/admin/indicadores");
      }
    });

    it("el endpoint mis-indicadores debe requerir estrictamente MENU_MIS_INDICADORES (/admin/mis-indicadores)", () => {
      // Dado el endpoint obtenerMisIndicadores
      const ruta = reflector.get<string>(MENU_ACCESS_KEY, controller.obtenerMisIndicadores);

      // Entonces debe requerir la ruta exclusiva para docentes
      expect(ruta).toBe(MENU_MIS_INDICADORES);
      expect(ruta).toBe("/admin/mis-indicadores");
    });
  });

  // =========================================================================
  // Control de Permisos por Rol
  // =========================================================================
  describe("Control de Permisos por Rol (Director vs Subdirector vs Docente)", () => {
    it("un Director puede registrar pretest y el controlador delega con su usuarioId y rol", async () => {
      // Dado que el usuario autenticado es Director
      const dto: RegistrarPretestDto = {
        indicador: "CSP",
        periodoDescrito: "I Bimestre 2026",
        fechaInicio: "2026-03-01",
        fechaFin: "2026-05-08",
        numerador: 942,
        denominador: 1200,
        fuente: "Hojas físicas de firma de la subdirección",
      };

      // Cuando invoca registrarPretest
      const respuesta = await controller.registrarPretest(dto, mockUsuarioDirector, mockClientInfo);

      // Entonces se ejecuta con éxito delegando rol e IP
      expect(respuesta.pretest.porcentaje).toBe(78.5);
      expect(service.registrarPretest).toHaveBeenCalledWith(
        dto,
        mockUsuarioDirector.id,
        mockUsuarioDirector.role,
        mockClientInfo.ip,
      );
    });

    it("un Subdirector que intente registrar pretest recibe ForbiddenException con mensaje de rol no autorizado", async () => {
      // Dado que el Subdirector intenta mutar un pretest
      const dto: RegistrarPretestDto = {
        indicador: "CSP",
        periodoDescrito: "I Bimestre 2026",
        fechaInicio: "2026-03-01",
        fechaFin: "2026-05-08",
        numerador: 942,
        denominador: 1200,
        fuente: "Hojas físicas",
      };
      service.registrarPretest.mockRejectedValue(
        new ForbiddenException(MENSAJES_INDICADORES.ROL_NO_AUTORIZADO),
      );

      // Cuando el controlador procesa la petición
      // Entonces propaga la ForbiddenException
      await expect(
        controller.registrarPretest(dto, mockUsuarioSubdirector, mockClientInfo),
      ).rejects.toThrow(ForbiddenException);
    });

    it("un Subdirector que intente cerrar medición recibe ForbiddenException con mensaje oficial", async () => {
      // Dado que el Subdirector intenta cerrar la medición de un bimestre
      const dto: CerrarMedicionDto = {
        periodoId: "per-ii-bim-uuid",
      };
      service.cerrarMedicion.mockRejectedValue(
        new ForbiddenException(MENSAJES_INDICADORES.ROL_NO_AUTORIZADO),
      );

      // Cuando el controlador ejecuta
      // Entonces propaga la excepción
      await expect(
        controller.cerrarMedicion(dto, mockUsuarioSubdirector, mockClientInfo),
      ).rejects.toThrow(ForbiddenException);
    });

    it("un Docente solo puede consultar mis-indicadores con su propio personaId", async () => {
      // Dado que el Docente consulta sus propios indicadores
      const periodoId = "per-ii-bim-uuid";

      // Cuando invoca obtenerMisIndicadores
      const resultado = await controller.obtenerMisIndicadores(mockUsuarioDocente, periodoId);

      // Entonces se delega pasando su personaId (no el usuarioId)
      expect(resultado).toBe(mockMisIndicadores);
      expect(service.obtenerMisIndicadores).toHaveBeenCalledWith(
        mockUsuarioDocente.personaId,
        periodoId,
      );
    });
  });

  // =========================================================================
  // Delegación de Todos los Endpoints REST al Servicio
  // =========================================================================
  describe("Delegación de Endpoints REST al Servicio Fachada", () => {
    it("obtenerTablero() delega al servicio con los filtros recibidos", async () => {
      const query: FiltroIndicadoresQueryDto = {
        periodoId: "per-ii-bim-uuid",
      };

      const resultado = await controller.obtenerTablero(query);

      expect(resultado).toBe(mockTablero);
      expect(service.obtenerTablero).toHaveBeenCalledWith(query);
    });

    it("listarPretests() delega al servicio y retorna la lista histórica", async () => {
      const resultado = await controller.listarPretests();

      expect(resultado).toEqual([mockPretest]);
      expect(service.listarPretests).toHaveBeenCalled();
    });

    it("obtenerPretestVigente() delega con el indicador especificado", async () => {
      const resultado = await controller.obtenerPretestVigente("CSP");

      expect(resultado).toBe(mockPretest);
      expect(service.obtenerPretestVigente).toHaveBeenCalledWith("CSP");
    });

    it("cerrarMedicion() delega al servicio con dto, usuario.id, usuario.role e ip", async () => {
      const dto: CerrarMedicionDto = {
        periodoId: "per-ii-bim-uuid",
      };

      const resultado = await controller.cerrarMedicion(dto, mockUsuarioDirector, mockClientInfo);

      expect(resultado.medicion).toBe(mockMedicion);
      expect(service.cerrarMedicion).toHaveBeenCalledWith(
        dto,
        mockUsuarioDirector.id,
        mockUsuarioDirector.role,
        mockClientInfo.ip,
      );
    });

    it("nuevaVersionMedicion() delega con id, dto, usuario.id, usuario.role e ip", async () => {
      const dto: NuevaVersionMedicionDto = {
        motivoCambio: "Justificaciones aprobadas tarde",
      };

      const resultado = await controller.nuevaVersionMedicion(
        "medicion-1-uuid",
        dto,
        mockUsuarioDirector,
        mockClientInfo,
      );

      expect(resultado.medicion.version).toBe(2);
      expect(service.crearNuevaVersionMedicion).toHaveBeenCalledWith(
        "medicion-1-uuid",
        dto,
        mockUsuarioDirector.id,
        mockUsuarioDirector.role,
        mockClientInfo.ip,
      );
    });

    it("obtenerMedicionPeriodo() delega con el periodoId", async () => {
      const resultado = await controller.obtenerMedicionPeriodo("per-ii-bim-uuid");

      expect(resultado).toBe(mockMedicion);
      expect(service.obtenerMedicionPeriodo).toHaveBeenCalledWith("per-ii-bim-uuid");
    });

    it("obtenerHistorialMediciones() delega con el periodoId", async () => {
      const resultado = await controller.obtenerHistorialMediciones("per-ii-bim-uuid");

      expect(resultado.versiones).toBeDefined();
      expect(service.obtenerHistorialMediciones).toHaveBeenCalledWith("per-ii-bim-uuid");
    });

    it("obtenerComparacion() delega con el periodoId", async () => {
      const resultado = await controller.obtenerComparacion("per-ii-bim-uuid");

      expect(resultado).toBe(mockComparacion);
      expect(service.obtenerComparacion).toHaveBeenCalledWith("per-ii-bim-uuid");
    });

    it("obtenerPanel() delega al servicio y retorna las métricas directivas", async () => {
      const resultado = await controller.obtenerPanel();

      expect(resultado).toBe(mockPanel);
      expect(service.obtenerPanel).toHaveBeenCalled();
    });

    it("exportarExcel() configura headers de descarga attachment y envía el buffer binario", async () => {
      const query: ExportarIndicadoresQueryDto = { periodoId: "per-ii-bim-uuid" };
      const res = crearMockRespuestaHttp();

      await controller.exportarExcel(query, mockUsuarioDirector, mockClientInfo, res);

      expect(service.exportarExcel).toHaveBeenCalledWith(
        query,
        mockUsuarioDirector.id,
        mockUsuarioDirector.username,
        mockClientInfo.ip,
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        'attachment; filename="reporte-indicadores-II-Bimestre.xlsx"',
      );
      expect(res.send).toHaveBeenCalledWith(Buffer.from("simulated-excel-content"));
    });

    it("exportarPdf() configura headers de visualización inline y envía el buffer binario", async () => {
      const query: ExportarIndicadoresQueryDto = { periodoId: "per-ii-bim-uuid" };
      const res = crearMockRespuestaHttp();

      await controller.exportarPdf(query, mockUsuarioDirector, mockClientInfo, res);

      expect(service.exportarPdf).toHaveBeenCalledWith(
        query,
        mockUsuarioDirector.id,
        mockUsuarioDirector.username,
        mockClientInfo.ip,
      );
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        'inline; filename="informe-indicadores-tesis-II-Bimestre.pdf"',
      );
      expect(res.send).toHaveBeenCalledWith(Buffer.from("simulated-pdf-content"));
    });
  });
});
