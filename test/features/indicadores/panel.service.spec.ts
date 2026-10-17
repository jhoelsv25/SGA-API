import { AnioLectivoCls } from "@/common/anio-lectivo";
import {
  PanelService,
  PanelRepository,
  IndicadoresCalculoService,
  type PanelGeneralResponseDto,
  type TableroIndicadoresResponseDto,
} from "@/features/indicadores";

describe("PanelService (RF-020: Panel General de Apoyo Directivo)", () => {
  let service: PanelService;
  let repo: {
    contarEstudiantesMatriculadosActivos: jest.Mock;
    contarEstudiantesConMarcacionIngresoHoy: jest.Mock;
    contarTardanzasHoy: jest.Mock;
    contarSesionesHoyPorEstado: jest.Mock;
    contarLibretasPendientes: jest.Mock;
  };
  let calculoService: {
    obtenerTablero: jest.Mock;
  };
  let anioLectivoCls: {
    id: jest.Mock;
  };

  const ANIO_ACADEMICO_ID = "anio-2026-uuid";

  const tableroEnCursoMock: TableroIndicadoresResponseDto = {
    periodoId: "per-iii-bim-uuid",
    periodoNombre: "III Bimestre",
    enCurso: true,
    csp: {
      indicador: "CSP",
      nombre: "Cumplimiento de sesiones planificadas",
      dimension: "Prácticas pedagógicas",
      formula: "(cumplidas + parciales) ÷ (planificadas − justificadas) × 100",
      numerador: 1140,
      denominador: 1180,
      porcentaje: 96.61,
      porcentajeTexto: "96.61 %",
      enCurso: true,
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
      enCurso: true,
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
      enCurso: true,
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

  beforeEach(() => {
    repo = {
      contarEstudiantesMatriculadosActivos: jest.fn().mockResolvedValue(350),
      contarEstudiantesConMarcacionIngresoHoy: jest.fn().mockResolvedValue(336),
      contarTardanzasHoy: jest.fn().mockResolvedValue(14),
      contarSesionesHoyPorEstado: jest.fn().mockResolvedValue({
        cumplidas: 20,
        enCurso: 4,
        pendientes: 2,
        noCumplidas: 1,
        justificadas: 1,
      }),
      contarLibretasPendientes: jest.fn().mockResolvedValue({
        vencidas: 3,
        porVencer: 5,
      }),
    };

    calculoService = {
      obtenerTablero: jest.fn().mockResolvedValue(tableroEnCursoMock),
    };

    anioLectivoCls = {
      id: jest.fn().mockReturnValue(ANIO_ACADEMICO_ID),
    };

    service = new PanelService(
      repo as unknown as PanelRepository,
      calculoService as unknown as IndicadoresCalculoService,
      anioLectivoCls as unknown as AnioLectivoCls,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // CP-RF020-20: Ver el panel general directivo (HU4)
  // =========================================================================
  describe("CP-RF020-20: Ver el panel (HU4)", () => {
    it("debe retornar métricas del día completas: asistencia (96.00 %), tardanzas (14), sesiones clasificadas y libretas pendientes", async () => {
      // Dado que el Director consulta el panel general
      // y en el colegio hay 350 matriculados activos, 336 ingresaron hoy, 14 tardanzas,
      // 28 sesiones del día y 8 libretas pendientes (3 vencidas, 5 por vencer)

      // Cuando se invoca obtenerPanel
      const panel: PanelGeneralResponseDto = await service.obtenerPanel();

      // Entonces el panel contiene la fecha del día en formato YYYY-MM-DD
      expect(panel).toBeDefined();
      expect(panel.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Y la asistencia calcula (336 ÷ 350) × 100 = 96.00 %
      expect(panel.asistenciaHoy.totalEstudiantesMatriculados).toBe(350);
      expect(panel.asistenciaHoy.estudiantesConIngreso).toBe(336);
      expect(panel.asistenciaHoy.porcentajeAsistencia).toBe(96.0);
      expect(panel.asistenciaHoy.porcentajeAsistenciaTexto).toBe("96.00 %");

      // Y las tardanzas suman 14
      expect(panel.tardanzasHoy.totalTardanzas).toBe(14);

      // Y las sesiones del día totalizan 28 con sus estados desagregados
      expect(panel.sesionesHoy.totalSesiones).toBe(28);
      expect(panel.sesionesHoy.cumplidas).toBe(20);
      expect(panel.sesionesHoy.enCurso).toBe(4);
      expect(panel.sesionesHoy.pendientes).toBe(2);
      expect(panel.sesionesHoy.noCumplidas).toBe(1);
      expect(panel.sesionesHoy.justificadas).toBe(1);

      // Y las libretas pendientes suman 8 en total (3 vencidas y 5 por vencer)
      expect(panel.libretasPendientes.totalPendientes).toBe(8);
      expect(panel.libretasPendientes.vencidas).toBe(3);
      expect(panel.libretasPendientes.porVencer).toBe(5);

      // Y los 3 indicadores reflejan el bimestre en curso con sus valores dinámicos
      expect(panel.indicadoresBimestreActual.periodoId).toBe("per-iii-bim-uuid");
      expect(panel.indicadoresBimestreActual.periodoNombre).toBe("III Bimestre");
      expect(panel.indicadoresBimestreActual.enCurso).toBe(true);
      expect(panel.indicadoresBimestreActual.cspPorcentaje).toBe(96.61);
      expect(panel.indicadoresBimestreActual.isaPorcentaje).toBe(95.24);
      expect(panel.indicadoresBimestreActual.igmPorcentaje).toBe(88.0);
    });

    it("debe retornar asistencia 0.00 % sin error de división por cero si no hay estudiantes matriculados", async () => {
      // Dado que no hay estudiantes matriculados activos (ej. período previo a inicio de año)
      repo.contarEstudiantesMatriculadosActivos.mockResolvedValue(0);
      repo.contarEstudiantesConMarcacionIngresoHoy.mockResolvedValue(0);

      // Cuando se solicita el panel
      const panel = await service.obtenerPanel();

      // Entonces la asistencia devuelve 0 sin NaN ni error de división
      expect(panel.asistenciaHoy.totalEstudiantesMatriculados).toBe(0);
      expect(panel.asistenciaHoy.estudiantesConIngreso).toBe(0);
      expect(panel.asistenciaHoy.porcentajeAsistencia).toBe(0);
      expect(panel.asistenciaHoy.porcentajeAsistenciaTexto).toBe("0.00 %");
    });

    it("debe reflejar indicadores cerrados con enCurso false si no hay bimestre actualmente en curso", async () => {
      // Dado que el bimestre activo ya culminó y no hay período en curso
      calculoService.obtenerTablero.mockResolvedValue({
        ...tableroEnCursoMock,
        enCurso: false,
        csp: { ...tableroEnCursoMock.csp, enCurso: false },
        isa: { ...tableroEnCursoMock.isa, enCurso: false },
        igm: { ...tableroEnCursoMock.igm, enCurso: false },
      });

      // Cuando se obtiene el panel
      const panel = await service.obtenerPanel();

      // Entonces la sección de indicadores señala que no está en curso
      expect(panel.indicadoresBimestreActual.enCurso).toBe(false);
      expect(panel.indicadoresBimestreActual.cspPorcentaje).toBe(96.61);
    });

    it("debe calcular totalPendientes como la suma de vencidas y porVencer cuando no hay vencidas", async () => {
      // Dado que todas las libretas pendientes están dentro del plazo
      repo.contarLibretasPendientes.mockResolvedValue({
        vencidas: 0,
        porVencer: 7,
      });

      // Cuando se consulta el panel
      const panel = await service.obtenerPanel();

      // Entonces vencidas es 0 y el total es 7
      expect(panel.libretasPendientes.vencidas).toBe(0);
      expect(panel.libretasPendientes.porVencer).toBe(7);
      expect(panel.libretasPendientes.totalPendientes).toBe(7);
    });

    it("debe consultar las métricas del repositorio utilizando el anioAcademicoId inyectado en CLS", async () => {
      // Dado el contexto de año académico activo en CLS
      const panel = await service.obtenerPanel();

      // Entonces se invoca al repositorio con dicho año lectivo
      expect(anioLectivoCls.id).toHaveBeenCalled();
      expect(repo.contarEstudiantesMatriculadosActivos).toHaveBeenCalledWith(ANIO_ACADEMICO_ID);
      expect(repo.contarLibretasPendientes).toHaveBeenCalledWith(ANIO_ACADEMICO_ID, panel.fecha);
    });
  });
});
