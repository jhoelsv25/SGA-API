import type { Database } from "@/core/database";
import { AuditService } from "@/common/services/audit.service";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import {
  ExportacionService,
  IndicadoresCalculoService,
  ComparacionService,
  MedicionService,
  type ExportarIndicadoresQueryDto,
  type TableroIndicadoresResponseDto,
  type ComparacionBimestreResponseDto,
  type MedicionBimestreResponseDto,
} from "@/features/indicadores";

describe("ExportacionService (RF-020: Exportación oficial a Excel y PDF)", () => {
  let service: ExportacionService;
  let calculoService: {
    obtenerTablero: jest.Mock;
  };
  let comparacionService: {
    obtenerComparacion: jest.Mock;
  };
  let medicionService: {
    obtenerPorPeriodo: jest.Mock;
  };
  let auditService: {
    log: jest.Mock;
  };
  let anioLectivoCls: {
    id: jest.Mock;
  };
  let dbMock: jest.Mocked<Partial<Database>>;

  const idAnioAcademicoMock = "anio-2026-uuid";
  const idPeriodoMock = "periodo-ii-bimestre-uuid";
  const idActorMock = "user-director-uuid";
  const ipClienteMock = "192.168.1.50";

  const tableroMock: TableroIndicadoresResponseDto = {
    periodoId: idPeriodoMock,
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

  const comparacionMock: ComparacionBimestreResponseDto = {
    periodoId: idPeriodoMock,
    periodoNombre: "II Bimestre",
    comparaciones: [
      {
        indicador: "CSP",
        nombre: "Cumplimiento de sesiones planificadas",
        dimension: "Prácticas pedagógicas",
        pretest: {
          registrado: true,
          porcentaje: 78.5,
          porcentajeTexto: "78.50 %",
          fuente: "Hojas físicas de firma de la subdirección",
          periodoDescrito: "I Bimestre 2026",
        },
        postest: {
          medido: true,
          porcentaje: 94.2,
          porcentajeTexto: "94.20 %",
          version: 1,
          cerradaEn: "2026-06-30T15:00:00.000Z",
        },
        variacionPuntos: 15.7,
        variacionPuntosTexto: "+15.70 pp",
      },
      {
        indicador: "ISA",
        nombre: "Informes de seguimiento académico",
        dimension: "Seguimiento académico",
        pretest: {
          registrado: true,
          porcentaje: 82.0,
          porcentajeTexto: "82.00 %",
          fuente: "Actas físicas de notas bimestrales",
          periodoDescrito: "I Bimestre 2026",
        },
        postest: {
          medido: true,
          porcentaje: 97.1,
          porcentajeTexto: "97.10 %",
          version: 1,
          cerradaEn: "2026-06-30T15:00:00.000Z",
        },
        variacionPuntos: 15.1,
        variacionPuntosTexto: "+15.10 pp",
      },
      {
        indicador: "IGM",
        nombre: "Gestión de materiales",
        dimension: "Aula virtual",
        pretest: {
          registrado: true,
          porcentaje: 70.0,
          porcentajeTexto: "70.00 %",
          fuente: "Registro de entregas USB a dirección",
          periodoDescrito: "I Bimestre 2026",
        },
        postest: {
          medido: true,
          porcentaje: 88.0,
          porcentajeTexto: "88.00 %",
          version: 1,
          cerradaEn: "2026-06-30T15:00:00.000Z",
        },
        variacionPuntos: 18.0,
        variacionPuntosTexto: "+18.00 pp",
      },
    ],
    evolucionBimestres: [
      {
        periodoId: "periodo-i-bimestre-uuid",
        periodoNombre: "I Bimestre",
        numero: 1,
        csp: 78.5,
        isa: 82.0,
        igm: 70.0,
      },
      {
        periodoId: idPeriodoMock,
        periodoNombre: "II Bimestre",
        numero: 2,
        csp: 94.2,
        isa: 97.1,
        igm: 88.0,
      },
    ],
  };

  const medicionMock: MedicionBimestreResponseDto = {
    id: "medicion-ii-bimestre-uuid",
    periodoId: idPeriodoMock,
    periodoNombre: "II Bimestre",
    version: 1,
    vigente: true,
    motivoCambio: null,
    cerradaPorId: idActorMock,
    cerradaPorNombre: "Director General",
    cerradaEn: "2026-06-30T15:00:00.000Z",
    indicadores: [
      {
        indicador: "CSP",
        numerador: 1140,
        denominador: 1180,
        porcentaje: 96.61,
        porcentajeTexto: "96.61 %",
        desglose: {
          planificadas: 1200,
          cumplidas: 1080,
          parciales: 60,
          noCumplidas: 40,
          justificadas: 20,
          denominadorEfectivo: 1180,
        },
      },
      {
        indicador: "ISA",
        numerador: 160,
        denominador: 168,
        porcentaje: 95.24,
        porcentajeTexto: "95.24 %",
        desglose: {
          programadas: 168,
          publicadasATiempo: 160,
          publicadasFueraDePlazo: 5,
          pendientes: 3,
          vistasPorFamilia: 142,
          porcentajeVistasFamilia: 84.52,
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

  beforeEach(() => {
    calculoService = {
      obtenerTablero: jest.fn().mockResolvedValue(tableroMock),
    };

    comparacionService = {
      obtenerComparacion: jest.fn().mockResolvedValue(comparacionMock),
    };

    medicionService = {
      obtenerPorPeriodo: jest.fn().mockResolvedValue(medicionMock),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    anioLectivoCls = {
      id: jest.fn().mockReturnValue(idAnioAcademicoMock),
    };

    dbMock = {
      query: {
        institucion: {
          findFirst: jest.fn().mockResolvedValue({
            id: "inst-uuid",
            nombre: "I.E. Simón Bolívar",
            codigoModular: "0345678",
            ugel: "UGEL 03",
            dre: "DRE Lima Metropolitana",
            direccion: "Av. La Marina 123",
          }),
        },
      },
    } as unknown as jest.Mocked<Partial<Database>>;

    service = new ExportacionService(
      calculoService as unknown as IndicadoresCalculoService,
      comparacionService as unknown as ComparacionService,
      medicionService as unknown as MedicionService,
      auditService as unknown as AuditService,
      anioLectivoCls as unknown as AnioLectivoCls,
      dbMock as unknown as Database,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("CP-RF020-18: Exportar a Excel (HU3)", () => {
    it("debe generar un libro de Excel con hojas de resumen y datos crudos detallados y registrar auditoría", async () => {
      // Dado que el usuario solicita exportar los indicadores del II Bimestre a Excel
      const query: ExportarIndicadoresQueryDto = {
        periodoId: idPeriodoMock,
      };

      // Cuando se ejecuta la exportación a Excel
      const resultado = await service.exportarExcel(query, idActorMock, "admin", ipClienteMock);

      // Entonces el resultado contiene un buffer binario y el nombre del archivo con extensión .xlsx
      expect(resultado).toBeDefined();
      expect(Buffer.isBuffer(resultado.buffer)).toBe(true);
      expect(resultado.buffer.length).toBeGreaterThan(0);
      expect(resultado.nombreArchivo).toMatch(/^reporte-indicadores-.*\.xlsx$/);

      // Y el servicio consulta los indicadores para estructurar las hojas
      expect(calculoService.obtenerTablero).toHaveBeenCalledWith({
        periodoId: idPeriodoMock,
      });

      // Y registra de forma obligatoria la auditoría de exportación
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: idActorMock,
          accion: "crear",
          tabla: "exportaciones_indicadores_excel",
          direccionIp: ipClienteMock,
        }),
      );
    });

    it("debe permitir filtrar por docente específico y generar las hojas correspondientes", async () => {
      // Dado que se exporta filtrando por un docente
      const idDocente = "doc-quispe-uuid";
      const query: ExportarIndicadoresQueryDto = {
        periodoId: idPeriodoMock,
        docenteId: idDocente,
      };

      // Cuando se genera el Excel
      const resultado = await service.exportarExcel(query, idActorMock, "admin", ipClienteMock);

      // Entonces el archivo se genera correctamente y se delega el filtro al servicio de cálculo
      expect(Buffer.isBuffer(resultado.buffer)).toBe(true);
      expect(calculoService.obtenerTablero).toHaveBeenCalledWith({
        periodoId: idPeriodoMock,
        docenteId: idDocente,
      });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          tabla: "exportaciones_indicadores_excel",
          usuarioId: idActorMock,
        }),
      );
    });

    it("debe permitir filtrar por un indicador individual (CSP) en la exportación a Excel", async () => {
      // Dado que se solicita exportar únicamente el indicador CSP
      const query: ExportarIndicadoresQueryDto = {
        periodoId: idPeriodoMock,
        indicador: "CSP",
      };

      // Cuando se procesa la solicitud
      const resultado = await service.exportarExcel(query, idActorMock, "admin", ipClienteMock);

      // Entonces el buffer es generado y auditado
      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(resultado.nombreArchivo).toContain(".xlsx");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          tabla: "exportaciones_indicadores_excel",
          usuarioId: idActorMock,
        }),
      );
    });

    it("debe auditar correctamente cuando no se proporciona dirección IP", async () => {
      // Dado que no se recibe IP del cliente
      const query: ExportarIndicadoresQueryDto = {
        periodoId: idPeriodoMock,
      };

      // Cuando se exporta sin IP
      await service.exportarExcel(query, idActorMock, "admin", undefined);

      // Entonces la auditoría se guarda con direccionIp undefined
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: idActorMock,
          accion: "crear",
          tabla: "exportaciones_indicadores_excel",
          direccionIp: undefined,
        }),
      );
    });
  });

  describe("CP-RF020-19: Exportar a PDF (HU3)", () => {
    it("debe generar un informe formal en PDF con membrete institucional, tablas de comparación y registrar auditoría", async () => {
      // Dado que el Director exporta el informe oficial en PDF del II Bimestre
      const query: ExportarIndicadoresQueryDto = {
        periodoId: idPeriodoMock,
      };
      const nombreActor = "Prof. Alberto Director";

      // Cuando se genera el documento PDF
      const resultado = await service.exportarPdf(query, idActorMock, nombreActor, ipClienteMock);

      // Entonces se obtiene un buffer con contenido y el nombre con extensión .pdf
      expect(resultado).toBeDefined();
      expect(Buffer.isBuffer(resultado.buffer)).toBe(true);
      expect(resultado.buffer.length).toBeGreaterThan(0);
      expect(resultado.nombreArchivo).toMatch(/^informe-indicadores-tesis-.*\.pdf$/);

      // Y se consultan la comparación pretest-postest y la medición congelada del período
      expect(comparacionService.obtenerComparacion).toHaveBeenCalledWith(idPeriodoMock);

      // Y se audita de forma obligatoria la exportación del PDF oficial
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: idActorMock,
          accion: "crear",
          tabla: "exportaciones_indicadores_pdf",
          direccionIp: ipClienteMock,
        }),
      );
    });

    it("debe generar el PDF adecuadamente incluso si no se provee IP", async () => {
      // Dado que se solicita PDF sin IP de cliente
      const query: ExportarIndicadoresQueryDto = {
        periodoId: idPeriodoMock,
      };

      // Cuando se genera el PDF
      const resultado = await service.exportarPdf(query, idActorMock, "Director", undefined);

      // Entonces se genera el buffer y la auditoría registra la ausencia de IP
      expect(Buffer.isBuffer(resultado.buffer)).toBe(true);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: idActorMock,
          accion: "crear",
          tabla: "exportaciones_indicadores_pdf",
          direccionIp: undefined,
        }),
      );
    });

    it("debe utilizar el año académico de AnioLectivoCls cuando no se pasa periodoId explícito", async () => {
      // Dado que la query no especifica periodoId
      const query: ExportarIndicadoresQueryDto = {};

      // Cuando se solicita la exportación a Excel
      await service.exportarExcel(query, idActorMock, "admin", ipClienteMock);

      // Entonces el servicio recurre a AnioLectivoCls para el contexto académico
      expect(anioLectivoCls.id).toHaveBeenCalled();
    });
  });
});
