import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import {
  IndicadoresCalculoRepository,
  IndicadoresCalculoService,
  MENSAJES_INDICADORES,
  type ConteoLibretasFila,
  type ConteoMaterialesFila,
  type ConteoSesionesFila,
  type CursoDocenteFila,
  type DesgloseCspDto,
  type DesgloseIgmDto,
  type DesgloseIsaDto,
  type FiltroIndicadoresQueryDto,
  type FiltrosConsultaCalculo,
  type IndicadorCalculadoDto,
  type MisIndicadoresDocenteResponseDto,
  type TableroIndicadoresResponseDto,
} from "@/features/indicadores";

describe("RF-020: Indicadores de la Tesis — Cálculo de Indicadores (CP-RF020-01 a CP-RF020-07)", () => {
  let service: IndicadoresCalculoService;

  let repo: {
    obtenerPeriodoPorId: jest.Mock;
    obtenerPeriodoEnCurso: jest.Mock;
    contarSesiones: jest.Mock;
    contarLibretas: jest.Mock;
    contarMateriales: jest.Mock;
    listarCursosDeDocente: jest.Mock;
    obtenerDocentePorPersonaId: jest.Mock;
  };

  let anioLectivoCls: {
    id: jest.Mock;
  };

  const ANIO_ACADEMICO_ID = "anio-2026-uuid";
  const PERIODO_II_BIMESTRE_ID = "per-ii-bim-uuid";
  const PERIODO_III_BIMESTRE_ID = "per-iii-bim-uuid";
  const DOCENTE_QUISPE_ID = "doc-quispe-uuid";
  const PERSONA_QUISPE_ID = "per-quispe-uuid";

  const periodoIiBimestreCerrado = {
    id: PERIODO_II_BIMESTRE_ID,
    nombre: "II Bimestre",
    estado: "cerrado",
    fechaInicio: "2026-05-18",
    fechaFin: "2026-07-24",
  };

  const periodoIiiBimestreEnCurso = {
    id: PERIODO_III_BIMESTRE_ID,
    nombre: "III Bimestre",
    estado: "en_curso",
    fechaInicio: "2026-08-10",
    fechaFin: "2026-10-16",
  };

  // Datos canónicos de la sección 11 del contrato (CP-RF020-01)
  const conteoSesionesCanonico: ConteoSesionesFila = {
    planificadas: 1200,
    cumplidas: 1080,
    parciales: 60,
    noCumplidas: 40,
    justificadas: 20,
  };

  // Datos canónicos de la sección 11 del contrato (CP-RF020-02)
  const conteoLibretasCanonico: ConteoLibretasFila = {
    programadas: 168,
    publicadasATiempo: 160,
    publicadasFueraDePlazo: 5,
    pendientes: 3,
    vistasPorFamilia: 142,
  };

  // Datos canónicos de la sección 11 del contrato (CP-RF020-03)
  const conteoMaterialesCanonico: ConteoMaterialesFila = {
    planificados: 250,
    publicadosATiempo: 220,
    publicadosFueraDePlazo: 20,
    pendientes: 10,
    extras: 30,
  };

  const cursosDocenteQuispe: CursoDocenteFila[] = [
    {
      cursoId: "cur-mat-1",
      cursoNombre: "Matemática",
      seccionId: "sec-1a",
      seccionNombre: "1° A",
      gradoNombre: "1° de Secundaria",
    },
    {
      cursoId: "cur-geo-1",
      cursoNombre: "Geometría",
      seccionId: "sec-1b",
      seccionNombre: "1° B",
      gradoNombre: "1° de Secundaria",
    },
  ];

  beforeEach(() => {
    repo = {
      obtenerPeriodoPorId: jest.fn().mockResolvedValue(periodoIiBimestreCerrado),
      obtenerPeriodoEnCurso: jest.fn().mockResolvedValue(periodoIiiBimestreEnCurso),
      contarSesiones: jest.fn().mockResolvedValue(conteoSesionesCanonico),
      contarLibretas: jest.fn().mockResolvedValue(conteoLibretasCanonico),
      contarMateriales: jest.fn().mockResolvedValue(conteoMaterialesCanonico),
      listarCursosDeDocente: jest.fn().mockResolvedValue(cursosDocenteQuispe),
      obtenerDocentePorPersonaId: jest.fn().mockResolvedValue({
        id: DOCENTE_QUISPE_ID,
        nombres: "Carlos",
        apellidoPaterno: "Quispe",
        apellidoMaterno: "Mamani",
      }),
    };

    anioLectivoCls = {
      id: jest.fn().mockReturnValue(ANIO_ACADEMICO_ID),
    };

    service = new IndicadoresCalculoService(
      repo as unknown as IndicadoresCalculoRepository,
      anioLectivoCls as unknown as AnioLectivoCls,
    );
  });

  // =========================================================================
  // CP-RF020-01: Ver el CSP del bimestre
  // =========================================================================
  describe("CP-RF020-01: Ver el CSP del bimestre", () => {
    it("CP-RF020-01: debe calcular el CSP con la fórmula canónica (1080 + 60) ÷ (1200 − 20) × 100 = 96.61 % con su desglose", async () => {
      // Dado que en el II Bimestre hubo 1 200 sesiones planificadas: 1 080 cumplidas, 60 parciales, 40 no cumplidas y 20 justificadas
      const filtros: FiltrosConsultaCalculo = {
        anioAcademicoId: ANIO_ACADEMICO_ID,
        periodoId: PERIODO_II_BIMESTRE_ID,
      };
      repo.contarSesiones.mockResolvedValue(conteoSesionesCanonico);

      // Cuando calculo el CSP del período
      const resultado: IndicadorCalculadoDto<DesgloseCspDto> = await service.calcularCsp(filtros);

      // Entonces el CSP es 96.61 % y se muestra el desglose de las cuatro categorías
      expect(resultado.indicador).toBe("CSP");
      expect(resultado.nombre).toBe("Cumplimiento de sesiones planificadas");
      expect(resultado.dimension).toBe("Prácticas pedagógicas");
      expect(resultado.formula).toBe(
        "(cumplidas + parciales) ÷ (planificadas − justificadas) × 100",
      );
      expect(resultado.numerador).toBe(1140); // 1080 + 60
      expect(resultado.denominador).toBe(1180); // 1200 - 20
      expect(resultado.porcentaje).toBe(96.61);
      expect(resultado.porcentajeTexto).toBe("96.61 %");
      expect(resultado.enCurso).toBe(false);
      expect(resultado.sinDatos).toBe(false);

      expect(resultado.desglose.planificadas).toBe(1200);
      expect(resultado.desglose.cumplidas).toBe(1080);
      expect(resultado.desglose.parciales).toBe(60);
      expect(resultado.desglose.noCumplidas).toBe(40);
      expect(resultado.desglose.justificadas).toBe(20);
      expect(resultado.desglose.denominadorEfectivo).toBe(1180);
    });

    it("CP-RF020-01: debe reflejar el CSP y su desglose dentro del tablero general para el II Bimestre cerrado", async () => {
      // Dado que abro Indicadores y elijo el II Bimestre
      const query: FiltroIndicadoresQueryDto = {
        periodoId: PERIODO_II_BIMESTRE_ID,
      };
      repo.obtenerPeriodoPorId.mockResolvedValue(periodoIiBimestreCerrado);
      repo.contarSesiones.mockResolvedValue(conteoSesionesCanonico);

      // Cuando consulto el tablero de indicadores
      const tablero: TableroIndicadoresResponseDto = await service.obtenerTablero(query);

      // Entonces el tablero contiene el período, enCurso en false y el CSP canónico
      expect(tablero.periodoId).toBe(PERIODO_II_BIMESTRE_ID);
      expect(tablero.periodoNombre).toBe("II Bimestre");
      expect(tablero.enCurso).toBe(false);
      expect(tablero.csp.porcentaje).toBe(96.61);
      expect(tablero.csp.porcentajeTexto).toBe("96.61 %");
      expect(tablero.csp.desglose.denominadorEfectivo).toBe(1180);
      expect(tablero.csp.desglose.cumplidas).toBe(1080);
      expect(tablero.csp.desglose.parciales).toBe(60);
      expect(tablero.csp.desglose.noCumplidas).toBe(40);
      expect(tablero.csp.desglose.justificadas).toBe(20);
    });
  });

  // =========================================================================
  // CP-RF020-02: Ver el ISA del bimestre
  // =========================================================================
  describe("CP-RF020-02: Ver el ISA del bimestre", () => {
    it("CP-RF020-02: debe calcular el ISA con 160 ÷ 168 × 100 = 95.24 % e incluir vistas por familia (142 ÷ 168 = 84.52 %)", async () => {
      // Dado que se programaron 168 libretas y 160 se publicaron a tiempo con 142 vistas por la familia
      const filtros: FiltrosConsultaCalculo = {
        anioAcademicoId: ANIO_ACADEMICO_ID,
        periodoId: PERIODO_II_BIMESTRE_ID,
      };
      repo.contarLibretas.mockResolvedValue(conteoLibretasCanonico);

      // Cuando calculo el ISA del período
      const resultado: IndicadorCalculadoDto<DesgloseIsaDto> = await service.calcularIsa(filtros);

      // Entonces el ISA es 95.24 % y se muestra además cuántas fueron vistas por la familia
      expect(resultado.indicador).toBe("ISA");
      expect(resultado.nombre).toBe("Informes de seguimiento académico");
      expect(resultado.dimension).toBe("Seguimiento académico");
      expect(resultado.formula).toBe("libretas publicadas a tiempo ÷ libretas programadas × 100");
      expect(resultado.numerador).toBe(160);
      expect(resultado.denominador).toBe(168);
      expect(resultado.porcentaje).toBe(95.24);
      expect(resultado.porcentajeTexto).toBe("95.24 %");
      expect(resultado.enCurso).toBe(false);
      expect(resultado.sinDatos).toBe(false);

      expect(resultado.desglose.programadas).toBe(168);
      expect(resultado.desglose.publicadasATiempo).toBe(160);
      expect(resultado.desglose.publicadasFueraDePlazo).toBe(5);
      expect(resultado.desglose.pendientes).toBe(3);
      expect(resultado.desglose.vistasPorFamilia).toBe(142);
      expect(resultado.desglose.porcentajeVistasFamilia).toBe(84.52);
    });

    it("CP-RF020-02: debe incluir el ISA dentro del tablero general con el desglose de libretas y vistas familiares", async () => {
      // Dado que consulto el ISA del II Bimestre en el tablero general
      const query: FiltroIndicadoresQueryDto = {
        periodoId: PERIODO_II_BIMESTRE_ID,
      };
      repo.obtenerPeriodoPorId.mockResolvedValue(periodoIiBimestreCerrado);
      repo.contarLibretas.mockResolvedValue(conteoLibretasCanonico);

      // Cuando consulto el tablero
      const tablero: TableroIndicadoresResponseDto = await service.obtenerTablero(query);

      // Entonces el ISA del tablero entrega el porcentaje exacto y el porcentaje de vistas
      expect(tablero.isa.porcentaje).toBe(95.24);
      expect(tablero.isa.porcentajeTexto).toBe("95.24 %");
      expect(tablero.isa.desglose.publicadasATiempo).toBe(160);
      expect(tablero.isa.desglose.vistasPorFamilia).toBe(142);
      expect(tablero.isa.desglose.porcentajeVistasFamilia).toBe(84.52);
    });
  });

  // =========================================================================
  // CP-RF020-03: Ver el IGM del bimestre
  // =========================================================================
  describe("CP-RF020-03: Ver el IGM del bimestre", () => {
    it("CP-RF020-03: debe calcular el IGM con 220 ÷ 250 × 100 = 88.00 % y excluir materiales extra del cálculo", async () => {
      // Dado que se planificaron 250 materiales y 220 se publicaron a tiempo, más 30 materiales extra
      const filtros: FiltrosConsultaCalculo = {
        anioAcademicoId: ANIO_ACADEMICO_ID,
        periodoId: PERIODO_II_BIMESTRE_ID,
      };
      repo.contarMateriales.mockResolvedValue(conteoMaterialesCanonico);

      // Cuando calculo el IGM del período
      const resultado: IndicadorCalculadoDto<DesgloseIgmDto> = await service.calcularIgm(filtros);

      // Entonces el IGM es 88.00 % y los materiales extra no se cuentan en numerador ni denominador
      expect(resultado.indicador).toBe("IGM");
      expect(resultado.nombre).toBe("Gestión de materiales");
      expect(resultado.dimension).toBe("Aula virtual");
      expect(resultado.formula).toBe(
        "materiales planificados publicados a tiempo ÷ materiales planificados × 100",
      );
      expect(resultado.numerador).toBe(220);
      expect(resultado.denominador).toBe(250); // Los 30 extras NO se suman al denominador
      expect(resultado.porcentaje).toBe(88.0);
      expect(resultado.porcentajeTexto).toBe("88.00 %");
      expect(resultado.enCurso).toBe(false);
      expect(resultado.sinDatos).toBe(false);

      expect(resultado.desglose.planificados).toBe(250);
      expect(resultado.desglose.publicadosATiempo).toBe(220);
      expect(resultado.desglose.publicadosFueraDePlazo).toBe(20);
      expect(resultado.desglose.pendientes).toBe(10);
      expect(resultado.desglose.extras).toBe(30);
    });

    it("CP-RF020-03: debe incluir el IGM dentro del tablero general mostrando la cantidad de materiales extra", async () => {
      // Dado que consulto el IGM del II Bimestre en el tablero general
      const query: FiltroIndicadoresQueryDto = {
        periodoId: PERIODO_II_BIMESTRE_ID,
      };
      repo.obtenerPeriodoPorId.mockResolvedValue(periodoIiBimestreCerrado);
      repo.contarMateriales.mockResolvedValue(conteoMaterialesCanonico);

      // Cuando consulto el tablero
      const tablero: TableroIndicadoresResponseDto = await service.obtenerTablero(query);

      // Entonces el IGM del tablero es 88.00 % y desglose.extras es 30
      expect(tablero.igm.porcentaje).toBe(88.0);
      expect(tablero.igm.porcentajeTexto).toBe("88.00 %");
      expect(tablero.igm.desglose.extras).toBe(30);
    });
  });

  // =========================================================================
  // CP-RF020-04: Filtrar por docente
  // =========================================================================
  describe("CP-RF020-04: Filtrar por docente", () => {
    it("CP-RF020-04: debe filtrar CSP e IGM por el docente Quispe y mostrar el detalle desagregado por curso", async () => {
      // Dado que estoy en Indicadores y filtro por el docente Quispe en el II Bimestre
      const query: FiltroIndicadoresQueryDto = {
        docenteId: DOCENTE_QUISPE_ID,
        periodoId: PERIODO_II_BIMESTRE_ID,
      };

      // Mock de sesiones: global para Quispe y luego por curso
      repo.contarSesiones
        .mockResolvedValueOnce({
          planificadas: 100,
          cumplidas: 90,
          parciales: 5,
          noCumplidas: 3,
          justificadas: 2,
        }) // Global Quispe: (90 + 5) / (100 - 2) * 100 = 95 / 98 * 100 = 96.94 %
        .mockResolvedValueOnce({
          planificadas: 60,
          cumplidas: 55,
          parciales: 3,
          noCumplidas: 1,
          justificadas: 1,
        }) // Curso 1 (Matemática 1° A): (55 + 3) / (60 - 1) * 100 = 58 / 59 * 100 = 98.31 %
        .mockResolvedValueOnce({
          planificadas: 40,
          cumplidas: 35,
          parciales: 2,
          noCumplidas: 2,
          justificadas: 1,
        }); // Curso 2 (Geometría 1° B): (35 + 2) / (40 - 1) * 100 = 37 / 39 * 100 = 94.87 %

      // Mock de materiales: global para Quispe y luego por curso
      repo.contarMateriales
        .mockResolvedValueOnce({
          planificados: 20,
          publicadosATiempo: 18,
          publicadosFueraDePlazo: 1,
          pendientes: 1,
          extras: 2,
        }) // Global Quispe: 18 / 20 * 100 = 90.00 %
        .mockResolvedValueOnce({
          planificados: 12,
          publicadosATiempo: 11,
          publicadosFueraDePlazo: 1,
          pendientes: 0,
          extras: 1,
        }) // Curso 1: 11 / 12 * 100 = 91.67 %
        .mockResolvedValueOnce({
          planificados: 8,
          publicadosATiempo: 7,
          publicadosFueraDePlazo: 0,
          pendientes: 1,
          extras: 1,
        }); // Curso 2: 7 / 8 * 100 = 87.50 %

      // Cuando ejecuto obtenerTablero con filtro docenteId
      const tablero: TableroIndicadoresResponseDto = await service.obtenerTablero(query);

      // Entonces el sistema muestra los valores globales del docente y el detalle por curso
      expect(tablero.csp.porcentaje).toBe(96.94);
      expect(tablero.igm.porcentaje).toBe(90.0);
      expect(tablero.detallePorCursos).toBeDefined();
      expect(tablero.detallePorCursos).toHaveLength(2);

      const curso1 = tablero.detallePorCursos?.[0];
      expect(curso1?.cursoNombre).toBe("Matemática");
      expect(curso1?.seccionNombre).toBe("1° A");
      expect(curso1?.gradoNombre).toBe("1° de Secundaria");
      expect(curso1?.csp.porcentaje).toBe(98.31);
      expect(curso1?.igm.porcentaje).toBe(91.67);

      const curso2 = tablero.detallePorCursos?.[1];
      expect(curso2?.cursoNombre).toBe("Geometría");
      expect(curso2?.seccionNombre).toBe("1° B");
      expect(curso2?.gradoNombre).toBe("1° de Secundaria");
      expect(curso2?.csp.porcentaje).toBe(94.87);
      expect(curso2?.igm.porcentaje).toBe(87.5);
    });

    it("CP-RF020-04: debe retornar detallePorCursos como arreglo vacío si el docente no tiene cursos asignados en el período", async () => {
      // Dado un docente sin cursos asignados en el período
      const query: FiltroIndicadoresQueryDto = {
        docenteId: "doc-sin-cursos-uuid",
        periodoId: PERIODO_II_BIMESTRE_ID,
      };
      repo.listarCursosDeDocente.mockResolvedValue([]);

      // Cuando consulto el tablero
      const tablero: TableroIndicadoresResponseDto = await service.obtenerTablero(query);

      // Entonces detallePorCursos es un arreglo vacío
      expect(tablero.detallePorCursos).toEqual([]);
    });
  });

  // =========================================================================
  // CP-RF020-05: Valor en curso
  // =========================================================================
  describe("CP-RF020-05: Valor en curso", () => {
    it("CP-RF020-05: debe marcar enCurso=true cuando el III Bimestre consultado por ID está en curso", async () => {
      // Dado que el III Bimestre está en curso
      const query: FiltroIndicadoresQueryDto = {
        periodoId: PERIODO_III_BIMESTRE_ID,
      };
      repo.obtenerPeriodoPorId.mockResolvedValue(periodoIiiBimestreEnCurso);

      // Cuando consulto sus indicadores
      const tablero: TableroIndicadoresResponseDto = await service.obtenerTablero(query);

      // Entonces el sistema muestra el valor al momento marcado como en curso
      expect(tablero.periodoId).toBe(PERIODO_III_BIMESTRE_ID);
      expect(tablero.periodoNombre).toBe("III Bimestre");
      expect(tablero.enCurso).toBe(true);
      expect(tablero.csp.enCurso).toBe(true);
      expect(tablero.isa.enCurso).toBe(true);
      expect(tablero.igm.enCurso).toBe(true);
    });

    it("CP-RF020-05: debe obtener automáticamente el período en curso del año lectivo si no se envía periodoId", async () => {
      // Dado que consulto indicadores sin especificar período
      const query: FiltroIndicadoresQueryDto = {};
      repo.obtenerPeriodoEnCurso.mockResolvedValue(periodoIiiBimestreEnCurso);

      // Cuando consulto el tablero sin periodoId
      const tablero: TableroIndicadoresResponseDto = await service.obtenerTablero(query);

      // Entonces el sistema utiliza el período en curso del año y marca enCurso=true
      expect(repo.obtenerPeriodoEnCurso).toHaveBeenCalledWith(ANIO_ACADEMICO_ID);
      expect(tablero.periodoId).toBe(PERIODO_III_BIMESTRE_ID);
      expect(tablero.periodoNombre).toBe("III Bimestre");
      expect(tablero.enCurso).toBe(true);
      expect(tablero.csp.enCurso).toBe(true);
      expect(tablero.isa.enCurso).toBe(true);
      expect(tablero.igm.enCurso).toBe(true);
    });

    it("CP-RF020-05: debe marcar enCurso=true al calcular individualmente CSP, ISA e IGM con período abierto", async () => {
      // Dado que se calculan las métricas directas con un período en curso
      const filtros: FiltrosConsultaCalculo = {
        anioAcademicoId: ANIO_ACADEMICO_ID,
        periodoId: PERIODO_III_BIMESTRE_ID,
      };
      repo.obtenerPeriodoPorId.mockResolvedValue(periodoIiiBimestreEnCurso);

      // Cuando ejecuto los cálculos individuales
      const csp = await service.calcularCsp(filtros);
      const isa = await service.calcularIsa(filtros);
      const igm = await service.calcularIgm(filtros);

      // Entonces todos retornan enCurso=true
      expect(csp.enCurso).toBe(true);
      expect(isa.enCurso).toBe(true);
      expect(igm.enCurso).toBe(true);
    });
  });

  // =========================================================================
  // CP-RF020-06: Sin datos y validaciones de rango
  // =========================================================================
  describe("CP-RF020-06: Sin datos y validaciones de rango", () => {
    it("CP-RF020-06: debe retornar porcentaje nulo, sinDatos=true y el mensaje exacto cuando el período no tiene sesiones, libretas ni materiales", async () => {
      // Dado que el periodo elegido no tiene sesiones, libretas ni materiales
      const query: FiltroIndicadoresQueryDto = {
        periodoId: PERIODO_II_BIMESTRE_ID,
      };
      repo.contarSesiones.mockResolvedValue({
        planificadas: 0,
        cumplidas: 0,
        parciales: 0,
        noCumplidas: 0,
        justificadas: 0,
      });
      repo.contarLibretas.mockResolvedValue({
        programadas: 0,
        publicadasATiempo: 0,
        publicadasFueraDePlazo: 0,
        pendientes: 0,
        vistasPorFamilia: 0,
      });
      repo.contarMateriales.mockResolvedValue({
        planificados: 0,
        publicadosATiempo: 0,
        publicadosFueraDePlazo: 0,
        pendientes: 0,
        extras: 0,
      });

      // Cuando consulto el tablero
      const tablero: TableroIndicadoresResponseDto = await service.obtenerTablero(query);

      // Entonces el sistema muestra porcentaje null, sinDatos true y el mensaje exacto
      expect(tablero.csp.porcentaje).toBeNull();
      expect(tablero.csp.porcentajeTexto).toBe("Sin datos");
      expect(tablero.csp.sinDatos).toBe(true);
      expect(tablero.csp.mensajeSinDatos).toBe(MENSAJES_INDICADORES.SIN_DATOS);
      expect(tablero.csp.mensajeSinDatos).toBe(
        "No hay datos para el periodo y los filtros elegidos.",
      );

      expect(tablero.isa.porcentaje).toBeNull();
      expect(tablero.isa.porcentajeTexto).toBe("Sin datos");
      expect(tablero.isa.sinDatos).toBe(true);
      expect(tablero.isa.mensajeSinDatos).toBe(MENSAJES_INDICADORES.SIN_DATOS);

      expect(tablero.igm.porcentaje).toBeNull();
      expect(tablero.igm.porcentajeTexto).toBe("Sin datos");
      expect(tablero.igm.sinDatos).toBe(true);
      expect(tablero.igm.mensajeSinDatos).toBe(MENSAJES_INDICADORES.SIN_DATOS);
    });

    it("CP-RF020-06: debe retornar sinDatos=true en CSP cuando todas las sesiones planificadas fueron justificadas (denominador efectivo = 0)", async () => {
      // Dado que hubo 10 sesiones planificadas y las 10 fueron justificadas
      const filtros: FiltrosConsultaCalculo = {
        anioAcademicoId: ANIO_ACADEMICO_ID,
        periodoId: PERIODO_II_BIMESTRE_ID,
      };
      repo.contarSesiones.mockResolvedValue({
        planificadas: 10,
        cumplidas: 0,
        parciales: 0,
        noCumplidas: 0,
        justificadas: 10,
      });

      // Cuando calculo el CSP
      const resultado = await service.calcularCsp(filtros);

      // Entonces el denominador efectivo es 0 y se marca sinDatos=true
      expect(resultado.desglose.denominadorEfectivo).toBe(0);
      expect(resultado.porcentaje).toBeNull();
      expect(resultado.porcentajeTexto).toBe("Sin datos");
      expect(resultado.sinDatos).toBe(true);
      expect(resultado.mensajeSinDatos).toBe(MENSAJES_INDICADORES.SIN_DATOS);
    });

    it("CP-RF020-06: debe lanzar BadRequestException si la fechaFin es anterior a la fechaInicio", async () => {
      // Dado un rango de fechas con fin anterior a inicio
      const query: FiltroIndicadoresQueryDto = {
        fechaInicio: "2026-07-20",
        fechaFin: "2026-07-01",
      };

      // Cuando consulto con fechas incoherentes
      // Entonces debe rechazar con BadRequestException y el mensaje oficial
      await expect(service.obtenerTablero(query)).rejects.toThrow(BadRequestException);
      await expect(service.obtenerTablero(query)).rejects.toThrow(
        "La fecha de fin no puede ser anterior a la fecha de inicio.",
      );
    });

    it("CP-RF020-06: debe lanzar NotFoundException si el período académico especificado no existe", async () => {
      // Dado un ID de período que no existe en el sistema
      const query: FiltroIndicadoresQueryDto = {
        periodoId: "per-inexistente-uuid",
      };
      repo.obtenerPeriodoPorId.mockResolvedValue(null);

      // Cuando consulto con un período inexistente
      // Entonces debe lanzar NotFoundException
      await expect(service.obtenerTablero(query)).rejects.toThrow(NotFoundException);
      await expect(service.obtenerTablero(query)).rejects.toThrow(
        MENSAJES_INDICADORES.PERIODO_NO_ENCONTRADO,
      );
    });
  });

  // =========================================================================
  // CP-RF020-07: Docente ve solo lo suyo (alcance propio)
  // =========================================================================
  describe("CP-RF020-07: Docente ve solo lo suyo", () => {
    it("CP-RF020-07: debe retornar solo CSP e IGM del docente autenticado con el desglose de sus cursos y sin exponer ISA", async () => {
      // Dado que soy docente con alcance propio (Carlos Quispe) y abro Indicadores
      repo.obtenerDocentePorPersonaId.mockResolvedValue({
        id: DOCENTE_QUISPE_ID,
        nombres: "Carlos",
        apellidoPaterno: "Quispe",
        apellidoMaterno: "Mamani",
      });
      repo.obtenerPeriodoPorId.mockResolvedValue(periodoIiBimestreCerrado);
      repo.listarCursosDeDocente.mockResolvedValue(cursosDocenteQuispe);

      // Mock de sesiones: global y luego por curso
      repo.contarSesiones
        .mockResolvedValueOnce({
          planificadas: 80,
          cumplidas: 72,
          parciales: 4,
          noCumplidas: 2,
          justificadas: 2,
        }) // Global: (72 + 4) / (80 - 2) * 100 = 76 / 78 * 100 = 97.44 %
        .mockResolvedValueOnce({
          planificadas: 50,
          cumplidas: 46,
          parciales: 2,
          noCumplidas: 1,
          justificadas: 1,
        }) // Curso 1: (46 + 2) / (50 - 1) * 100 = 48 / 49 * 100 = 97.96 %
        .mockResolvedValueOnce({
          planificadas: 30,
          cumplidas: 26,
          parciales: 2,
          noCumplidas: 1,
          justificadas: 1,
        }); // Curso 2: (26 + 2) / (30 - 1) * 100 = 28 / 29 * 100 = 96.55 %

      // Mock de materiales: global y luego por curso
      repo.contarMateriales
        .mockResolvedValueOnce({
          planificados: 15,
          publicadosATiempo: 14,
          publicadosFueraDePlazo: 1,
          pendientes: 0,
          extras: 1,
        }) // Global: 14 / 15 * 100 = 93.33 %
        .mockResolvedValueOnce({
          planificados: 10,
          publicadosATiempo: 9,
          publicadosFueraDePlazo: 1,
          pendientes: 0,
          extras: 1,
        }) // Curso 1: 9 / 10 * 100 = 90.00 %
        .mockResolvedValueOnce({
          planificados: 5,
          publicadosATiempo: 5,
          publicadosFueraDePlazo: 0,
          pendientes: 0,
          extras: 0,
        }); // Curso 2: 5 / 5 * 100 = 100.00 %

      // Cuando abro mis indicadores para el II Bimestre
      const misIndicadores: MisIndicadoresDocenteResponseDto = await service.obtenerMisIndicadores(
        PERSONA_QUISPE_ID,
        PERIODO_II_BIMESTRE_ID,
      );

      // Entonces veo solo mi CSP y mi IGM y el detalle de mis cursos
      expect(misIndicadores.docenteId).toBe(DOCENTE_QUISPE_ID);
      expect(misIndicadores.docenteNombre).toContain("Quispe");
      expect(misIndicadores.periodoId).toBe(PERIODO_II_BIMESTRE_ID);
      expect(misIndicadores.periodoNombre).toBe("II Bimestre");
      expect(misIndicadores.enCurso).toBe(false);

      expect(misIndicadores.csp.porcentaje).toBe(97.44);
      expect(misIndicadores.igm.porcentaje).toBe(93.33);

      // Verifico que NO exponga la propiedad 'isa' (alcance propio)
      expect((misIndicadores as Record<string, unknown>).isa).toBeUndefined();

      // Verifico cursos asignados
      expect(misIndicadores.cursos).toHaveLength(2);
      expect(misIndicadores.cursos[0]?.cursoNombre).toBe("Matemática");
      expect(misIndicadores.cursos[0]?.csp.porcentaje).toBe(97.96);
      expect(misIndicadores.cursos[0]?.igm.porcentaje).toBe(90.0);

      expect(misIndicadores.cursos[1]?.cursoNombre).toBe("Geometría");
      expect(misIndicadores.cursos[1]?.csp.porcentaje).toBe(96.55);
      expect(misIndicadores.cursos[1]?.igm.porcentaje).toBe(100.0);
    });

    it("CP-RF020-07: debe lanzar ForbiddenException si la persona no cuenta con registro de docente activo", async () => {
      // Dado que la persona autenticada no tiene docente asociado
      repo.obtenerDocentePorPersonaId.mockResolvedValue(null);

      // Cuando intenta consultar mis-indicadores
      // Entonces debe rechazar con ForbiddenException
      await expect(
        service.obtenerMisIndicadores("persona-sin-docente-uuid", PERIODO_II_BIMESTRE_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it("CP-RF020-07: debe lanzar NotFoundException si se consulta mis-indicadores con un período que no existe", async () => {
      // Dado un docente existente pero un período inválido
      repo.obtenerDocentePorPersonaId.mockResolvedValue({
        id: DOCENTE_QUISPE_ID,
        nombres: "Carlos",
        apellidoPaterno: "Quispe",
        apellidoMaterno: "Mamani",
      });
      repo.obtenerPeriodoPorId.mockResolvedValue(null);

      // Cuando intenta consultar mis-indicadores con período inexistente
      // Entonces debe rechazar con NotFoundException
      await expect(
        service.obtenerMisIndicadores(PERSONA_QUISPE_ID, "periodo-invalido-uuid"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
