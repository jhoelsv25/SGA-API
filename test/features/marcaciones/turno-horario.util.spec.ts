import { evaluarMarcacion, turnoSegunClases } from "@/features/marcaciones/utils";

const general = {
  horaEntrada: "07:30:00",
  horaSalida: "13:30:00",
  ventanaEntradaInicio: "06:30:00",
  ventanaEntradaFin: "09:30:00",
  ventanaSalidaInicio: "12:30:00",
  ventanaSalidaFin: "15:30:00",
  toleranciaMin: 10,
  diasLaborables: "1,2,3,4,5",
};
const JUEVES = "2026-11-26";
const SABADO = "2026-11-28";

describe("turnoSegunClases: el turno del docente sale de su horario", () => {
  it("sin clases ese día vale el turno general", () => {
    expect(turnoSegunClases(general, [], JUEVES)).toBe(general);
  });

  it("entrada = primera clase y salida = fin de la última, aunque lleguen desordenadas", () => {
    const turno = turnoSegunClases(
      general,
      [
        { horaInicio: "14:05:00", horaFin: "14:50:00" },
        { horaInicio: "11:10", horaFin: "12:05" },
      ],
      JUEVES,
    );
    expect([turno.horaEntrada, turno.horaSalida]).toEqual(["11:10:00", "14:50:00"]);
  });

  it("las ventanas conservan los márgenes del turno general", () => {
    const turno = turnoSegunClases(general, [{ horaInicio: "11:00", horaFin: "12:00" }], JUEVES);
    expect(turno).toMatchObject({
      ventanaEntradaInicio: "10:00:00",
      ventanaEntradaFin: "13:00:00",
      ventanaSalidaInicio: "11:00:00",
      ventanaSalidaFin: "14:00:00",
      toleranciaMin: 10,
    });
  });

  it("quien entra a las 11:00 y marca 11:08 es puntual; con el turno general estaría fuera de turno", () => {
    const turno = turnoSegunClases(general, [{ horaInicio: "11:00", horaFin: "12:00" }], JUEVES);
    expect(evaluarMarcacion("entrada", turno, "11:08:00", true).resultado).toBe("puntual");
    expect(evaluarMarcacion("entrada", turno, "11:25:00", true)).toEqual({
      resultado: "tardanza",
      minutosTardanza: 15,
    });
    expect(evaluarMarcacion("entrada", general, "11:08:00", true).resultado).toBe("fuera_de_turno");
  });

  it("la salida se mide contra el fin de su última clase", () => {
    const turno = turnoSegunClases(general, [{ horaInicio: "07:30", horaFin: "09:30" }], JUEVES);
    expect(evaluarMarcacion("salida", turno, "09:35:00", true).resultado).toBe("puntual");
    expect(evaluarMarcacion("salida", turno, "09:00:00", true).resultado).toBe("salida_anticipada");
  });

  it("un día con clases es laborable para el docente", () => {
    const turno = turnoSegunClases(general, [{ horaInicio: "08:00", horaFin: "10:00" }], SABADO);
    expect(turno.diasLaborables.split(",")).toContain("6");
  });

  it("los márgenes no se salen del día", () => {
    const turno = turnoSegunClases(general, [{ horaInicio: "00:20", horaFin: "23:30" }], JUEVES);
    expect(turno.ventanaEntradaInicio).toBe("00:00:00");
    expect(turno.ventanaSalidaFin).toBe("23:59:00");
  });
});
