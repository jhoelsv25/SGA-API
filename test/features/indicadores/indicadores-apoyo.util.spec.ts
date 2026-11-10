import {
  INDICADORES,
  calcularApoyo,
  ordenarRanking,
  rankingDeDocentes,
  type AusenciaApoyo,
  type ContextoApoyo,
  type JustificacionApoyo,
  type SesionApoyo,
} from "@/features/indicadores";

const ctx: ContextoApoyo = {
  desde: "2028-05-10",
  hasta: "2028-07-16",
  hoy: "2028-07-17",
  diasSinClases: new Set(),
  avisoDias: 3,
};

let n = 0;
const sesion = (p: Partial<SesionApoyo> = {}): SesionApoyo => ({
  id: `s-${++n}`,
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
const varias = (cuantas: number, p: Partial<SesionApoyo> = {}) =>
  Array.from({ length: cuantas }, () => sesion(p));
const ausencia = (minutos: number, p: Partial<AusenciaApoyo> = {}): AusenciaApoyo => ({
  id: `a-${++n}`,
  sesionId: "s",
  fecha: "2028-05-16",
  docenteId: "quispe",
  docenteNombre: "Quispe, Juan",
  cursoNombre: "Matemática",
  seccionNombre: "2.° A",
  minutos,
  motivo: "fuera_del_aula",
  ...p,
});
const justificacion = (p: Partial<JustificacionApoyo> = {}): JustificacionApoyo => ({
  sesionId: `s-${++n}`,
  fechaSesion: "2028-05-16",
  docenteId: "quispe",
  docenteNombre: "Quispe, Juan",
  cursoNombre: "Matemática",
  seccionNombre: "2.° A",
  estado: "solicitada",
  solicitadaEn: "2028-06-01 09:00:00",
  revisadaEn: null,
  ...p,
});

describe("RF-020 V2: indicadores de apoyo del seguimiento docente", () => {
  // 40 sesiones: 33 cumplidas, 4 parciales (20, 30, 15 y 25 min perdidos), 1 no cumplida y 2 justificadas.
  const escenario40 = () => [
    ...varias(33),
    ...[20, 30, 15, 25].map((m) => sesion({ estado: "parcial", minutosPerdidos: m })),
    sesion({ estado: "no_cumplida" }),
    ...varias(2, { estado: "justificada" }),
  ];

  it("CP-RF020-23: jornadas efectivas = 1 575 ÷ 1 710 = 92.11 % (las justificadas salen)", () => {
    const { jornadasEfectivas } = calcularApoyo(escenario40(), [], [], ctx);
    expect(jornadasEfectivas).toMatchObject({
      minutosProgramados: 1710,
      minutosEfectivos: 1575,
      valor: 92.11,
      sinDatos: false,
    });
  });

  it("CP-RF020-24: una parcial de 45 min con 20 perdidos aporta 25 efectivos de 45", () => {
    const { jornadasEfectivas } = calcularApoyo(
      [sesion({ estado: "parcial", minutosPerdidos: 20 })],
      [],
      [],
      ctx,
    );
    expect([jornadasEfectivas.minutosEfectivos, jornadasEfectivas.minutosProgramados]).toEqual([
      25, 45,
    ]);
  });

  it("CP-RF020-25: salida automática con 10 min de retraso aporta 35 de 45", () => {
    const { jornadasEfectivas } = calcularApoyo(
      [sesion({ estado: "parcial", minutosPerdidos: 10, minutosRetraso: 10 })],
      [],
      [],
      ctx,
    );
    expect([jornadasEfectivas.minutosEfectivos, jornadasEfectivas.minutosProgramados]).toEqual([
      35, 45,
    ]);
  });

  it("CP-RF020-26: 90 minutos perdidos en 37 sesiones = promedio 2.43", () => {
    const { minutosPerdidos } = calcularApoyo(escenario40(), [], [], ctx);
    expect(minutosPerdidos).toMatchObject({
      total: 90,
      promedioPorSesion: 2.43,
      sesionesEjecutadas: 37,
    });
  });

  it("CP-RF020-27: puntualidad 34 ÷ 37 = 91.89 %; no cumplidas y justificadas no entran", () => {
    const sesiones = [
      ...varias(34),
      ...varias(3, { estado: "parcial", minutosRetraso: 20, minutosPerdidos: 20 }),
      sesion({ estado: "no_cumplida" }),
      sesion({ estado: "justificada" }),
    ];
    const { puntualidad } = calcularApoyo(sesiones, [], [], ctx);
    expect(puntualidad).toMatchObject({ valor: 91.89, puntuales: 34, sesionesConIngreso: 37 });
  });

  it("CP-RF020-28: 65 minutos fuera del aula en 3 supervisiones", () => {
    const { minutosFueraAula } = calcularApoyo(
      varias(1),
      [ausencia(20), ausencia(15), ausencia(30)],
      [],
      ctx,
    );
    expect(minutosFueraAula).toMatchObject({ minutos: 65, supervisiones: 3, sinDatos: false });
  });

  it("CP-RF020-29: resueltas en 1, 2 y 3 días = 2.0 y dos vencidas; las rechazadas cuentan", () => {
    const resuelta = (dias: number, estado: string) =>
      justificacion({
        estado,
        solicitadaEn: "2028-06-01 09:00:00",
        revisadaEn: `2028-06-0${1 + dias} 09:00:00`,
      });
    const { tiempoResolucion } = calcularApoyo(
      [],
      [],
      [
        resuelta(1, "aprobada"),
        resuelta(2, "rechazada"),
        resuelta(3, "aprobada"),
        justificacion({ solicitadaEn: "2028-06-05 09:00:00" }), // lleva más de 3 días hábiles
        justificacion({ solicitadaEn: "2028-06-06 09:00:00" }),
      ],
      { ...ctx, hoy: "2028-06-20" },
    );
    expect(tiempoResolucion).toMatchObject({ promedioDias: 2, resueltas: 3, vencidas: 2 });
  });

  it("una solicitud reciente no está vencida", () => {
    const { tiempoResolucion } = calcularApoyo(
      [],
      [],
      [justificacion({ solicitadaEn: "2028-06-19 09:00:00" })],
      { ...ctx, hoy: "2028-06-20" },
    );
    expect(tiempoResolucion.vencidas).toBe(0);
  });

  it("CP-RF020-30: sin sesiones todo es «Sin datos», sin 0 % ni división por cero", () => {
    const r = calcularApoyo([], [], [], ctx);
    expect(r.jornadasEfectivas).toMatchObject({ sinDatos: true, valor: null });
    expect(r.minutosPerdidos).toMatchObject({
      sinDatos: true,
      total: null,
      promedioPorSesion: null,
    });
    expect(r.puntualidad).toMatchObject({ sinDatos: true, valor: null });
    expect(r.minutosFueraAula).toMatchObject({ sinDatos: true, minutos: null });
    expect(r.tiempoResolucion).toMatchObject({ sinDatos: true, promedioDias: null });
  });

  it("CP-RF020-31: con sesiones pero sin supervisión solo los minutos fuera del aula son «Sin datos»", () => {
    const r = calcularApoyo(escenario40(), [], [], ctx);
    expect(r.jornadasEfectivas.valor).toBe(92.11);
    expect(r.minutosPerdidos.sinDatos).toBe(false);
    expect(r.puntualidad.sinDatos).toBe(false);
    expect(r.minutosFueraAula.sinDatos).toBe(true);
  });

  it("el día de hoy aún no se cierra y no entra en el cálculo", () => {
    const r = calcularApoyo([sesion({ fecha: "2028-07-17", estado: "cumplida" })], [], [], ctx);
    expect(r.jornadasEfectivas.sinDatos).toBe(true);
  });

  it("solo cuentan las sesiones del rango pedido", () => {
    const r = calcularApoyo(
      [sesion({ fecha: "2028-05-16" }), sesion({ fecha: "2028-03-10" })],
      [],
      [],
      ctx,
    );
    expect(r.jornadasEfectivas.minutosProgramados).toBe(45);
  });

  it("CP-RF020-32: el ranking se ordena por minutos perdidos y los «Sin datos» quedan al final", () => {
    const sesiones = [
      sesion({
        docenteId: "a",
        docenteNombre: "Alva, Ana",
        estado: "parcial",
        minutosPerdidos: 10,
      }),
      sesion({
        docenteId: "b",
        docenteNombre: "Borja, Beto",
        estado: "parcial",
        minutosPerdidos: 40,
      }),
      sesion({ docenteId: "c", docenteNombre: "Cueva, Carla", estado: "no_cumplida" }), // sin ejecutadas
    ];
    const filas = rankingDeDocentes(sesiones, [], [], ctx);
    const desc = ordenarRanking(filas, "minutosPerdidos", "desc").map((f) => f.docenteId);
    const asc = ordenarRanking(filas, "minutosPerdidos", "asc").map((f) => f.docenteId);
    expect(desc).toEqual(["b", "a", "c"]);
    expect(asc).toEqual(["a", "b", "c"]);
  });

  it("CP-RF020-37: las tarjetas muestran el valor sin meta, semáforo ni calificación", () => {
    const texto = JSON.stringify(calcularApoyo(escenario40(), [], [], ctx)).toLowerCase();
    for (const prohibida of ["meta", "semaforo", "semáforo", "calificacion", "color"]) {
      expect(texto).not.toContain(prohibida);
    }
  });

  it("CP-RF020-36: los indicadores de la tesis siguen siendo solo CSP, ISA e IGM", () => {
    expect([...INDICADORES]).toEqual(["CSP", "ISA", "IGM"]);
  });
});
