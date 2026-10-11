import {
  esDiaLaborable,
  evaluarEntrada,
  evaluarSalida,
  siguienteTipo,
  type TurnoParaEvaluar,
} from "@/features/marcaciones";

const turnoEstudiantes: TurnoParaEvaluar = {
  horaEntrada: "07:45:00",
  horaSalida: "13:15:00",
  ventanaEntradaInicio: "06:30:00",
  ventanaEntradaFin: "09:30:00",
  ventanaSalidaInicio: "12:30:00",
  ventanaSalidaFin: "15:00:00",
  toleranciaMin: 10,
  diasLaborables: "1,2,3,4,5",
};

const turnoDocentes: TurnoParaEvaluar = {
  ...turnoEstudiantes,
  horaEntrada: "07:30:00",
  horaSalida: "14:00:00",
  ventanaSalidaInicio: "12:00:00",
};

describe("RF-010: reglas de marcación", () => {
  it("CP-RF010-01: entrada hasta la hora oficial + tolerancia es puntual", () => {
    expect(evaluarEntrada(turnoEstudiantes, "07:52", true)).toEqual({
      resultado: "puntual",
      minutosTardanza: 0,
    });
    expect(evaluarEntrada(turnoEstudiantes, "07:55", true).resultado).toBe("puntual");
  });

  it("CP-RF010-02: entrada después de la tolerancia es tardanza con los minutos excedidos", () => {
    expect(evaluarEntrada(turnoEstudiantes, "08:05", true)).toEqual({
      resultado: "tardanza",
      minutosTardanza: 10,
    });
  });

  it("CP-RF010-05: salida antes de la hora oficial es salida anticipada", () => {
    expect(evaluarSalida(turnoDocentes, "12:45", true).resultado).toBe("salida_anticipada");
    expect(evaluarSalida(turnoDocentes, "14:03", true).resultado).toBe("puntual");
  });

  it("CP-RF010-06: fuera de la ventana es fuera_de_turno", () => {
    expect(evaluarEntrada(turnoEstudiantes, "10:15", true).resultado).toBe("fuera_de_turno");
    expect(evaluarEntrada(turnoEstudiantes, "05:00", true).resultado).toBe("fuera_de_turno");
    expect(evaluarSalida(turnoDocentes, "16:00", true).resultado).toBe("fuera_de_turno");
  });

  it("un día sin clases es fuera_de_turno aunque la hora esté en ventana", () => {
    expect(evaluarEntrada(turnoEstudiantes, "07:50", false).resultado).toBe("fuera_de_turno");
  });

  it("detecta días laborables con lunes = 1 y domingo = 7", () => {
    expect(esDiaLaborable("2027-05-12", "1,2,3,4,5")).toBe(true); // miércoles
    expect(esDiaLaborable("2027-05-15", "1,2,3,4,5")).toBe(false); // sábado
    expect(esDiaLaborable("2027-05-16", "7")).toBe(true); // domingo
  });

  it("CP-RF010-03/04: estudiante solo entrada; personal entrada y luego salida", () => {
    expect(siguienteTipo(true, [])).toBe("entrada");
    expect(siguienteTipo(true, ["entrada"])).toBeNull();
    expect(siguienteTipo(false, [])).toBe("entrada");
    expect(siguienteTipo(false, ["entrada"])).toBe("salida");
    expect(siguienteTipo(false, ["entrada", "salida"])).toBeNull();
  });
});
