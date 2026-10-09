import {
  construirCredencialEmitida,
  parsearFechaIngreso,
  parsearJornadaHorasDocente,
  parsearParentescoApoderado,
  parsearTipoContratoDocente,
} from "@/features/importacion/utils";

describe("fila-parser.util (extensiones)", () => {
  describe("parsearTipoContratoDocente", () => {
    it("debe retornar nombrado por defecto si no es contratado ni practicante", () => {
      expect(parsearTipoContratoDocente({})).toBe("nombrado");
      expect(parsearTipoContratoDocente({ tipoContrato: "indefinido" })).toBe("nombrado");
    });

    it("debe retornar contratado o practicante correctamente sin importar mayúsculas", () => {
      expect(parsearTipoContratoDocente({ tipoContrato: "CONTRATADO" })).toBe("contratado");
      expect(parsearTipoContratoDocente({ tipo_contrato: "practicante" })).toBe("practicante");
    });
  });

  describe("parsearJornadaHorasDocente", () => {
    it("debe retornar 30 por defecto si no es 20, 24 o 40", () => {
      expect(parsearJornadaHorasDocente({})).toBe(30);
      expect(parsearJornadaHorasDocente({ jornada: 35 })).toBe(30);
    });

    it("debe aceptar valores válidos de 20, 24 y 40", () => {
      expect(parsearJornadaHorasDocente({ jornada: 20 })).toBe(20);
      expect(parsearJornadaHorasDocente({ jornadaHoras: "24" })).toBe(24);
      expect(parsearJornadaHorasDocente({ jornada: 40 })).toBe(40);
    });
  });

  describe("parsearParentescoApoderado", () => {
    it("debe retornar madre por defecto", () => {
      expect(parsearParentescoApoderado({})).toBe("madre");
    });

    it("debe normalizar el parentesco proporcionado a minúsculas", () => {
      expect(parsearParentescoApoderado({ parentesco: "PADRE" })).toBe("padre");
      expect(parsearParentescoApoderado({ parentesco: "tutor" })).toBe("tutor");
    });
  });

  describe("parsearFechaIngreso", () => {
    it("debe retornar la fecha proporcionada en formato string", () => {
      expect(parsearFechaIngreso({ fechaIngreso: "2024-03-01" })).toBe("2024-03-01");
      expect(parsearFechaIngreso({ fecha_ingreso: "2023-08-15" })).toBe("2023-08-15");
    });

    it("debe retornar la fecha actual en formato YYYY-MM-DD si no se envía", () => {
      const fecha = parsearFechaIngreso({});
      expect(fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("construirCredencialEmitida", () => {
    it("debe armar el DTO con todos los campos normalizados", () => {
      const dto = construirCredencialEmitida({
        nombreCompleto: "Rosa Quispe",
        numeroDocumento: "44332211",
        tipoRol: "Docente",
        nombreUsuario: "DOC-001",
        tempPassword: "PassWord123!",
        codigoCredencial: "CR-44332211",
        pin: "5678",
      });

      expect(dto.nombreCompleto).toBe("Rosa Quispe");
      expect(dto.numeroDocumento).toBe("44332211");
      expect(dto.tipoRol).toBe("Docente");
      expect(dto.nombreUsuario).toBe("DOC-001");
      expect(dto.tempPassword).toBe("PassWord123!");
      expect(dto.codigoCredencial).toBe("CR-44332211");
      expect(dto.pin).toBe("5678");
    });
  });
});
