import { AuditService } from "@/common/services/audit.service";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import type { Database } from "@/core/database";
import {
  IndicadoresApoyoRepository,
  IndicadoresApoyoService,
  IndicadoresCalculoRepository,
  type SesionApoyo,
} from "@/features/indicadores";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

const periodos = [
  {
    id: "p1",
    nombre: "I Bimestre",
    estado: "cerrado",
    fechaInicio: "2028-03-01",
    fechaFin: "2028-05-09",
  },
  {
    id: "p2",
    nombre: "II Bimestre",
    estado: "en_curso",
    fechaInicio: "2028-05-10",
    fechaFin: "2028-07-16",
  },
];

const sesion = (p: Partial<SesionApoyo> = {}): SesionApoyo => ({
  id: "s",
  fecha: "2028-05-16",
  docenteId: "quispe",
  docenteNombre: "Quispe, Juan",
  cursoNombre: "Matemática",
  seccionNombre: "2.° A",
  estado: "cumplida",
  minutosBloque: 45,
  minutosPerdidos: 0,
  minutosRetraso: 0,
  ...p,
});

describe("RF-020 V2: servicio de indicadores de apoyo", () => {
  let service: IndicadoresApoyoService;
  let repo: Mocks<IndicadoresApoyoRepository>;
  let calculo: Mocks<IndicadoresCalculoRepository>;
  let audit: Mocks<AuditService>;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date("2028-06-20T12:00:00-05:00") });
    repo = {
      listarPeriodos: jest.fn().mockResolvedValue(periodos),
      sesiones: jest.fn().mockResolvedValue([sesion(), sesion({ fecha: "2028-04-10" })]),
      ausencias: jest.fn().mockResolvedValue([]),
      justificaciones: jest.fn().mockResolvedValue([]),
      diasSinClases: jest.fn().mockResolvedValue([]),
      avisoDiasJustificacion: jest.fn().mockResolvedValue(3),
    };
    calculo = {
      obtenerDocentePorPersonaId: jest.fn().mockResolvedValue({
        id: "quispe",
        nombres: "Juan",
        apellidoPaterno: "Quispe",
        apellidoMaterno: "",
      }),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new IndicadoresApoyoService(
      repo as unknown as IndicadoresApoyoRepository,
      calculo as unknown as IndicadoresCalculoRepository,
      { id: () => "anio" } as unknown as AnioLectivoCls,
      audit as unknown as AuditService,
      {} as unknown as Database,
    );
  });

  afterEach(() => jest.useRealTimers());

  it("CP-RF020-21: la sección trae su mensaje de apoyo y el bimestre en curso por defecto", async () => {
    const r = await service.consultar({});
    expect(r.mensaje).toBe(
      "Indicadores de apoyo: informativos, no forman parte de los indicadores de la tesis.",
    );
    expect(r.periodoNombre).toBe("II Bimestre");
    expect(r.enCurso).toBe(true);
    expect(r.mensajeEnCurso).toBe("En curso: el día de hoy aún no se cierra.");
    expect(r.ranking).toHaveLength(1);
  });

  it("CP-RF020-33: el docente ve solo lo suyo, sin ranking, aunque pida otro docente", async () => {
    const r = await service.consultarMios("per-quispe", { docenteId: "otro" });
    expect(r.ranking).toBeNull();
    expect(repo.sesiones).toHaveBeenCalledWith(expect.objectContaining({ docenteId: "quispe" }));
  });

  it("CP-RF020-33: sin ficha de docente no hay indicadores propios", async () => {
    calculo.obtenerDocentePorPersonaId!.mockResolvedValue(null);
    await expect(service.consultarMios("per-x", {})).rejects.toThrow();
  });

  it("CP-RF020-34: los filtros de bimestre, curso y sección llegan a las consultas", async () => {
    await service.consultar({ periodoId: "p2", cursoId: "mat", seccionId: "2a" });
    for (const consulta of [repo.sesiones, repo.ausencias, repo.justificaciones]) {
      expect(consulta).toHaveBeenCalledWith(
        expect.objectContaining({ cursoId: "mat", seccionId: "2a" }),
      );
    }
  });

  it("un bimestre inexistente responde que no se encontró", async () => {
    await expect(service.consultar({ periodoId: "zzz" })).rejects.toThrow(
      "Período académico no encontrado.",
    );
  });

  it("CP-RF020-35: la evolución trae un valor por bimestre y marca el que está en curso", async () => {
    const r = await service.consultar({});
    expect(r.evolucion.map((e) => [e.periodoNombre, e.enCurso])).toEqual([
      ["I Bimestre", false],
      ["II Bimestre", true],
    ]);
    expect(r.evolucion[0].resumen.jornadasEfectivas.minutosProgramados).toBe(45);
    expect(r.evolucion[1].mensajeEnCurso).toBe("En curso: el día de hoy aún no se cierra.");
  });

  it("sin la variable de vencimiento se usa el valor por defecto de RF-004 (3 días hábiles)", async () => {
    repo.avisoDiasJustificacion!.mockResolvedValue(null);
    repo.justificaciones!.mockResolvedValue([
      {
        sesionId: "s",
        fechaSesion: "2028-05-16",
        docenteId: "quispe",
        docenteNombre: "Quispe, Juan",
        cursoNombre: "Matemática",
        seccionNombre: "2.° A",
        estado: "solicitada",
        solicitadaEn: "2028-06-09 09:00:00",
        revisadaEn: null,
      },
    ]);
    const r = await service.consultar({ periodoId: "p2" });
    expect(r.resumen.tiempoResolucion.vencidas).toBe(1);
  });

  it("CP-RF020-38: exporta a Excel y deja la exportación en la bitácora", async () => {
    // exceljs usa temporizadores reales: con el reloj simulado el test no termina.
    jest.useRealTimers();
    const { buffer, nombreArchivo } = await service.exportarExcel(
      {},
      "u-dir",
      "director",
      "10.0.0.1",
    );
    expect(buffer.subarray(0, 2).toString()).toBe("PK"); // un .xlsx es un zip
    expect(nombreArchivo).toMatch(/^indicadores-apoyo-.*\.xlsx$/);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: "u-dir",
        tabla: "exportaciones_indicadores_apoyo_excel",
        direccionIp: "10.0.0.1",
      }),
    );
  });
});
