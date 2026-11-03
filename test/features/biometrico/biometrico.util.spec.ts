import { desfaseEnMinutos, normalizarFechaHora, ordenarPorHora } from "@/features/biometrico";

describe("RF-022: utilidades del biométrico", () => {
  it("CP-RF022-15b: acepta fecha y hora con espacio o con T y las normaliza", () => {
    expect(normalizarFechaHora("2027-05-12 07:35:12")).toBe("2027-05-12 07:35:12");
    expect(normalizarFechaHora("2027-05-12T07:35:12")).toBe("2027-05-12 07:35:12");
  });

  it("CP-RF022-15b: rechaza fechas inexistentes o con otro formato", () => {
    expect(normalizarFechaHora("2027-02-30 07:35:12")).toBeNull();
    expect(normalizarFechaHora("2027-05-12 25:00:00")).toBeNull();
    expect(normalizarFechaHora("12/05/2027 07:35")).toBeNull();
    expect(normalizarFechaHora("")).toBeNull();
  });

  it("CP-RF022-19b: calcula el desfase absoluto en minutos", () => {
    expect(desfaseEnMinutos("2027-05-12 07:30:00", "2027-05-12 07:35:00")).toBe(5);
    expect(desfaseEnMinutos("2027-05-12 07:40:00", "2027-05-12 07:35:00")).toBe(5);
    expect(desfaseEnMinutos("2027-05-12 07:35:00", "2027-05-12 07:35:10")).toBe(0);
  });

  it("CP-RF022-16b: ordena las marcaciones de la más antigua a la más reciente", () => {
    const orden = ordenarPorHora([
      { fechaHora: "2027-05-12 14:03:00" },
      { fechaHora: "2027-05-12 07:35:00" },
    ]);
    expect(orden.map((m) => m.fechaHora)).toEqual(["2027-05-12 07:35:00", "2027-05-12 14:03:00"]);
  });
});
