import {
  diaSemanaIso,
  duracionBloqueMin,
  faltantesParaLista,
  hayMomentosRepetidos,
  lunesDe,
  sumarDiasFecha,
  MENSAJES_PLANIFICACION,
} from "@/features/planificacion-sesiones";

const momentos = (i: number, d: number, c: number) => [
  { momento: "inicio" as const, actividades: "Motivación", minutos: i },
  { momento: "desarrollo" as const, actividades: "Práctica", minutos: d },
  { momento: "cierre" as const, actividades: "Metacognición", minutos: c },
];
const completa = {
  proposito: "Explora juegos tradicionales",
  evidencia: "Ficha de trabajo",
  competencias: [{ desempenos: [{ desempenoId: null, base: null, texto: "Adapta movimientos" }] }],
  momentos: momentos(15, 65, 10),
};

describe("RF-024 V1: reglas de la planificación", () => {
  it("duración del bloque en minutos", () => {
    expect(duracionBloqueMin("08:00:00", "09:30:00")).toBe(90);
  });

  it("calcula el día ISO, el lunes y suma días", () => {
    expect(diaSemanaIso("2027-03-14")).toBe(7); // domingo
    expect(diaSemanaIso("2027-03-15")).toBe(1); // lunes
    expect(lunesDe("2027-03-18")).toBe("2027-03-15");
    expect(lunesDe("2027-03-14")).toBe("2027-03-08");
    expect(sumarDiasFecha("2027-03-15", 4)).toBe("2027-03-19");
  });

  it("CP: completa y con tiempos que cuadran no tiene faltantes", () => {
    expect(faltantesParaLista(completa, 90)).toEqual([]);
  });

  it("CP: tiempos que no suman el bloque", () => {
    expect(faltantesParaLista({ ...completa, momentos: momentos(15, 45, 10) }, 90)).toEqual([
      MENSAJES_PLANIFICACION.tiemposNoCuadran(70, 90),
    ]);
  });

  it("CP: sin desempeños, sin propósito o sin un momento no queda lista", () => {
    expect(faltantesParaLista({ ...completa, competencias: [] }, 90)).toContain(
      MENSAJES_PLANIFICACION.FALTA_COMPETENCIA,
    );
    expect(faltantesParaLista({ ...completa, proposito: " " }, 90)).toContain(
      MENSAJES_PLANIFICACION.FALTA_COMPETENCIA,
    );
    expect(
      faltantesParaLista({ ...completa, momentos: momentos(15, 65, 10).slice(0, 2) }, 90),
    ).toContain(MENSAJES_PLANIFICACION.FALTA_COMPETENCIA);
    expect(faltantesParaLista({ ...completa, competencias: [{ desempenos: [] }] }, 90)).toContain(
      MENSAJES_PLANIFICACION.FALTA_COMPETENCIA,
    );
  });

  it("detecta momentos repetidos", () => {
    expect(hayMomentosRepetidos([{ momento: "inicio" }, { momento: "inicio" }])).toBe(true);
    expect(hayMomentosRepetidos(momentos(1, 1, 1))).toBe(false);
  });
});
