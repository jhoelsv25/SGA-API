import {
  ahoraEnLima,
  fechaHoyLima,
  horaActualLima,
  ZONA_HORARIA_LIMA,
} from "@/common/utils/fecha-lima.util";

describe("fecha-lima.util (Propuesta 2: fecha hoy y hora en Lima)", () => {
  it("a las 2026-10-15T02:00Z devuelve 2026-10-14; a las 05:00Z devuelve 2026-10-15", () => {
    // 2026-10-15T02:00Z en UTC-5 corresponde a las 21:00 del 2026-10-14 en Lima
    const fecha2amUtc = new Date("2026-10-15T02:00:00Z");
    // 2026-10-15T05:00Z en UTC-5 corresponde a las 00:00 del 2026-10-15 en Lima
    const fecha5amUtc = new Date("2026-10-15T05:00:00Z");

    expect(fechaHoyLima(fecha2amUtc)).toBe("2026-10-14");
    expect(fechaHoyLima(fecha5amUtc)).toBe("2026-10-15");
  });

  it("devuelve la fecha, hora y fechaHora descompuestas en zona horaria America/Lima", () => {
    const fecha2amUtc = new Date("2026-10-15T02:00:00Z");
    const resultado = ahoraEnLima(fecha2amUtc);

    expect(resultado.fecha).toBe("2026-10-14");
    expect(resultado.hora).toBe("21:00:00");
    expect(resultado.fechaHora).toBe("2026-10-14 21:00:00");
    expect(horaActualLima(fecha2amUtc)).toBe("21:00:00");
  });

  it("a las 2026-10-15T05:00Z devuelve medianoche en Lima", () => {
    const fecha5amUtc = new Date("2026-10-15T05:00:00Z");
    const resultado = ahoraEnLima(fecha5amUtc);

    expect(resultado.fecha).toBe("2026-10-15");
    expect(resultado.hora).toBe("00:00:00");
    expect(resultado.fechaHora).toBe("2026-10-15 00:00:00");
  });

  it("acepta referencias como string o timestamp numérico", () => {
    expect(fechaHoyLima("2026-10-15T02:00:00Z")).toBe("2026-10-14");
    expect(fechaHoyLima(new Date("2026-10-15T05:00:00Z").getTime())).toBe("2026-10-15");
  });

  it("define la constante de zona horaria como America/Lima", () => {
    expect(ZONA_HORARIA_LIMA).toBe("America/Lima");
  });
});
