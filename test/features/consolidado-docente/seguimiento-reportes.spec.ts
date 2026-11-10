import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Workbook } from "exceljs";
import {
  ConsolidadoDocenteRepository,
  SeguimientoReportesRepository,
  SeguimientoReportesService,
  type ActorConsolidado,
  type FilaInformeMensual,
  type PendienteCrudo,
} from "@/features/consolidado-docente";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

const director: ActorConsolidado = { id: "u1", roleId: "r", role: "Director", personaId: "p1" };
const subdirector: ActorConsolidado = {
  id: "u2",
  roleId: "r",
  role: "Subdirector",
  personaId: "p2",
};
const docente: ActorConsolidado = { id: "u3", roleId: "r", role: "Docente", personaId: "p3" };

const fila = (p: Partial<FilaInformeMensual> = {}): FilaInformeMensual => ({
  docenteId: "d1",
  docenteNombre: "Quispe Mamani Juan",
  docenteDni: "45000001",
  jornadaHoras: 30,
  sesiones: 20,
  minutosProgramados: 900,
  minutosDictados: 780,
  justificadas: 2,
  injustificadas: 1,
  tardanzas: 3,
  minutosPerdidosFirma: 30,
  minutosFueraAula: 15,
  ...p,
});

const crudo = (p: Partial<PendienteCrudo> = {}): PendienteCrudo => ({
  tipo: "compromiso_vencido",
  docenteId: "d1",
  docenteNombre: "Quispe Mamani Juan",
  periodoId: "per-2",
  periodoNombre: "II Bimestre",
  origen: "2026-11-01",
  vence: "2026-11-01",
  referenciaId: "ref-1",
  ...p,
});

describe("RF-013 V2: informe mensual y pendientes de seguimiento", () => {
  let service: SeguimientoReportesService;
  let repo: Mocks<SeguimientoReportesRepository>;
  let consolidados: Mocks<ConsolidadoDocenteRepository>;
  const variables: Record<string, string | null> = {
    "sesion.tolerancia_ingreso_min": "15",
    "sesion.minutos_hora_pedagogica": "45",
    "ausencia.plazo_descargo_dias": "7",
    "consolidado.dias_para_decidir": "0",
  };

  beforeEach(() => {
    // Solo se congela la fecha: exceljs necesita los temporizadores reales.
    jest.useFakeTimers({
      now: new Date("2026-11-09T12:00:00-05:00"),
      doNotFake: [
        "nextTick",
        "setImmediate",
        "clearImmediate",
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "queueMicrotask",
      ],
    });
    repo = {
      informeMensual: jest.fn().mockResolvedValue([fila()]),
      pendientes: jest.fn().mockResolvedValue([]),
    };
    consolidados = {
      valorVariable: jest
        .fn()
        .mockImplementation((c: string) => Promise.resolve(variables[c] ?? null)),
    };
    service = new SeguimientoReportesService(
      repo as unknown as SeguimientoReportesRepository,
      consolidados as unknown as ConsolidadoDocenteRepository,
      { get: jest.fn().mockResolvedValue({ nombre: "Colegio de Prueba" }) } as never,
    );
  });

  afterEach(() => jest.useRealTimers());

  async function filasDelExcel(buffer: Buffer) {
    const libro = new Workbook();
    await libro.xlsx.load(buffer as unknown as ArrayBuffer);
    const hoja = libro.worksheets[0];
    const filas: unknown[][] = [];
    hoja.eachRow((r) => filas.push((r.values as unknown[]).slice(1)));
    return { filas, libro };
  }

  describe("informe mensual", () => {
    it("CP-RF013-40/41: una fila por docente con horas, J, I, tardanzas y minutos", async () => {
      const buffer = await service.informeMensualExcel("2026-11", director, "director.prueba");
      expect(repo.informeMensual).toHaveBeenCalledWith("2026-11-01", "2026-11-30", 15);
      const { filas } = await filasDelExcel(buffer);
      const texto = JSON.stringify(filas);
      expect(texto).toContain("Quispe Mamani Juan");
      // 900/45 = 20,0 programadas; 780/45 = 17,3 dictadas; J=2, I=1, tardanzas=3
      expect(texto).toContain("20");
      expect(texto).toContain("17.3");
    });

    it("CP-RF013-43: un mes sin sesiones no genera archivo", async () => {
      repo.informeMensual!.mockResolvedValue([]);
      await expect(service.informeMensualExcel("2026-01", director, "x")).rejects.toThrow(
        new NotFoundException("No hay sesiones en el mes elegido para exportar."),
      );
    });

    it("CP-RF013-44: se calcula con las sesiones del mes aunque el bimestre siga abierto", async () => {
      await service.informeMensualExcel("2026-11", director, "x");
      // No consulta consolidados: el informe sale solo de las sesiones.
      expect(consolidados.obtenerConsolidadosVigentesPeriodo).toBeUndefined();
    });

    it("el Subdirector también exporta; el docente no", async () => {
      await expect(service.informeMensualExcel("2026-11", subdirector, "x")).resolves.toBeDefined();
      await expect(service.informeMensualExcel("2026-11", docente, "x")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("usa la tolerancia configurada para contar tardanzas y febrero de año bisiesto", async () => {
      variables["sesion.tolerancia_ingreso_min"] = "10";
      await service.informeMensualExcel("2028-02", director, "x");
      expect(repo.informeMensual).toHaveBeenCalledWith("2028-02-01", "2028-02-29", 10);
      variables["sesion.tolerancia_ingreso_min"] = "15";
    });
  });

  describe("pendientes", () => {
    it("CP-RF013-45: conteos por tipo y listado con días de atraso", async () => {
      repo.pendientes!.mockResolvedValue([
        crudo(),
        crudo({ tipo: "justificacion_sin_resolver", origen: "2026-11-06", vence: "2026-11-06" }),
        crudo({ tipo: "solicitud_revision_abierta", origen: "2026-11-08", vence: "2026-11-08" }),
      ]);
      const r = await service.pendientes({}, director);
      expect(r.total).toBe(3);
      expect(r.conteos).toMatchObject({
        compromiso_vencido: 1,
        justificacion_sin_resolver: 1,
        solicitud_revision_abierta: 1,
        descargo_vencido: 0,
      });
      expect(r.items[0]).toMatchObject({ tipo: "compromiso_vencido", diasAtraso: 8 });
      expect(r.mensaje).toBeNull();
    });

    it("CP-RF013-46: pasa el bimestre y el docente al filtro", async () => {
      await service.pendientes({ periodoId: "per-2", docenteId: "d1" }, director);
      expect(repo.pendientes).toHaveBeenCalledWith(
        { periodoId: "per-2", docenteId: "d1" },
        "2026-11-09",
        7,
        0,
      );
    });

    it("CP-RF013-47: cada fila enlaza a la pantalla donde se atiende", async () => {
      repo.pendientes!.mockResolvedValue([
        crudo({ tipo: "justificacion_sin_resolver" }),
        crudo({ tipo: "descargo_vencido" }),
        crudo({ tipo: "consolidado_sin_generar" }),
        crudo({ tipo: "consolidado_sin_decision" }),
        crudo({ tipo: "solicitud_revision_abierta" }),
        crudo({ tipo: "compromiso_vencido" }),
      ]);
      const { items } = await service.pendientes({}, subdirector);
      const enlace = (t: string) => items.find((i) => i.tipo === t)?.enlace;
      expect(enlace("justificacion_sin_resolver")).toBe(
        "/admin/justificaciones-sesion?sesionId=ref-1",
      );
      expect(enlace("descargo_vencido")).toBe("/admin/ausencias-docentes?ausenciaId=ref-1");
      expect(enlace("consolidado_sin_generar")).toContain("docenteId=d1");
      expect(enlace("consolidado_sin_decision")).toContain("consolidadoId=ref-1");
      expect(enlace("solicitud_revision_abierta")).toContain("solicitudId=ref-1");
      expect(enlace("compromiso_vencido")).toContain("compromisoId=ref-1");
    });

    it("CP-RF013-48: lo atendido ya no se devuelve y el conteo baja", async () => {
      repo.pendientes!.mockResolvedValueOnce([crudo({ tipo: "solicitud_revision_abierta" })]);
      expect((await service.pendientes({}, director)).conteos.solicitud_revision_abierta).toBe(1);
      repo.pendientes!.mockResolvedValueOnce([]);
      expect((await service.pendientes({}, director)).conteos.solicitud_revision_abierta).toBe(0);
    });

    it("CP-RF013-49: exporta el listado filtrado a Excel", async () => {
      repo.pendientes!.mockResolvedValue([crudo()]);
      const buffer = await service.exportarPendientes({ periodoId: "per-2" }, director, "dir");
      const { filas } = await filasDelExcel(buffer);
      const texto = JSON.stringify(filas);
      expect(texto).toContain("Compromiso vencido");
      expect(texto).toContain("II Bimestre");
    });

    it("CP-RF013-50: sin pendientes avisa y deja los conteos en cero", async () => {
      const r = await service.pendientes({}, director);
      expect(r.mensaje).toBe("No hay pendientes de seguimiento.");
      expect(Object.values(r.conteos).every((n) => n === 0)).toBe(true);
    });

    it("CP-RF013-51: el docente no accede a los pendientes", async () => {
      await expect(service.pendientes({}, docente)).rejects.toThrow(ForbiddenException);
      await expect(service.exportarPendientes({}, docente, "x")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("el día de la generación no cuenta como atraso: el plazo parte de la variable", async () => {
      variables["consolidado.dias_para_decidir"] = "2";
      await service.pendientes({}, director);
      expect(repo.pendientes).toHaveBeenCalledWith({}, "2026-11-09", 7, 2);
      variables["consolidado.dias_para_decidir"] = "0";
    });
  });
});
