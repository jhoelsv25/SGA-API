import { ForbiddenException } from "@nestjs/common";
import type { AnioLectivoCls } from "@/common/anio-lectivo";
import type { InstitucionService } from "@/features/institucion/institucion.service";
import {
  ObservacionesProgramacionService,
  ObservacionesReporteService,
  type ObservacionesAulaRepository,
} from "@/features/observaciones-aula";
import { comunSimulado, director, docente, repositorioSimulado, type Mocks } from "./fixtures";

const fila = (
  obs: string,
  docenteId: string,
  fecha: string,
  desempeno: number,
  nivel: 1 | 2 | 3 | 4,
) => ({
  observacionId: obs,
  docenteId,
  fecha,
  observadorNombre: "Sara Rojas",
  desempeno,
  nivel,
});

describe("RF-023 V1: historial, matriz y consolidado (HU5 y HU7)", () => {
  let repo: Mocks<ObservacionesAulaRepository>;
  let service: ObservacionesReporteService;

  beforeEach(() => {
    // Solo se simula la fecha: exceljs y pdfkit necesitan los temporizadores reales.
    jest.useFakeTimers({
      now: new Date("2027-06-01T10:00:00-05:00"),
      doNotFake: ["setImmediate", "setTimeout", "setInterval", "nextTick", "queueMicrotask"],
    });
    repo = repositorioSimulado();
    repo.docentesActivos = jest.fn().mockResolvedValue([
      { id: "doc-1", nombre: "Carlos Quispe" },
      { id: "doc-2", nombre: "Lucía Flores" },
    ]);
    const { comun } = comunSimulado(repo);
    const anio = { id: () => "anio-1" } as unknown as AnioLectivoCls;
    const programacion = new ObservacionesProgramacionService(comun, anio);
    service = new ObservacionesReporteService(
      comun,
      programacion,
      {
        get: jest.fn().mockResolvedValue({ nombre: "I.E. de prueba" }),
      } as unknown as InstitucionService,
      anio,
    );
  });
  afterEach(() => jest.useRealTimers());

  describe("historial del docente", () => {
    it("muestra cada observación con sus niveles y cómo evolucionó cada desempeño", async () => {
      repo.calificacionesDelAnio = jest
        .fn()
        .mockResolvedValue([
          fila("o1", "doc-1", "2027-03-18", 1, 2),
          fila("o1", "doc-1", "2027-03-18", 2, 3),
          fila("o2", "doc-1", "2027-05-20", 1, 3),
          fila("o2", "doc-1", "2027-05-20", 2, 3),
          fila("o3", "doc-2", "2027-05-21", 1, 4),
        ]);
      const r = await service.historialDocente("doc-1", director);
      expect(r.observaciones).toHaveLength(2);
      expect(r.observaciones?.[0].evolucion).toEqual({ 1: null, 2: null });
      expect(r.observaciones?.[1].evolucion).toEqual({ 1: "sube", 2: "igual" });
    });

    it("sin observaciones devuelve el mensaje", async () => {
      const r = await service.historialDocente("doc-1", director);
      expect(r).toMatchObject({
        observaciones: [],
        mensaje: "Este docente aún no tiene observaciones en el año.",
      });
    });

    it("el evaluado no consulta su propio historial por esta vía", async () => {
      await expect(service.historialDocente("doc-1", docente)).rejects.toThrow(ForbiddenException);
    });
  });

  describe("matriz docente por desempeño", () => {
    beforeEach(() => {
      // Filas por fecha ascendente: la última de cada desempeño es la vigente.
      repo.calificacionesDelAnio = jest
        .fn()
        .mockResolvedValue([
          fila("o1", "doc-1", "2027-03-18", 1, 2),
          fila("o1", "doc-1", "2027-03-18", 2, 2),
          fila("o2", "doc-1", "2027-05-20", 1, 4),
        ]);
    });

    it("toma el último nivel vigente de cada desempeño y deja «sin observar» el resto", async () => {
      const { matriz } = await service.matriz({});
      const carlos = matriz.find((m) => m.docenteId === "doc-1");
      expect(carlos?.niveles[1]).toEqual({ nivel: 4, fecha: "2027-05-20" });
      expect(carlos?.niveles[2]).toEqual({ nivel: 2, fecha: "2027-03-18" });
      expect(carlos?.niveles[3]).toBeNull();
      expect(matriz.find((m) => m.docenteId === "doc-2")?.niveles[1]).toBeNull();
    });

    it("filtra por nivel y por desempeño", async () => {
      expect((await service.matriz({ nivel: 4 })).matriz.map((m) => m.docenteId)).toEqual([
        "doc-1",
      ]);
      expect((await service.matriz({ desempeno: 5 })).matriz).toHaveLength(0);
      expect((await service.matriz({ desempeno: 2, nivel: 4 })).matriz).toHaveLength(0);
      expect((await service.matriz({ desempeno: 2, nivel: 2 })).matriz).toHaveLength(1);
    });

    it("trae la cobertura del cronograma en la misma respuesta", async () => {
      repo.conteosPorDocente = jest
        .fn()
        .mockResolvedValue([{ docenteId: "doc-1", estado: "retroalimentada" }]);
      const { cobertura } = await service.matriz({});
      expect(cobertura.total).toMatchObject({ realizadas: 1, meta: 4, porcentaje: 25 });
    });

    it("exporta a Excel la matriz y la cobertura", async () => {
      const buffer = await service.matrizExcel({}, "director.prueba");
      expect(buffer.length).toBeGreaterThan(1000);
      expect(buffer.subarray(0, 2).toString()).toBe("PK");
    });
  });

  describe("resumen para el consolidado (RF-013)", () => {
    it("devuelve la fecha y los 5 niveles de la última retroalimentada, solo lectura", async () => {
      repo.ultimaRetroalimentadaDelPeriodo = jest
        .fn()
        .mockResolvedValue({ id: "obs-1", fecha: "2027-05-20" });
      repo.calificacionesVigentes = jest
        .fn()
        .mockResolvedValue([1, 2, 3, 4, 5].map((n) => ({ desempeno: n, nivel: 3 })));
      const r = await service.resumenParaConsolidado("doc-1", "per-2", director);
      expect(r.observacion?.niveles).toHaveLength(5);
      expect(r.observacion?.fecha).toBe("2027-05-20");
    });

    it("sin observación retroalimentada devuelve null", async () => {
      expect(await service.resumenParaConsolidado("doc-1", "per-2", director)).toEqual({
        observacion: null,
      });
    });

    it("el docente solo ve el suyo", async () => {
      repo.obtenerDocenteDePersona = jest.fn().mockResolvedValue({ id: "doc-1" });
      await expect(service.resumenParaConsolidado("doc-2", "per-2", docente)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(
        service.resumenParaConsolidado("doc-1", "per-2", docente),
      ).resolves.toBeDefined();
    });
  });

  describe("protocolo en PDF", () => {
    const retro = async () => {
      const { observacion } = await import("./fixtures");
      repo.obtener = jest.fn().mockResolvedValue(
        observacion({
          estado: "retroalimentada",
          horaInicioReal: "08:32:00",
          horaFinReal: "09:25:00",
          minutosTotales: 53,
          estudiantesPresentes: 16,
          retroFecha: "2027-05-21",
        }),
      );
    };

    it("genera el PDF y registra la descarga en la bitácora", async () => {
      await retro();
      const { comun, audit } = comunSimulado(repo);
      const anio = { id: () => "anio-1" } as unknown as AnioLectivoCls;
      const s = new ObservacionesReporteService(
        comun,
        new ObservacionesProgramacionService(comun, anio),
        {
          get: jest.fn().mockResolvedValue({ nombre: "I.E. de prueba" }),
        } as unknown as InstitucionService,
        anio,
      );
      const pdf = await s.protocoloPdf("obs-1", director);
      expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ valorNuevo: { accion: "descarga_protocolo_pdf" } }),
      );
    });

    it("solo de una observación retroalimentada", async () => {
      await expect(service.protocoloPdf("obs-1", director)).rejects.toThrow(
        "aún no está retroalimentada",
      );
    });
  });
});
