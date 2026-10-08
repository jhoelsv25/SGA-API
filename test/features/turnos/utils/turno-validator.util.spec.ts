import { BadRequestException } from "@nestjs/common";
import { validateTurnoTimes } from "@/features/turnos/utils/turno-validator.util";

describe("validateTurnoTimes (RF-004)", () => {
  const validTurno = {
    horaEntrada: "07:45",
    horaSalida: "13:15",
    ventanaEntradaInicio: "06:30",
    ventanaEntradaFin: "09:30",
    ventanaSalidaInicio: "12:30",
    ventanaSalidaFin: "15:00",
    toleranciaMin: 10,
    diasLaborables: "1,2,3,4,5",
  };

  it("debe aceptar un turno con horas y ventanas consistentes", () => {
    expect(() => validateTurnoTimes(validTurno)).not.toThrow();
  });

  it("debe rechazar si la hora de salida es anterior o igual a la hora de entrada (Escenario: Horas invertidas)", () => {
    expect(() =>
      validateTurnoTimes({
        ...validTurno,
        horaSalida: "07:00",
      }),
    ).toThrow(
      new BadRequestException("La hora de salida debe ser posterior a la hora de entrada."),
    );

    expect(() =>
      validateTurnoTimes({
        ...validTurno,
        horaSalida: "07:45",
      }),
    ).toThrow(
      new BadRequestException("La hora de salida debe ser posterior a la hora de entrada."),
    );
  });

  it("debe rechazar si la hora oficial de entrada está fuera de su ventana (Escenario: Hora oficial fuera de su ventana)", () => {
    expect(() =>
      validateTurnoTimes({
        ...validTurno,
        horaEntrada: "05:00", // antes de 06:30
      }),
    ).toThrow(
      new BadRequestException("La hora oficial debe estar dentro de su ventana de marcado."),
    );

    expect(() =>
      validateTurnoTimes({
        ...validTurno,
        horaEntrada: "10:00", // después de 09:30
      }),
    ).toThrow(
      new BadRequestException("La hora oficial debe estar dentro de su ventana de marcado."),
    );
  });

  it("debe rechazar si la hora oficial de salida está fuera de su ventana", () => {
    expect(() =>
      validateTurnoTimes({
        ...validTurno,
        horaSalida: "16:00", // después de 15:00
      }),
    ).toThrow(
      new BadRequestException("La hora oficial debe estar dentro de su ventana de marcado."),
    );
  });

  it("debe rechazar si las ventanas se superponen (Escenario: Ventanas superpuestas)", () => {
    expect(() =>
      validateTurnoTimes({
        ...validTurno,
        ventanaEntradaFin: "13:00",
        ventanaSalidaInicio: "12:30", // empieza antes de 13:00
      }),
    ).toThrow(
      new BadRequestException(
        "La ventana de salida debe empezar después de la ventana de entrada.",
      ),
    );
  });

  it("debe rechazar tolerancias fuera de rango (Escenario: Tolerancia fuera de rango)", () => {
    expect(() =>
      validateTurnoTimes({
        ...validTurno,
        toleranciaMin: 90,
      }),
    ).toThrow(new BadRequestException("La tolerancia debe estar entre 0 y 60 minutos."));

    expect(() =>
      validateTurnoTimes({
        ...validTurno,
        toleranciaMin: -5,
      }),
    ).toThrow(new BadRequestException("La tolerancia debe estar entre 0 y 60 minutos."));
  });

  it("debe rechazar si no se seleccionan días laborables (Escenario: Sin días laborables)", () => {
    expect(() =>
      validateTurnoTimes({
        ...validTurno,
        diasLaborables: "",
      }),
    ).toThrow(new BadRequestException("Seleccione al menos un día laborable."));

    expect(() =>
      validateTurnoTimes({
        ...validTurno,
        diasLaborables: "   ",
      }),
    ).toThrow(new BadRequestException("Seleccione al menos un día laborable."));
  });
});
