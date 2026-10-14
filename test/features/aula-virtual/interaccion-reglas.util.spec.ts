import { MENSAJES_INTERACCION } from "@/features/aula-virtual/constants";
import {
  estaDentroDePlazoEdicion,
  validarAnioParaInteraccion,
  validarMotivoOcultamiento,
  validarTamanoAdjunto,
  validarTextoOAdjunto,
} from "@/features/aula-virtual/utils";

describe("RF-017: reglas puras de interacción y actividad del curso", () => {
  describe("validarTextoOAdjunto (CP-RF017-03)", () => {
    it("impide publicación vacía si no hay texto ni adjunto", () => {
      const res1 = validarTextoOAdjunto("", false);
      expect(res1.valido).toBe(false);
      expect(res1.mensaje).toBe(MENSAJES_INTERACCION.PUBLICACION_VACIA);

      const res2 = validarTextoOAdjunto("   ", false);
      expect(res2.valido).toBe(false);
      expect(res2.mensaje).toBe(MENSAJES_INTERACCION.PUBLICACION_VACIA);

      const res3 = validarTextoOAdjunto(null, false);
      expect(res3.valido).toBe(false);
      expect(res3.mensaje).toBe(MENSAJES_INTERACCION.PUBLICACION_VACIA);
    });

    it("permite publicación si contiene texto aunque no tenga adjunto", () => {
      const res = validarTextoOAdjunto("¿Alguien entendió el ejercicio 7?", false);
      expect(res.valido).toBe(true);
    });

    it("permite publicación si contiene adjunto aunque no tenga texto", () => {
      const res = validarTextoOAdjunto("", true);
      expect(res.valido).toBe(true);
    });
  });

  describe("validarTamanoAdjunto (CP-RF017-04)", () => {
    it("rechaza archivos que superan los 10 MB", () => {
      const bytes25Mb = 25 * 1024 * 1024;
      const res = validarTamanoAdjunto(bytes25Mb);
      expect(res.valido).toBe(false);
      expect(res.mensaje).toBe(MENSAJES_INTERACCION.ADJUNTO_MUY_PESADO);
    });

    it("acepta archivos de hasta 10 MB", () => {
      expect(validarTamanoAdjunto(10 * 1024 * 1024).valido).toBe(true);
      expect(validarTamanoAdjunto(5 * 1024 * 1024).valido).toBe(true);
    });
  });

  describe("estaDentroDePlazoEdicion (CP-RF017-06)", () => {
    it("permite editar dentro de los 15 minutos", () => {
      const creado = new Date("2027-05-15T10:00:00Z");
      const ahora10Min = new Date("2027-05-15T10:10:00Z");
      const ahora15Min = new Date("2027-05-15T10:15:00Z");

      expect(estaDentroDePlazoEdicion(creado, ahora10Min)).toBe(true);
      expect(estaDentroDePlazoEdicion(creado, ahora15Min)).toBe(true);
    });

    it("impide editar pasados los 15 minutos", () => {
      const creado = new Date("2027-05-15T10:00:00Z");
      const ahora30Min = new Date("2027-05-15T10:30:00Z");
      expect(estaDentroDePlazoEdicion(creado, ahora30Min)).toBe(false);
    });
  });

  describe("validarMotivoOcultamiento (CP-RF017-13)", () => {
    it("impide ocultar sin motivo", () => {
      const res1 = validarMotivoOcultamiento("");
      expect(res1.valido).toBe(false);
      expect(res1.mensaje).toBe(MENSAJES_INTERACCION.MOTIVO_REQUERIDO);

      const res2 = validarMotivoOcultamiento("   ");
      expect(res2.valido).toBe(false);
      expect(res2.mensaje).toBe(MENSAJES_INTERACCION.MOTIVO_REQUERIDO);
    });

    it("permite ocultar con motivo válido", () => {
      const res = validarMotivoOcultamiento("Lenguaje inapropiado");
      expect(res.valido).toBe(true);
    });
  });

  describe("validarAnioParaInteraccion (CP-RF017-19)", () => {
    it("impide interactuar si el año escolar está cerrado", () => {
      const res = validarAnioParaInteraccion("cerrado");
      expect(res.valido).toBe(false);
      expect(res.mensaje).toBe(MENSAJES_INTERACCION.ANIO_CERRADO);
    });

    it("permite interactuar si el año escolar está abierto", () => {
      expect(validarAnioParaInteraccion("abierto").valido).toBe(true);
      expect(validarAnioParaInteraccion("en_curso").valido).toBe(true);
    });
  });
});
