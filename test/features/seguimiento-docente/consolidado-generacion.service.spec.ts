import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import {
  ConsolidadoBloqueoService,
  ISeguimientoDocenteRepository,
  MENSAJES_CONSOLIDADO,
  SeguimientoDocenteRepository,
  SeguimientoDocenteService,
  SeguimientoExportacionService,
  SolicitudesRevisionService,
  type ConsolidadoFila,
  type DocenteParaConsolidado,
  type MetricasCalculadasDocente,
  type PeriodoParaConsolidado,
  type RegistrarDecisionDto,
} from "@/features/seguimiento-docente";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

describe("RF-013: Generación del consolidado y decisión directiva (HU1)", () => {
  let service: SeguimientoDocenteService;
  let repo: Mocks<ISeguimientoDocenteRepository>;
  let bloqueoService: Mocks<ConsolidadoBloqueoService>;
  let solicitudesService: Mocks<SolicitudesRevisionService>;
  let exportacionService: Mocks<SeguimientoExportacionService>;
  let notificaciones: Mocks<NotificacionesService>;
  let audit: Mocks<AuditService>;
  let anioCls: Mocks<AnioLectivoCls>;

  const periodoBimestre2Cerrado: PeriodoParaConsolidado = {
    id: "periodo-bimestre-2-uuid",
    nombre: "II Bimestre",
    numero: 2,
    estado: "cerrado",
    fechaInicio: "2027-05-01",
    fechaFin: "2027-07-15",
  };

  const docenteQuispe: DocenteParaConsolidado = {
    id: "docente-quispe-uuid",
    personaId: "persona-quispe-uuid",
    usuarioId: "usuario-quispe-uuid",
    nombres: "Juan",
    apellidoPaterno: "Quispe",
    apellidoMaterno: "Mamani",
    nombreCompleto: "Quispe Mamani, Juan",
    numeroDocumento: "10203040",
    firmaUrl: "/firmas/docente-quispe.png",
  };

  const metricasQuispeCanonico: MetricasCalculadasDocente = {
    docenteId: "docente-quispe-uuid",
    sesionesProgramadas: 24,
    sesionesCumplidas: 20,
    sesionesParciales: 2,
    sesionesNoCumplidas: 2,
    sesionesJustificadas: 0,
    minutosPerdidosFirma: 40,
    totalAusencias: 3,
    minutosFueraAula: 60,
    totalMinutosFueraClase: 100,
  };

  const consolidadoQuispeFila: ConsolidadoFila = {
    id: "cons-quispe-uuid",
    docenteId: "docente-quispe-uuid",
    periodoId: "periodo-bimestre-2-uuid",
    consolidadoRaizId: null,
    estado: "cerrado",
    version: 1,
    vigente: true,
    motivoCambio: null,
    sesionesProgramadas: 24,
    sesionesCumplidas: 20,
    sesionesParciales: 2,
    sesionesNoCumplidas: 2,
    sesionesJustificadas: 0,
    minutosPerdidosFirma: 40,
    totalAusencias: 3,
    minutosFueraAula: 60,
    decision: "ninguna",
    observacion: null,
    generadoPorId: "user-director-uuid",
    generadoEn: "2027-07-16T10:00:00.000Z",
    enviadoEn: null,
    reabiertoPorId: null,
    reabiertoEn: null,
  };

  function crear24Docentes(): DocenteParaConsolidado[] {
    return Array.from({ length: 24 }, (_, i) => {
      const num = i + 1;
      return {
        id: `docente-${num}-uuid`,
        personaId: `persona-${num}-uuid`,
        usuarioId: `usuario-${num}-uuid`,
        nombres: `Docente ${num}`,
        apellidoPaterno: `Paterno${num}`,
        apellidoMaterno: `Materno${num}`,
        nombreCompleto: `Paterno${num} Materno${num}, Docente ${num}`,
        numeroDocumento: `700000${num < 10 ? "0" + num : num}`,
        firmaUrl: `/firmas/docente-${num}.png`,
      };
    });
  }

  beforeEach(() => {
    repo = {
      buscarPeriodoPorId: jest.fn().mockResolvedValue(periodoBimestre2Cerrado),
      buscarDocentesConSesionesEnPeriodo: jest.fn().mockResolvedValue([docenteQuispe]),
      buscarConsolidadoVigente: jest.fn().mockResolvedValue(null),
      buscarConsolidadoPorId: jest.fn().mockResolvedValue(consolidadoQuispeFila),
      buscarConsolidadoConDetalle: jest.fn().mockResolvedValue({
        consolidado: consolidadoQuispeFila,
        docente: docenteQuispe,
        periodo: periodoBimestre2Cerrado,
        generadoPorNombre: "Director Escolar",
        reabiertoPorNombre: null,
        sesiones: [],
      }),
      buscarHistorialVersiones: jest.fn().mockResolvedValue([]),
      calcularMetricasDocente: jest.fn().mockResolvedValue(metricasQuispeCanonico),
      crearConsolidado: jest
        .fn()
        .mockImplementation(
          (datos: {
            docenteId: string;
            periodoId: string;
            generadoPorId: string;
            metricas: MetricasCalculadasDocente;
          }) =>
            Promise.resolve({
              ...consolidadoQuispeFila,
              id: `cons-${datos.docenteId}-uuid`,
              docenteId: datos.docenteId,
              periodoId: datos.periodoId,
              generadoPorId: datos.generadoPorId,
              ...datos.metricas,
            }),
        ),
      actualizarDecision: jest
        .fn()
        .mockImplementation(
          (
            id: string,
            decision: "ninguna" | "llamada_atencion" | "compromiso_mejora" | "derivado",
            observacion?: string | null,
          ) =>
            Promise.resolve({
              ...consolidadoQuispeFila,
              id,
              decision,
              observacion: observacion ?? null,
            }),
        ),
      reabrirConsolidado: jest.fn().mockResolvedValue(consolidadoQuispeFila),
      crearNuevaVersion: jest.fn().mockResolvedValue(consolidadoQuispeFila),
      docentePorPersonaId: jest.fn().mockResolvedValue(docenteQuispe),
      docentePorId: jest.fn().mockResolvedValue(docenteQuispe),
      usuarioPorPersonaId: jest.fn().mockResolvedValue({ id: "usuario-quispe-uuid" }),
      crearSolicitud: jest.fn(),
      buscarSolicitudPorId: jest.fn().mockResolvedValue(null),
      buscarSolicitudAbierta: jest.fn().mockResolvedValue(null),
      listarSolicitudes: jest.fn().mockResolvedValue([]),
      resolverSolicitud: jest.fn(),
    };

    bloqueoService = {
      asegurarNoCerrado: jest.fn().mockResolvedValue(undefined),
      asegurarNoCerradoPorFecha: jest.fn().mockResolvedValue(undefined),
    };

    solicitudesService = {
      crear: jest.fn(),
      listar: jest.fn().mockResolvedValue([]),
      aceptar: jest.fn(),
      rechazar: jest.fn(),
    };

    exportacionService = {
      generarFichaPdf: jest.fn(),
      exportarReporteExcel: jest.fn(),
    };

    notificaciones = {
      enviar: jest.fn().mockResolvedValue(undefined),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    anioCls = {
      id: jest.fn().mockReturnValue("anio-2027-uuid"),
    };

    service = new SeguimientoDocenteService(
      repo as unknown as SeguimientoDocenteRepository,
      bloqueoService as unknown as ConsolidadoBloqueoService,
      solicitudesService as unknown as SolicitudesRevisionService,
      exportacionService as unknown as SeguimientoExportacionService,
      notificaciones as unknown as NotificacionesService,
      audit as unknown as AuditService,
      anioCls as unknown as AnioLectivoCls,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe("CP-RF013-01: Generar para todos los docentes (HU1)", () => {
    it("debe crear un consolidado cerrado versión 1 para cada uno de los 24 docentes, notificar a cada uno y mostrar mensaje oficial", async () => {
      // Dado que el II Bimestre está cerrado y hay 24 docentes con sesiones en él
      const docentes24 = crear24Docentes();
      repo.buscarPeriodoPorId = jest.fn().mockResolvedValue(periodoBimestre2Cerrado);
      repo.buscarDocentesConSesionesEnPeriodo = jest.fn().mockResolvedValue(docentes24);
      repo.buscarConsolidadoVigente = jest.fn().mockResolvedValue(null);

      // Cuando presiono "Generar consolidado" para todos
      const respuesta = await service.generarTodos(
        "periodo-bimestre-2-uuid",
        "user-director-uuid",
        "director",
        "192.168.1.100",
      );

      // Entonces el sistema crea un consolidado cerrado, versión 1, por cada docente con sus totales
      expect(respuesta.mensaje).toBe(MENSAJES_CONSOLIDADO.CONSOLIDADO_GENERADO("II Bimestre", 24));
      expect(respuesta.cantidad).toBe(24);
      expect(repo.crearConsolidado).toHaveBeenCalledTimes(24);

      // Y notifica a cada docente a través de NotificacionesService
      expect(notificaciones.enviar).toHaveBeenCalledTimes(24);
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "usuario-1-uuid",
          titulo: "Consolidado de seguimiento disponible",
          mensaje: "Se generó el consolidado del II Bimestre. Puede revisarlo en Mi seguimiento.",
          tipo: "informativa",
          enlaceUrl: "/admin/mi-seguimiento",
        }),
      );

      // Y registra auditoría inmutable por cada consolidado creado
      expect(audit.log).toHaveBeenCalledTimes(24);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-director-uuid",
          accion: "crear",
          tabla: "consolidados_docente",
          direccionIp: "192.168.1.100",
        }),
      );
    });

    it("debe denegar con ForbiddenException si un usuario con rol Subdirector intenta generar consolidados masivamente", async () => {
      // Dado que el usuario tiene rol subdirector (solo consulta)
      // Cuando intenta generar el consolidado para todos
      // Entonces el sistema rechaza la mutación con 403 Forbidden
      await expect(
        service.generarTodos(
          "periodo-bimestre-2-uuid",
          "user-subdirector-uuid",
          "subdirector",
          "192.168.1.101",
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(repo.crearConsolidado).not.toHaveBeenCalled();
      expect(notificaciones.enviar).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });
  });

  describe("CP-RF013-02: Cálculo del total (HU1)", () => {
    it("debe calcular 3 ausencias vigentes (60 min) excluyendo la anulada de 30 min, sumar 40 min de firma y fijar 1 h 40 min fuera de clase", async () => {
      // Dado que el docente Quispe tuvo 40 minutos perdidos por firma y 3 ausencias vigentes de 20, 15 y 25 minutos, y una ausencia anulada de 30 minutos
      repo.buscarPeriodoPorId = jest.fn().mockResolvedValue(periodoBimestre2Cerrado);
      repo.buscarConsolidadoVigente = jest.fn().mockResolvedValue(null);
      repo.calcularMetricasDocente = jest.fn().mockResolvedValue(metricasQuispeCanonico);
      repo.buscarConsolidadoConDetalle = jest.fn().mockResolvedValue({
        consolidado: {
          ...consolidadoQuispeFila,
          minutosPerdidosFirma: 40,
          totalAusencias: 3,
          minutosFueraAula: 60,
        },
        docente: docenteQuispe,
        periodo: periodoBimestre2Cerrado,
        generadoPorNombre: "Director Escolar",
        reabiertoPorNombre: null,
        sesiones: [],
      });

      // Cuando se genera su consolidado individualmente
      const detalle = await service.generarUno(
        "periodo-bimestre-2-uuid",
        "docente-quispe-uuid",
        "user-director-uuid",
        "director",
        "192.168.1.102",
      );

      // Entonces el consolidado muestra 3 ausencias, 60 minutos fuera del aula y un total de 1 h 40 min fuera de clase
      expect(detalle.totalAusencias).toBe(3);
      expect(detalle.minutosFueraAula).toBe(60);
      expect(detalle.minutosPerdidosFirma).toBe(40);
      expect(detalle.totalMinutosFueraClase).toBe(100);
      expect(detalle.tiempoFueraClaseTexto).toBe("1 h 40 min");
      expect(detalle.estado).toBe("cerrado");
      expect(detalle.version).toBe(1);
      expect(detalle.vigente).toBe(true);

      // Y notifica al docente y registra auditoría
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "usuario-quispe-uuid",
          titulo: "Consolidado de seguimiento disponible",
          mensaje: "Se generó el consolidado del II Bimestre. Puede revisarlo en Mi seguimiento.",
          enlaceUrl: "/admin/mi-seguimiento",
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-director-uuid",
          accion: "crear",
          tabla: "consolidados_docente",
          direccionIp: "192.168.1.102",
        }),
      );
    });
  });

  describe("CP-RF013-03: Bimestre todavía en curso (HU1)", () => {
    it("debe bloquear la acción con BadRequestException y mensaje oficial si faltan más de 7 días naturales (tres semanas) para el fin del bimestre", async () => {
      // Dado que faltan tres semanas para el fin del bimestre (hoy: 2027-06-24, fin: 2027-07-15, diferencia: 21 días)
      jest.useFakeTimers().setSystemTime(new Date("2027-06-24T12:00:00.000Z"));

      const periodoEnCursoTemprano: PeriodoParaConsolidado = {
        id: "periodo-bimestre-2-uuid",
        nombre: "II Bimestre",
        numero: 2,
        estado: "en_curso",
        fechaInicio: "2027-05-01",
        fechaFin: "2027-07-15",
      };
      repo.buscarPeriodoPorId = jest.fn().mockResolvedValue(periodoEnCursoTemprano);

      // Cuando intento generar el consolidado (individual o todos)
      // Entonces el sistema bloquea la acción y muestra mensaje oficial
      await expect(
        service.generarUno(
          "periodo-bimestre-2-uuid",
          "docente-quispe-uuid",
          "user-director-uuid",
          "director",
        ),
      ).rejects.toThrow(new BadRequestException(MENSAJES_CONSOLIDADO.BIMESTRE_AUN_ABIERTO));

      await expect(
        service.generarTodos("periodo-bimestre-2-uuid", "user-director-uuid", "director"),
      ).rejects.toThrow(new BadRequestException(MENSAJES_CONSOLIDADO.BIMESTRE_AUN_ABIERTO));

      expect(repo.crearConsolidado).not.toHaveBeenCalled();
      expect(notificaciones.enviar).not.toHaveBeenCalled();
    });

    it("debe bloquear con BadRequestException si el período está en estado planificado", async () => {
      // Dado un período que ni siquiera ha iniciado
      const periodoPlanificado: PeriodoParaConsolidado = {
        id: "periodo-bimestre-3-uuid",
        nombre: "III Bimestre",
        numero: 3,
        estado: "planificado",
        fechaInicio: "2027-08-01",
        fechaFin: "2027-10-15",
      };
      repo.buscarPeriodoPorId = jest.fn().mockResolvedValue(periodoPlanificado);

      // Cuando intento generar consolidado
      // Entonces bloquea con mensaje oficial
      await expect(
        service.generarUno(
          "periodo-bimestre-3-uuid",
          "docente-quispe-uuid",
          "user-director-uuid",
          "director",
        ),
      ).rejects.toThrow(new BadRequestException(MENSAJES_CONSOLIDADO.BIMESTRE_AUN_ABIERTO));
    });

    it("debe permitir la generación si el período está en curso pero faltan 5 días naturales (última semana)", async () => {
      // Dado que hoy es 2027-07-10 y el bimestre termina el 2027-07-15 (5 días naturales restantes <= 7)
      jest.useFakeTimers().setSystemTime(new Date("2027-07-10T12:00:00.000Z"));

      const periodoUltimaSemana: PeriodoParaConsolidado = {
        id: "periodo-bimestre-2-uuid",
        nombre: "II Bimestre",
        numero: 2,
        estado: "en_curso",
        fechaInicio: "2027-05-01",
        fechaFin: "2027-07-15",
      };
      repo.buscarPeriodoPorId = jest.fn().mockResolvedValue(periodoUltimaSemana);
      repo.buscarConsolidadoVigente = jest.fn().mockResolvedValue(null);

      // Cuando el Director genera el consolidado en la última semana
      // Entonces se genera con éxito
      await expect(
        service.generarUno(
          "periodo-bimestre-2-uuid",
          "docente-quispe-uuid",
          "user-director-uuid",
          "director",
        ),
      ).resolves.toBeDefined();

      expect(repo.crearConsolidado).toHaveBeenCalled();
    });
  });

  describe("CP-RF013-04: Consolidado ya existente (HU1)", () => {
    it("debe bloquear con ConflictException y mensaje oficial si el docente ya tiene un consolidado vigente del II Bimestre", async () => {
      // Dado que el docente ya tiene un consolidado vigente del II Bimestre
      repo.buscarPeriodoPorId = jest.fn().mockResolvedValue(periodoBimestre2Cerrado);
      repo.buscarConsolidadoVigente = jest.fn().mockResolvedValue(consolidadoQuispeFila);

      // Cuando intento generarlo de nuevo individualmente
      // Entonces el sistema bloquea la acción y muestra mensaje oficial
      await expect(
        service.generarUno(
          "periodo-bimestre-2-uuid",
          "docente-quispe-uuid",
          "user-director-uuid",
          "director",
        ),
      ).rejects.toThrow(new ConflictException(MENSAJES_CONSOLIDADO.CONSOLIDADO_YA_EXISTE));

      expect(repo.crearConsolidado).not.toHaveBeenCalled();
    });

    it("debe lanzar ConflictException en generarTodos si todos los docentes ya cuentan con consolidado vigente", async () => {
      // Dado que todos los docentes del bimestre ya tienen consolidado vigente
      repo.buscarPeriodoPorId = jest.fn().mockResolvedValue(periodoBimestre2Cerrado);
      repo.buscarDocentesConSesionesEnPeriodo = jest.fn().mockResolvedValue([docenteQuispe]);
      repo.buscarConsolidadoVigente = jest.fn().mockResolvedValue(consolidadoQuispeFila);

      // Cuando intento generar todos
      // Entonces el sistema lanza ConflictException porque no hay consolidados nuevos por crear
      await expect(
        service.generarTodos("periodo-bimestre-2-uuid", "user-director-uuid", "director"),
      ).rejects.toThrow(new ConflictException(MENSAJES_CONSOLIDADO.CONSOLIDADO_YA_EXISTE));

      expect(repo.crearConsolidado).not.toHaveBeenCalled();
    });
  });

  describe("CP-RF013-05: Registrar la decisión directiva (HU1)", () => {
    it("debe guardar la decisión compromiso_mejora con la observación Reunión el 20/07 en el consolidado cerrado y auditar la mutación", async () => {
      // Dado que el consolidado del docente Quispe está cerrado
      repo.buscarConsolidadoPorId = jest.fn().mockResolvedValue(consolidadoQuispeFila);
      repo.buscarConsolidadoConDetalle = jest.fn().mockResolvedValue({
        consolidado: {
          ...consolidadoQuispeFila,
          decision: "compromiso_mejora",
          observacion: "Reunión el 20/07",
        },
        docente: docenteQuispe,
        periodo: periodoBimestre2Cerrado,
        generadoPorNombre: "Director Escolar",
        reabiertoPorNombre: null,
        sesiones: [],
      });

      const dto: RegistrarDecisionDto = {
        decision: "compromiso_mejora",
        observacion: "Reunión el 20/07",
      };

      // Cuando registro la decisión compromiso_mejora con la observación "Reunión el 20/07"
      const resultado = await service.registrarDecision(
        "cons-quispe-uuid",
        dto,
        "user-director-uuid",
        "director",
        "192.168.1.103",
      );

      // Entonces el sistema la guarda y la incluye en la ficha/detalle
      expect(repo.actualizarDecision).toHaveBeenCalledWith(
        "cons-quispe-uuid",
        "compromiso_mejora",
        "Reunión el 20/07",
      );
      expect(resultado.decision).toBe("compromiso_mejora");
      expect(resultado.observacion).toBe("Reunión el 20/07");

      // Y audita la mutación directiva
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-director-uuid",
          accion: "actualizar",
          tabla: "consolidados_docente",
          registroId: "cons-quispe-uuid",
          direccionIp: "192.168.1.103",
        }),
      );
    });

    it("debe lanzar NotFoundException si el consolidado indicado no existe al registrar decisión", async () => {
      // Dado un ID de consolidado inexistente
      repo.buscarConsolidadoPorId = jest.fn().mockResolvedValue(null);

      const dto: RegistrarDecisionDto = {
        decision: "llamada_atencion",
        observacion: "Primer llamado",
      };

      // Cuando intento registrar decisión
      // Entonces responde con NotFoundException
      await expect(
        service.registrarDecision("cons-inexistente-uuid", dto, "user-director-uuid", "director"),
      ).rejects.toThrow(new NotFoundException(MENSAJES_CONSOLIDADO.CONSOLIDADO_NO_ENCONTRADO));

      expect(repo.actualizarDecision).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it("debe rechazar con ForbiddenException si un Subdirector intenta registrar o modificar una decisión directiva", async () => {
      // Dado un actor con rol subdirector (sin permisos de decisión directiva)
      repo.buscarConsolidadoPorId = jest.fn().mockResolvedValue(consolidadoQuispeFila);

      const dto: RegistrarDecisionDto = {
        decision: "derivado",
      };

      // Cuando intenta registrar decisión
      // Entonces el sistema bloquea con 403 Forbidden
      await expect(
        service.registrarDecision("cons-quispe-uuid", dto, "user-subdirector-uuid", "subdirector"),
      ).rejects.toThrow(ForbiddenException);

      expect(repo.actualizarDecision).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });
  });

  describe("Escenario 21 / Propuesta R3: Generar consolidado individual de un docente (HU1)", () => {
    it("debe generar el consolidado individualmente para un docente cuando el bimestre está cerrado", async () => {
      // Dado que el II Bimestre está cerrado y el docente Quispe no tiene consolidado
      repo.buscarPeriodoPorId = jest.fn().mockResolvedValue(periodoBimestre2Cerrado);
      repo.buscarConsolidadoVigente = jest.fn().mockResolvedValue(null);
      repo.calcularMetricasDocente = jest.fn().mockResolvedValue(metricasQuispeCanonico);
      repo.buscarConsolidadoConDetalle = jest.fn().mockResolvedValue({
        consolidado: consolidadoQuispeFila,
        docente: docenteQuispe,
        periodo: periodoBimestre2Cerrado,
        generadoPorNombre: "Director Escolar",
        reabiertoPorNombre: null,
        sesiones: [],
      });

      // Cuando el Director genera el consolidado para este docente
      const resultado = await service.generarUno(
        "periodo-bimestre-2-uuid",
        "docente-quispe-uuid",
        "user-director-uuid",
        "director",
        "192.168.1.104",
      );

      // Entonces crea el consolidado cerrado, versión 1, notifica al docente y registra auditoría
      expect(repo.crearConsolidado).toHaveBeenCalledWith(
        expect.objectContaining({
          docenteId: "docente-quispe-uuid",
          periodoId: "periodo-bimestre-2-uuid",
          generadoPorId: "user-director-uuid",
        }),
      );
      expect(resultado.id).toBe("cons-quispe-uuid");
      expect(resultado.version).toBe(1);
      expect(resultado.vigente).toBe(true);
      expect(resultado.estado).toBe("cerrado");
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "usuario-quispe-uuid",
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: "crear",
          tabla: "consolidados_docente",
        }),
      );
    });
  });
});
