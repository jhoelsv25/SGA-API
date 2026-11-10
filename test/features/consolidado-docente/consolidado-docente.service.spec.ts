import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import {
  ConsolidadoDocenteRepository,
  ConsolidadoDocenteService,
  MENSAJES_CONSOLIDADO,
  formatearMinutosAHrsMin,
  puedeGenerarConsolidadoPeriodo,
  type ActorConsolidado,
  type ConsolidadoResumenItem,
  type HistorialVersionConsolidadoItem,
  type SolicitudRevisionItem,
} from "@/features/consolidado-docente";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

const PERIODO_CERRABLE = {
  id: "per-1",
  nombre: "Bimestre I",
  fechaInicio: "2026-03-01",
  fechaFin: "2026-05-15",
  estado: "cerrado",
  anioAcademicoId: "anio-2026",
};

const PERIODO_FUTURO = {
  id: "per-2",
  nombre: "Bimestre II",
  fechaInicio: "2026-10-01",
  fechaFin: "2026-12-15",
  estado: "en_curso",
  anioAcademicoId: "anio-2026",
};

const consolidadoMock = (
  override: Partial<ConsolidadoResumenItem> = {},
): ConsolidadoResumenItem => ({
  id: "cons-1",
  docenteId: "doc-1",
  docenteNombre: "Juan Pérez",
  docenteDni: "12345678",
  periodoId: "per-1",
  periodoNombre: "Bimestre I",
  version: 1,
  vigente: true,
  estado: "cerrado",
  sesionesProgramadas: 20,
  sesionesCumplidas: 16,
  sesionesParciales: 2,
  sesionesNoCumplidas: 1,
  sesionesJustificadas: 1,
  minutosFueraAula: 45,
  minutosPerdidosFirma: 45,
  minutosTotalFuera: 90,
  tiempoTotalFueraTexto: "1 h 30 min",
  totalAusencias: 1,
  minutosProgramados: 900,
  minutosDictados: 780,
  minutosHoraPedagogica: 45,
  horasProgramadas: 20,
  horasDictadas: 17.3,
  horasPerdidas: 2.7,
  minutosNoDictados: 120,
  decision: "ninguna",
  decisionRegistradaEn: null,
  observacion: null,
  motivoCambio: null,
  generadoEn: new Date().toISOString(),
  generadoPorNombre: "Director Demo",
  ...override,
});

describe("RF-013: Consolidado y Ficha de Seguimiento Docente (CP-RF013-01 a CP-RF013-20)", () => {
  let service: ConsolidadoDocenteService;
  let repo: Mocks<ConsolidadoDocenteRepository>;
  let audit: Mocks<AuditService>;
  let notificaciones: Mocks<NotificacionesService>;

  const usuarioDirector: ActorConsolidado = {
    id: "usr-dir",
    roleId: "r-dir",
    role: "Director",
    personaId: "per-dir",
  };

  const usuarioDocente: ActorConsolidado = {
    id: "usr-doc",
    roleId: "r-doc",
    role: "Docente",
    personaId: "per-doc",
  };

  beforeEach(() => {
    repo = {
      obtenerPeriodo: jest.fn(),
      listarDocentesConSesionesEnPeriodo: jest.fn(),
      obtenerConsolidadosVigentesPeriodo: jest.fn(),
      obtenerConsolidadoVigenteDocente: jest.fn(),
      obtenerConsolidadoPorId: jest.fn(),
      calcularMetricasDocente: jest.fn(),
      crearConsolidado: jest.fn(),
      actualizarDecision: jest.fn(),
      reabrirConsolidado: jest.fn(),
      cerrarConNuevaVersion: jest.fn(),
      listarHistorialVersiones: jest.fn(),
      obtenerDetalleSesiones: jest.fn(),
      crearSolicitudRevision: jest.fn(),
      obtenerSolicitudPendiente: jest.fn(),
      obtenerSolicitudPorId: jest.fn(),
      resolverSolicitud: jest.fn(),
      obtenerDocenteDePersona: jest.fn(),
      consolidadoCerradoBloqueante: jest.fn(),
      valorVariable: jest.fn().mockResolvedValue("45"),
      contarCompromisosPendientes: jest.fn().mockResolvedValue(0),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    notificaciones = {
      enviar: jest.fn().mockResolvedValue(undefined),
    };

    service = new ConsolidadoDocenteService(
      repo as unknown as ConsolidadoDocenteRepository,
      audit as unknown as AuditService,
      notificaciones as unknown as NotificacionesService,
      { get: jest.fn().mockResolvedValue({ nombre: "Colegio" }) } as never,
    );
  });

  describe("CP-RF013-01: Generación masiva dentro de la ventana permitida (<= 7 días o cerrado)", () => {
    it("debe generar consolidados exitosamente cuando el período está cerrado", async () => {
      repo.obtenerPeriodo!.mockResolvedValue(PERIODO_CERRABLE);
      repo.listarDocentesConSesionesEnPeriodo!.mockResolvedValue([
        { docenteId: "doc-1", docenteNombre: "Juan Pérez", usuarioId: "usr-doc" },
      ]);
      repo.obtenerConsolidadoVigenteDocente!.mockResolvedValue(null);
      repo.calcularMetricasDocente!.mockResolvedValue({
        sesionesProgramadas: 20,
        sesionesCumplidas: 16,
        sesionesParciales: 2,
        sesionesNoCumplidas: 1,
        sesionesJustificadas: 1,
        totalAusencias: 1,
        minutosFueraAula: 45,
        minutosPerdidosFirma: 45,
        minutosTotalFuera: 90,
      });
      repo.crearConsolidado!.mockResolvedValue(consolidadoMock());

      const resultado = await service.generarConsolidados({ periodoId: "per-1" }, usuarioDirector);

      expect(resultado.creados).toBe(1);
      expect(repo.crearConsolidado).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "crear", tabla: "consolidados_docente" }),
      );
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: "informacion",
          titulo: "Consolidado de seguimiento disponible",
        }),
      );
    });
  });

  describe("CP-RF013-02: Rechazo de generación fuera de ventana (> 7 días antes de fin)", () => {
    it("debe lanzar BadRequestException si el período no ha finalizado y faltan más de 7 días", async () => {
      repo.obtenerPeriodo!.mockResolvedValue(PERIODO_FUTURO);

      await expect(
        service.generarConsolidados({ periodoId: "per-2" }, usuarioDirector),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("CP-RF013-03: Cálculo exacto de métricas", () => {
    it("debe calcular sesiones cumplidas, minutos perdidos y minutos totales fuera del aula", async () => {
      repo.obtenerPeriodo!.mockResolvedValue(PERIODO_CERRABLE);
      repo.obtenerConsolidadoVigenteDocente!.mockResolvedValue(null);
      repo.calcularMetricasDocente!.mockResolvedValue({
        sesionesProgramadas: 4,
        sesionesCumplidas: 1,
        sesionesParciales: 1,
        sesionesNoCumplidas: 1,
        sesionesJustificadas: 1,
        totalAusencias: 1,
        minutosFueraAula: 20,
        minutosPerdidosFirma: 40,
        minutosTotalFuera: 60,
      });
      repo.crearConsolidado!.mockResolvedValue(consolidadoMock());

      await service.generarConsolidados(
        { periodoId: "per-1", docenteId: "doc-1" },
        usuarioDirector,
      );

      expect(repo.calcularMetricasDocente).toHaveBeenCalledWith(
        "doc-1",
        PERIODO_CERRABLE.fechaInicio,
        PERIODO_CERRABLE.fechaFin,
      );
      expect(repo.crearConsolidado).toHaveBeenCalledWith(
        expect.objectContaining({
          sesionesProgramadas: 4,
          sesionesCumplidas: 1,
          sesionesParciales: 1,
          sesionesNoCumplidas: 1,
          sesionesJustificadas: 1,
          minutosPerdidosFirma: 40,
          minutosTotalFuera: 60,
        }),
      );
    });
  });

  describe("CP-RF013-04: Manejo de docente con 0 sesiones programadas", () => {
    it("debe procesar docente con 0 sesiones sin errores", async () => {
      repo.obtenerPeriodo!.mockResolvedValue(PERIODO_CERRABLE);
      repo.obtenerConsolidadoVigenteDocente!.mockResolvedValue(null);
      repo.calcularMetricasDocente!.mockResolvedValue({
        sesionesProgramadas: 0,
        sesionesCumplidas: 0,
        sesionesParciales: 0,
        sesionesNoCumplidas: 0,
        sesionesJustificadas: 0,
        totalAusencias: 0,
        minutosFueraAula: 0,
        minutosPerdidosFirma: 0,
        minutosTotalFuera: 0,
      });
      repo.crearConsolidado!.mockResolvedValue(consolidadoMock({ sesionesProgramadas: 0 }));

      await service.generarConsolidados(
        { periodoId: "per-1", docenteId: "doc-1" },
        usuarioDirector,
      );

      expect(repo.crearConsolidado).toHaveBeenCalledWith(
        expect.objectContaining({
          sesionesProgramadas: 0,
          sesionesCumplidas: 0,
        }),
      );
    });
  });

  describe("CP-RF013-05: Generación individual cuando ya existe consolidado vigente", () => {
    it("debe lanzar ConflictException si el docente ya tiene consolidado vigente", async () => {
      repo.obtenerPeriodo!.mockResolvedValue(PERIODO_CERRABLE);
      repo.obtenerConsolidadoVigenteDocente!.mockResolvedValue(consolidadoMock());

      await expect(
        service.generarConsolidados({ periodoId: "per-1", docenteId: "doc-1" }, usuarioDirector),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("CP-RF013-06: Generación masiva omite docentes con consolidado existente", () => {
    it("no duplica consolidado si ya existe vigente para el docente", async () => {
      repo.obtenerPeriodo!.mockResolvedValue(PERIODO_CERRABLE);
      repo.listarDocentesConSesionesEnPeriodo!.mockResolvedValue([
        { docenteId: "doc-1", docenteNombre: "Juan Pérez", usuarioId: "usr-doc" },
      ]);
      repo.obtenerConsolidadoVigenteDocente!.mockResolvedValue(consolidadoMock());

      const resultado = await service.generarConsolidados({ periodoId: "per-1" }, usuarioDirector);

      expect(resultado.creados).toBe(0);
      expect(repo.crearConsolidado).not.toHaveBeenCalled();
    });
  });

  describe("CP-RF013-07: Consulta de consolidados por período con ordenamiento", () => {
    it("debe listar consolidados y permitir ordenar por minutosTotalFuera", async () => {
      repo.obtenerConsolidadosVigentesPeriodo!.mockResolvedValue([
        consolidadoMock({ id: "c1", docenteNombre: "Ana", minutosTotalFuera: 90 }),
        consolidadoMock({ id: "c2", docenteNombre: "Beto", minutosTotalFuera: 40 }),
      ]);

      const resultado = await service.listarConsolidadosPeriodo(
        { periodoId: "per-1", ordenarPor: "minutosTotalFuera", orden: "asc" },
        usuarioDirector,
      );

      expect(resultado[0].minutosTotalFuera).toBe(40);
      expect(resultado[1].minutosTotalFuera).toBe(90);
    });
  });

  describe("CP-RF013-08: Consulta de detalle de consolidado", () => {
    it("debe retornar el detalle con sesiones, desglose de ausencias y solicitud pendiente", async () => {
      const mockDetalle = consolidadoMock();
      repo.obtenerConsolidadoPorId!.mockResolvedValue(mockDetalle);
      repo.obtenerPeriodo!.mockResolvedValue(PERIODO_CERRABLE);
      repo.obtenerDetalleSesiones!.mockResolvedValue([]);
      repo.obtenerSolicitudPendiente!.mockResolvedValue(null);

      const resultado = await service.obtenerDetalle("cons-1", usuarioDirector);

      expect(resultado.consolidado.id).toBe("cons-1");
      expect(resultado.sesiones).toEqual([]);
      expect(resultado.solicitudPendiente).toBeNull();
    });
  });

  describe("CP-RF013-09: Consulta de 'Mi seguimiento' para el docente", () => {
    it("debe retornar el consolidado vigente del docente autenticado", async () => {
      repo.obtenerDocenteDePersona!.mockResolvedValue({ id: "doc-1", personaId: "per-doc" });
      repo.obtenerConsolidadoVigenteDocente!.mockResolvedValue(
        consolidadoMock({ docenteId: "doc-1" }),
      );
      repo.obtenerConsolidadoPorId!.mockResolvedValue(consolidadoMock({ docenteId: "doc-1" }));
      repo.obtenerPeriodo!.mockResolvedValue(PERIODO_CERRABLE);
      repo.obtenerDetalleSesiones!.mockResolvedValue([]);
      repo.obtenerSolicitudPendiente!.mockResolvedValue(null);

      const resultado = await service.obtenerMiSeguimiento("per-1", usuarioDocente);

      expect(resultado.consolidado.docenteId).toBe("doc-1");
    });
  });

  describe("CP-RF013-10: Usuario sin perfil docente intentando consultar 'Mi seguimiento'", () => {
    it("debe lanzar ForbiddenException si no existe perfil de docente", async () => {
      repo.obtenerDocenteDePersona!.mockResolvedValue(null);

      await expect(service.obtenerMiSeguimiento("per-1", usuarioDocente)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("docente no puede consultar el detalle de consolidado de otro docente", async () => {
      repo.obtenerConsolidadoPorId!.mockResolvedValue(consolidadoMock({ docenteId: "doc-otro" }));
      repo.obtenerDocenteDePersona!.mockResolvedValue({ id: "doc-1", personaId: "per-doc" });

      await expect(service.obtenerDetalle("cons-1", usuarioDocente)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("CP-RF013-11: Registro de decisión del director", () => {
    it("debe registrar la decisión y registrar auditoría", async () => {
      repo.obtenerConsolidadoPorId!.mockResolvedValue(consolidadoMock({ decision: "ninguna" }));
      repo.actualizarDecision!.mockResolvedValue(
        consolidadoMock({
          decision: "compromiso_mejora",
          observacion: "Mejorar puntualidad en las mañanas",
        }),
      );

      const resultado = await service.registrarDecision(
        "cons-1",
        {
          decision: "compromiso_mejora",
          observacion: "Mejorar puntualidad en las mañanas",
        },
        usuarioDirector,
      );

      expect(resultado.decision).toBe("compromiso_mejora");
      expect(repo.actualizarDecision).toHaveBeenCalledWith(
        "cons-1",
        "compromiso_mejora",
        "Mejorar puntualidad en las mañanas",
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "actualizar", tabla: "consolidados_docente" }),
      );
    });
  });

  describe("CP-RF013-12: Rechazo de registrar decisión por un docente", () => {
    it("debe lanzar ForbiddenException si un docente intenta registrar decisión", async () => {
      await expect(
        service.registrarDecision("cons-1", { decision: "compromiso_mejora" }, usuarioDocente),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("CP-RF013-13: Reapertura de consolidado", () => {
    it("debe reabrir el consolidado pasando su estado a reabierto", async () => {
      repo.obtenerConsolidadoPorId!.mockResolvedValue(consolidadoMock({ estado: "cerrado" }));
      repo.reabrirConsolidado!.mockResolvedValue(consolidadoMock({ estado: "reabierto" }));

      const resultado = await service.reabrirConsolidado("cons-1", usuarioDirector);

      expect(resultado.consolidado.estado).toBe("reabierto");
      expect(resultado.mensaje).toBe(MENSAJES_CONSOLIDADO.CONSOLIDADO_REABIERTO);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "actualizar", valorNuevo: { estado: "reabierto" } }),
      );
    });
  });

  describe("CP-RF013-14: Cierre posterior a reapertura sin motivo obligatorio", () => {
    it("debe lanzar BadRequestException si la versión es >= 1 y no se indica motivo de cambio", async () => {
      repo.obtenerConsolidadoPorId!.mockResolvedValue(
        consolidadoMock({ version: 1, estado: "reabierto" }),
      );

      await expect(
        service.cerrarConsolidado("cons-1", { motivoCambio: "   " }, usuarioDirector),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("CP-RF013-15: Cierre posterior a reapertura incrementa versión", () => {
    it("debe cerrar con nueva version (version 2) y recalcular métricas", async () => {
      repo.obtenerConsolidadoPorId!.mockResolvedValue(
        consolidadoMock({ version: 1, estado: "reabierto" }),
      );
      repo.obtenerPeriodo!.mockResolvedValue(PERIODO_CERRABLE);
      repo.calcularMetricasDocente!.mockResolvedValue({
        sesionesProgramadas: 20,
        sesionesCumplidas: 18,
        sesionesParciales: 1,
        sesionesNoCumplidas: 0,
        sesionesJustificadas: 1,
        totalAusencias: 0,
        minutosFueraAula: 0,
        minutosPerdidosFirma: 10,
        minutosTotalFuera: 10,
      });
      repo.cerrarConNuevaVersion!.mockResolvedValue(
        consolidadoMock({
          version: 2,
          estado: "cerrado",
          motivoCambio: "Ajuste de justificaciones",
        }),
      );

      const resultado = await service.cerrarConsolidado(
        "cons-1",
        { motivoCambio: "Ajuste de justificaciones" },
        usuarioDirector,
      );

      expect(resultado.version).toBe(2);
      expect(repo.cerrarConNuevaVersion).toHaveBeenCalledWith(
        "cons-1",
        "Ajuste de justificaciones",
        expect.objectContaining({
          sesionesCumplidas: 18,
        }),
        "usr-dir",
      );
    });
  });

  describe("CP-RF013-16: Consulta de historial de versiones", () => {
    it("debe retornar la lista de todas las versiones históricas del consolidado", async () => {
      repo.obtenerConsolidadoPorId!.mockResolvedValue(consolidadoMock());
      const versiones: HistorialVersionConsolidadoItem[] = [
        {
          id: "cons-v2",
          version: 2,
          estado: "cerrado",
          vigente: true,
          motivoCambio: "Ajuste",
          minutosTotalFuera: 10,
          tiempoTotalFueraTexto: "10 min",
          sesionesProgramadas: 20,
          sesionesCumplidas: 18,
          sesionesParciales: 1,
          sesionesNoCumplidas: 0,
          sesionesJustificadas: 1,
          totalAusencias: 0,
          minutosFueraAula: 0,
          decision: "ninguna",
          observacion: null,
          generadoPorNombre: "Director Demo",
          generadoEn: new Date().toISOString(),
        },
        {
          id: "cons-v1",
          version: 1,
          estado: "cerrado",
          vigente: false,
          motivoCambio: null,
          minutosTotalFuera: 90,
          tiempoTotalFueraTexto: "1 h 30 min",
          sesionesProgramadas: 20,
          sesionesCumplidas: 16,
          sesionesParciales: 2,
          sesionesNoCumplidas: 1,
          sesionesJustificadas: 1,
          totalAusencias: 1,
          minutosFueraAula: 45,
          decision: "compromiso_mejora",
          observacion: null,
          generadoPorNombre: "Director Demo",
          generadoEn: new Date().toISOString(),
        },
      ];
      repo.listarHistorialVersiones!.mockResolvedValue(versiones);

      const historial = await service.historialVersiones("cons-1", usuarioDirector);

      expect(historial).toHaveLength(2);
      expect(historial[0].version).toBe(2);
      expect(historial[1].version).toBe(1);
    });
  });

  describe("CP-RF013-17: Bloqueo de modificación de sesiones pasadas con consolidado cerrado", () => {
    it("debe lanzar ForbiddenException al intentar modificar si existe consolidado cerrado para la fecha", async () => {
      repo.consolidadoCerradoBloqueante!.mockResolvedValue(true);

      await expect(service.validarModificacionPermitida("doc-1", "2026-04-10")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("debe permitir modificación si el consolidado no está bloqueando (no existe o reabierto)", async () => {
      repo.consolidadoCerradoBloqueante!.mockResolvedValue(false);

      await expect(
        service.validarModificacionPermitida("doc-1", "2026-04-10"),
      ).resolves.toBeUndefined();
    });
  });

  describe("CP-RF013-18: Mensaje exacto de bloqueo de modificaciones", () => {
    it("debe retornar el mensaje de CONSOLIDADO_CERRADO", async () => {
      repo.consolidadoCerradoBloqueante!.mockResolvedValue(true);

      await expect(service.validarModificacionPermitida("doc-1", "2026-03-15")).rejects.toThrow(
        MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO,
      );
    });
  });

  describe("CP-RF013-19: Solicitud de revisión de consolidado por parte del docente", () => {
    it("debe permitir al docente registrar una solicitud de revisión con motivo válido", async () => {
      repo.obtenerConsolidadoPorId!.mockResolvedValue(consolidadoMock({ docenteId: "doc-1" }));
      repo.obtenerDocenteDePersona!.mockResolvedValue({ id: "doc-1", personaId: "per-doc" });
      repo.obtenerSolicitudPendiente!.mockResolvedValue(null);
      const solicitudCreada: SolicitudRevisionItem = {
        id: "sol-1",
        consolidadoId: "cons-1",
        docenteId: "doc-1",
        motivo: "La sesión del 14 de abril sí fue dictada y tengo registro auxiliar",
        adjuntoUrl: null,
        estado: "solicitada",
        solicitadoEn: new Date().toISOString(),
        resueltoPorNombre: null,
        resueltoEn: null,
        respuesta: null,
      };
      repo.crearSolicitudRevision!.mockResolvedValue(solicitudCreada);

      const resultado = await service.solicitarRevision(
        "cons-1",
        { motivo: "La sesión del 14 de abril sí fue dictada y tengo registro auxiliar" },
        usuarioDocente,
      );

      expect(resultado.solicitud.id).toBe("sol-1");
      expect(resultado.mensaje).toBe(MENSAJES_CONSOLIDADO.SOLICITUD_ENVIADA);
      expect(repo.crearSolicitudRevision).toHaveBeenCalled();
    });

    it("debe rechazar si ya existe una solicitud en curso", async () => {
      repo.obtenerConsolidadoPorId!.mockResolvedValue(consolidadoMock({ docenteId: "doc-1" }));
      repo.obtenerDocenteDePersona!.mockResolvedValue({ id: "doc-1", personaId: "per-doc" });
      repo.obtenerSolicitudPendiente!.mockResolvedValue({ id: "sol-existente" });

      await expect(
        service.solicitarRevision(
          "cons-1",
          { motivo: "Otro motivo de prueba largo" },
          usuarioDocente,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("CP-RF013-20: Resolución de solicitud de revisión por director/administrador", () => {
    it("debe aceptar la solicitud, reabrir consolidado y notificar al docente", async () => {
      repo.obtenerSolicitudPorId!.mockResolvedValue({
        id: "sol-1",
        consolidadoId: "cons-1",
        docenteId: "doc-1",
        docenteUsuarioId: "usr-doc",
        motivo: "Revisión por error",
        estado: "solicitada",
      });
      repo.resolverSolicitud!.mockResolvedValue({
        id: "sol-1",
        estado: "aceptada",
        respuesta: "Aceptada para corrección de sesiones",
      });

      const resultado = await service.resolverSolicitud(
        "sol-1",
        {
          accion: "aceptar",
          respuesta: "Aceptada para corrección de sesiones",
        },
        usuarioDirector,
      );

      expect(resultado.solicitud.estado).toBe("aceptada");
      expect(resultado.mensaje).toContain("Solicitud aceptada y consolidado reabierto.");
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: "informacion",
          titulo: "Solicitud de revisión aceptada",
        }),
      );
    });

    it("debe rechazar la solicitud exigiendo respuesta y notificar", async () => {
      repo.obtenerSolicitudPorId!.mockResolvedValue({
        id: "sol-1",
        consolidadoId: "cons-1",
        docenteId: "doc-1",
        docenteUsuarioId: "usr-doc",
        motivo: "Revisión por error",
        estado: "solicitada",
      });

      // Si no se manda respuesta al rechazar
      await expect(
        service.resolverSolicitud("sol-1", { accion: "rechazar", respuesta: "" }, usuarioDirector),
      ).rejects.toThrow(BadRequestException);

      repo.resolverSolicitud!.mockResolvedValue({
        id: "sol-1",
        estado: "rechazada",
        respuesta: "No procede el reclamo según marcaciones biométricas",
      });

      const resultado = await service.resolverSolicitud(
        "sol-1",
        { accion: "rechazar", respuesta: "No procede el reclamo según marcaciones biométricas" },
        usuarioDirector,
      );

      expect(resultado.solicitud.estado).toBe("rechazada");
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          titulo: "Solicitud de revisión rechazada",
        }),
      );
    });
  });

  describe("Utilidades auxiliares de formato y fechas", () => {
    it("formatearMinutosAHrsMin formatea correctamente minutos en horas y minutos", () => {
      expect(formatearMinutosAHrsMin(0)).toBe("0 min");
      expect(formatearMinutosAHrsMin(45)).toBe("45 min");
      expect(formatearMinutosAHrsMin(60)).toBe("1 h 0 min");
      expect(formatearMinutosAHrsMin(105)).toBe("1 h 45 min");
    });

    it("puedeGenerarConsolidadoPeriodo evalúa correctamente días restantes", () => {
      expect(puedeGenerarConsolidadoPeriodo("2026-05-15", "cerrado", "2026-04-01")).toBe(true);
      expect(puedeGenerarConsolidadoPeriodo("2026-05-15", "en_curso", "2026-05-10")).toBe(true);
      expect(puedeGenerarConsolidadoPeriodo("2026-05-15", "en_curso", "2026-05-01")).toBe(false);
    });
  });
});
