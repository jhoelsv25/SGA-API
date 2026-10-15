import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import {
  ConsolidadoVersionadoService,
  SeguimientoDocenteRepository,
  MENSAJES_CONSOLIDADO,
  type CerrarConsolidadoDto,
  type ConsolidadoFila,
  type DocenteParaConsolidado,
  type HistorialConsolidadoResponseDto,
  type ISeguimientoDocenteRepository,
  type MetricasCalculadasDocente,
  type PeriodoParaConsolidado,
} from "@/features/seguimiento-docente";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

describe("RF-013: Reabrir y versionar el consolidado docente (HU2)", () => {
  let service: ConsolidadoVersionadoService;
  let repo: Mocks<ISeguimientoDocenteRepository>;
  let notificaciones: Mocks<NotificacionesService>;
  let audit: Mocks<AuditService>;

  const periodoEjemplo: PeriodoParaConsolidado = {
    id: "periodo-bimestre-2-uuid",
    nombre: "II Bimestre",
    numero: 2,
    estado: "cerrado",
    fechaInicio: "2027-05-15",
    fechaFin: "2027-07-20",
  };

  const docenteQuispe: DocenteParaConsolidado = {
    id: "doc-quispe-uuid",
    personaId: "per-quispe-uuid",
    usuarioId: "user-quispe-uuid",
    nombres: "Juan",
    apellidoPaterno: "Quispe",
    apellidoMaterno: "Mamani",
    nombreCompleto: "Quispe Mamani, Juan",
    numeroDocumento: "10203040",
    firmaUrl: "/uploads/firmas/doc-quispe.png",
  };

  const consolidadoV1Cerrado: ConsolidadoFila = {
    id: "cons-v1-uuid",
    docenteId: "doc-quispe-uuid",
    periodoId: "periodo-bimestre-2-uuid",
    consolidadoRaizId: "cons-v1-uuid",
    estado: "cerrado",
    version: 1,
    vigente: true,
    motivoCambio: null,
    sesionesProgramadas: 20,
    sesionesCumplidas: 18,
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

  const consolidadoV1Reabierto: ConsolidadoFila = {
    ...consolidadoV1Cerrado,
    estado: "reabierto",
    reabiertoPorId: "user-director-uuid",
    reabiertoEn: "2027-07-22T08:30:00.000Z",
  };

  const metricasRecalculadasV2: MetricasCalculadasDocente = {
    docenteId: "doc-quispe-uuid",
    sesionesProgramadas: 20,
    sesionesCumplidas: 18,
    sesionesParciales: 1,
    sesionesNoCumplidas: 1,
    sesionesJustificadas: 0,
    minutosPerdidosFirma: 40,
    totalAusencias: 2, // Se anuló una ausencia de 20 min
    minutosFueraAula: 40, // 60 - 20 = 40 min
    totalMinutosFueraClase: 80, // 40 + 40 = 80 min (1 h 20 min)
  };

  const consolidadoV2Cerrado: ConsolidadoFila = {
    ...consolidadoV1Cerrado,
    id: "cons-v2-uuid",
    version: 2,
    vigente: true,
    estado: "cerrado",
    motivoCambio: "Ausencia anulada tras revisión",
    totalAusencias: 2,
    minutosFueraAula: 40,
    generadoPorId: "user-director-uuid",
    generadoEn: "2027-07-22T09:00:00.000Z",
  };

  beforeEach(() => {
    repo = {
      buscarPeriodoPorId: jest.fn().mockResolvedValue(periodoEjemplo),
      buscarConsolidadoPorId: jest.fn().mockResolvedValue(consolidadoV1Cerrado),
      buscarConsolidadoVigente: jest.fn().mockResolvedValue(consolidadoV1Cerrado),
      reabrirConsolidado: jest.fn().mockResolvedValue(consolidadoV1Reabierto),
      crearNuevaVersion: jest.fn().mockResolvedValue(consolidadoV2Cerrado),
      calcularMetricasDocente: jest.fn().mockResolvedValue(metricasRecalculadasV2),
      docentePorId: jest.fn().mockResolvedValue(docenteQuispe),
      buscarHistorialVersiones: jest.fn().mockResolvedValue([
        {
          ...consolidadoV2Cerrado,
          generadoPorNombre: "Director General",
          reabiertoPorNombre: null,
        },
        {
          ...consolidadoV1Cerrado,
          vigente: false,
          generadoPorNombre: "Director General",
          reabiertoPorNombre: "Director General",
        },
      ]),
    };

    notificaciones = {
      enviar: jest.fn().mockResolvedValue(undefined),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new ConsolidadoVersionadoService(
      repo as unknown as SeguimientoDocenteRepository,
      notificaciones as unknown as NotificacionesService,
      audit as unknown as AuditService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("CP-RF013-07: Reabrir un consolidado", () => {
    it("debe pasar el consolidado a reabierto, mostrar mensaje oficial, notificar al docente y registrar auditoría", async () => {
      // Dado que el consolidado del docente Quispe está cerrado
      const actorId = "user-director-uuid";
      const rol = "director";
      const ip = "192.168.1.10";

      // Cuando presiono 'Reabrir' y confirmo
      const resultado = await service.reabrir("cons-v1-uuid", actorId, rol, ip);

      // Entonces el consolidado pasa a reabierto y el sistema muestra el mensaje exacto
      expect(resultado.mensaje).toBe(MENSAJES_CONSOLIDADO.CONSOLIDADO_REABIERTO);
      expect(resultado.mensaje).toBe(
        "Consolidado reabierto. Ya se pueden corregir las sesiones y ausencias del docente en este bimestre.",
      );
      expect(resultado.consolidado.estado).toBe("reabierto");

      // Y persiste la reapertura a través del repositorio
      expect(repo.reabrirConsolidado).toHaveBeenCalledWith("cons-v1-uuid", actorId);

      // Y notifica al docente
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-quispe-uuid",
          titulo: expect.stringContaining("reabierto") as unknown,
          enlaceUrl: "/admin/mi-seguimiento",
        }),
      );

      // Y registra auditoría inmutable
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: actorId,
          accion: "actualizar",
          tabla: "consolidados_docente",
          registroId: "cons-v1-uuid",
          direccionIp: ip,
        }),
      );
    });

    it("debe rechazar la acción con 403 Forbidden si un Subdirector intenta reabrir", async () => {
      // Dado que el usuario tiene rol Subdirector
      const actorId = "user-subdirector-uuid";
      const rol = "subdirector";

      // Cuando intenta reabrir el consolidado
      // Entonces el sistema bloquea la acción con 403
      await expect(service.reabrir("cons-v1-uuid", actorId, rol)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.reabrir("cons-v1-uuid", actorId, rol)).rejects.toThrow(
        "Su rol no tiene autorización para modificar el consolidado.",
      );

      expect(repo.reabrirConsolidado).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it("debe lanzar NotFoundException si el consolidado solicitado no existe", async () => {
      // Dado que el consolidado no existe en base de datos
      repo.buscarConsolidadoPorId = jest.fn().mockResolvedValue(null);

      // Cuando intento reabrirlo
      // Entonces el sistema lanza 404 con mensaje oficial
      await expect(
        service.reabrir("cons-inexistente-uuid", "user-director-uuid", "director"),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.reabrir("cons-inexistente-uuid", "user-director-uuid", "director"),
      ).rejects.toThrow(MENSAJES_CONSOLIDADO.CONSOLIDADO_NO_ENCONTRADO);

      expect(repo.reabrirConsolidado).not.toHaveBeenCalled();
    });

    it("debe lanzar BadRequestException si el consolidado ya se encuentra en estado reabierto", async () => {
      // Dado que el consolidado ya se encuentra en estado 'reabierto'
      repo.buscarConsolidadoPorId = jest.fn().mockResolvedValue(consolidadoV1Reabierto);

      // Cuando intento reabrirlo de nuevo
      // Entonces el sistema lanza 400 Bad Request
      await expect(
        service.reabrir("cons-v1-uuid", "user-director-uuid", "director"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.reabrir("cons-v1-uuid", "user-director-uuid", "director"),
      ).rejects.toThrow("El consolidado ya se encuentra reabierto.");

      expect(repo.reabrirConsolidado).not.toHaveBeenCalled();
    });
  });

  describe("CP-RF013-08: Volver a cerrar con una versión nueva", () => {
    it("debe recalcular totales, crear la versión 2 vigente, dejar la versión 1 con vigencia 0 y mostrar mensaje oficial", async () => {
      // Dado que reabrí el consolidado y se anuló una ausencia de 20 minutos
      repo.buscarConsolidadoPorId = jest.fn().mockResolvedValue(consolidadoV1Reabierto);
      const dto: CerrarConsolidadoDto = {
        motivoCambio: "Ausencia anulada tras revisión",
      };
      const actorId = "user-director-uuid";
      const rol = "director";
      const ip = "192.168.1.10";

      // Cuando presiono 'Cerrar consolidado' con el motivo 'Ausencia anulada tras revisión'
      const resultado = await service.cerrar("cons-v1-uuid", dto, actorId, rol, ip);

      // Entonces el sistema recalcula los totales
      expect(repo.calcularMetricasDocente).toHaveBeenCalledWith(
        "doc-quispe-uuid",
        "periodo-bimestre-2-uuid",
      );

      // Y crea la versión 2 vigente, dejando la anterior con vigencia 0
      expect(repo.crearNuevaVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          anteriorId: "cons-v1-uuid",
          consolidadoRaizId: "cons-v1-uuid",
          version: 2,
          motivoCambio: "Ausencia anulada tras revisión",
          generadoPorId: actorId,
          metricas: metricasRecalculadasV2,
        }),
      );

      // Y muestra el mensaje exacto del requerimiento
      expect(resultado.mensaje).toBe(MENSAJES_CONSOLIDADO.NUEVA_VERSION(2));
      expect(resultado.mensaje).toBe("Se generó la versión 2 del consolidado.");
      expect(resultado.consolidado.version).toBe(2);
      expect(resultado.consolidado.vigente).toBe(true);
      expect(resultado.consolidado.estado).toBe("cerrado");

      // Y registra auditoría inmutable de la creación de la nueva versión
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: actorId,
          accion: "crear",
          tabla: "consolidados_docente",
          registroId: "cons-v2-uuid",
          direccionIp: ip,
        }),
      );
    });

    it("debe rechazar la acción con 403 Forbidden si un Subdirector intenta cerrar la nueva versión", async () => {
      // Dado que el usuario tiene rol Subdirector
      repo.buscarConsolidadoPorId = jest.fn().mockResolvedValue(consolidadoV1Reabierto);
      const dto: CerrarConsolidadoDto = {
        motivoCambio: "Intento de cierre por subdirector",
      };

      // Cuando intenta cerrar el consolidado
      // Entonces el sistema bloquea la acción con 403
      await expect(
        service.cerrar("cons-v1-uuid", dto, "user-subdirector-uuid", "subdirector"),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.cerrar("cons-v1-uuid", dto, "user-subdirector-uuid", "subdirector"),
      ).rejects.toThrow("Su rol no tiene autorización para modificar el consolidado.");

      expect(repo.crearNuevaVersion).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it("debe lanzar BadRequestException si el consolidado se encuentra cerrado y no reabierto", async () => {
      // Dado que el consolidado ya se encuentra 'cerrado'
      repo.buscarConsolidadoPorId = jest.fn().mockResolvedValue(consolidadoV1Cerrado);
      const dto: CerrarConsolidadoDto = {
        motivoCambio: "Intento sobre consolidado cerrado",
      };

      // Cuando intento cerrarlo
      // Entonces el sistema lanza 400 Bad Request
      await expect(
        service.cerrar("cons-v1-uuid", dto, "user-director-uuid", "director"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.cerrar("cons-v1-uuid", dto, "user-director-uuid", "director"),
      ).rejects.toThrow("Solo se puede cerrar un consolidado que esté reabierto.");

      expect(repo.crearNuevaVersion).not.toHaveBeenCalled();
    });
  });

  describe("CP-RF013-09: Nuevo cierre sin motivo", () => {
    it("debe impedir la acción y mostrar 'Indique el motivo del cambio.' cuando motivoCambio está vacío", async () => {
      // Dado que el consolidado está reabierto
      repo.buscarConsolidadoPorId = jest.fn().mockResolvedValue(consolidadoV1Reabierto);
      const dtoVacio: CerrarConsolidadoDto = {
        motivoCambio: "",
      };

      // Cuando intento cerrarlo sin motivo del cambio
      // Entonces el sistema impide la acción y muestra 'Indique el motivo del cambio.'
      await expect(
        service.cerrar("cons-v1-uuid", dtoVacio, "user-director-uuid", "director"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.cerrar("cons-v1-uuid", dtoVacio, "user-director-uuid", "director"),
      ).rejects.toThrow(MENSAJES_CONSOLIDADO.NUEVO_CIERRE_SIN_MOTIVO);
      await expect(
        service.cerrar("cons-v1-uuid", dtoVacio, "user-director-uuid", "director"),
      ).rejects.toThrow("Indique el motivo del cambio.");

      expect(repo.crearNuevaVersion).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it("debe impedir la acción cuando motivoCambio solo contiene espacios en blanco", async () => {
      // Dado que el motivo solo contiene espacios
      repo.buscarConsolidadoPorId = jest.fn().mockResolvedValue(consolidadoV1Reabierto);
      const dtoEspacios: CerrarConsolidadoDto = {
        motivoCambio: "    ",
      };

      // Cuando intento cerrarlo
      // Entonces el sistema impide la acción con 400 Bad Request
      await expect(
        service.cerrar("cons-v1-uuid", dtoEspacios, "user-director-uuid", "director"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.cerrar("cons-v1-uuid", dtoEspacios, "user-director-uuid", "director"),
      ).rejects.toThrow(MENSAJES_CONSOLIDADO.NUEVO_CIERRE_SIN_MOTIVO);

      expect(repo.crearNuevaVersion).not.toHaveBeenCalled();
    });
  });

  describe("CP-RF013-10: Ver el historial de versiones", () => {
    it("debe mostrar cada versión con sus totales, autor, fecha y motivo de cambio marcando la vigente", async () => {
      // Dado que el consolidado tiene 2 versiones
      repo.buscarConsolidadoPorId = jest.fn().mockResolvedValue(consolidadoV2Cerrado);

      // Cuando abro 'Historial'
      const historial: HistorialConsolidadoResponseDto =
        await service.obtenerHistorial("cons-v2-uuid");

      // Entonces el sistema consulta el historial por la raíz
      expect(repo.buscarHistorialVersiones).toHaveBeenCalledWith("cons-v1-uuid");

      // Y muestra cada versión con sus totales, quién la generó, cuándo y el motivo del cambio
      expect(historial.consolidadoRaizId).toBe("cons-v1-uuid");
      expect(historial.docenteId).toBe("doc-quispe-uuid");
      expect(historial.versiones).toHaveLength(2);

      // Versión 2 (vigente)
      const version2 = historial.versiones[0];
      expect(version2.version).toBe(2);
      expect(version2.vigente).toBe(true);
      expect(version2.estado).toBe("cerrado");
      expect(version2.motivoCambio).toBe("Ausencia anulada tras revisión");
      expect(version2.generadoPorNombre).toBe("Director General");
      expect(version2.totalAusencias).toBe(2);
      expect(version2.totalMinutosFueraClase).toBe(80);
      expect(version2.tiempoFueraClaseTexto).toBe("1 h 20 min");

      // Versión 1 (no vigente, vigencia 0)
      const version1 = historial.versiones[1];
      expect(version1.version).toBe(1);
      expect(version1.vigente).toBe(false);
      expect(version1.totalAusencias).toBe(3);
      expect(version1.totalMinutosFueraClase).toBe(100);
      expect(version1.tiempoFueraClaseTexto).toBe("1 h 40 min");
    });

    it("debe lanzar NotFoundException si el consolidado para historial no existe", async () => {
      // Dado que el consolidado no existe
      repo.buscarConsolidadoPorId = jest.fn().mockResolvedValue(null);

      // Cuando intento consultar el historial
      // Entonces el sistema lanza 404 Not Found
      await expect(service.obtenerHistorial("cons-inexistente-uuid")).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.obtenerHistorial("cons-inexistente-uuid")).rejects.toThrow(
        MENSAJES_CONSOLIDADO.CONSOLIDADO_NO_ENCONTRADO,
      );

      expect(repo.buscarHistorialVersiones).not.toHaveBeenCalled();
    });
  });
});
