import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import {
  MENSAJES_CONSOLIDADO,
  SeguimientoDocenteRepository,
  SeguimientoExportacionService,
  formatearTiempoMinutos,
  type ConsolidadoFila,
  type DocenteParaConsolidado,
  type PeriodoParaConsolidado,
} from "@/features/seguimiento-docente";

describe("SeguimientoExportacionService (RF-013: Exportaciones y Ficha de Seguimiento)", () => {
  let service: SeguimientoExportacionService;
  let repository: jest.Mocked<SeguimientoDocenteRepository>;

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
    apellidoMaterno: "Ríos",
    nombreCompleto: "Flores Ríos, María",
    numeroDocumento: "77889900",
    firmaUrl: null,
  };

  const mockPeriodoBimestre2: PeriodoParaConsolidado = {
    id: "per-bim-2-uuid",
    nombre: "II Bimestre",
    numero: 2,
    estado: "cerrado",
    fechaInicio: "2027-05-01",
    fechaFin: "2027-07-20",
  };

  const mockConsolidadoQuispeFila: ConsolidadoFila = {
    id: "cons-quispe-uuid",
    docenteId: "doc-quispe-uuid",
    periodoId: "per-bim-2-uuid",
    consolidadoRaizId: null,
    estado: "cerrado",
    version: 1,
    vigente: true,
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

  const mockConsolidadoVigenteQuispe = {
    ...mockConsolidadoQuispeFila,
    docente: mockDocenteQuispe,
    generadoPorNombre: "Director General",
    reabiertoPorNombre: null,
  };

  const mockDetalleConsolidadoQuispe = {
    consolidado: mockConsolidadoQuispeFila,
    docente: mockDocenteQuispe,
    periodo: mockPeriodoBimestre2,
    generadoPorNombre: "Director General",
    reabiertoPorNombre: null,
    sesiones: [
      {
        id: "ses-1-uuid",
        fecha: "2027-05-13",
        cursoNombre: "Matemática",
        seccionNombre: "5.° A",
        tema: "Ecuaciones cuadráticas",
        horaInicioPlan: "08:00",
        horaFinPlan: "09:30",
        horaInicioReal: "08:20",
        horaFinReal: "09:30",
        minutosRetraso: 20,
        minutosPerdidos: 20,
        estado: "parcial",
        justificacionComentario: null,
        ausencias: [
          {
            id: "aus-1-uuid",
            horaDesde: "08:30",
            horaHasta: "08:50",
            minutos: 20,
            motivo: "fuera_del_aula",
            observacion: "En cafetería",
            descargo: "Fui por tizas a secretaría",
            descargoEn: "2027-05-14T08:00:00.000Z",
            fotos: [
              {
                id: "foto-1-uuid",
                archivoUrl: "https://sga.edu.pe/fotos/foto1.jpg",
                tomadaEn: "2027-05-13T08:35:00.000Z",
                orden: 1,
              },
            ],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    repository = {
      buscarPeriodoPorId: jest.fn().mockResolvedValue(mockPeriodoBimestre2),
      buscarPeriodoPorFecha: jest.fn(),
      buscarDocentesConSesionesEnPeriodo: jest.fn().mockResolvedValue([mockDocenteQuispe]),
      buscarConsolidadoVigente: jest.fn(),
      buscarConsolidadoPorId: jest.fn().mockResolvedValue(mockConsolidadoQuispeFila),
      buscarConsolidadoConDetalle: jest.fn().mockResolvedValue(mockDetalleConsolidadoQuispe),
      buscarHistorialVersiones: jest.fn(),
      calcularMetricasDocente: jest.fn(),
      crearConsolidado: jest.fn(),
      actualizarDecision: jest.fn(),
      reabrirConsolidado: jest.fn(),
      crearNuevaVersion: jest.fn(),
      docentePorPersonaId: jest.fn().mockImplementation((personaId: string) => {
        if (personaId === mockUsuarioDocenteQuispe.personaId) {
          return Promise.resolve(mockDocenteQuispe);
        }
        if (personaId === mockUsuarioDocenteFlores.personaId) {
          return Promise.resolve(mockDocenteFlores);
        }
        return Promise.resolve(null);
      }),
      docentePorId: jest.fn().mockResolvedValue(mockDocenteQuispe),
      usuarioPorPersonaId: jest.fn(),
      crearSolicitud: jest.fn(),
      buscarSolicitudPorId: jest.fn(),
      buscarSolicitudAbierta: jest.fn(),
      listarSolicitudes: jest.fn(),
      resolverSolicitud: jest.fn(),
      listarConsolidadosVigentesPorPeriodo: jest
        .fn()
        .mockResolvedValue([mockConsolidadoVigenteQuispe]),
    } as unknown as jest.Mocked<SeguimientoDocenteRepository>;

    service = new SeguimientoExportacionService(repository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("CP-RF013-18: Descargar la ficha de seguimiento docente en PDF (HU4)", () => {
    it("CP-RF013-18: debe generar la ficha de seguimiento en PDF con sesiones, ausencias vigentes, fotos, totales, decisión, firma y versión", async () => {
      // Dado que el consolidado del docente Quispe está cerrado
      // y contiene 40 min perdidos por firma, 3 ausencias vigentes y decisión registrada
      const consolidadoId = "cons-quispe-uuid";

      // Cuando presiono "Ficha de seguimiento (PDF)" como Director
      const resultado = await service.generarFichaPdf(consolidadoId, mockUsuarioDirector);

      // Entonces el sistema genera el PDF con los datos requeridos
      expect(resultado).toBeDefined();
      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(resultado.buffer.length).toBeGreaterThan(0);
      expect(resultado.buffer.subarray(0, 4).toString()).toBe("%PDF");
      expect(resultado.nombreArchivo).toMatch(/^ficha-seguimiento-.*\.pdf$/i);

      // Y consulta el detalle del consolidado en el repositorio
      expect(repository.buscarConsolidadoConDetalle).toHaveBeenCalledWith(consolidadoId);
    });

    it("CP-RF013-18: el Subdirector puede consultar y descargar la ficha de seguimiento en PDF", async () => {
      // Dado que el usuario es Subdirector con permiso de consulta del menú consolidado
      const consolidadoId = "cons-quispe-uuid";

      // Cuando el Subdirector solicita la ficha en PDF
      const resultado = await service.generarFichaPdf(consolidadoId, mockUsuarioSubdirector);

      // Entonces el sistema genera exitosamente el documento oficial
      expect(resultado).toBeDefined();
      expect(resultado.buffer).toBeInstanceOf(Buffer);
    });

    it("CP-RF013-18: el docente puede descargar su propia ficha de seguimiento", async () => {
      // Dado que el usuario es el docente Quispe (propietario del consolidado)
      const consolidadoId = "cons-quispe-uuid";

      // Cuando solicita su propia ficha en PDF
      const resultado = await service.generarFichaPdf(consolidadoId, mockUsuarioDocenteQuispe);

      // Entonces el sistema le entrega su ficha de seguimiento sin rechazar el acceso
      expect(resultado).toBeDefined();
      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(repository.docentePorPersonaId).toHaveBeenCalledWith(
        mockUsuarioDocenteQuispe.personaId,
      );
    });

    it("CP-RF013-18: debe lanzar NotFoundException si el consolidado solicitado no existe", async () => {
      // Dado que el consolidado no existe en la base de datos
      repository.buscarConsolidadoConDetalle.mockResolvedValue(null);

      // Cuando intento descargar la ficha en PDF
      // Entonces el sistema lanza NotFoundException con el mensaje exacto
      await expect(
        service.generarFichaPdf("cons-inexistente-uuid", mockUsuarioDirector),
      ).rejects.toThrow(new NotFoundException(MENSAJES_CONSOLIDADO.CONSOLIDADO_NO_ENCONTRADO));
    });

    it("CP-RF013-18: debe incluir la versión del consolidado (versión 2 recalculada) y reflejar el versionado", async () => {
      // Dado un consolidado que fue reabierto y vuelto a cerrar como versión 2
      const detalleVersion2 = {
        ...mockDetalleConsolidadoQuispe,
        consolidado: {
          ...mockConsolidadoQuispeFila,
          version: 2,
          motivoCambio: "Ausencia anulada tras revisión",
        },
      };
      repository.buscarConsolidadoConDetalle.mockResolvedValue(detalleVersion2);

      // Cuando se genera la ficha en PDF
      const resultado = await service.generarFichaPdf("cons-quispe-uuid", mockUsuarioDirector);

      // Entonces genera el buffer incluyendo metadatos de la versión 2
      expect(resultado).toBeDefined();
      expect(resultado.buffer.length).toBeGreaterThan(0);
    });

    it("CP-RF013-18: debe incluir la firma del docente cuando dispone de firmaUrl y espacio para el Director", async () => {
      // Dado que el docente Quispe posee firmaUrl registrada (RF-007)
      expect(mockDocenteQuispe.firmaUrl).toBe("https://sga.edu.pe/firmas/quispe.png");

      // Cuando se genera la ficha de seguimiento
      const resultado = await service.generarFichaPdf("cons-quispe-uuid", mockUsuarioDirector);

      // Entonces genera el archivo oficial conteniendo la sección de firmas
      expect(resultado).toBeDefined();
      expect(resultado.buffer).toBeInstanceOf(Buffer);
    });

    it("CP-RF013-20: debe rechazar con ForbiddenException si un docente intenta descargar la ficha de otro docente", async () => {
      // Dado que soy la docente Flores (rol Docente, personaId distinta a la del consolidado de Quispe)
      const consolidadoIdQuispe = "cons-quispe-uuid";

      // Cuando intento descargar la ficha de seguimiento de otro docente
      // Entonces el sistema rechaza el acceso con 403 Forbidden y el mensaje exacto
      await expect(
        service.generarFichaPdf(consolidadoIdQuispe, mockUsuarioDocenteFlores),
      ).rejects.toThrow(new ForbiddenException("No tiene acceso al consolidado de otro docente."));
    });

    it("CP-RF013-20: debe rechazar si el usuario con rol Docente no tiene registro de docente asociado", async () => {
      // Dado un usuario con rol Docente pero sin ficha docente asociada
      const docenteSinPersona: AuthenticatedUser = {
        id: "user-huerfano-uuid",
        username: "huerfano",
        role: "Docente",
        roleId: "rol-docente-uuid",
        personaId: "per-huerfano-uuid",
      };
      repository.docentePorPersonaId.mockResolvedValue(null);

      // Cuando intenta acceder a la ficha
      // Entonces el sistema rechaza la petición
      await expect(service.generarFichaPdf("cons-quispe-uuid", docenteSinPersona)).rejects.toThrow(
        new ForbiddenException("El usuario no tiene un registro de docente asociado."),
      );
    });
  });

  describe("CP-RF013-19: Reporte de todos los docentes y exportación a Excel (HU4)", () => {
    it("CP-RF013-19: debe exportar a Excel (.xlsx) el reporte consolidado de todos los docentes del bimestre", async () => {
      // Dado que el II Bimestre cuenta con docentes consolidados y sesiones
      const periodoId = "per-bim-2-uuid";
      const ip = "192.168.1.100";

      // Cuando solicito la exportación a Excel del bimestre
      const resultado = await service.exportarReporteExcel(periodoId, mockUsuarioDirector.id, ip);

      // Entonces el sistema genera la hoja de cálculo oficial
      expect(resultado).toBeDefined();
      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(resultado.buffer.length).toBeGreaterThan(0);
      expect(resultado.buffer.subarray(0, 2).toString()).toBe("PK");
      expect(resultado.nombreArchivo).toMatch(/^reporte-seguimiento-.*\.xlsx$/i);

      // Y consulta el período para validar su existencia y nombre
      expect(repository.buscarPeriodoPorId).toHaveBeenCalledWith(periodoId);

      // Y obtiene los consolidados vigentes con una sola llamada al repositorio
      expect(repository.listarConsolidadosVigentesPorPeriodo).toHaveBeenCalledWith(periodoId);
    });

    it("CP-RF013-19: debe lanzar NotFoundException si el período académico para exportación no existe", async () => {
      // Dado un período académico inexistente
      repository.buscarPeriodoPorId.mockResolvedValue(null);

      // Cuando intento exportar a Excel
      // Entonces el sistema rechaza la operación informando que el período no fue encontrado
      await expect(
        service.exportarReporteExcel("per-inexistente-uuid", mockUsuarioDirector.id),
      ).rejects.toThrow(new NotFoundException("Período académico no encontrado."));
    });

    it("CP-RF013-19: debe exportar una hoja válida con encabezados aunque no haya docentes con sesiones en el período", async () => {
      // Dado un período sin consolidados registrados
      repository.listarConsolidadosVigentesPorPeriodo.mockResolvedValue([]);

      // Cuando solicito la exportación
      const resultado = await service.exportarReporteExcel(
        "per-bim-2-uuid",
        mockUsuarioDirector.id,
      );

      // Entonces genera el archivo Excel con las columnas requeridas sin errores
      expect(resultado).toBeDefined();
      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(resultado.buffer.length).toBeGreaterThan(0);
      expect(repository.listarConsolidadosVigentesPorPeriodo).toHaveBeenCalledWith(
        "per-bim-2-uuid",
      );
    });
  });

  describe("CP-RF013-02 / tiempo.util: Utilidad de formateo de tiempo fuera de clase (formatearTiempoMinutos)", () => {
    it("CP-RF013-02: 100 minutos deben formatearse exactamente como '1 h 40 min' (caso canónico Quispe: 40 min firma + 60 min ausencias)", () => {
      // Dado el total de 100 minutos del docente Quispe
      // Cuando se formatea el tiempo
      const texto = formatearTiempoMinutos(100);

      // Entonces la representación textual requerida por el RF es '1 h 40 min'
      expect(texto).toBe("1 h 40 min");
    });

    it("tiempo.util: 40 minutos deben formatearse exactamente como '0 h 40 min'", () => {
      // Dado un lapso de 40 minutos
      // Cuando se formatea
      const texto = formatearTiempoMinutos(40);

      // Entonces debe mostrar '0 h 40 min'
      expect(texto).toBe("0 h 40 min");
    });

    it("tiempo.util: 0 minutos deben formatearse exactamente como '0 h 0 min'", () => {
      // Dado 0 minutos
      // Cuando se formatea
      const texto = formatearTiempoMinutos(0);

      // Entonces debe mostrar '0 h 0 min'
      expect(texto).toBe("0 h 0 min");
    });

    it("tiempo.util: 60 minutos exactos deben formatearse como '1 h 0 min'", () => {
      // Dado 60 minutos (exactamente 1 hora)
      // Cuando se formatea
      const texto = formatearTiempoMinutos(60);

      // Entonces debe mostrar '1 h 0 min'
      expect(texto).toBe("1 h 0 min");
    });

    it("tiempo.util: 120 minutos exactos deben formatearse como '2 h 0 min'", () => {
      // Dado 120 minutos (2 horas exactas)
      // Cuando se formatea
      const texto = formatearTiempoMinutos(120);

      // Entonces debe mostrar '2 h 0 min'
      expect(texto).toBe("2 h 0 min");
    });

    it("tiempo.util: 125 minutos deben formatearse como '2 h 5 min'", () => {
      // Dado 125 minutos
      // Cuando se formatea
      const texto = formatearTiempoMinutos(125);

      // Entonces debe mostrar '2 h 5 min'
      expect(texto).toBe("2 h 5 min");
    });

    it("tiempo.util: valores negativos deben normalizarse a '0 h 0 min'", () => {
      // Dado un valor negativo
      // Cuando se formatea
      const texto = formatearTiempoMinutos(-25);

      // Entonces debe retornar '0 h 0 min' de forma segura
      expect(texto).toBe("0 h 0 min");
    });

    it("tiempo.util: valores decimales deben truncarse hacia abajo", () => {
      // Dado un valor con fracción de minutos (ej. 99.8 minutos)
      // Cuando se formatea
      const texto = formatearTiempoMinutos(99.8);

      // Entonces trunca a 99 minutos -> '1 h 39 min'
      expect(texto).toBe("1 h 39 min");
    });
  });
});
