import {
  diaIsoDe,
  esEnlaceValido,
  estaEnVentana,
  estadoPlazo,
  fechaMinimaFueraDeVentana,
  formatearFecha,
  formatoPermitido,
  porcentajeATiempo,
  sumarDias,
} from "@/features/aula-virtual/utils";

describe("RF-015: reglas puras de materiales", () => {
  describe("ventana de planificación", () => {
    it("incluye el día de inicio como día 1 y termina al séptimo día", () => {
      expect(estaEnVentana("2027-05-09", "2027-05-03", 7)).toBe(true);
      expect(estaEnVentana("2027-05-10", "2027-05-03", 7)).toBe(false);
    });

    it("fuera de la ventana exige hoy + N días", () => {
      expect(fechaMinimaFueraDeVentana("2027-06-02", 7)).toBe("2027-06-09");
    });
  });

  describe("estadoPlazo (primera publicación)", () => {
    it("a tiempo si se publicó hasta el día programado", () => {
      expect(estadoPlazo("2027-05-15", "2027-05-14 10:00:00", "2027-05-20")).toBe("a_tiempo");
      expect(estadoPlazo("2027-05-15", "2027-05-15 23:59:00", "2027-05-20")).toBe("a_tiempo");
    });

    it("fuera de plazo si se publicó después", () => {
      expect(estadoPlazo("2027-05-15", "2027-05-17 08:00:00", "2027-05-20")).toBe("fuera_de_plazo");
    });

    it("no publicado cuando la fecha pasó sin publicarse; pendiente antes", () => {
      expect(estadoPlazo("2027-05-15", null, "2027-05-16")).toBe("no_publicado");
      expect(estadoPlazo("2027-05-15", null, "2027-05-15")).toBe("pendiente");
    });
  });

  describe("contenido", () => {
    it("valida enlaces con http:// o https://", () => {
      expect(esEnlaceValido("https://youtu.be/abc")).toBe(true);
      expect(esEnlaceValido("www.youtube.com/abc")).toBe(false);
    });

    it("valida el formato según el tipo", () => {
      expect(formatoPermitido("documento", "guia.PDF")).toBe(true);
      expect(formatoPermitido("documento", "audio.mp3")).toBe(false);
      expect(formatoPermitido("video", "clase.mp4")).toBe(true);
      expect(formatoPermitido("enlace", "x.pdf")).toBe(false);
    });
  });

  describe("fechas", () => {
    it("suma días, calcula el día ISO y da formato", () => {
      expect(sumarDias("2027-05-30", 7)).toBe("2027-06-06");
      expect(diaIsoDe("2027-05-15")).toBe(6);
      expect(formatearFecha("2027-05-15")).toBe("15/05/2027");
    });

    it("calcula el porcentaje a tiempo", () => {
      expect(porcentajeATiempo(3, 4)).toBe(75);
      expect(porcentajeATiempo(0, 0)).toBe(0);
    });
  });
});
