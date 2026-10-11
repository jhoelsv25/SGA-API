import { diasConClases, faltasAlColegio, resumirEstados } from "@/features/asistencia-clase";

describe("RF-010: utilidades de asistencia", () => {
  it("resume los estados de asistencia", () => {
    expect(
      resumirEstados(["presente", "presente", "tardanza", "falta", "falta_justificada"]),
    ).toEqual({ presentes: 2, tardanzas: 1, faltas: 1, faltasJustificadas: 1 });
  });

  it("días con clases: laborables sin suspensión y sin contar hoy", () => {
    // lunes 10 a viernes 14 de mayo de 2027; el miércoles 12 se suspende
    const dias = diasConClases("2027-05-10", "2027-05-16", "2027-05-14", "1,2,3,4,5", [
      { fechaInicio: "2027-05-12", fechaFin: "2027-05-12" },
    ]);
    expect(dias).toEqual(["2027-05-10", "2027-05-11", "2027-05-13"]);
  });

  it("CP-RF010-24: día con clases sin entrada es falta al colegio", () => {
    const dias = ["2027-05-11", "2027-05-12", "2027-05-13"];
    expect(
      faltasAlColegio(dias, new Set(["2027-05-11", "2027-05-13"]), "2027-03-01", null),
    ).toEqual(["2027-05-12"]);
  });

  it("no cuenta faltas antes de la matrícula ni desde el retiro", () => {
    const dias = ["2027-05-10", "2027-05-11", "2027-05-12"];
    expect(faltasAlColegio(dias, new Set(), "2027-05-11", "2027-05-12")).toEqual(["2027-05-11"]);
  });
});
