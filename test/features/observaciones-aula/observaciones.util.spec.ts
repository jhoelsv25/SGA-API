import {
  contenidoInstrumentoCompleto,
  diaSemanaIso,
  diasEntre,
  duracionFueraDeRango,
  evolucionDeNivel,
  intervalosSeCruzan,
  minutosEntre,
  normalizarContenido,
  notaEsValida,
  sumarDias,
} from "@/features/observaciones-aula";
import { instrumentoCompleto } from "./fixtures";

describe("RF-023: utilidades de observación de aula", () => {
  it("calcula los minutos entre dos horas", () => {
    expect(minutosEntre("08:32", "09:25")).toBe(53);
    expect(minutosEntre("08:30:00", "09:00:00")).toBe(30);
  });

  it("la duración fuera de 45 a 90 minutos es atípica", () => {
    expect(duracionFueraDeRango(30)).toBe(true);
    expect(duracionFueraDeRango(45)).toBe(false);
    expect(duracionFueraDeRango(90)).toBe(false);
    expect(duracionFueraDeRango(91)).toBe(true);
  });

  it("detecta el cruce de horarios sin contar el borde", () => {
    expect(intervalosSeCruzan("08:30", "10:00", "09:00", "10:30")).toBe(true);
    expect(intervalosSeCruzan("08:30", "10:00", "10:00", "11:00")).toBe(false);
  });

  it("cuenta días calendario y suma días", () => {
    expect(diasEntre("2027-03-16", "2027-03-18")).toBe(2);
    expect(sumarDias("2027-03-19", 7)).toBe("2027-03-26");
    expect(diaSemanaIso("2027-03-18")).toBe(4); // jueves
    expect(diaSemanaIso("2027-03-21")).toBe(7); // domingo
  });

  it("acepta conductas observables y rechaza notas vacías o con un nivel", () => {
    expect(notaEsValida("De 16 estudiantes, 12 realizan la actividad con afán")).toBe(true);
    expect(notaEsValida("   ")).toBe(false);
    expect(notaEsValida(undefined)).toBe(false);
    expect(notaEsValida("Alcanza el nivel III")).toBe(false);
    expect(notaEsValida("Hay 3 niveles de dificultad en la ficha")).toBe(true);
  });

  it("compara la evolución de un desempeño", () => {
    expect(evolucionDeNivel(2, 3)).toBe("sube");
    expect(evolucionDeNivel(3, 3)).toBe("igual");
    expect(evolucionDeNivel(4, 2)).toBe("baja");
  });

  describe("instrumento", () => {
    it("completo: 5 desempeños con 4 niveles descritos", () => {
      expect(contenidoInstrumentoCompleto(instrumentoCompleto())).toBe(true);
    });

    it("incompleto si falta la descripción de un nivel", () => {
      const c = instrumentoCompleto();
      c.desempenos[2].niveles[1].descripcion = "  ";
      expect(contenidoInstrumentoCompleto(c)).toBe(false);
    });

    it("incompleto si faltan desempeños o hay uno repetido", () => {
      const faltan = instrumentoCompleto();
      faltan.desempenos.pop();
      expect(contenidoInstrumentoCompleto(faltan)).toBe(false);
      const repetido = instrumentoCompleto();
      repetido.desempenos[4].numero = 1;
      expect(contenidoInstrumentoCompleto(repetido)).toBe(false);
    });

    it("normaliza el nombre y el grupo de los niveles con los del instructivo", () => {
      const c = normalizarContenido(
        instrumentoCompleto() as unknown as Parameters<typeof normalizarContenido>[0],
      );
      const niveles = c.desempenos[0].niveles;
      expect(niveles.map((n) => n.nombre)).toEqual([
        "Muy deficiente",
        "En proceso",
        "Suficiente",
        "Destacado",
      ]);
      expect(niveles.map((n) => n.grupo)).toEqual([
        "insatisfactorio",
        "insatisfactorio",
        "satisfactorio",
        "satisfactorio",
      ]);
    });
  });
});
