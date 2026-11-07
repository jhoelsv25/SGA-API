import type { MarcacionDelDia } from "@/features/marcaciones/interfaces";
import { decidirMarca } from "@/features/marcaciones/utils";

const DIA = "2027-05-12";
const marca = (
  tipo: "entrada" | "salida",
  hora: string,
  origen: MarcacionDelDia["origen"],
  id = `${tipo}-${hora}`,
): MarcacionDelDia => ({ id, tipo, fechaHora: `${DIA} ${hora}`, origen });

const decidir = (
  previas: MarcacionDelDia[],
  hora: string,
  origen: MarcacionDelDia["origen"],
  extra: { esEstudiante?: boolean; minutosEntreVias?: number } = {},
) =>
  decidirMarca({
    esEstudiante: extra.esEstudiante ?? false,
    previas,
    fechaHora: `${DIA} ${hora}`,
    origen,
    minutosEntreVias: extra.minutosEntreVias ?? 30,
  });

describe("decidirMarca: marcaciones que llegan por distintas vías", () => {
  describe("sin marcas previas", () => {
    it("la primera marca del día es entrada, venga de la vía que venga", () => {
      for (const origen of ["kiosko", "biometrico", "manual"] as const) {
        expect(decidir([], "07:30:00", origen)).toEqual({ accion: "registrar", tipo: "entrada" });
      }
    });
  });

  describe("ventana entre vías (la misma asistencia por dos medios)", () => {
    it("kiosko y luego reloj dentro de la ventana: se ignora y se indica con cuál coincide", () => {
      const kiosko = marca("entrada", "07:30:00", "kiosko");
      expect(decidir([kiosko], "07:50:00", "biometrico")).toEqual({
        accion: "ignorar",
        razon: "duplicada_entre_vias",
        con: kiosko,
      });
    });

    it("reloj y luego kiosko dentro de la ventana: el kiosko ya no genera una salida falsa", () => {
      const reloj = marca("entrada", "07:30:00", "biometrico");
      expect(decidir([reloj], "07:45:00", "kiosko")).toMatchObject({
        accion: "ignorar",
        razon: "duplicada_entre_vias",
      });
    });

    it("una entrada manual también cuenta como otra vía", () => {
      const manual = marca("entrada", "07:45:00", "manual");
      expect(decidir([manual], "08:10:00", "biometrico")).toMatchObject({
        accion: "ignorar",
        razon: "duplicada_entre_vias",
      });
    });

    it("fuera de la ventana es una marca nueva: la salida", () => {
      const kiosko = marca("entrada", "07:30:00", "kiosko");
      expect(decidir([kiosko], "14:03:00", "biometrico")).toEqual({
        accion: "registrar",
        tipo: "salida",
      });
    });

    it("justo en el límite de la ventana ya no es duplicada", () => {
      const kiosko = marca("entrada", "07:30:00", "kiosko");
      expect(decidir([kiosko], "08:00:00", "biometrico")).toEqual({
        accion: "registrar",
        tipo: "salida",
      });
    });

    it("la ventana mira hacia atrás y hacia adelante (marcas que llegan desordenadas)", () => {
      const kiosko = marca("entrada", "07:30:00", "kiosko");
      expect(decidir([kiosko], "07:10:00", "biometrico")).toMatchObject({
        accion: "ignorar",
        razon: "duplicada_entre_vias",
      });
    });

    it("una segunda marca de la MISMA vía no la cubre la ventana (la ve su propia regla)", () => {
      const reloj = marca("entrada", "07:30:00", "biometrico");
      expect(decidir([reloj], "07:40:00", "biometrico")).toEqual({
        accion: "registrar",
        tipo: "salida",
      });
    });

    it("con la ventana en 0 se desactiva", () => {
      const kiosko = marca("entrada", "07:30:00", "kiosko");
      expect(decidir([kiosko], "07:31:00", "biometrico", { minutosEntreVias: 0 })).toEqual({
        accion: "registrar",
        tipo: "salida",
      });
    });
  });

  describe("entrada y salida por la hora de la marca, no por el orden de llegada", () => {
    it("llega tarde una marca anterior a la entrada: pasa a ser la entrada y la guardada, la salida", () => {
      const kiosko = marca("entrada", "09:10:00", "kiosko", "m-kiosko");
      expect(decidir([kiosko], "07:05:00", "biometrico")).toEqual({
        accion: "registrar",
        tipo: "entrada",
        reetiquetar: kiosko,
      });
    });

    it("una marca posterior a la entrada es la salida", () => {
      const kiosko = marca("entrada", "07:30:00", "kiosko");
      expect(decidir([kiosko], "15:00:00", "biometrico")).toEqual({
        accion: "registrar",
        tipo: "salida",
      });
    });

    it("con entrada y salida ya registradas no se guarda una tercera", () => {
      const previas = [
        marca("entrada", "07:30:00", "kiosko"),
        marca("salida", "14:03:00", "biometrico"),
      ];
      expect(decidir(previas, "16:00:00", "biometrico")).toEqual({
        accion: "ignorar",
        razon: "jornada_completa",
      });
    });

    it("una salida manual sin entrada no cambia: la marca nueva es la entrada", () => {
      const manual = marca("salida", "14:00:00", "manual");
      expect(decidir([manual], "07:30:00", "biometrico")).toEqual({
        accion: "registrar",
        tipo: "entrada",
      });
    });
  });

  describe("estudiantes (solo entrada)", () => {
    it("ya tiene entrada: no admite otra, aunque llegue por otra vía fuera de la ventana", () => {
      const kiosko = marca("entrada", "07:30:00", "kiosko");
      expect(decidir([kiosko], "11:00:00", "kiosko", { esEstudiante: true })).toEqual({
        accion: "ignorar",
        razon: "jornada_completa",
      });
    });
  });
});
