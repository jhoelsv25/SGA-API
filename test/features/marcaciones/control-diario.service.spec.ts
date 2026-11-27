import { ControlDiarioService } from "@/features/marcaciones/control-diario.service";
import { estadoDelDia, fechasDelMes } from "@/features/marcaciones/utils";

describe("estadoDelDia", () => {
  it.each([
    [true, true, true, true, "completo"],
    [true, true, false, true, "en_el_colegio"],
    [true, true, false, false, "sin_salida"],
    [true, false, true, false, "sin_entrada"],
    [true, false, false, true, "sin_marca"],
    [false, false, false, false, "no_corresponde"],
    [false, true, true, false, "completo"],
  ])(
    "esperado=%s entrada=%s salida=%s hoy=%s → %s",
    (esperado, tieneEntrada, tieneSalida, esHoy, estado) => {
      expect(estadoDelDia({ esperado, tieneEntrada, tieneSalida, esHoy })).toBe(estado);
    },
  );

  it("hoy, dentro de su plazo de entrada, todavía no cuenta como sin marca", () => {
    const base = { esperado: true, tieneEntrada: false, tieneSalida: false, esHoy: true };
    expect(estadoDelDia({ ...base, aunEnPlazo: true })).toBe("por_llegar");
  });
});

describe("fechasDelMes", () => {
  it("llega hasta hoy en el mes en curso y completo en uno pasado", () => {
    expect(fechasDelMes("2026-11", "2026-11-03")).toEqual([
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ]);
    expect(fechasDelMes("2026-02", "2026-11-03")).toHaveLength(28);
    expect(fechasDelMes("2026-12", "2026-11-03")).toEqual([]);
  });
});

describe("ControlDiarioService", () => {
  const turno = {
    horaEntrada: "07:30:00",
    horaSalida: "13:30:00",
    ventanaEntradaInicio: "06:30:00",
    ventanaEntradaFin: "09:30:00",
    ventanaSalidaInicio: "12:30:00",
    ventanaSalidaFin: "15:30:00",
    toleranciaMin: 10,
    diasLaborables: "1,2,3,4,5",
    activo: true,
  };
  const persona = (personaId: string, tipoPersona: string) => ({
    personaId,
    tipoPersona,
    nombreCompleto: personaId,
    fotoUrl: null,
  });

  function construir(sinClases = false, porClases = true, personalLabora = false) {
    const repository = {
      personal: jest
        .fn()
        .mockResolvedValue([persona("doc", "docentes"), persona("adm", "administrativos")]),
      clases: jest
        .fn()
        .mockResolvedValue(
          new Map([["doc|2026-01-08", [{ horaInicio: "11:00", horaFin: "12:30" }]]]),
        ),
      sesiones: jest.fn().mockResolvedValue(new Map()),
    };
    const marcaciones = {
      marcacionesEntre: jest
        .fn()
        .mockResolvedValue([
          { personaId: "doc", tipo: "entrada", fechaHora: "2026-01-08 11:02:00" },
        ]),
    };
    const turnos = { findByAplicaA: jest.fn().mockResolvedValue(turno) };
    const calendario = {
      suspendeClasesEn: jest.fn().mockResolvedValue(sinClases),
      fechasSinTrabajoPersonal: jest
        .fn()
        .mockResolvedValue(new Set(sinClases && !personalLabora ? ["2026-01-08"] : [])),
    };
    return new ControlDiarioService(
      repository as never,
      marcaciones as never,
      turnos as never,
      calendario as never,
      { isActiva: jest.fn().mockResolvedValue(porClases) } as never,
    );
  }

  it("sin clases pero con el personal trabajando, sí se espera asistencia", async () => {
    const r = await construir(true, false, true).delDia("2026-01-08");
    expect(r).toMatchObject({ sinClases: true, personalLabora: true });
    expect(r.personas[1]).toMatchObject({ estado: "sin_marca" });
  });

  it("el docente toma su horario de las clases y los demás, el turno general", async () => {
    const r = await construir().delDia("2026-01-08");
    expect(r.personas[0]).toMatchObject({
      estado: "sin_salida",
      horario: { fuente: "clases", entrada: "11:00", salida: "12:30" },
    });
    expect(r.personas[1]).toMatchObject({
      estado: "sin_marca",
      horario: { fuente: "turno", entrada: "07:30", salida: "13:30" },
    });
  });

  it("con el horario del Reglamento Interno el docente usa el turno aunque tenga clases", async () => {
    const r = await construir(false, false).delDia("2026-01-08");
    expect(r.personas[0].horario).toMatchObject({
      fuente: "turno",
      entrada: "07:30",
      salida: "13:30",
    });
  });

  it("si el calendario suspende las clases, no se espera a quien no marcó", async () => {
    const r = await construir(true).delDia("2026-01-08");
    expect(r.personas[1]).toMatchObject({ estado: "no_corresponde", horario: null });
  });

  it("hoy espera hasta la hora de entrada más la tolerancia", async () => {
    jest.useFakeTimers({ now: new Date("2026-01-08T07:40:00-05:00") });
    try {
      expect((await construir().delDia("2026-01-08")).personas[1].estado).toBe("por_llegar");
      jest.setSystemTime(new Date("2026-01-08T07:41:00-05:00"));
      expect((await construir().delDia("2026-01-08")).personas[1].estado).toBe("sin_marca");
    } finally {
      jest.useRealTimers();
    }
  });

  it("no admite fechas futuras", async () => {
    await expect(construir().delDia("2999-01-01")).rejects.toThrow();
  });
});
