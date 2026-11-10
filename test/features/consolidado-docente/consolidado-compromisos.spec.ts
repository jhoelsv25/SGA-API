import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import {
  CompromisosConsolidadoRepository,
  CompromisosConsolidadoService,
  ConsolidadoDocenteRepository,
  ConsolidadoDocenteService,
  type ActorConsolidado,
} from "@/features/consolidado-docente";
import type { FilaCompromiso } from "@/features/consolidado-docente/repositories/compromisos-consolidado.repository";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

const director: ActorConsolidado = { id: "u-dir", roleId: "r", role: "Director", personaId: "p-d" };
const subdirector: ActorConsolidado = {
  id: "u-sub",
  roleId: "r",
  role: "Subdirector",
  personaId: "p-s",
};
const docente: ActorConsolidado = { id: "u-doc", roleId: "r", role: "Docente", personaId: "p-doc" };

const consolidado = (decision = "compromiso_mejora") => ({
  id: "cons-1",
  docenteId: "doc-1",
  periodoId: "per-1",
  decision,
  version: 1,
});

const fila = (p: Partial<FilaCompromiso> = {}): FilaCompromiso => ({
  id: "fila-1",
  compromisoId: "comp-1",
  consolidadoId: "cons-1",
  consolidadoVersion: 1,
  docenteId: "doc-1",
  docenteNombre: "Juan Quispe Mamani",
  docenteApellido: "Quispe",
  periodoId: "per-1",
  version: 1,
  vigente: true,
  descripcion: "Firmar el ingreso dentro de la tolerancia",
  fechaRevision: "2026-12-15",
  estado: "pendiente",
  observacionCierre: null,
  cerradoEn: null,
  enteradoEn: null,
  anulado: false,
  motivoAnulacion: null,
  anuladoEn: null,
  creadoPorId: "u-dir",
  creadoEn: "2026-11-09 10:00:00",
  ...p,
});

describe("RF-013 V2: compromisos de mejora", () => {
  let service: CompromisosConsolidadoService;
  let repo: Mocks<CompromisosConsolidadoRepository>;
  let consolidados: Mocks<ConsolidadoDocenteRepository>;
  let audit: Mocks<AuditService>;
  let notificaciones: Mocks<NotificacionesService>;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date("2026-11-09T12:00:00-05:00") });
    repo = {
      crear: jest.fn().mockImplementation(() => Promise.resolve(fila())),
      obtenerVigente: jest.fn().mockResolvedValue(fila()),
      historial: jest.fn().mockResolvedValue([fila()]),
      listarVigentesDelConsolidado: jest.fn().mockResolvedValue([fila()]),
      cerrar: jest.fn().mockResolvedValue(undefined),
      anular: jest.fn().mockResolvedValue(undefined),
      marcarEnterado: jest.fn().mockResolvedValue(undefined),
      reprogramar: jest.fn().mockResolvedValue("fila-2"),
      pendientesDeRevisarEl: jest.fn().mockResolvedValue([]),
      usuarioDeDocente: jest.fn().mockResolvedValue("u-doc"),
      usuarioActivo: jest.fn().mockResolvedValue(true),
      usuariosConRol: jest.fn().mockResolvedValue(["u-dir-vigente"]),
      registrarAlertaEnviada: jest.fn().mockResolvedValue(true),
    };
    consolidados = {
      obtenerConsolidadoPorId: jest.fn().mockResolvedValue(consolidado()),
      obtenerDocenteDePersona: jest.fn().mockResolvedValue({ id: "doc-1" }),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    notificaciones = { enviar: jest.fn().mockResolvedValue(undefined) };
    service = new CompromisosConsolidadoService(
      repo as unknown as CompromisosConsolidadoRepository,
      consolidados as unknown as ConsolidadoDocenteRepository,
      audit as unknown as AuditService,
      notificaciones as unknown as NotificacionesService,
    );
  });

  afterEach(() => jest.useRealTimers());

  const registrar = (p: Record<string, string> = {}, actor = director) =>
    service.registrar(
      {
        consolidadoId: "cons-1",
        descripcion: "Firmar el ingreso dentro de la tolerancia",
        fechaRevision: "2026-12-15",
        ...p,
      },
      actor,
    );

  describe("registrar", () => {
    it("CP-RF013-23: lo guarda pendiente, avisa su fecha y notifica al docente", async () => {
      const r = await registrar();
      expect(r.mensaje).toBe("Compromiso registrado. Se le recordará el 15/12/2026.");
      expect(repo.crear).toHaveBeenCalledWith(
        expect.objectContaining({
          consolidadoId: "cons-1",
          docenteId: "doc-1",
          fechaRevision: "2026-12-15",
          creadoPorId: "u-dir",
        }),
      );
      expect(r.compromiso.estado).toBe("pendiente");
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: "u-doc" }),
      );
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ accion: "crear" }));
    });

    it("CP-RF013-24: la llamada de atención también admite compromisos", async () => {
      consolidados.obtenerConsolidadoPorId!.mockResolvedValue(consolidado("llamada_atencion"));
      await expect(registrar()).resolves.toBeDefined();
      expect(repo.crear).toHaveBeenCalled();
    });

    it.each(["ninguna", "derivado"])(
      "CP-RF013-25: con la decisión %s no se registran compromisos",
      async (decision) => {
        consolidados.obtenerConsolidadoPorId!.mockResolvedValue(consolidado(decision));
        await expect(registrar()).rejects.toThrow(
          "Solo se registran compromisos cuando la decisión es compromiso de mejora o llamada de atención.",
        );
        expect(repo.crear).not.toHaveBeenCalled();
      },
    );

    it("CP-RF013-26: sin descripción no se registra", async () => {
      await expect(registrar({ descripcion: "  " })).rejects.toThrow(
        "Indique la descripción del compromiso.",
      );
    });

    it("CP-RF013-27: una fecha de revisión pasada no se acepta, pero hoy sí", async () => {
      await expect(registrar({ fechaRevision: "2026-11-01" })).rejects.toThrow(
        "La fecha de revisión debe ser hoy o posterior.",
      );
      await expect(registrar({ fechaRevision: "2026-11-09" })).resolves.toBeDefined();
    });

    it("solo el Director o el Administrador registran; el Subdirector solo consulta", async () => {
      await expect(registrar({}, subdirector)).rejects.toThrow(ForbiddenException);
      await expect(registrar({}, docente)).rejects.toThrow(ForbiddenException);
    });
  });

  describe("cerrar", () => {
    it("CP-RF013-29: cumplido guarda la observación, quién lo cerró y notifica al docente", async () => {
      const r = await service.cerrar(
        "comp-1",
        { resultado: "cumplido", observacion: " Cumplió las 3 semanas siguientes " },
        director,
      );
      expect(r.mensaje).toBe("Compromiso marcado como cumplido.");
      expect(repo.cerrar).toHaveBeenCalledWith(
        "fila-1",
        "cumplido",
        "Cumplió las 3 semanas siguientes",
        "u-dir",
      );
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: "u-doc" }),
      );
    });

    it("CP-RF013-30: también se puede cerrar como no cumplido", async () => {
      const r = await service.cerrar(
        "comp-1",
        { resultado: "no_cumplido", observacion: "Mantiene retrasos" },
        director,
      );
      expect(r.mensaje).toBe("Compromiso marcado como no cumplido.");
    });

    it("CP-RF013-31: el cierre exige observación", async () => {
      await expect(
        service.cerrar("comp-1", { resultado: "cumplido", observacion: " " }, director),
      ).rejects.toThrow("Indique la observación de cierre.");
      expect(repo.cerrar).not.toHaveBeenCalled();
    });

    it("CP-RF013-32: un compromiso cerrado no se puede volver a cerrar", async () => {
      repo.obtenerVigente!.mockResolvedValue(fila({ estado: "cumplido" }));
      await expect(
        service.cerrar("comp-1", { resultado: "no_cumplido", observacion: "x" }, director),
      ).rejects.toThrow(
        new ConflictException("El compromiso ya está cerrado. No se puede volver a cerrar."),
      );
    });

    it("un compromiso anulado no se cierra", async () => {
      repo.obtenerVigente!.mockResolvedValue(fila({ anulado: true }));
      await expect(
        service.cerrar("comp-1", { resultado: "cumplido", observacion: "x" }, director),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("reprogramar y anular", () => {
    it("CP-RF013-33: cambiar la fecha crea una versión nueva", async () => {
      await service.reprogramar("comp-1", { fechaRevision: "2026-12-20" }, director);
      expect(repo.reprogramar).toHaveBeenCalledWith(
        expect.objectContaining({ id: "fila-1" }),
        { fechaRevision: "2026-12-20", descripcion: "Firmar el ingreso dentro de la tolerancia" },
        "u-dir",
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ valorNuevo: expect.objectContaining({ version: 2 }) as unknown }),
      );
    });

    it("la nueva fecha tampoco puede ser pasada y un cierre no se reprograma", async () => {
      await expect(
        service.reprogramar("comp-1", { fechaRevision: "2026-11-01" }, director),
      ).rejects.toThrow("La fecha de revisión debe ser hoy o posterior.");
      repo.obtenerVigente!.mockResolvedValue(fila({ estado: "cumplido" }));
      await expect(
        service.reprogramar("comp-1", { fechaRevision: "2026-12-20" }, director),
      ).rejects.toThrow(ConflictException);
    });

    it("CP-RF013-34: anular lo deja visible como anulado y queda en la bitácora", async () => {
      await service.anular("comp-1", { motivo: "Registrado en el docente equivocado" }, director);
      expect(repo.anular).toHaveBeenCalledWith(
        "fila-1",
        "Registrado en el docente equivocado",
        "u-dir",
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ tabla: "compromisos_consolidado" }),
      );
    });

    it("CP-RF013-35: anular exige motivo", async () => {
      await expect(service.anular("comp-1", { motivo: " " }, director)).rejects.toThrow(
        "Indique el motivo de la anulación.",
      );
    });
  });

  describe("ver y enterado", () => {
    it("CP-RF013-37: el compromiso sigue enlazado a la versión del consolidado en que se registró", async () => {
      repo.obtenerVigente!.mockResolvedValue(fila({ consolidadoVersion: 1 }));
      const r = await service.detalle("comp-1", director);
      expect(r.compromiso.consolidadoVersion).toBe(1);
      expect(r.historial).toHaveLength(1);
    });

    it("CP-RF013-38: el docente da su enterado, sin cambiar el estado y sin ver el historial", async () => {
      const r = await service.marcarEnterado("comp-1", docente);
      expect(r.mensaje).toBe("Gracias. Quedó registrado que está enterado.");
      expect(repo.marcarEnterado).toHaveBeenCalledWith("fila-1");
      expect(repo.cerrar).not.toHaveBeenCalled();
      const detalle = await service.detalle("comp-1", docente);
      expect(detalle.historial).toEqual([]);
      expect(repo.historial).not.toHaveBeenCalled();
    });

    it("CP-RF013-39: el docente no ve ni confirma compromisos de otros", async () => {
      consolidados.obtenerDocenteDePersona!.mockResolvedValue({ id: "otro-doc" });
      await expect(service.detalle("comp-1", docente)).rejects.toThrow(ForbiddenException);
      await expect(service.marcarEnterado("comp-1", docente)).rejects.toThrow(ForbiddenException);
      await expect(service.listar("cons-1", docente)).rejects.toThrow(ForbiddenException);
    });

    it("solo el docente da el enterado", async () => {
      await expect(service.marcarEnterado("comp-1", director)).rejects.toThrow(ForbiddenException);
    });

    it("marca como vencido el pendiente con fecha de revisión pasada", async () => {
      repo.listarVigentesDelConsolidado!.mockResolvedValue([
        fila({ fechaRevision: "2026-11-01" }),
        fila({ id: "f2", fechaRevision: "2026-12-15" }),
        fila({ id: "f3", fechaRevision: "2026-11-01", estado: "cumplido" }),
      ]);
      const r = await service.listar("cons-1", director);
      expect(r.map((c) => c.vencido)).toEqual([true, false, false]);
    });
  });

  describe("CP-RF013-28: recordatorio en la fecha de revisión (RF-019)", () => {
    it("avisa al Director que lo registró, enlazado al compromiso", async () => {
      repo.pendientesDeRevisarEl!.mockResolvedValue([fila({ fechaRevision: "2026-12-15" })]);
      const enviados = await service.recordarCompromisosDeHoy("2026-12-15");
      expect(enviados).toBe(1);
      expect(repo.registrarAlertaEnviada).toHaveBeenCalledWith("compromiso:comp-1:2026-12-15");
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "u-dir",
          mensaje:
            "Hoy se revisa el compromiso de Quispe: Firmar el ingreso dentro de la tolerancia.",
          enlaceUrl: expect.stringContaining("compromisoId=comp-1") as unknown,
        }),
      );
    });

    it("no lo repite si ya se envió", async () => {
      repo.pendientesDeRevisarEl!.mockResolvedValue([fila()]);
      repo.registrarAlertaEnviada!.mockResolvedValue(false);
      await expect(service.recordarCompromisosDeHoy("2026-12-15")).resolves.toBe(0);
      expect(notificaciones.enviar).not.toHaveBeenCalled();
    });

    it("si el Director que lo registró ya no está activo, avisa a los Directores vigentes", async () => {
      repo.pendientesDeRevisarEl!.mockResolvedValue([fila()]);
      repo.usuarioActivo!.mockResolvedValue(false);
      await service.recordarCompromisosDeHoy("2026-12-15");
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: "u-dir-vigente" }),
      );
    });
  });
});

describe("RF-013 V2: cambiar la decisión con compromisos pendientes", () => {
  let service: ConsolidadoDocenteService;
  let repo: Mocks<ConsolidadoDocenteRepository>;

  beforeEach(() => {
    repo = {
      obtenerConsolidadoPorId: jest.fn().mockResolvedValue(consolidado()),
      contarCompromisosPendientes: jest.fn().mockResolvedValue(1),
      actualizarDecision: jest.fn().mockResolvedValue({}),
    };
    service = new ConsolidadoDocenteService(
      repo as unknown as ConsolidadoDocenteRepository,
      { log: jest.fn() } as unknown as AuditService,
      { enviar: jest.fn() } as unknown as NotificacionesService,
      { get: jest.fn() } as never,
    );
  });

  it("CP-RF013-36: no se cambia a «ninguna» con un compromiso pendiente", async () => {
    await expect(
      service.registrarDecision("cons-1", { decision: "ninguna" }, director),
    ).rejects.toThrow(
      "Hay compromisos pendientes. Ciérrelos o anúlelos antes de cambiar la decisión.",
    );
    expect(repo.actualizarDecision).not.toHaveBeenCalled();
  });

  it("sí se puede pasar a otra decisión que admite compromisos", async () => {
    await service.registrarDecision("cons-1", { decision: "llamada_atencion" }, director);
    expect(repo.actualizarDecision).toHaveBeenCalled();
  });

  it("sin compromisos pendientes se cambia a «ninguna»", async () => {
    repo.contarCompromisosPendientes!.mockResolvedValue(0);
    await service.registrarDecision("cons-1", { decision: "ninguna" }, director);
    expect(repo.actualizarDecision).toHaveBeenCalled();
  });
});
