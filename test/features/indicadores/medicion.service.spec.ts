import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import {
  IndicadoresCalculoService,
  MedicionRepository,
  MedicionService,
  MENSAJES_INDICADORES,
  type CerrarMedicionDto,
  type DesgloseCspDto,
  type DesgloseIgmDto,
  type DesgloseIsaDto,
  type HistorialMedicionResponseDto,
  type Indicador,
  type MedicionBimestreResponseDto,
  type MedicionFila,
  type MensajeIndicadoresResponseDto,
  type NuevaVersionMedicionDto,
  type TableroIndicadoresResponseDto,
} from "@/features/indicadores";

describe("RF-020: Servicio de Medición — MedicionService (CP-RF020-11 a CP-RF020-15)", () => {
  let service: MedicionService;

  let repo: {
    obtenerMedicionVigentePorPeriodo: jest.Mock;
    obtenerHistorialPorPeriodo: jest.Mock;
    guardarMedicionCongelada: jest.Mock;
    invalidarVersionVigente: jest.Mock;
    obtenerPeriodoPorId: jest.Mock;
  };

  let calculoService: {
    obtenerTablero: jest.Mock;
    obtenerPeriodoPorId: jest.Mock;
  };

  let auditService: {
    log: jest.Mock;
  };

  let anioLectivoCls: {
    id: jest.Mock;
  };

  const ACTOR_DIRECTOR_ID = "usr-director-uuid";
  const ACTOR_ADMIN_ID = "usr-admin-uuid";
  const ACTOR_SUBDIRECTOR_ID = "usr-subdirector-uuid";
  const ACTOR_DOCENTE_ID = "usr-docente-uuid";
  const IP_CLIENTE = "192.168.1.100";

  const PERIODO_II_BIMESTRE_ID = "periodo-ii-bimestre-uuid";
  const PERIODO_III_BIMESTRE_ID = "periodo-iii-bimestre-uuid";
  const MEDICION_V1_ID = "medicion-ii-bim-v1-uuid";
  const MEDICION_V2_ID = "medicion-ii-bim-v2-uuid";

  // Períodos de prueba
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

  // Desgloses canónicos de indicadores según el contrato (Sección 11)
  const desgloseCspCanonico: DesgloseCspDto = {
    planificadas: 1200,
    cumplidas: 1080,
    parciales: 50,
    noCumplidas: 70,
    justificadas: 0,
    denominadorEfectivo: 1200,
  };

  const desgloseIsaCanonico: DesgloseIsaDto = {
    programadas: 168,
    publicadasATiempo: 163,
    publicadasFueraDePlazo: 3,
    pendientes: 2,
    vistasPorFamilia: 145,
    porcentajeVistasFamilia: 86.31,
  };

  const desgloseIgmCanonico: DesgloseIgmDto = {
    planificados: 250,
    publicadosATiempo: 220,
    publicadosFueraDePlazo: 20,
    pendientes: 10,
    extras: 30,
  };

  // Tablero canónico calculado en el momento del cierre de medición
  const tableroCalculadoCierreMock: TableroIndicadoresResponseDto = {
    periodoId: PERIODO_II_BIMESTRE_ID,
    periodoNombre: "II Bimestre",
    enCurso: false,
    csp: {
      indicador: "CSP",
      nombre: "Cumplimiento de sesiones planificadas",
      dimension: "Prácticas pedagógicas",
      formula: "(cumplidas + parciales) ÷ (planificadas − justificadas) × 100",
      numerador: 1130,
      denominador: 1200,
      porcentaje: 94.2,
      porcentajeTexto: "94.20 %",
      enCurso: false,
      sinDatos: false,
      desglose: desgloseCspCanonico,
    },
    isa: {
      indicador: "ISA",
      nombre: "Informes de seguimiento académico",
      dimension: "Seguimiento académico",
      formula: "libretas publicadas a tiempo ÷ libretas programadas × 100",
      numerador: 163,
      denominador: 168,
      porcentaje: 97.1,
      porcentajeTexto: "97.10 %",
      enCurso: false,
      sinDatos: false,
      desglose: desgloseIsaCanonico,
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
      desglose: desgloseIgmCanonico,
    },
  };

  // Fila de medición versión 1 congelada en base de datos
  const medicionV1FilaCanonica: MedicionFila = {
    id: MEDICION_V1_ID,
    periodoId: PERIODO_II_BIMESTRE_ID,
    periodoNombre: "II Bimestre",
    version: 1,
    vigente: true,
    motivoCambio: null,
    cerradaPorId: ACTOR_DIRECTOR_ID,
    cerradaPorNombre: "Director General",
    cerradaEn: "2026-07-25T18:00:00.000Z",
    indicadores: [
      {
        indicador: "CSP",
        numerador: 1130,
        denominador: 1200,
        porcentaje: 94.2,
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

  // Fila de medición versión 2 con recálculo por justificaciones aprobadas tarde
  const medicionV2FilaCanonica: MedicionFila = {
    id: MEDICION_V2_ID,
    periodoId: PERIODO_II_BIMESTRE_ID,
    periodoNombre: "II Bimestre",
    version: 2,
    vigente: true,
    motivoCambio: "Justificaciones aprobadas tarde",
    cerradaPorId: ACTOR_DIRECTOR_ID,
    cerradaPorNombre: "Director General",
    cerradaEn: "2026-07-28T10:00:00.000Z",
    indicadores: [
      {
        indicador: "CSP",
        numerador: 1140,
        denominador: 1200,
        porcentaje: 95.0,
        desglose: {
          planificadas: 1200,
          cumplidas: 1080,
          parciales: 60,
          noCumplidas: 50,
          justificadas: 10,
          denominadorEfectivo: 1190,
        },
      },
      {
        indicador: "ISA",
        numerador: 163,
        denominador: 168,
        porcentaje: 97.1,
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
    repo = {
      obtenerMedicionVigentePorPeriodo: jest.fn().mockResolvedValue(null),
      obtenerHistorialPorPeriodo: jest.fn().mockResolvedValue([medicionV1FilaCanonica]),
      guardarMedicionCongelada: jest.fn().mockResolvedValue(medicionV1FilaCanonica),
      invalidarVersionVigente: jest.fn().mockResolvedValue(undefined),
      obtenerPeriodoPorId: jest.fn().mockResolvedValue(periodoIiBimestreCerrado),
    };

    calculoService = {
      obtenerTablero: jest.fn().mockResolvedValue(tableroCalculadoCierreMock),
      obtenerPeriodoPorId: jest.fn().mockResolvedValue(periodoIiBimestreCerrado),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    anioLectivoCls = {
      id: jest.fn().mockReturnValue("anio-2026-uuid"),
    };

    service = new MedicionService(
      repo as unknown as MedicionRepository,
      calculoService as unknown as IndicadoresCalculoService,
      auditService as unknown as AuditService,
      anioLectivoCls as unknown as AnioLectivoCls,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // CP-RF020-11: Cerrar la medición del bimestre
  // =========================================================================
  describe("CP-RF020-11: Cerrar la medición del bimestre", () => {
    it("CP-RF020-11: debe calcular y congelar los 3 indicadores con desglose, versión 1, mensaje oficial y auditoría", async () => {
      // Dado que el II Bimestre está cerrado y no tiene medición previa
      repo.obtenerMedicionVigentePorPeriodo.mockResolvedValue(null);
      const dto: CerrarMedicionDto = {
        periodoId: PERIODO_II_BIMESTRE_ID,
      };

      // Cuando presiono 'Cerrar medición' como Director
      const respuesta: MensajeIndicadoresResponseDto & { medicion: MedicionBimestreResponseDto } =
        await service.cerrar(dto, ACTOR_DIRECTOR_ID, "Director", IP_CLIENTE);

      // Entonces el sistema calcula y congela los tres indicadores como postest, con su desglose
      expect(respuesta.mensaje).toBe(
        MENSAJES_INDICADORES.MEDICION_CERRADA("II Bimestre", 94.2, 97.1, 88.0),
      );
      expect(respuesta.mensaje).toBe(
        "Medición del II Bimestre cerrada: CSP 94.20 %, ISA 97.10 %, IGM 88.00 %.",
      );
      expect(respuesta.medicion.periodoId).toBe(PERIODO_II_BIMESTRE_ID);
      expect(respuesta.medicion.periodoNombre).toBe("II Bimestre");
      expect(respuesta.medicion.version).toBe(1);
      expect(respuesta.medicion.vigente).toBe(true);
      expect(respuesta.medicion.motivoCambio).toBeNull();
      expect(respuesta.medicion.indicadores).toHaveLength(3);

      // CSP congelado
      const csp = respuesta.medicion.indicadores.find(
        (item: { indicador: Indicador }) => item.indicador === "CSP",
      );
      expect(csp?.porcentaje).toBe(94.2);
      expect(csp?.porcentajeTexto).toBe("94.20 %");
      expect(csp?.numerador).toBe(1130);
      expect(csp?.denominador).toBe(1200);

      // ISA congelado
      const isa = respuesta.medicion.indicadores.find(
        (item: { indicador: Indicador }) => item.indicador === "ISA",
      );
      expect(isa?.porcentaje).toBe(97.1);
      expect(isa?.porcentajeTexto).toBe("97.10 %");
      expect(isa?.numerador).toBe(163);
      expect(isa?.denominador).toBe(168);

      // IGM congelado
      const igm = respuesta.medicion.indicadores.find(
        (item: { indicador: Indicador }) => item.indicador === "IGM",
      );
      expect(igm?.porcentaje).toBe(88.0);
      expect(igm?.porcentajeTexto).toBe("88.00 %");
      expect(igm?.numerador).toBe(220);
      expect(igm?.denominador).toBe(250);

      // Y persiste la medición congelada en la base de datos
      expect(repo.guardarMedicionCongelada).toHaveBeenCalledWith({
        periodoId: PERIODO_II_BIMESTRE_ID,
        version: 1,
        motivoCambio: null,
        cerradaPorId: ACTOR_DIRECTOR_ID,
        indicadores: expect.arrayContaining([
          expect.objectContaining({ indicador: "CSP", porcentaje: 94.2 }),
          expect.objectContaining({ indicador: "ISA", porcentaje: 97.1 }),
          expect.objectContaining({ indicador: "IGM", porcentaje: 88.0 }),
        ]) as unknown,
      });

      // Y registra auditoría inmutable
      expect(auditService.log).toHaveBeenCalledWith({
        usuarioId: ACTOR_DIRECTOR_ID,
        accion: "crear",
        tabla: "mediciones_bimestre",
        registroId: MEDICION_V1_ID,
        direccionIp: IP_CLIENTE,
      });
    });

    it("CP-RF020-11: debe permitir cerrar la medición si el actor tiene rol admin", async () => {
      // Dado un período cerrado
      const dto: CerrarMedicionDto = { periodoId: PERIODO_II_BIMESTRE_ID };

      // Cuando se ejecuta como admin
      const respuesta = await service.cerrar(dto, ACTOR_ADMIN_ID, "admin", IP_CLIENTE);

      // Entonces se cierra exitosamente
      expect(respuesta.medicion.version).toBe(1);
      expect(auditService.log).toHaveBeenCalledTimes(1);
    });

    it("CP-RF020-11: debe rechazar con 403 Forbidden si el rol es Subdirector", async () => {
      // Dado un período cerrado
      const dto: CerrarMedicionDto = { periodoId: PERIODO_II_BIMESTRE_ID };

      // Cuando un Subdirector intenta cerrar la medición
      const accion = service.cerrar(dto, ACTOR_SUBDIRECTOR_ID, "Subdirector", IP_CLIENTE);

      // Entonces lanza ForbiddenException con el mensaje oficial
      await expect(accion).rejects.toThrow(ForbiddenException);
      await expect(accion).rejects.toThrow(MENSAJES_INDICADORES.ROL_NO_AUTORIZADO);
      expect(repo.guardarMedicionCongelada).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it("CP-RF020-11: debe rechazar con 403 Forbidden si el rol es Docente", async () => {
      // Dado un período cerrado
      const dto: CerrarMedicionDto = { periodoId: PERIODO_II_BIMESTRE_ID };

      // Cuando un Docente intenta cerrar la medición
      const accion = service.cerrar(dto, ACTOR_DOCENTE_ID, "Docente", IP_CLIENTE);

      // Entonces lanza ForbiddenException
      await expect(accion).rejects.toThrow(ForbiddenException);
      await expect(accion).rejects.toThrow(MENSAJES_INDICADORES.ROL_NO_AUTORIZADO);
      expect(repo.guardarMedicionCongelada).not.toHaveBeenCalled();
    });

    it("CP-RF020-11: debe rechazar con 409 Conflict si el bimestre ya tiene una medición cerrada vigente", async () => {
      // Dado que el II Bimestre ya tiene una medición vigente cerrada
      repo.obtenerMedicionVigentePorPeriodo.mockResolvedValue(medicionV1FilaCanonica);
      const dto: CerrarMedicionDto = { periodoId: PERIODO_II_BIMESTRE_ID };

      // Cuando intento cerrar nuevamente la medición de ese bimestre
      const accion = service.cerrar(dto, ACTOR_DIRECTOR_ID, "Director", IP_CLIENTE);

      // Entonces el sistema bloquea con ConflictException y el mensaje oficial
      await expect(accion).rejects.toThrow(ConflictException);
      await expect(accion).rejects.toThrow(MENSAJES_INDICADORES.MEDICION_YA_CERRADA);
      await expect(accion).rejects.toThrow(
        "Este bimestre ya tiene una medición cerrada. Genere una nueva versión indicando el motivo.",
      );
      expect(repo.guardarMedicionCongelada).not.toHaveBeenCalled();
    });

    it("CP-RF020-11: debe rechazar con 404 Not Found si el período no existe en la base de datos", async () => {
      // Dado un periodoId inexistente
      repo.obtenerPeriodoPorId.mockResolvedValue(null);
      calculoService.obtenerPeriodoPorId.mockResolvedValue(null);
      const dto: CerrarMedicionDto = { periodoId: "periodo-inexistente-uuid" };

      // Cuando intento cerrar medición
      const accion = service.cerrar(dto, ACTOR_DIRECTOR_ID, "Director", IP_CLIENTE);

      // Entonces lanza NotFoundException
      await expect(accion).rejects.toThrow(NotFoundException);
      await expect(accion).rejects.toThrow(MENSAJES_INDICADORES.PERIODO_NO_ENCONTRADO);
      expect(repo.guardarMedicionCongelada).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // CP-RF020-12: Cerrar la medición con el bimestre abierto
  // =========================================================================
  describe("CP-RF020-12: Cerrar la medición con el bimestre abierto", () => {
    it("CP-RF020-12: debe bloquear la acción y lanzar 400 Bad Request cuando el período está en curso", async () => {
      // Dado que el III Bimestre está en curso
      repo.obtenerPeriodoPorId.mockResolvedValue(periodoIiiBimestreEnCurso);
      calculoService.obtenerPeriodoPorId.mockResolvedValue(periodoIiiBimestreEnCurso);
      const dto: CerrarMedicionDto = { periodoId: PERIODO_III_BIMESTRE_ID };

      // Cuando intento cerrar su medición
      const accion = service.cerrar(dto, ACTOR_DIRECTOR_ID, "Director", IP_CLIENTE);

      // Entonces el sistema bloquea la acción y muestra el mensaje oficial exacto
      await expect(accion).rejects.toThrow(BadRequestException);
      await expect(accion).rejects.toThrow(MENSAJES_INDICADORES.BIMESTRE_ABIERTO);
      await expect(accion).rejects.toThrow(
        "Solo se puede cerrar la medición de un bimestre cerrado.",
      );

      expect(repo.guardarMedicionCongelada).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it("CP-RF020-12: debe bloquear la acción si el período está en estado planificado", async () => {
      // Dado un período en estado planificado
      const periodoPlanificado = {
        id: "periodo-iv-bim-uuid",
        nombre: "IV Bimestre",
        estado: "planificado",
        fechaInicio: "2026-10-19",
        fechaFin: "2026-12-18",
      };
      repo.obtenerPeriodoPorId.mockResolvedValue(periodoPlanificado);
      calculoService.obtenerPeriodoPorId.mockResolvedValue(periodoPlanificado);
      const dto: CerrarMedicionDto = { periodoId: "periodo-iv-bim-uuid" };

      // Cuando intento cerrar medición
      const accion = service.cerrar(dto, ACTOR_DIRECTOR_ID, "Director", IP_CLIENTE);

      // Entonces bloquea con BadRequestException
      await expect(accion).rejects.toThrow(BadRequestException);
      await expect(accion).rejects.toThrow(MENSAJES_INDICADORES.BIMESTRE_ABIERTO);
      expect(repo.guardarMedicionCongelada).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // CP-RF020-13: El valor congelado no cambia
  // =========================================================================
  describe("CP-RF020-13: El valor congelado no cambia", () => {
    it("CP-RF020-13: debe devolver los valores congelados guardados inmutables tras cambios en datos dinámicos", async () => {
      // Dado que la medición del II Bimestre está cerrada con CSP 94.20 %
      repo.obtenerMedicionVigentePorPeriodo.mockResolvedValue(medicionV1FilaCanonica);

      // Cuando luego se aprueba una justificación de una sesión de ese bimestre
      // y se consulta la medición congelada del período
      const resultado: MedicionBimestreResponseDto | null =
        await service.obtenerPorPeriodo(PERIODO_II_BIMESTRE_ID);

      // Entonces el postest congelado sigue entregando exactamente 94.20 % sin recalcular
      expect(resultado).not.toBeNull();
      expect(resultado?.periodoId).toBe(PERIODO_II_BIMESTRE_ID);
      expect(resultado?.version).toBe(1);
      expect(resultado?.vigente).toBe(true);

      const cspCongelado = resultado?.indicadores.find(
        (item: { indicador: Indicador }) => item.indicador === "CSP",
      );
      expect(cspCongelado?.porcentaje).toBe(94.2);
      expect(cspCongelado?.porcentajeTexto).toBe("94.20 %");
      expect(cspCongelado?.numerador).toBe(1130);
      expect(cspCongelado?.denominador).toBe(1200);

      // Y no se ejecutó el recálculo dinámico en el cálculo service para la consulta congelada
      expect(calculoService.obtenerTablero).not.toHaveBeenCalled();
      expect(repo.obtenerMedicionVigentePorPeriodo).toHaveBeenCalledWith(PERIODO_II_BIMESTRE_ID);
    });

    it("CP-RF020-13: debe retornar null si no existe medición cerrada para el período", async () => {
      // Dado que no hay medición para el período
      repo.obtenerMedicionVigentePorPeriodo.mockResolvedValue(null);

      // Cuando consulto la medición
      const resultado = await service.obtenerPorPeriodo("periodo-sin-medicion-uuid");

      // Entonces retorna null
      expect(resultado).toBeNull();
      expect(repo.obtenerMedicionVigentePorPeriodo).toHaveBeenCalledWith(
        "periodo-sin-medicion-uuid",
      );
    });
  });

  // =========================================================================
  // CP-RF020-14: Nueva versión de la medición
  // =========================================================================
  describe("CP-RF020-14: Nueva versión de la medición", () => {
    it("CP-RF020-14: debe recalcular, crear la versión 2 vigente y dejar la versión 1 con vigencia 0 con motivo obligatorio", async () => {
      // Dado que la medición del II Bimestre ya está cerrada (versión 1)
      repo.obtenerMedicionVigentePorPeriodo.mockResolvedValue(medicionV1FilaCanonica);
      repo.guardarMedicionCongelada.mockResolvedValue(medicionV2FilaCanonica);

      // Y el recálculo dinámico arroja CSP 95.00 % por justificaciones aprobadas tarde
      const tableroRecalculado: TableroIndicadoresResponseDto = {
        ...tableroCalculadoCierreMock,
        csp: {
          ...tableroCalculadoCierreMock.csp,
          numerador: 1140,
          denominador: 1200,
          porcentaje: 95.0,
          porcentajeTexto: "95.00 %",
          desglose: {
            ...desgloseCspCanonico,
            cumplidas: 1080,
            parciales: 60,
            noCumplidas: 50,
            justificadas: 10,
            denominadorEfectivo: 1190,
          },
        },
      };
      calculoService.obtenerTablero.mockResolvedValue(tableroRecalculado);

      const dto: NuevaVersionMedicionDto = {
        motivoCambio: "Justificaciones aprobadas tarde",
      };

      // Cuando genero una nueva versión con el motivo 'Justificaciones aprobadas tarde' como Director
      const respuesta: MensajeIndicadoresResponseDto & { medicion: MedicionBimestreResponseDto } =
        await service.crearNuevaVersion(
          MEDICION_V1_ID,
          dto,
          ACTOR_DIRECTOR_ID,
          "Director",
          IP_CLIENTE,
        );

      // Entonces el sistema recalcula, crea la versión 2 vigente
      expect(respuesta.medicion.version).toBe(2);
      expect(respuesta.medicion.vigente).toBe(true);
      expect(respuesta.medicion.motivoCambio).toBe("Justificaciones aprobadas tarde");

      const cspV2 = respuesta.medicion.indicadores.find(
        (item: { indicador: Indicador }) => item.indicador === "CSP",
      );
      expect(cspV2?.porcentaje).toBe(95.0);
      expect(cspV2?.porcentajeTexto).toBe("95.00 %");

      // Y deja la versión 1 anterior invalidada con vigencia 0 (false)
      expect(repo.invalidarVersionVigente).toHaveBeenCalledWith(PERIODO_II_BIMESTRE_ID);

      // Y persiste la versión 2 congelada con su motivo
      expect(repo.guardarMedicionCongelada).toHaveBeenCalledWith({
        periodoId: PERIODO_II_BIMESTRE_ID,
        version: 2,
        motivoCambio: "Justificaciones aprobadas tarde",
        cerradaPorId: ACTOR_DIRECTOR_ID,
        indicadores: expect.arrayContaining([
          expect.objectContaining({ indicador: "CSP", porcentaje: 95.0 }),
          expect.objectContaining({ indicador: "ISA", porcentaje: 97.1 }),
          expect.objectContaining({ indicador: "IGM", porcentaje: 88.0 }),
        ]) as unknown,
      });

      // Y audita la creación de la nueva versión
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: ACTOR_DIRECTOR_ID,
          accion: "crear",
          tabla: "mediciones_bimestre",
          registroId: MEDICION_V2_ID,
        }),
      );
    });

    it("CP-RF020-14: debe permitir crear nueva versión si el actor tiene rol admin", async () => {
      // Dado que existe medición versión 1 previa
      repo.obtenerMedicionVigentePorPeriodo.mockResolvedValue(medicionV1FilaCanonica);
      repo.guardarMedicionCongelada.mockResolvedValue(medicionV2FilaCanonica);
      const dto: NuevaVersionMedicionDto = { motivoCambio: "Revisión técnica de libretas" };

      // Cuando se ejecuta como admin
      const respuesta = await service.crearNuevaVersion(
        MEDICION_V1_ID,
        dto,
        ACTOR_ADMIN_ID,
        "admin",
        IP_CLIENTE,
      );

      // Entonces se crea exitosamente
      expect(respuesta.medicion.version).toBe(2);
      expect(auditService.log).toHaveBeenCalledTimes(1);
    });

    it("CP-RF020-14: debe rechazar con 403 Forbidden si el rol es Subdirector", async () => {
      // Dado un DTO válido de nueva versión
      const dto: NuevaVersionMedicionDto = { motivoCambio: "Justificaciones aprobadas tarde" };

      // Cuando un Subdirector intenta generar nueva versión
      const accion = service.crearNuevaVersion(
        MEDICION_V1_ID,
        dto,
        ACTOR_SUBDIRECTOR_ID,
        "Subdirector",
        IP_CLIENTE,
      );

      // Entonces lanza ForbiddenException
      await expect(accion).rejects.toThrow(ForbiddenException);
      await expect(accion).rejects.toThrow(MENSAJES_INDICADORES.ROL_NO_AUTORIZADO);
      expect(repo.guardarMedicionCongelada).not.toHaveBeenCalled();
    });

    it("CP-RF020-14: debe rechazar con 403 Forbidden si el rol es Docente", async () => {
      // Dado un DTO de nueva versión
      const dto: NuevaVersionMedicionDto = { motivoCambio: "Corrección docente" };

      // Cuando un Docente intenta generar nueva versión
      const accion = service.crearNuevaVersion(
        MEDICION_V1_ID,
        dto,
        ACTOR_DOCENTE_ID,
        "Docente",
        IP_CLIENTE,
      );

      // Entonces lanza ForbiddenException
      await expect(accion).rejects.toThrow(ForbiddenException);
      await expect(accion).rejects.toThrow(MENSAJES_INDICADORES.ROL_NO_AUTORIZADO);
    });

    it("CP-RF020-14: debe rechazar con 404 Not Found si la medición base no existe", async () => {
      // Dado que no se encuentra medición previa
      repo.obtenerMedicionVigentePorPeriodo.mockResolvedValue(null);
      const dto: NuevaVersionMedicionDto = { motivoCambio: "Justificaciones aprobadas tarde" };

      // Cuando intento crear nueva versión de id inexistente
      const accion = service.crearNuevaVersion(
        "medicion-inexistente-uuid",
        dto,
        ACTOR_DIRECTOR_ID,
        "Director",
        IP_CLIENTE,
      );

      // Entonces lanza NotFoundException
      await expect(accion).rejects.toThrow(NotFoundException);
      await expect(accion).rejects.toThrow(MENSAJES_INDICADORES.MEDICION_NO_ENCONTRADA);
      expect(repo.guardarMedicionCongelada).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // CP-RF020-15: Nueva versión sin motivo
  // =========================================================================
  describe("CP-RF020-15: Nueva versión sin motivo", () => {
    it("CP-RF020-15: debe impedir la acción y lanzar 400 Bad Request cuando el motivo es una cadena vacía", async () => {
      // Dado que estoy generando una nueva versión y confirmo sin motivo
      const dto: NuevaVersionMedicionDto = {
        motivoCambio: "",
      };

      // Cuando confirmo sin motivo
      const accion = service.crearNuevaVersion(
        MEDICION_V1_ID,
        dto,
        ACTOR_DIRECTOR_ID,
        "Director",
        IP_CLIENTE,
      );

      // Entonces el sistema impide la acción y muestra el mensaje oficial exacto
      await expect(accion).rejects.toThrow(BadRequestException);
      await expect(accion).rejects.toThrow(MENSAJES_INDICADORES.NUEVA_VERSION_SIN_MOTIVO);
      await expect(accion).rejects.toThrow("Indique el motivo de la nueva versión.");

      expect(repo.guardarMedicionCongelada).not.toHaveBeenCalled();
      expect(repo.invalidarVersionVigente).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it("CP-RF020-15: debe impedir la acción cuando el motivo contiene únicamente espacios en blanco", async () => {
      // Dado un motivo con puros espacios
      const dto: NuevaVersionMedicionDto = {
        motivoCambio: "     ",
      };

      // Cuando intento confirmar la nueva versión
      const accion = service.crearNuevaVersion(
        MEDICION_V1_ID,
        dto,
        ACTOR_DIRECTOR_ID,
        "Director",
        IP_CLIENTE,
      );

      // Entonces lanza BadRequestException
      await expect(accion).rejects.toThrow(BadRequestException);
      await expect(accion).rejects.toThrow(MENSAJES_INDICADORES.NUEVA_VERSION_SIN_MOTIVO);
      expect(repo.guardarMedicionCongelada).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Historial de Versiones de la Medición (obtenerHistorial)
  // =========================================================================
  describe("Consultar historial de versiones de medición", () => {
    it("debe retornar el historial con todas las versiones del período ordenadas", async () => {
      // Dado que existen versión 1 (vigente=false) y versión 2 (vigente=true)
      const medicionV1NoVigente: MedicionFila = {
        ...medicionV1FilaCanonica,
        vigente: false,
      };
      repo.obtenerHistorialPorPeriodo.mockResolvedValue([
        medicionV1NoVigente,
        medicionV2FilaCanonica,
      ]);

      // Cuando consulto el historial de mediciones del período
      const historial: HistorialMedicionResponseDto =
        await service.obtenerHistorial(PERIODO_II_BIMESTRE_ID);

      // Entonces retorna ambas versiones
      expect(historial.periodoId).toBe(PERIODO_II_BIMESTRE_ID);
      expect(historial.periodoNombre).toBe("II Bimestre");
      expect(historial.versiones).toHaveLength(2);
      expect(historial.versiones[0].version).toBe(1);
      expect(historial.versiones[0].vigente).toBe(false);
      expect(historial.versiones[1].version).toBe(2);
      expect(historial.versiones[1].vigente).toBe(true);
      expect(historial.versiones[1].motivoCambio).toBe("Justificaciones aprobadas tarde");
      expect(repo.obtenerHistorialPorPeriodo).toHaveBeenCalledWith(PERIODO_II_BIMESTRE_ID);
    });

    it("debe lanzar 404 Not Found si no existen versiones para el período consultado", async () => {
      // Dado que el historial está vacío
      repo.obtenerHistorialPorPeriodo.mockResolvedValue([]);

      // Cuando consulto el historial
      const accion = service.obtenerHistorial("periodo-sin-historial-uuid");

      // Entonces lanza NotFoundException
      await expect(accion).rejects.toThrow(NotFoundException);
      await expect(accion).rejects.toThrow(MENSAJES_INDICADORES.MEDICION_NO_ENCONTRADA);
    });
  });
});
