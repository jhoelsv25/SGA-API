import {
  apellidoDeNombre,
  diasHabilesTranscurridos,
  lunesDeLaSemana,
  viernesDeLaSemana,
  elegirDestacada,
  evaluarIngreso,
  minutosSalidaAnticipada,
  planificarSesiones,
  type BloqueDelDia,
} from "@/features/sesiones-clase";

const bloque = (p: Partial<BloqueDelDia>): BloqueDelDia => ({
  horarioId: "h",
  seccionId: "5a",
  cursoSeccionId: "mate",
  docenteId: "doc-1",
  tipoBloque: "clase",
  horaInicio: "08:00:00",
  horaFin: "08:45:00",
  ...p,
});

describe("RF-011: reglas de sesión", () => {
  it("CP-RF011-01: una sesión por bloque de clase con docente", () => {
    const planes = planificarSesiones([
      bloque({
        horarioId: "h1",
        cursoSeccionId: "mate",
        horaInicio: "07:45:00",
        horaFin: "08:30:00",
      }),
      bloque({
        horarioId: "h2",
        cursoSeccionId: "comu",
        horaInicio: "08:30:00",
        horaFin: "09:15:00",
      }),
      bloque({ horarioId: "h3", seccionId: "5b", horaInicio: "07:45:00", horaFin: "08:30:00" }),
    ]);
    expect(planes.map((p) => p.horarioId).sort()).toEqual(["h1", "h2", "h3"]);
  });

  it("bloque doble del mismo curso = una sola sesión (P-04)", () => {
    const planes = planificarSesiones([
      bloque({ horarioId: "h1", horaInicio: "08:30:00", horaFin: "09:15:00" }),
      bloque({ horarioId: "h2", horaInicio: "09:15:00", horaFin: "10:00:00" }),
    ]);
    expect(planes).toEqual([
      { horarioId: "h1", docenteId: "doc-1", horaInicio: "08:30:00", horaFin: "10:00:00" },
    ]);
  });

  it("un recreo entre dos bloques del mismo curso los separa", () => {
    const planes = planificarSesiones([
      bloque({ horarioId: "h1", horaInicio: "08:30:00", horaFin: "09:15:00" }),
      bloque({
        horarioId: "r",
        tipoBloque: "recreo",
        cursoSeccionId: null,
        docenteId: null,
        horaInicio: "09:15:00",
        horaFin: "09:30:00",
      }),
      bloque({ horarioId: "h2", horaInicio: "09:30:00", horaFin: "10:15:00" }),
    ]);
    expect(planes.map((p) => p.horarioId)).toEqual(["h1", "h2"]);
  });

  it("CP-RF011-03: curso sin docente no genera sesión", () => {
    expect(planificarSesiones([bloque({ docenteId: null })])).toEqual([]);
  });

  const ventana = {
    horaInicio: "08:30",
    horaFin: "10:00",
    minutosAntes: 15,
    toleranciaIngreso: 15,
  };

  it("CP-RF011-07 y 29: a tiempo o dentro de la tolerancia, sin retraso", () => {
    expect(evaluarIngreso({ ...ventana, ahora: "08:30" })).toEqual({
      tipo: "ok",
      minutosRetraso: 0,
    });
    expect(evaluarIngreso({ ...ventana, ahora: "08:42" })).toEqual({
      tipo: "ok",
      minutosRetraso: 0,
    });
  });

  it("CP-RF011-08: pasada la tolerancia, el retraso cuenta desde el inicio", () => {
    expect(evaluarIngreso({ ...ventana, ahora: "08:50" })).toEqual({
      tipo: "ok",
      minutosRetraso: 20,
    });
  });

  it("CP-RF011-12: antes de la ventana informa cuándo se habilita", () => {
    expect(evaluarIngreso({ ...ventana, ahora: "08:10" })).toEqual({
      tipo: "antes",
      habilitaA: "08:15",
    });
  });

  it("CP-RF011-13: después del fin del bloque ya no se firma", () => {
    expect(evaluarIngreso({ ...ventana, ahora: "10:15" })).toEqual({ tipo: "despues" });
  });

  it("CP-RF011-09 y 10: salida dentro y fuera de la tolerancia", () => {
    expect(minutosSalidaAnticipada("10:00", "10:00", 15)).toBe(0);
    expect(minutosSalidaAnticipada("10:00", "09:50", 15)).toBe(0);
    expect(minutosSalidaAnticipada("10:00", "09:40", 15)).toBe(20);
  });

  it("destaca la sesión actual y, si no hay, la siguiente", () => {
    const sesiones = [
      { id: "a", estado: "cumplida", horaInicio: "07:45", horaFin: "08:30" },
      { id: "b", estado: "pendiente", horaInicio: "08:30", horaFin: "10:00" },
      { id: "c", estado: "pendiente", horaInicio: "11:00", horaFin: "12:30" },
    ];
    expect(elegirDestacada(sesiones, "08:20", 15)).toBe("b");
    expect(elegirDestacada(sesiones, "10:30", 15)).toBe("c");
  });
});

describe("RF-011 V3: fechas y mensajes de las alertas", () => {
  it("el lunes y el viernes de la semana de un martes, un domingo y un lunes", () => {
    expect([lunesDeLaSemana("2028-05-16"), viernesDeLaSemana("2028-05-16")]).toEqual([
      "2028-05-15",
      "2028-05-19",
    ]);
    expect(lunesDeLaSemana("2028-05-21")).toBe("2028-05-15"); // domingo
    expect(lunesDeLaSemana("2028-05-15")).toBe("2028-05-15");
  });

  it("los días hábiles saltan fines de semana y días sin clases", () => {
    expect(diasHabilesTranscurridos("2028-05-12", "2028-05-16")).toBe(2); // lun y mar
    expect(diasHabilesTranscurridos("2028-05-12", "2028-05-16", new Set(["2028-05-15"]))).toBe(1);
    expect(diasHabilesTranscurridos("2028-05-16", "2028-05-16")).toBe(0);
  });

  it("el apellido sale antes de la coma", () => {
    expect(apellidoDeNombre("Quispe, Juan")).toBe("Quispe");
    expect(apellidoDeNombre("Quispe Mamani")).toBe("Quispe Mamani");
  });
});
