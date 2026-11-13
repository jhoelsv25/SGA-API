import { ConflictException, ForbiddenException } from "@nestjs/common";
import {
  MisObservacionesService,
  type ObservacionesAulaRepository,
} from "@/features/observaciones-aula";
import {
  calificacion,
  comunSimulado,
  compromiso,
  docente,
  observacion,
  repositorioSimulado,
  type Mocks,
} from "./fixtures";

const retro = (p: Parameters<typeof observacion>[0] = {}) =>
  observacion({
    estado: "retroalimentada",
    retroFecha: "2027-05-21",
    retroalimentadaEn: "2027-05-21 10:30:00",
    ...p,
  });

describe("RF-023 V1: Mis observaciones del docente (HU6)", () => {
  let repo: Mocks<ObservacionesAulaRepository>;
  let service: MisObservacionesService;
  let notificaciones: ReturnType<typeof comunSimulado>["notificaciones"];

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date("2027-05-24T09:00:00-05:00") });
    repo = repositorioSimulado();
    const c = comunSimulado(repo);
    notificaciones = c.notificaciones;
    service = new MisObservacionesService(c.comun);
  });
  afterEach(() => jest.useRealTimers());

  it("lista las próximas sin notas ni niveles y las retroalimentadas con niveles y compromisos", async () => {
    repo.listarDelDocente = jest
      .fn()
      .mockResolvedValue([observacion({ id: "p", estado: "programada" }), retro({ id: "r" })]);
    repo.calificacionesVigentes = jest.fn().mockResolvedValue([calificacion(1, 3)]);
    repo.compromisosVigentes = jest.fn().mockResolvedValue([compromiso()]);
    const r = await service.listar(docente);
    expect(r.proximas).toHaveLength(1);
    expect(r.proximas[0]).toEqual(
      expect.objectContaining({
        fecha: "2027-05-20",
        hora: "08:30",
        curso: "Matemática",
        observador: "Sara Rojas",
      }),
    );
    expect(r.proximas[0]).not.toHaveProperty("niveles");
    expect(r.retroalimentadas[0].niveles).toHaveLength(1);
    expect(r.retroalimentadas[0].compromisos[0]).toMatchObject({
      desempeno: 3,
      estado: "pendiente",
    });
  });

  it("calificada sin retroalimentar: mensaje y ninguna nota ni nivel", async () => {
    repo.obtener = jest.fn().mockResolvedValue(observacion({ estado: "calificada" }));
    await expect(service.detalle("obs-1", docente)).rejects.toThrow(
      "Esta observación se mostrará cuando se haya realizado la retroalimentación.",
    );
    expect(repo.notas).not.toHaveBeenCalled();
    expect(repo.calificacionesVigentes).not.toHaveBeenCalled();
  });

  it("una programada muestra solo el aviso", async () => {
    const r = await service.detalle("obs-1", docente);
    expect(Object.keys(r)).toEqual(["observacion"]);
    expect(r.observacion).toMatchObject({ estado: "programada" });
    expect(repo.notas).not.toHaveBeenCalled();
  });

  it("retroalimentada: visita, evidencias, niveles con fundamento y compromisos, sin historial", async () => {
    repo.obtener = jest.fn().mockResolvedValue(retro());
    repo.notas = jest.fn().mockResolvedValue([
      {
        id: "n",
        observacionId: "obs-1",
        desempeno: 1,
        aspecto: null,
        texto: "12 de 16 trabajan",
        horaAproximada: null,
      },
    ]);
    repo.calificacionesVigentes = jest.fn().mockResolvedValue([calificacion(1, 3)]);
    repo.compromisosVigentes = jest.fn().mockResolvedValue([compromiso()]);
    const r = await service.detalle("obs-1", docente);
    expect(r).toMatchObject({
      evidencias: [{ desempeno: 1, texto: "12 de 16 trabajan" }],
      calificaciones: [{ nivelRomano: "III", fundamento: "Según las notas" }],
      compromisos: [{ compromisoId: "comp-1" }],
      fechaLimiteComentario: "2027-05-28",
      puedeComentar: true,
    });
    expect(r).not.toHaveProperty("historialCalificaciones");
    expect(repo.historialCalificaciones).not.toHaveBeenCalled();
    expect(repo.historialCompromisos).not.toHaveBeenCalled();
  });

  it("un docente no ve la observación de otro", async () => {
    repo.obtener = jest.fn().mockResolvedValue(retro({ docenteId: "doc-2" }));
    await expect(service.detalle("obs-1", docente)).rejects.toThrow(ForbiddenException);
    await expect(service.enterado("obs-1", docente)).rejects.toThrow(ForbiddenException);
  });

  it("quien no es docente no entra", async () => {
    repo.obtenerDocenteDePersona = jest.fn().mockResolvedValue(null);
    await expect(service.listar(docente)).rejects.toThrow(ForbiddenException);
  });

  describe("enterado", () => {
    it("guarda el enterado con la fecha", async () => {
      repo.obtener = jest.fn().mockResolvedValue(retro());
      const r = await service.enterado("obs-1", docente);
      const llamada = (repo.actualizar as jest.Mock).mock.calls[0] as [
        string,
        { enteradoEn?: string },
      ];
      expect(llamada[0]).toBe("obs-1");
      expect(typeof llamada[1].enteradoEn).toBe("string");
      expect(r.mensaje).toBe("Quedó registrado su enterado.");
    });

    it("un segundo enterado conserva la primera fecha", async () => {
      repo.obtener = jest.fn().mockResolvedValue(retro({ enteradoEn: "2027-05-22 08:00:00" }));
      await service.enterado("obs-1", docente);
      expect(repo.actualizar).not.toHaveBeenCalled();
    });

    it("no se puede antes de la retroalimentación", async () => {
      repo.obtener = jest.fn().mockResolvedValue(observacion({ estado: "calificada" }));
      await expect(service.enterado("obs-1", docente)).rejects.toThrow("se mostrará");
    });
  });

  describe("comentario", () => {
    beforeEach(() => {
      repo.obtener = jest.fn().mockResolvedValue(retro());
    });

    it("lo guarda dentro del plazo, avisa al observador y no toca la calificación", async () => {
      const r = await service.comentar(
        "obs-1",
        { texto: " La clase fue la primera tras evaluaciones " },
        docente,
      );
      expect(repo.crearComentario).toHaveBeenCalledWith(
        "obs-1",
        "La clase fue la primera tras evaluaciones",
        "u-doc",
      );
      expect(r.mensaje).toBe("Su comentario fue registrado.");
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "u-sub",
          enlaceUrl: expect.stringMatching(/\/obs-1$/) as string,
        }),
      );
      expect(repo.guardarBorrador).not.toHaveBeenCalled();
      expect(repo.nuevaVersionCalificacion).not.toHaveBeenCalled();
    });

    it("solo uno por observación", async () => {
      repo.comentarioDe = jest.fn().mockResolvedValue({ id: "c", texto: "x", creadoEn: "" });
      await expect(service.comentar("obs-1", { texto: "otro" }, docente)).rejects.toThrow(
        "Ya dejó su comentario para esta observación.",
      );
    });

    it("la carrera de dos envíos también se rechaza", async () => {
      repo.crearComentario = jest.fn().mockResolvedValue(false);
      await expect(service.comentar("obs-1", { texto: "otro" }, docente)).rejects.toThrow(
        ConflictException,
      );
    });

    it("fuera de plazo (7 días desde la retroalimentación)", async () => {
      jest.setSystemTime(new Date("2027-05-30T09:00:00-05:00"));
      await expect(service.comentar("obs-1", { texto: "tarde" }, docente)).rejects.toThrow(
        "El plazo para dejar su comentario venció el 28/05/2027.",
      );
    });

    it("el último día del plazo todavía se puede", async () => {
      jest.setSystemTime(new Date("2027-05-28T22:00:00-05:00"));
      await expect(
        service.comentar("obs-1", { texto: "a tiempo" }, docente),
      ).resolves.toBeDefined();
    });

    it("el plazo sale de la variable del sistema", async () => {
      repo.valoresVariables = jest
        .fn()
        .mockResolvedValue(new Map([["observacion.plazo_descargo_dias", "2"]]));
      await expect(service.comentar("obs-1", { texto: "x" }, docente)).rejects.toThrow(
        "venció el 23/05/2027",
      );
    });

    it("rechaza el comentario vacío", async () => {
      await expect(service.comentar("obs-1", { texto: "  " }, docente)).rejects.toThrow(
        "Escriba su comentario.",
      );
    });
  });
});
