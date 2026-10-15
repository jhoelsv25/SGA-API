import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import {
  SolicitudesRevisionService,
  SeguimientoDocenteRepository,
  MENSAJES_CONSOLIDADO,
  type CrearSolicitudRevisionDto,
  type FiltroSolicitudesQueryDto,
  type RechazarSolicitudDto,
  type ResolverSolicitudDto,
  type SolicitudRevisionResponseDto,
  type SolicitudRevisionFila,
  type ConsolidadoFila,
  type DocenteParaConsolidado,
  type PeriodoParaConsolidado,
  type ISeguimientoDocenteRepository,
  type MiConsolidadoResponseDto,
} from "@/features/seguimiento-docente";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

describe("RF-013: Solicitud de revisión del docente y mi seguimiento (HU3)", () => {
  let service: SolicitudesRevisionService;
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
    id: "cons-quispe-uuid",
    docenteId: "doc-quispe-uuid",
    periodoId: "periodo-bimestre-2-uuid",
    consolidadoRaizId: "cons-quispe-uuid",
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

  const consolidadoReabierto: ConsolidadoFila = {
    ...consolidadoV1Cerrado,
    estado: "reabierto",
    reabiertoPorId: "user-director-uuid",
    reabiertoEn: "2027-07-23T11:00:00.000Z",
  };

  const detalleConsolidadoCompleto = {
    consolidado: consolidadoV1Cerrado,
    docente: docenteQuispe,
    periodo: periodoEjemplo,
    generadoPorNombre: "Director General",
    reabiertoPorNombre: null,
    sesiones: [
      {
        id: "ses-1",
        fecha: "2027-06-12",
        cursoNombre: "Matemática",
        seccionNombre: "5.° A",
        tema: "Álgebra lineal",
        horaInicioPlan: "08:00",
        horaFinPlan: "09:30",
        horaInicioReal: null,
        horaFinReal: null,
        minutosRetraso: 0,
        minutosPerdidos: 0,
        estado: "no_cumplida",
        justificacionComentario: null,
        ausencias: [],
      },
    ],
  };

  const solicitudPendienteFila: SolicitudRevisionFila = {
    id: "sol-1-uuid",
    consolidadoId: "cons-quispe-uuid",
    docenteId: "doc-quispe-uuid",
    motivo: "El 12/06 firmé en el kiosko; adjunto foto de la pizarra",
    adjuntoRuta: "/uploads/solicitudes-revision/foto-pizarra.png",
    adjuntoNombre: "foto-pizarra.png",
    estado: "solicitada",
    respuesta: null,
    resueltaPorId: null,
    creadoEn: "2027-06-15T10:00:00.000Z",
    resueltaEn: null,
  };

  const solicitudAceptadaFila: SolicitudRevisionFila = {
    ...solicitudPendienteFila,
    estado: "aceptada",
    respuesta: "Se revisará la sesión del 12/06",
    resueltaPorId: "user-director-uuid",
    resueltaEn: "2027-06-16T15:00:00.000Z",
  };

  const solicitudRechazadaFila: SolicitudRevisionFila = {
    ...solicitudPendienteFila,
    estado: "rechazada",
    respuesta: "La sesión no tiene firma de ingreso",
    resueltaPorId: "user-director-uuid",
    resueltaEn: "2027-06-16T15:00:00.000Z",
  };

  beforeEach(() => {
    repo = {
      buscarPeriodoPorId: jest.fn().mockResolvedValue(periodoEjemplo),
      buscarConsolidadoPorId: jest.fn().mockResolvedValue(consolidadoV1Cerrado),
      buscarConsolidadoVigente: jest.fn().mockResolvedValue(consolidadoV1Cerrado),
      buscarConsolidadoConDetalle: jest.fn().mockResolvedValue(detalleConsolidadoCompleto),
      docentePorPersonaId: jest.fn().mockResolvedValue(docenteQuispe),
      docentePorId: jest.fn().mockResolvedValue(docenteQuispe),
      buscarSolicitudAbierta: jest.fn().mockResolvedValue(null),
      crearSolicitud: jest.fn().mockResolvedValue(solicitudPendienteFila),
      buscarSolicitudPorId: jest.fn().mockResolvedValue({
        ...solicitudPendienteFila,
        docente: docenteQuispe,
        periodo: periodoEjemplo,
        resueltaPorNombre: null,
      }),
      resolverSolicitud: jest.fn().mockResolvedValue(solicitudAceptadaFila),
      reabrirConsolidado: jest.fn().mockResolvedValue(consolidadoReabierto),
      listarSolicitudes: jest.fn().mockResolvedValue([
        {
          ...solicitudPendienteFila,
          docente: docenteQuispe,
          periodo: periodoEjemplo,
          resueltaPorNombre: null,
        },
      ]),
    };

    notificaciones = {
      enviar: jest.fn().mockResolvedValue(undefined),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new SolicitudesRevisionService(
      repo as unknown as SeguimientoDocenteRepository,
      notificaciones as unknown as NotificacionesService,
      audit as unknown as AuditService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("CP-RF013-11: Ver mi consolidado", () => {
    it("debe mostrar mis totales, el detalle por sesión y la decisión del Director sin el historial de versiones", async () => {
      // Dado que se generó mi consolidado del II Bimestre
      const periodoId = "periodo-bimestre-2-uuid";
      const personaId = "per-quispe-uuid";

      // Cuando abro la notificación o 'Mi seguimiento'
      const resultado: MiConsolidadoResponseDto = await service.miConsolidado(periodoId, personaId);

      // Entonces el sistema resuelve el docente autenticado
      expect(repo.docentePorPersonaId).toHaveBeenCalledWith(personaId);
      expect(repo.buscarConsolidadoVigente).toHaveBeenCalledWith("doc-quispe-uuid", periodoId);

      // Y muestra los totales del consolidado
      expect(resultado.consolidado).toBeDefined();
      expect(resultado.consolidado.docenteId).toBe("doc-quispe-uuid");
      expect(resultado.consolidado.sesionesProgramadas).toBe(20);
      expect(resultado.consolidado.sesionesCumplidas).toBe(18);
      expect(resultado.consolidado.totalAusencias).toBe(3);
      expect(resultado.consolidado.totalMinutosFueraClase).toBe(100);
      expect(resultado.consolidado.tiempoFueraClaseTexto).toBe("1 h 40 min");

      // Y muestra la decisión y observación del Director
      expect(resultado.consolidado.decision).toBe("compromiso_mejora");
      expect(resultado.consolidado.observacion).toBe("Reunión el 20/07");

      // Y muestra el detalle por sesión
      expect(resultado.sesiones).toHaveLength(1);
      expect(resultado.sesiones[0].estado).toBe("no_cumplida");

      // Y refleja que no hay solicitud pendiente
      expect(resultado.solicitudPendiente).toBeNull();

      // Y el requerimiento estipula estrictamente: 'sin el historial de versiones'
      expect(resultado).not.toHaveProperty("versiones");
      expect(resultado).not.toHaveProperty("historial");
    });

    it("debe incluir la solicitud pendiente si el docente ya tiene una en curso", async () => {
      // Dado que el docente tiene una solicitud pendiente de revisión
      repo.buscarSolicitudAbierta = jest.fn().mockResolvedValue(solicitudPendienteFila);

      // Cuando consulta su seguimiento
      const resultado = await service.miConsolidado("periodo-bimestre-2-uuid", "per-quispe-uuid");

      // Entonces se incluye la solicitud pendiente en la respuesta
      expect(resultado.solicitudPendiente).toBeDefined();
      expect(resultado.solicitudPendiente?.estado).toBe("solicitada");
      expect(resultado.solicitudPendiente?.motivo).toBe(
        "El 12/06 firmé en el kiosko; adjunto foto de la pizarra",
      );
    });

    it("debe lanzar ForbiddenException si el usuario autenticado no está asociado a un docente", async () => {
      // Dado que la persona no es docente
      repo.docentePorPersonaId = jest.fn().mockResolvedValue(null);

      // Cuando intenta acceder a 'Mi seguimiento'
      // Entonces el sistema bloquea con 403
      await expect(
        service.miConsolidado("periodo-bimestre-2-uuid", "per-no-docente-uuid"),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.miConsolidado("periodo-bimestre-2-uuid", "per-no-docente-uuid"),
      ).rejects.toThrow("El usuario no tiene un registro de docente asociado.");
    });

    it("debe lanzar NotFoundException si aún no se ha generado el consolidado del bimestre", async () => {
      // Dado que aún no existe consolidado para este bimestre
      repo.buscarConsolidadoVigente = jest.fn().mockResolvedValue(null);

      // Cuando intenta acceder
      // Entonces el sistema responde con 404
      await expect(
        service.miConsolidado("periodo-bimestre-2-uuid", "per-quispe-uuid"),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.miConsolidado("periodo-bimestre-2-uuid", "per-quispe-uuid"),
      ).rejects.toThrow(MENSAJES_CONSOLIDADO.CONSOLIDADO_NO_ENCONTRADO);
    });
  });

  describe("CP-RF013-12: Enviar una solicitud de revisión", () => {
    it("debe registrar la solicitud en estado 'solicitada', notificar al Director, registrar auditoría y responder con mensaje oficial", async () => {
      // Dado que veo una sesión marcada no_cumplida que sí dicté
      const dto: CrearSolicitudRevisionDto = {
        consolidadoId: "cons-quispe-uuid",
        motivo: "El 12/06 firmé en el kiosko; adjunto foto de la pizarra",
      };
      const adjuntoSimulado = {
        originalname: "foto-pizarra.png",
        filename: "arch-123.png",
        path: "/uploads/solicitudes-revision/arch-123.png",
        mimetype: "image/png",
        size: 1024 * 1024,
      } as Express.Multer.File;
      const personaId = "per-quispe-uuid";
      const actorId = "user-quispe-uuid";
      const ip = "192.168.1.50";

      // Cuando envío una solicitud con motivo y adjunto
      const resultado = await service.crear(dto, adjuntoSimulado, personaId, actorId, ip);

      // Entonces el sistema registra la solicitud como solicitada
      expect(repo.crearSolicitud).toHaveBeenCalledWith(
        expect.objectContaining({
          consolidadoId: "cons-quispe-uuid",
          docenteId: "doc-quispe-uuid",
          motivo: "El 12/06 firmé en el kiosko; adjunto foto de la pizarra",
        }),
      );

      // Y notifica al Director
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          titulo: expect.stringContaining("solicitud") as unknown,
          enlaceUrl: "/admin/solicitudes-revision",
        }),
      );

      // Y registra auditoría inmutable
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: actorId,
          accion: "crear",
          tabla: "solicitudes_revision_consolidado",
          registroId: "sol-1-uuid",
          direccionIp: ip,
        }),
      );

      // Y muestra el mensaje exacto
      expect(resultado.mensaje).toBe(MENSAJES_CONSOLIDADO.SOLICITUD_ENVIADA);
      expect(resultado.mensaje).toBe("Su solicitud de revisión fue enviada al Director.");
      expect(resultado.solicitud.estado).toBe("solicitada");
    });

    it("debe permitir crear la solicitud de revisión sin adjunto", async () => {
      // Dado que el docente envía la solicitud sin archivo adjunto
      const dto: CrearSolicitudRevisionDto = {
        consolidadoId: "cons-quispe-uuid",
        motivo: "Revisar los minutos perdidos de la sesión del 10/06",
      };

      // Cuando envío sin adjunto
      const resultado = await service.crear(dto, undefined, "per-quispe-uuid", "user-quispe-uuid");

      // Entonces la solicitud se crea con adjunto nulo
      expect(repo.crearSolicitud).toHaveBeenCalledWith(
        expect.objectContaining({
          adjuntoRuta: null,
          adjuntoNombre: null,
        }),
      );
      expect(resultado.mensaje).toBe(MENSAJES_CONSOLIDADO.SOLICITUD_ENVIADA);
    });

    it("debe impedir que un docente solicite revisión sobre el consolidado de otro docente con 403 Forbidden", async () => {
      // Dado un consolidado que pertenece a otro docente
      repo.buscarConsolidadoPorId = jest.fn().mockResolvedValue({
        ...consolidadoV1Cerrado,
        docenteId: "doc-otro-uuid",
      });
      const dto: CrearSolicitudRevisionDto = {
        consolidadoId: "cons-quispe-uuid",
        motivo: "Intento sobre otro consolidado",
      };

      // Cuando intenta registrar la solicitud
      // Entonces el sistema bloquea la acción con 403
      await expect(
        service.crear(dto, undefined, "per-quispe-uuid", "user-quispe-uuid"),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.crear(dto, undefined, "per-quispe-uuid", "user-quispe-uuid"),
      ).rejects.toThrow("No tiene acceso al consolidado de otro docente.");

      expect(repo.crearSolicitud).not.toHaveBeenCalled();
    });
  });

  describe("CP-RF013-13: Solicitud sin motivo", () => {
    it("debe impedir el envío y mostrar 'Indique el motivo de su solicitud.' cuando el motivo está vacío", async () => {
      // Dado que estoy creando una solicitud
      const dtoVacio: CrearSolicitudRevisionDto = {
        consolidadoId: "cons-quispe-uuid",
        motivo: "",
      };

      // Cuando envío sin motivo
      // Entonces el sistema impide el envío y muestra 'Indique el motivo de su solicitud.'
      await expect(
        service.crear(dtoVacio, undefined, "per-quispe-uuid", "user-quispe-uuid"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.crear(dtoVacio, undefined, "per-quispe-uuid", "user-quispe-uuid"),
      ).rejects.toThrow(MENSAJES_CONSOLIDADO.SOLICITUD_SIN_MOTIVO);
      await expect(
        service.crear(dtoVacio, undefined, "per-quispe-uuid", "user-quispe-uuid"),
      ).rejects.toThrow("Indique el motivo de su solicitud.");

      expect(repo.crearSolicitud).not.toHaveBeenCalled();
      expect(notificaciones.enviar).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it("debe impedir el envío cuando el motivo contiene únicamente espacios en blanco", async () => {
      // Dado un motivo con puros espacios
      const dtoEspacios: CrearSolicitudRevisionDto = {
        consolidadoId: "cons-quispe-uuid",
        motivo: "    ",
      };

      // Cuando envío
      // Entonces lanza 400 Bad Request
      await expect(
        service.crear(dtoEspacios, undefined, "per-quispe-uuid", "user-quispe-uuid"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.crear(dtoEspacios, undefined, "per-quispe-uuid", "user-quispe-uuid"),
      ).rejects.toThrow(MENSAJES_CONSOLIDADO.SOLICITUD_SIN_MOTIVO);

      expect(repo.crearSolicitud).not.toHaveBeenCalled();
    });
  });

  describe("CP-RF013-14: Solicitud repetida", () => {
    it("debe bloquear el envío y mostrar 'Ya tiene una solicitud de revisión pendiente para este consolidado.'", async () => {
      // Dado que ya tengo una solicitud pendiente para ese consolidado
      repo.buscarSolicitudAbierta = jest.fn().mockResolvedValue(solicitudPendienteFila);
      const dto: CrearSolicitudRevisionDto = {
        consolidadoId: "cons-quispe-uuid",
        motivo: "Segunda solicitud repetida",
      };

      // Cuando intento enviar otra
      // Entonces el sistema bloquea el envío y muestra el mensaje exacto
      await expect(
        service.crear(dto, undefined, "per-quispe-uuid", "user-quispe-uuid"),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.crear(dto, undefined, "per-quispe-uuid", "user-quispe-uuid"),
      ).rejects.toThrow(MENSAJES_CONSOLIDADO.SOLICITUD_REPETIDA);
      await expect(
        service.crear(dto, undefined, "per-quispe-uuid", "user-quispe-uuid"),
      ).rejects.toThrow("Ya tiene una solicitud de revisión pendiente para este consolidado.");

      expect(repo.crearSolicitud).not.toHaveBeenCalled();
      expect(notificaciones.enviar).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });
  });

  describe("CP-RF013-15: El Director acepta la solicitud", () => {
    it("debe dejar la solicitud aceptada, reabrir automáticamente el consolidado, notificar al docente y auditar", async () => {
      // Dado que hay una solicitud pendiente
      const dto: ResolverSolicitudDto = {
        respuesta: "Se revisará la sesión del 12/06",
      };
      const actorId = "user-director-uuid";
      const rol = "director";
      const ip = "192.168.1.10";

      // Cuando el Director la acepta con la respuesta 'Se revisará la sesión del 12/06'
      const resultado: SolicitudRevisionResponseDto = await service.aceptar(
        "sol-1-uuid",
        dto,
        actorId,
        rol,
        ip,
      );

      // Entonces la solicitud queda aceptada
      expect(repo.resolverSolicitud).toHaveBeenCalledWith(
        "sol-1-uuid",
        "aceptada",
        actorId,
        "Se revisará la sesión del 12/06",
      );
      expect(resultado.estado).toBe("aceptada");

      // Y el consolidado pasa a reabierto automáticamente
      expect(repo.reabrirConsolidado).toHaveBeenCalledWith("cons-quispe-uuid", actorId);

      // Y el docente es notificado
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-quispe-uuid",
          titulo: expect.stringContaining("aceptada") as unknown,
          enlaceUrl: "/admin/mi-seguimiento",
        }),
      );

      // Y se registra la auditoría inmutable
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: actorId,
          accion: "actualizar",
          tabla: "solicitudes_revision_consolidado",
          registroId: "sol-1-uuid",
          direccionIp: ip,
        }),
      );
    });

    it("debe permitir aceptar la solicitud sin una respuesta obligatoria (respuesta opcional)", async () => {
      // Dado que el Director acepta sin respuesta explícita
      const dtoVacio: ResolverSolicitudDto = {};

      // Cuando confirma la aceptación
      const resultado = await service.aceptar(
        "sol-1-uuid",
        dtoVacio,
        "user-director-uuid",
        "director",
      );

      // Entonces la solicitud se resuelve como aceptada sin error
      expect(repo.resolverSolicitud).toHaveBeenCalledWith(
        "sol-1-uuid",
        "aceptada",
        "user-director-uuid",
        undefined,
      );
      expect(resultado.estado).toBe("aceptada");
    });

    it("debe rechazar la acción con 403 Forbidden si el rol es Subdirector", async () => {
      // Dado que el usuario tiene rol Subdirector
      // Cuando intenta aceptar la solicitud
      // Entonces el sistema bloquea con 403
      await expect(
        service.aceptar("sol-1-uuid", {}, "user-subdirector-uuid", "subdirector"),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.aceptar("sol-1-uuid", {}, "user-subdirector-uuid", "subdirector"),
      ).rejects.toThrow("Su rol no tiene autorización para modificar el consolidado.");

      expect(repo.resolverSolicitud).not.toHaveBeenCalled();
      expect(repo.reabrirConsolidado).not.toHaveBeenCalled();
    });

    it("debe lanzar NotFoundException si la solicitud a resolver no existe", async () => {
      // Dado que la solicitud no existe
      repo.buscarSolicitudPorId = jest.fn().mockResolvedValue(null);

      // Cuando intento aceptarla
      // Entonces el sistema lanza 404
      await expect(
        service.aceptar("sol-inexistente", {}, "user-director-uuid", "director"),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.aceptar("sol-inexistente", {}, "user-director-uuid", "director"),
      ).rejects.toThrow(MENSAJES_CONSOLIDADO.SOLICITUD_NO_ENCONTRADA);

      expect(repo.resolverSolicitud).not.toHaveBeenCalled();
    });

    it("debe lanzar BadRequestException si la solicitud ya no está en estado solicitada", async () => {
      // Dado que la solicitud ya fue aceptada previamente
      repo.buscarSolicitudPorId = jest.fn().mockResolvedValue({
        ...solicitudAceptadaFila,
        docente: docenteQuispe,
        periodo: periodoEjemplo,
        resueltaPorNombre: "Director General",
      });

      // Cuando intento aceptarla de nuevo
      // Entonces el sistema lanza 400
      await expect(
        service.aceptar("sol-1-uuid", {}, "user-director-uuid", "director"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.aceptar("sol-1-uuid", {}, "user-director-uuid", "director"),
      ).rejects.toThrow("La solicitud ya fue resuelta.");

      expect(repo.reabrirConsolidado).not.toHaveBeenCalled();
    });
  });

  describe("CP-RF013-16: El Director rechaza la solicitud", () => {
    it("debe dejar la solicitud rechazada, NO modificar el estado del consolidado, notificar al docente con la respuesta y auditar", async () => {
      // Dado que hay una solicitud pendiente
      repo.resolverSolicitud = jest.fn().mockResolvedValue(solicitudRechazadaFila);
      const dto: RechazarSolicitudDto = {
        respuesta: "La sesión no tiene firma de ingreso",
      };
      const actorId = "user-director-uuid";
      const rol = "director";
      const ip = "192.168.1.10";

      // Cuando el Director la rechaza con la respuesta 'La sesión no tiene firma de ingreso'
      const resultado: SolicitudRevisionResponseDto = await service.rechazar(
        "sol-1-uuid",
        dto,
        actorId,
        rol,
        ip,
      );

      // Entonces la solicitud queda rechazada
      expect(repo.resolverSolicitud).toHaveBeenCalledWith(
        "sol-1-uuid",
        "rechazada",
        actorId,
        "La sesión no tiene firma de ingreso",
      );
      expect(resultado.estado).toBe("rechazada");
      expect(resultado.respuesta).toBe("La sesión no tiene firma de ingreso");

      // Y el consolidado NO cambia (no se reabre)
      expect(repo.reabrirConsolidado).not.toHaveBeenCalled();

      // Y el docente es notificado con la respuesta del Director
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-quispe-uuid",
          titulo: expect.stringContaining("rechazada") as unknown,
          mensaje: expect.stringContaining("La sesión no tiene firma de ingreso") as unknown,
          enlaceUrl: "/admin/mi-seguimiento",
        }),
      );

      // Y registra auditoría inmutable
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: actorId,
          accion: "actualizar",
          tabla: "solicitudes_revision_consolidado",
          registroId: "sol-1-uuid",
          direccionIp: ip,
        }),
      );
    });

    it("debe rechazar la acción con 403 Forbidden si el rol es Subdirector", async () => {
      // Dado que el usuario tiene rol Subdirector
      const dto: RechazarSolicitudDto = {
        respuesta: "Intento por subdirector",
      };

      // Cuando intenta rechazar la solicitud
      // Entonces bloquea con 403
      await expect(
        service.rechazar("sol-1-uuid", dto, "user-subdirector-uuid", "subdirector"),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.rechazar("sol-1-uuid", dto, "user-subdirector-uuid", "subdirector"),
      ).rejects.toThrow("Su rol no tiene autorización para modificar el consolidado.");

      expect(repo.resolverSolicitud).not.toHaveBeenCalled();
    });
  });

  describe("CP-RF013-17: Rechazo sin respuesta", () => {
    it("debe impedir la acción y mostrar 'Indique la respuesta para el docente.' cuando la respuesta está vacía", async () => {
      // Dado que el Director está rechazando una solicitud
      const dtoVacio: RechazarSolicitudDto = {
        respuesta: "",
      };

      // Cuando confirma sin respuesta
      // Entonces el sistema impide la acción y muestra 'Indique la respuesta para el docente.'
      await expect(
        service.rechazar("sol-1-uuid", dtoVacio, "user-director-uuid", "director"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.rechazar("sol-1-uuid", dtoVacio, "user-director-uuid", "director"),
      ).rejects.toThrow(MENSAJES_CONSOLIDADO.SOLICITUD_RECHAZADA_SIN_RESPUESTA);
      await expect(
        service.rechazar("sol-1-uuid", dtoVacio, "user-director-uuid", "director"),
      ).rejects.toThrow("Indique la respuesta para el docente.");

      expect(repo.resolverSolicitud).not.toHaveBeenCalled();
      expect(repo.reabrirConsolidado).not.toHaveBeenCalled();
      expect(notificaciones.enviar).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it("debe impedir la acción cuando la respuesta solo contiene espacios en blanco", async () => {
      // Dado que la respuesta solo tiene espacios
      const dtoEspacios: RechazarSolicitudDto = {
        respuesta: "     ",
      };

      // Cuando confirma
      // Entonces lanza 400 Bad Request
      await expect(
        service.rechazar("sol-1-uuid", dtoEspacios, "user-director-uuid", "director"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.rechazar("sol-1-uuid", dtoEspacios, "user-director-uuid", "director"),
      ).rejects.toThrow(MENSAJES_CONSOLIDADO.SOLICITUD_RECHAZADA_SIN_RESPUESTA);

      expect(repo.resolverSolicitud).not.toHaveBeenCalled();
    });
  });

  describe("Listar solicitudes de revisión para supervisión", () => {
    it("debe listar solicitudes filtrando por período y estado", async () => {
      // Dado filtros de búsqueda por período y estado
      const query: FiltroSolicitudesQueryDto = {
        periodoId: "periodo-bimestre-2-uuid",
        estado: "solicitada",
      };

      // Cuando el Director consulta la lista
      const resultado = await service.listar(query);

      // Entonces consulta el repositorio con los filtros
      expect(repo.listarSolicitudes).toHaveBeenCalledWith({
        periodoId: "periodo-bimestre-2-uuid",
        estado: "solicitada",
      });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].docenteNombre).toBe("Quispe Mamani, Juan");
    });
  });
});
