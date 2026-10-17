import { AnioLectivoCls } from "@/common/anio-lectivo";
import {
  ComparacionRepository,
  ComparacionService,
  MedicionService,
  MENSAJES_INDICADORES,
  PretestService,
  type ComparacionBimestreResponseDto,
  type Indicador,
  type MedicionBimestreResponseDto,
  type PretestResponseDto,
} from "@/features/indicadores";

describe("RF-020: Servicio de Comparación — ComparacionService (CP-RF020-16 a CP-RF020-17)", () => {
  let service: ComparacionService;

  let pretestService: {
    obtenerVigente: jest.Mock;
  };

  let medicionService: {
    obtenerPorPeriodo: jest.Mock;
  };

  let comparacionRepo: {
    obtenerMedicionesVigentesPorAnio: jest.Mock;
  };

  let anioLectivoCls: {
    id: jest.Mock;
  };

  const ANIO_ACADEMICO_ID = "anio-2026-uuid";
  const PERIODO_II_BIMESTRE_ID = "periodo-ii-bimestre-uuid";

  // Pretests canónicos de la sección 11 del contrato (Caso 4 y Caso 5)
  const pretestCspMock: PretestResponseDto = {
    id: "pretest-csp-2026-uuid",
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
    registradoPorId: "usr-director-uuid",
    registradoPorNombre: "Director General",
    creadoEn: "2026-05-10T10:00:00.000Z",
  };

  const pretestIsaMock: PretestResponseDto = {
    id: "pretest-isa-2026-uuid",
    indicador: "ISA",
    periodoDescrito: "I Bimestre 2026",
    fechaInicio: "2026-03-01",
    fechaFin: "2026-05-08",
    numerador: 138,
    denominador: 168,
    porcentaje: 82.14,
    porcentajeTexto: "82.14 %",
    fuente: "Actas impresas de entrega de libretas",
    vigente: true,
    registradoPorId: "usr-director-uuid",
    registradoPorNombre: "Director General",
    creadoEn: "2026-05-10T10:05:00.000Z",
  };

  const pretestIgmMock: PretestResponseDto = {
    id: "pretest-igm-2026-uuid",
    indicador: "IGM",
    periodoDescrito: "I Bimestre 2026",
    fechaInicio: "2026-03-01",
    fechaFin: "2026-05-08",
    numerador: 175,
    denominador: 250,
    porcentaje: 70.0,
    porcentajeTexto: "70.00 %",
    fuente: "Registros de recepción de guías impresas",
    vigente: true,
    registradoPorId: "usr-director-uuid",
    registradoPorNombre: "Director General",
    creadoEn: "2026-05-10T10:10:00.000Z",
  };

  // Medición postest congelada del II Bimestre según la sección 11 del contrato (Caso 1, 2 y 5)
  const medicionPostestBimestreMock: MedicionBimestreResponseDto = {
    id: "medicion-ii-bim-v1-uuid",
    periodoId: PERIODO_II_BIMESTRE_ID,
    periodoNombre: "II Bimestre",
    version: 1,
    vigente: true,
    motivoCambio: null,
    cerradaPorId: "usr-director-uuid",
    cerradaPorNombre: "Director General",
    cerradaEn: "2026-07-25T18:00:00.000Z",
    indicadores: [
      {
        indicador: "CSP",
        numerador: 1130,
        denominador: 1200,
        porcentaje: 94.2,
        porcentajeTexto: "94.20 %",
        desglose: {
          planificadas: 1200,
          cumplidas: 1080,
          parciales: 50,
          noCumplidas: 70,
          justificadas: 0,
          denominadorEfectivo: 1200,
        },
      },
      {
        indicador: "ISA",
        numerador: 163,
        denominador: 168,
        porcentaje: 97.1,
        porcentajeTexto: "97.10 %",
        desglose: {
          programadas: 168,
          publicadasATiempo: 163,
          publicadasFueraDePlazo: 3,
          pendientes: 2,
          vistasPorFamilia: 145,
          porcentajeVistasFamilia: 86.31,
        },
      },
      {
        indicador: "IGM",
        numerador: 220,
        denominador: 250,
        porcentaje: 88.0,
        porcentajeTexto: "88.00 %",
        desglose: {
          planificados: 250,
          publicadosATiempo: 220,
          publicadosFueraDePlazo: 20,
          pendientes: 10,
          extras: 30,
        },
      },
    ],
  };

  // Historial de evolución por bimestres del año
  const evolucionMedicionesAnioMock = [
    {
      periodoId: "periodo-i-bim-uuid",
      periodoNombre: "I Bimestre",
      numeroPeriodo: 1,
      indicador: "CSP" as Indicador,
      porcentaje: 85.5,
    },
    {
      periodoId: "periodo-i-bim-uuid",
      periodoNombre: "I Bimestre",
      numeroPeriodo: 1,
      indicador: "ISA" as Indicador,
      porcentaje: 89.0,
    },
    {
      periodoId: "periodo-i-bim-uuid",
      periodoNombre: "I Bimestre",
      numeroPeriodo: 1,
      indicador: "IGM" as Indicador,
      porcentaje: 80.0,
    },
    {
      periodoId: PERIODO_II_BIMESTRE_ID,
      periodoNombre: "II Bimestre",
      numeroPeriodo: 2,
      indicador: "CSP" as Indicador,
      porcentaje: 94.2,
    },
    {
      periodoId: PERIODO_II_BIMESTRE_ID,
      periodoNombre: "II Bimestre",
      numeroPeriodo: 2,
      indicador: "ISA" as Indicador,
      porcentaje: 97.1,
    },
    {
      periodoId: PERIODO_II_BIMESTRE_ID,
      periodoNombre: "II Bimestre",
      numeroPeriodo: 2,
      indicador: "IGM" as Indicador,
      porcentaje: 88.0,
    },
  ];

  beforeEach(() => {
    pretestService = {
      obtenerVigente: jest.fn().mockImplementation((indicador: Indicador) => {
        if (indicador === "CSP") return Promise.resolve(pretestCspMock);
        if (indicador === "ISA") return Promise.resolve(pretestIsaMock);
        if (indicador === "IGM") return Promise.resolve(pretestIgmMock);
        return Promise.resolve(null);
      }),
    };

    medicionService = {
      obtenerPorPeriodo: jest.fn().mockResolvedValue(medicionPostestBimestreMock),
    };

    comparacionRepo = {
      obtenerMedicionesVigentesPorAnio: jest.fn().mockResolvedValue(evolucionMedicionesAnioMock),
    };

    anioLectivoCls = {
      id: jest.fn().mockReturnValue(ANIO_ACADEMICO_ID),
    };

    service = new ComparacionService(
      pretestService as unknown as PretestService,
      medicionService as unknown as MedicionService,
      comparacionRepo as unknown as ComparacionRepository,
      anioLectivoCls as unknown as AnioLectivoCls,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // CP-RF020-16: Comparación pretest – postest
  // =========================================================================
  describe("CP-RF020-16: Comparación pretest – postest", () => {
    it("CP-RF020-16: debe mostrar ambos valores y variación de +15.70 pp para CSP con pretest 78.50 % y postest 94.20 %", async () => {
      // Dado que el CSP tiene pretest 78.50 % y postest 94.20 %
      // Cuando abro 'Comparación' para el II Bimestre
      const resultado: ComparacionBimestreResponseDto =
        await service.obtenerComparacion(PERIODO_II_BIMESTRE_ID);

      // Entonces el sistema muestra ambos valores y la variación de +15.70 puntos porcentuales
      expect(resultado.periodoId).toBe(PERIODO_II_BIMESTRE_ID);
      expect(resultado.periodoNombre).toBe("II Bimestre");
      expect(resultado.comparaciones).toHaveLength(3);

      const csp = resultado.comparaciones.find(
        (c: { indicador: Indicador }) => c.indicador === "CSP",
      );
      expect(csp).toBeDefined();
      expect(csp?.nombre).toBe("Cumplimiento de sesiones planificadas");
      expect(csp?.dimension).toBe("Prácticas pedagógicas");

      // Pretest
      expect(csp?.pretest.registrado).toBe(true);
      expect(csp?.pretest.porcentaje).toBe(78.5);
      expect(csp?.pretest.porcentajeTexto).toBe("78.50 %");
      expect(csp?.pretest.fuente).toBe("Hojas físicas de firma de la subdirección");
      expect(csp?.pretest.periodoDescrito).toBe("I Bimestre 2026");

      // Postest
      expect(csp?.postest.medido).toBe(true);
      expect(csp?.postest.porcentaje).toBe(94.2);
      expect(csp?.postest.porcentajeTexto).toBe("94.20 %");
      expect(csp?.postest.version).toBe(1);

      // Variación en puntos porcentuales (94.20 - 78.50 = +15.70 pp)
      expect(csp?.variacionPuntos).toBe(15.7);
      expect(csp?.variacionPuntosTexto).toBe("+15.70 pp");

      // Y consulta el pretest vigente de CSP
      expect(pretestService.obtenerVigente).toHaveBeenCalledWith("CSP");
      // Y consulta la medición congelada del período
      expect(medicionService.obtenerPorPeriodo).toHaveBeenCalledWith(PERIODO_II_BIMESTRE_ID);
    });

    it("CP-RF020-16: debe calcular variaciones correctas para ISA e IGM de manera análoga", async () => {
      // Dado que ISA tiene pretest 82.14 % y postest 97.10 % (+14.96 pp)
      // y IGM tiene pretest 70.00 % y postest 88.00 % (+18.00 pp)
      // Cuando consulto la comparación
      const resultado = await service.obtenerComparacion(PERIODO_II_BIMESTRE_ID);

      // Entonces para ISA
      const isa = resultado.comparaciones.find(
        (c: { indicador: Indicador }) => c.indicador === "ISA",
      );
      expect(isa?.pretest.porcentaje).toBe(82.14);
      expect(isa?.postest.porcentaje).toBe(97.1);
      expect(isa?.variacionPuntos).toBe(14.96);
      expect(isa?.variacionPuntosTexto).toBe("+14.96 pp");

      // Y para IGM
      const igm = resultado.comparaciones.find(
        (c: { indicador: Indicador }) => c.indicador === "IGM",
      );
      expect(igm?.pretest.porcentaje).toBe(70.0);
      expect(igm?.postest.porcentaje).toBe(88.0);
      expect(igm?.variacionPuntos).toBe(18.0);
      expect(igm?.variacionPuntosTexto).toBe("+18.00 pp");
    });

    it("CP-RF020-16: debe incluir la serie de evolución por bimestres obtenida del repositorio", async () => {
      // Dado el historial de mediciones del año lectivo
      // Cuando consulto la comparación
      const resultado = await service.obtenerComparacion(PERIODO_II_BIMESTRE_ID);

      // Entonces entrega la evolución agrupada por bimestre
      expect(resultado.evolucionBimestres).toBeDefined();
      expect(resultado.evolucionBimestres.length).toBeGreaterThanOrEqual(2);

      const bim1 = resultado.evolucionBimestres.find(
        (b: { periodoNombre: string }) => b.periodoNombre === "I Bimestre",
      );
      expect(bim1?.csp).toBe(85.5);
      expect(bim1?.isa).toBe(89.0);
      expect(bim1?.igm).toBe(80.0);

      const bim2 = resultado.evolucionBimestres.find(
        (b: { periodoNombre: string }) => b.periodoNombre === "II Bimestre",
      );
      expect(bim2?.csp).toBe(94.2);
      expect(bim2?.isa).toBe(97.1);
      expect(bim2?.igm).toBe(88.0);

      expect(comparacionRepo.obtenerMedicionesVigentesPorAnio).toHaveBeenCalledWith(
        ANIO_ACADEMICO_ID,
      );
    });
  });

  // =========================================================================
  // CP-RF020-17: Comparación sin pretest
  // =========================================================================
  describe("CP-RF020-17: Comparación sin pretest", () => {
    it("CP-RF020-17: debe mostrar solo postest para IGM y el mensaje oficial cuando no tiene pretest registrado", async () => {
      // Dado que el IGM no tiene pretest registrado
      pretestService.obtenerVigente.mockImplementation((indicador: Indicador) => {
        if (indicador === "CSP") return Promise.resolve(pretestCspMock);
        if (indicador === "ISA") return Promise.resolve(pretestIsaMock);
        if (indicador === "IGM") return Promise.resolve(null);
        return Promise.resolve(null);
      });

      // Cuando abro 'Comparación'
      const resultado: ComparacionBimestreResponseDto =
        await service.obtenerComparacion(PERIODO_II_BIMESTRE_ID);

      // Entonces el IGM muestra solo el postest con el mensaje exacto de la especificación
      const igm = resultado.comparaciones.find(
        (c: { indicador: Indicador }) => c.indicador === "IGM",
      );
      expect(igm).toBeDefined();

      // Pretest no registrado
      expect(igm?.pretest.registrado).toBe(false);
      expect(igm?.pretest.porcentaje).toBeNull();
      expect(igm?.pretest.mensaje).toBe(MENSAJES_INDICADORES.SIN_PRETEST);
      expect(igm?.pretest.mensaje).toBe("Registre el pretest para ver la comparación.");

      // Postest medido permanece visible
      expect(igm?.postest.medido).toBe(true);
      expect(igm?.postest.porcentaje).toBe(88.0);
      expect(igm?.postest.porcentajeTexto).toBe("88.00 %");

      // Variación nula sin pretest
      expect(igm?.variacionPuntos).toBeNull();
      expect(igm?.variacionPuntosTexto).toBe("Sin pretest");

      // Y CSP e ISA conservan su comparación completa normal
      const csp = resultado.comparaciones.find(
        (c: { indicador: Indicador }) => c.indicador === "CSP",
      );
      expect(csp?.pretest.registrado).toBe(true);
      expect(csp?.variacionPuntos).toBe(15.7);
    });
  });

  // =========================================================================
  // Casos complementarios de variación (negativa, neutra y sin postest)
  // =========================================================================
  describe("Casos complementarios de comparación pretest-postest", () => {
    it("debe formatear con signo negativo cuando la variación de puntos es descendente", async () => {
      // Dado un indicador donde el postest cayó respecto al pretest
      const pretestAlto: PretestResponseDto = {
        ...pretestCspMock,
        porcentaje: 90.0,
        porcentajeTexto: "90.00 %",
      };
      pretestService.obtenerVigente.mockResolvedValue(pretestAlto);

      const medicionBaja: MedicionBimestreResponseDto = {
        ...medicionPostestBimestreMock,
        indicadores: [
          {
            indicador: "CSP",
            numerador: 1000,
            denominador: 1200,
            porcentaje: 83.33,
            porcentajeTexto: "83.33 %",
            desglose: medicionPostestBimestreMock.indicadores[0].desglose,
          },
        ],
      };
      medicionService.obtenerPorPeriodo.mockResolvedValue(medicionBaja);

      // Cuando consulto la comparación
      const resultado = await service.obtenerComparacion(PERIODO_II_BIMESTRE_ID);

      // Entonces la variación es negativa con formato estándar
      const csp = resultado.comparaciones.find(
        (c: { indicador: Indicador }) => c.indicador === "CSP",
      );
      expect(csp?.variacionPuntos).toBe(-6.67);
      expect(csp?.variacionPuntosTexto).toBe("-6.67 pp");
    });

    it("debe formatear con +0.00 pp cuando el postest es exactamente igual al pretest", async () => {
      // Dado un pretest y postest iguales (80.00 %)
      const pretestIgual: PretestResponseDto = {
        ...pretestIgmMock,
        porcentaje: 88.0,
        porcentajeTexto: "88.00 %",
      };
      pretestService.obtenerVigente.mockResolvedValue(pretestIgual);

      // Cuando consulto la comparación
      const resultado = await service.obtenerComparacion(PERIODO_II_BIMESTRE_ID);

      // Entonces la variación es neutra positiva
      const igm = resultado.comparaciones.find(
        (c: { indicador: Indicador }) => c.indicador === "IGM",
      );
      expect(igm?.variacionPuntos).toBe(0);
      expect(igm?.variacionPuntosTexto).toBe("+0.00 pp");
    });

    it("debe manejar un período sin medición postest cerrada aún marcando medido en false", async () => {
      // Dado que el período consultado no tiene medición cerrada todavía
      medicionService.obtenerPorPeriodo.mockResolvedValue(null);

      // Cuando consulto la comparación
      const resultado = await service.obtenerComparacion(PERIODO_II_BIMESTRE_ID);

      // Entonces el postest se reporta como no medido y la variación es nula
      expect(resultado.comparaciones).toHaveLength(3);
      resultado.comparaciones.forEach(
        (comp: {
          postest: { medido: boolean; porcentaje: number | null };
          variacionPuntos: number | null;
          variacionPuntosTexto: string;
        }) => {
          expect(comp.postest.medido).toBe(false);
          expect(comp.postest.porcentaje).toBeNull();
          expect(comp.variacionPuntos).toBeNull();
          expect(comp.variacionPuntosTexto).toBe("Sin postest");
        },
      );
    });
  });
});
