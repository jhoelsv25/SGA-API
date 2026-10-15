import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import {
  ConsolidadoBloqueoService,
  MENSAJES_CONSOLIDADO,
  SeguimientoDocenteRepository,
  SeguimientoDocenteService,
  SeguimientoExportacionService,
  SolicitudesRevisionService,
  type CerrarConsolidadoDto,
  type ConsolidadoFila,
  type CrearSolicitudRevisionDto,
  type DocenteParaConsolidado,
  type FiltroReporteBimestreQueryDto,
  type FiltroSolicitudesQueryDto,
  type ISeguimientoDocenteRepository,
  type PeriodoParaConsolidado,
  type RechazarSolicitudDto,
  type RegistrarDecisionDto,
  type ResolverSolicitudDto,
} from "@/features/seguimiento-docente";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

describe("SeguimientoDocenteService (Fachada principal de seguimiento docente RF-013)", () => {
  let service: SeguimientoDocenteService;
  let repo: Mocks<ISeguimientoDocenteRepository>;
  let bloqueoService: Mocks<ConsolidadoBloqueoService>;
  let solicitudesService: Mocks<SolicitudesRevisionService>;
  let exportacionService: Mocks<SeguimientoExportacionService>;
  let notificaciones: Mocks<NotificacionesService>;
  let audit: Mocks<AuditService>;
  let anioCls: Mocks<AnioLectivoCls>;

  const mockPeriodo: PeriodoParaConsolidado = {
    id: "per-bim-2-uuid",
    nombre: "II Bimestre",
    numero: 2,
    estado: "cerrado",
    fechaInicio: "2027-05-01",
    fechaFin: "2027-07-20",
  };

  const mockDocenteQuispe: DocenteParaConsolidado = {
    id: "doc-quispe-uuid",
    personaId: "per-quispe-uuid",
    usuarioId: "user-quispe-uuid",
    nombres: "Juan",
    apellidoPaterno: "Quispe",
    apellidoMaterno: "Mamani",
    nombreCompleto: "Quispe Mamani, Juan",
    numeroDocumento: "44556677",
    firmaUrl: "https://sga.edu.pe/firmas/quispe.png",
  };

  const mockDocenteFlores: DocenteParaConsolidado = {
    id: "doc-flores-uuid",
    personaId: "per-flores-uuid",
    usuarioId: "user-flores-uuid",
    nombres: "María",
    apellidoPaterno: "Flores",
    apellidoMaterno: "Pérez",
    nombreCompleto: "Flores Pérez, María",
    numeroDocumento: "88990011",
    firmaUrl: "https://sga.edu.pe/firmas/flores.png",
  };

  const mockConsolidadoFila: ConsolidadoFila = {
    id: "cons-1-uuid",
    docenteId: "doc-quispe-uuid",
    periodoId: "per-bim-2-uuid",
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
    decision: "compromiso_mejora",
    observacion: "Reunión el 20/07",
    generadoPorId: "user-director-uuid",
    generadoEn: "2027-07-21T10:00:00.000Z",
    enviadoEn: null,
    reabiertoPorId: null,
    reabiertoEn: null,
  };

  const mockConsolidadoDetalleRepo = {
    consolidado: mockConsolidadoFila,
    docente: mockDocenteQuispe,
    periodo: mockPeriodo,
    generadoPorNombre: "Director General",
    reabiertoPorNombre: "Director General",
    sesiones: [],
  };

  const mockUsuarioDocenteQuispe: AuthenticatedUser = {
    id: "user-quispe-uuid",
    username: "jquispe",
    role: "Docente",
    roleId: "rol-docente-uuid",
    personaId: "per-quispe-uuid",
  };

  const mockUsuarioDocenteFlores: AuthenticatedUser = {
    id: "user-flores-uuid",
    username: "mflores",
    role: "Docente",
    roleId: "rol-docente-uuid",
    personaId: "per-flores-uuid",
  };

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

  beforeEach(() => {
    repo = {
      buscarPeriodoPorId: jest.fn().mockResolvedValue(mockPeriodo),
      buscarDocentesConSesionesEnPeriodo: jest.fn().mockResolvedValue([mockDocenteQuispe]),
      buscarConsolidadoVigente: jest.fn().mockResolvedValue(mockConsolidadoFila),
      buscarConsolidadoPorId: jest.fn().mockResolvedValue(mockConsolidadoFila),
      buscarConsolidadoConDetalle: jest.fn().mockResolvedValue(mockConsolidadoDetalleRepo),
      buscarHistorialVersiones: jest.fn().mockResolvedValue([
        {
          ...mockConsolidadoFila,
          generadoPorNombre: "Director General",
          reabiertoPorNombre: null,
        },
      ]),
      calcularMetricasDocente: jest.fn().mockResolvedValue({
        docenteId: "doc-quispe-uuid",
        sesionesProgramadas: 24,
        sesionesCumplidas: 22,
        sesionesParciales: 1,
        sesionesNoCumplidas: 1,
        sesionesJustificadas: 0,
        minutosPerdidosFirma: 40,
        totalAusencias: 3,
        minutosFueraAula: 60,
        totalMinutosFueraClase: 100,
      }),
      crearConsolidado: jest.fn().mockResolvedValue(mockConsolidadoFila),
      actualizarDecision: jest.fn().mockResolvedValue(mockConsolidadoFila),
      reabrirConsolidado: jest.fn().mockResolvedValue({
        ...mockConsolidadoFila,
        estado: "reabierto",
        reabiertoPorId: "user-director-uuid",
        reabiertoEn: new Date().toISOString(),
      }),
      crearNuevaVersion: jest.fn().mockResolvedValue({
        ...mockConsolidadoFila,
        id: "cons-v2-uuid",
        version: 2,
        estado: "cerrado",
        motivoCambio: "Ajuste de ausencia",
      }),
      docentePorPersonaId: jest.fn().mockImplementation((personaId: string) => {
        if (personaId === "per-quispe-uuid") return Promise.resolve(mockDocenteQuispe);
        if (personaId === "per-flores-uuid") return Promise.resolve(mockDocenteFlores);
        return Promise.resolve(null);
      }),
      docentePorId: jest.fn().mockResolvedValue(mockDocenteQuispe),
      usuarioPorPersonaId: jest.fn().mockResolvedValue({ id: "user-quispe-uuid" }),
    };

    bloqueoService = {
      asegurarNoCerrado: jest.fn().mockResolvedValue(undefined),
      asegurarNoCerradoPorFecha: jest.fn().mockResolvedValue(undefined),
    };

    solicitudesService = {
      miConsolidado: jest.fn().mockResolvedValue({
        consolidado: mockConsolidadoFila,
        sesiones: [],
        solicitudPendiente: null,
      }),
      crear: jest.fn().mockResolvedValue({
        mensaje: "Su solicitud de revisión fue enviada al Director.",
        solicitud: { id: "sol-1" },
      }),
      listar: jest.fn().mockResolvedValue([]),
      aceptar: jest.fn().mockResolvedValue({ id: "sol-1", estado: "aceptada" }),
      rechazar: jest.fn().mockResolvedValue({ id: "sol-1", estado: "rechazada" }),
    };

    exportacionService = {
      generarFichaPdf: jest.fn().mockResolvedValue({
        buffer: Buffer.from("%PDF-1.4"),
        nombreArchivo: "ficha.pdf",
      }),
      exportarReporteExcel: jest.fn().mockResolvedValue({
        buffer: Buffer.from("PK"),
        nombreArchivo: "reporte.xlsx",
      }),
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

  describe("HU1: Generación y Decisión Directiva", () => {
    it("CP-RF013-01: generarTodos delega en generacionService y produce el mensaje oficial", async () => {
      repo.buscarConsolidadoVigente = jest.fn().mockResolvedValue(null);

      const resultado = await service.generarTodos(
        "per-bim-2-uuid",
        "user-director-uuid",
        "Director",
        "192.168.1.10",
      );

      expect(resultado).toBeDefined();
      expect(resultado.mensaje).toContain("II Bimestre");
      expect(repo.crearConsolidado).toHaveBeenCalled();
    });

    it("CP-RF013-02: generarUno genera consolidado individual y retorna detalle completo", async () => {
      repo.buscarConsolidadoVigente = jest.fn().mockResolvedValue(null);

      const resultado = await service.generarUno(
        "per-bim-2-uuid",
        "doc-quispe-uuid",
        "user-director-uuid",
        "Director",
        "192.168.1.10",
      );

      expect(resultado).toBeDefined();
      expect(resultado.docenteId).toBe("doc-quispe-uuid");
      expect(resultado.sesionesProgramadas).toBe(24);
    });

    it("CP-RF013-05: registrarDecision guarda decisión compromiso_mejora y observación", async () => {
      const dto: RegistrarDecisionDto = {
        decision: "compromiso_mejora",
        observacion: "Reunión el 20/07",
      };

      const resultado = await service.registrarDecision(
        "cons-1-uuid",
        dto,
        "user-director-uuid",
        "Director",
        "192.168.1.10",
      );

      expect(resultado).toBeDefined();
      expect(repo.actualizarDecision).toHaveBeenCalledWith(
        "cons-1-uuid",
        "compromiso_mejora",
        "Reunión el 20/07",
      );
    });

    it("CP-RF013-06: asegurarNoCerrado delega al servicio de bloqueo", async () => {
      await service.asegurarNoCerrado("doc-quispe-uuid", "per-bim-2-uuid");
      expect(bloqueoService.asegurarNoCerrado).toHaveBeenCalledWith(
        "doc-quispe-uuid",
        "per-bim-2-uuid",
      );
    });

    it("CP-RF013-06-extra: asegurarNoCerradoPorFecha delega al servicio de bloqueo", async () => {
      await service.asegurarNoCerradoPorFecha("doc-quispe-uuid", "2027-05-15");
      expect(bloqueoService.asegurarNoCerradoPorFecha).toHaveBeenCalledWith(
        "doc-quispe-uuid",
        "2027-05-15",
      );
    });
  });

  describe("HU2: Reapertura, Cierre y Versionado", () => {
    it("CP-RF013-07: reabrir delega en versionadoService y resuelve generadoPorNombre y reabiertoPorNombre desde repo", async () => {
      const resultado = await service.reabrir(
        "cons-1-uuid",
        "user-director-uuid",
        "Director",
        "192.168.1.10",
      );

      expect(resultado.mensaje).toBe(MENSAJES_CONSOLIDADO.CONSOLIDADO_REABIERTO);
      expect(resultado.consolidado.estado).toBe("reabierto");
      // Verifica la resolución de nombres del punto 2 de T08
      expect(resultado.consolidado.generadoPorNombre).toBe("Director General");
      expect(resultado.consolidado.reabiertoPorNombre).toBe("Director General");
      expect(repo.buscarConsolidadoConDetalle).toHaveBeenCalledWith("cons-1-uuid");
    });

    it("CP-RF013-07-extra: reabrir rechaza con ForbiddenException si el rol es Subdirector", async () => {
      await expect(
        service.reabrir("cons-1-uuid", "user-subdirector-uuid", "Subdirector"),
      ).rejects.toThrow(
        new ForbiddenException("Su rol no tiene autorización para modificar el consolidado."),
      );
    });

    it("CP-RF013-07-fallback: reabrir maneja adecuadamente si buscarConsolidadoConDetalle retorna null o falla", async () => {
      repo.buscarConsolidadoConDetalle = jest.fn().mockResolvedValue(null);

      const resultado = await service.reabrir("cons-1-uuid", "user-director-uuid", "Director");

      expect(resultado.mensaje).toBe(MENSAJES_CONSOLIDADO.CONSOLIDADO_REABIERTO);
      expect(resultado.consolidado.estado).toBe("reabierto");
    });

    it("CP-RF013-08: cerrar genera nueva versión e incluye resolución de nombres", async () => {
      const reabiertoFila = { ...mockConsolidadoFila, estado: "reabierto" as const };
      repo.buscarConsolidadoPorId = jest.fn().mockResolvedValue(reabiertoFila);

      const dto: CerrarConsolidadoDto = {
        motivoCambio: "Corrección de ausencia de fecha 12/06",
      };

      const resultado = await service.cerrar(
        "cons-1-uuid",
        dto,
        "user-director-uuid",
        "Director",
        "192.168.1.10",
      );

      expect(resultado.mensaje).toBe(MENSAJES_CONSOLIDADO.NUEVA_VERSION(2));
      expect(resultado.consolidado.version).toBe(2);
      expect(resultado.consolidado.generadoPorNombre).toBe("Director General");
    });

    it("CP-RF013-08-extra: cerrar rechaza con ForbiddenException si el rol es Subdirector", async () => {
      const dto: CerrarConsolidadoDto = { motivoCambio: "Intento" };
      await expect(
        service.cerrar("cons-1-uuid", dto, "user-subdirector-uuid", "Subdirector"),
      ).rejects.toThrow(
        new ForbiddenException("Su rol no tiene autorización para modificar el consolidado."),
      );
    });

    it("CP-RF013-10: obtenerHistorial retorna todas las versiones ordenadas", async () => {
      const resultado = await service.obtenerHistorial("cons-1-uuid");

      expect(resultado).toBeDefined();
      expect(resultado.docenteNombre).toBe(mockDocenteQuispe.nombreCompleto);
      expect(resultado.versiones).toHaveLength(1);
      expect(resultado.versiones[0].generadoPorNombre).toBe("Director General");
    });
  });

  describe("HU3: Mi Consolidado y Solicitudes de Revisión", () => {
    it("CP-RF013-11: miConsolidado delega en solicitudesService con periodoId y personaId", async () => {
      const resultado = await service.miConsolidado("per-bim-2-uuid", "per-quispe-uuid");

      expect(solicitudesService.miConsolidado).toHaveBeenCalledWith(
        "per-bim-2-uuid",
        "per-quispe-uuid",
      );
      expect(resultado).toBeDefined();
    });

    it("CP-RF013-12: crearSolicitud delega en solicitudesService con adjunto", async () => {
      const dto: CrearSolicitudRevisionDto = {
        consolidadoId: "cons-1-uuid",
        motivo: "Revisar sesión",
      };
      const mockFile = {} as Express.Multer.File;

      const resultado = await service.crearSolicitud(
        dto,
        mockFile,
        "per-quispe-uuid",
        "user-quispe-uuid",
        "192.168.1.1",
      );

      expect(solicitudesService.crear).toHaveBeenCalledWith(
        dto,
        mockFile,
        "per-quispe-uuid",
        "user-quispe-uuid",
        "192.168.1.1",
      );
      expect(resultado.mensaje).toBe("Su solicitud de revisión fue enviada al Director.");
    });

    it("CP-RF013-12-extra: listarSolicitudes delega en solicitudesService con query de filtros", async () => {
      const query: FiltroSolicitudesQueryDto = { estado: "solicitada" };
      await service.listarSolicitudes(query);
      expect(solicitudesService.listar).toHaveBeenCalledWith(query);
    });

    it("CP-RF013-15: aceptarSolicitud delega en solicitudesService con dto y rol", async () => {
      const dto: ResolverSolicitudDto = { respuesta: "Procedente" };
      const resultado = await service.aceptarSolicitud(
        "sol-1",
        dto,
        "user-director-uuid",
        "Director",
        "192.168.1.1",
      );

      expect(solicitudesService.aceptar).toHaveBeenCalledWith(
        "sol-1",
        dto,
        "user-director-uuid",
        "Director",
        "192.168.1.1",
      );
      expect(resultado.estado).toBe("aceptada");
    });

    it("CP-RF013-16: rechazarSolicitud delega en solicitudesService con respuesta obligatoria", async () => {
      const dto: RechazarSolicitudDto = { respuesta: "Improcedente por falta de firma" };
      const resultado = await service.rechazarSolicitud(
        "sol-1",
        dto,
        "user-director-uuid",
        "Director",
        "192.168.1.1",
      );

      expect(solicitudesService.rechazar).toHaveBeenCalledWith(
        "sol-1",
        dto,
        "user-director-uuid",
        "Director",
        "192.168.1.1",
      );
      expect(resultado.estado).toBe("rechazada");
    });
  });

  describe("HU4: Reporte Bimestral, Exportación, Detalle y Seguridad de Acceso", () => {
    it("CP-RF013-18: generarFichaPdf delega en exportacionService y retorna buffer de PDF", async () => {
      const resultado = await service.generarFichaPdf("cons-1-uuid", mockUsuarioDirector);
      expect(exportacionService.generarFichaPdf).toHaveBeenCalledWith(
        "cons-1-uuid",
        mockUsuarioDirector,
      );
      expect(resultado.nombreArchivo).toBe("ficha.pdf");
    });

    it("CP-RF013-19: obtenerReporteBimestre delega en generacionService y retorna consolidado ordenable", async () => {
      const query: FiltroReporteBimestreQueryDto = {
        ordenarPor: "totalAusencias",
        direccion: "asc",
      };
      repo.listarConsolidadosVigentesPorPeriodo = jest.fn().mockResolvedValue([
        {
          ...mockConsolidadoFila,
          docente: mockDocenteQuispe,
        },
      ]);

      const resultado = await service.obtenerReporteBimestre("per-bim-2-uuid", query);
      expect(resultado).toBeDefined();
      expect(resultado.periodo.nombre).toBe("II Bimestre");
    });

    it("CP-RF013-19-extra: exportarReporteExcel delega en exportacionService y retorna buffer", async () => {
      const resultado = await service.exportarReporteExcel(
        "per-bim-2-uuid",
        "user-director-uuid",
        "192.168.1.1",
      );
      expect(exportacionService.exportarReporteExcel).toHaveBeenCalledWith(
        "per-bim-2-uuid",
        "user-director-uuid",
        "192.168.1.1",
      );
      expect(resultado.nombreArchivo).toBe("reporte.xlsx");
    });

    it("CP-RF013-20: obtenerDetalle lanza ForbiddenException si un Docente intenta consultar el consolidado de otro", async () => {
      // Docente Flores intenta ver el consolidado del Docente Quispe
      await expect(service.obtenerDetalle("cons-1-uuid", mockUsuarioDocenteFlores)).rejects.toThrow(
        new ForbiddenException("No tiene acceso al consolidado de otro docente."),
      );
    });

    it("CP-RF013-20-extra: obtenerDetalle permite al Docente consultar su propio consolidado", async () => {
      // Docente Quispe consulta su propio consolidado
      const resultado = await service.obtenerDetalle("cons-1-uuid", mockUsuarioDocenteQuispe);

      expect(resultado).toBeDefined();
      expect(resultado.id).toBe("cons-1-uuid");
      expect(resultado.docenteId).toBe("doc-quispe-uuid");
    });

    it("CP-RF013-20-extra2: obtenerDetalle permite al Director y Subdirector consultar cualquier consolidado", async () => {
      const resDir = await service.obtenerDetalle("cons-1-uuid", mockUsuarioDirector);
      expect(resDir.docenteId).toBe("doc-quispe-uuid");

      const resSub = await service.obtenerDetalle("cons-1-uuid", mockUsuarioSubdirector);
      expect(resSub.docenteId).toBe("doc-quispe-uuid");
    });

    it("CP-RF013-20-extra3: obtenerDetalle lanza NotFoundException si el consolidado no existe", async () => {
      repo.buscarConsolidadoConDetalle = jest.fn().mockResolvedValue(null);

      await expect(
        service.obtenerDetalle("cons-inexistente-uuid", mockUsuarioDirector),
      ).rejects.toThrow(new NotFoundException(MENSAJES_CONSOLIDADO.CONSOLIDADO_NO_ENCONTRADO));
    });
  });
});
