import {
  validarCamposObligatoriosPersona,
  validarEstructuraPersonaFila,
  validarFechaNacimientoNoFutura,
  validarFormatoDni,
  validarPersonaFila,
} from "@/features/importacion/utils";

describe("fila-validator.util", () => {
  describe("validarCamposObligatoriosPersona", () => {
    it("debe retornar error si falta documento, nombres o apellido paterno", () => {
      expect(validarCamposObligatoriosPersona("", "Juan", "Pérez").esValida).toBe(false);
      expect(validarCamposObligatoriosPersona("12345678", "", "Pérez").esValida).toBe(false);
      expect(validarCamposObligatoriosPersona("12345678", "Juan", "").esValida).toBe(false);
    });

    it("debe ser válida si todos los campos obligatorios están presentes", () => {
      const res = validarCamposObligatoriosPersona("12345678", "Juan", "Pérez");
      expect(res.esValida).toBe(true);
      expect(res.mensaje).toBeUndefined();
    });
  });

  describe("validarFormatoDni", () => {
    it("debe rechazar DNI que no tenga exactamente 8 dígitos", () => {
      expect(validarFormatoDni("dni", "123").esValida).toBe(false);
      expect(validarFormatoDni("dni", "123456789").esValida).toBe(false);
      expect(validarFormatoDni("dni", "1234abcd").esValida).toBe(false);
    });

    it("debe aceptar DNI con 8 dígitos válidos", () => {
      expect(validarFormatoDni("dni", "76543210").esValida).toBe(true);
    });

    it("no debe forzar 8 dígitos para otros tipos de documento", () => {
      expect(validarFormatoDni("ce", "001234567").esValida).toBe(true);
    });
  });

  describe("validarFechaNacimientoNoFutura", () => {
    it("debe rechazar fechas futuras", () => {
      const res = validarFechaNacimientoNoFutura("2099-01-01");
      expect(res.esValida).toBe(false);
    });

    it("debe aceptar fechas pasadas o no provistas", () => {
      expect(validarFechaNacimientoNoFutura("2010-05-15").esValida).toBe(true);
      expect(validarFechaNacimientoNoFutura(undefined).esValida).toBe(true);
    });
  });

  describe("validarEstructuraPersonaFila", () => {
    it("debe consolidar todas las validaciones estructurales correctamente", () => {
      const valido = validarEstructuraPersonaFila(
        "dni",
        "76543210",
        "Carlos",
        "Mendoza",
        "2005-10-10",
      );
      expect(valido.esValida).toBe(true);

      const invalido = validarEstructuraPersonaFila("dni", "123", "Carlos", "Mendoza");
      expect(invalido.esValida).toBe(false);
    });
  });

  describe("validarPersonaFila", () => {
    it("debe validar integralmente una fila de persona correcta", () => {
      const resultado = validarPersonaFila({
        tipoDocumento: "DNI",
        numeroDocumento: "76543210",
        nombres: "Carlos Alberto",
        apellidoPaterno: "Mendoza",
        sexo: "M",
      });
      expect(resultado.esValida).toBe(true);
      expect(resultado.tipoDocumento).toBe("dni");
      expect(resultado.numeroDocumento).toBe("76543210");
    });

    it("debe fallar si el tipo de documento es inválido", () => {
      const resultado = validarPersonaFila({
        tipoDocumento: "INVALIDO",
        numeroDocumento: "76543210",
        nombres: "Carlos",
        apellidoPaterno: "Mendoza",
        sexo: "M",
      });
      expect(resultado.esValida).toBe(false);
    });

    it("debe fallar si el sexo es inválido", () => {
      const resultado = validarPersonaFila({
        tipoDocumento: "DNI",
        numeroDocumento: "76543210",
        nombres: "Carlos",
        apellidoPaterno: "Mendoza",
        sexo: "X",
      });
      expect(resultado.esValida).toBe(false);
    });
  });
});
