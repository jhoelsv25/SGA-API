import {
  calcularRatioPorcentaje,
  estructurarCsp,
  estructurarIgm,
  estructurarIsa,
  formatearPorcentaje,
  redondear2Decimales,
} from "@/features/indicadores";

describe("calculo-indicadores.util", () => {
  describe("redondear2Decimales", () => {
    it("debe redondear valores con decimales periódicos a 2 decimales", () => {
      expect(redondear2Decimales(96.610169)).toBe(96.61);
      expect(redondear2Decimales(95.238095)).toBe(95.24);
      expect(redondear2Decimales(88.0)).toBe(88.0);
    });

    it("debe redondear correctamente casos con EPSILON de punto flotante", () => {
      expect(redondear2Decimales(1.005)).toBe(1.01);
      expect(redondear2Decimales(0.0)).toBe(0.0);
    });
  });

  describe("formatearPorcentaje", () => {
    it("debe formatear a texto con 2 decimales fijos y símbolo %", () => {
      expect(formatearPorcentaje(96.61)).toBe("96.61 %");
      expect(formatearPorcentaje(88)).toBe("88.00 %");
      expect(formatearPorcentaje(0)).toBe("0.00 %");
    });

    it("debe retornar 'Sin datos' cuando el valor es null o NaN", () => {
      expect(formatearPorcentaje(null)).toBe("Sin datos");
      expect(formatearPorcentaje(Number.NaN)).toBe("Sin datos");
    });
  });

  describe("calcularRatioPorcentaje", () => {
    it("debe calcular el porcentaje exacto y redondearlo", () => {
      expect(calcularRatioPorcentaje(1140, 1180)).toBe(96.61);
      expect(calcularRatioPorcentaje(160, 168)).toBe(95.24);
      expect(calcularRatioPorcentaje(220, 250)).toBe(88.0);
    });

    it("debe retornar null si el denominador es cero o negativo", () => {
      expect(calcularRatioPorcentaje(10, 0)).toBeNull();
      expect(calcularRatioPorcentaje(10, -5)).toBeNull();
    });
  });

  describe("estructurarCsp", () => {
    it("debe retornar sinDatos=true cuando planificadas es 0", () => {
      const resultado = estructurarCsp(
        { planificadas: 0, cumplidas: 0, parciales: 0, noCumplidas: 0, justificadas: 0 },
        false,
      );
      expect(resultado.sinDatos).toBe(true);
      expect(resultado.porcentaje).toBeNull();
      expect(resultado.porcentajeTexto).toBe("Sin datos");
      expect(resultado.mensajeSinDatos).toBeDefined();
    });

    it("debe retornar sinDatos=true cuando planificadas es igual a justificadas", () => {
      const resultado = estructurarCsp(
        { planificadas: 5, cumplidas: 0, parciales: 0, noCumplidas: 0, justificadas: 5 },
        false,
      );
      expect(resultado.sinDatos).toBe(true);
      expect(resultado.porcentaje).toBeNull();
      expect(resultado.desglose.denominadorEfectivo).toBe(0);
    });
  });

  describe("estructurarIsa", () => {
    it("debe calcular porcentajeVistasFamilia sobre las programadas", () => {
      const resultado = estructurarIsa(
        {
          programadas: 168,
          publicadasATiempo: 160,
          publicadasFueraDePlazo: 5,
          pendientes: 3,
          vistasPorFamilia: 142,
        },
        false,
      );
      expect(resultado.porcentaje).toBe(95.24);
      expect(resultado.desglose.porcentajeVistasFamilia).toBe(84.52);
    });

    it("debe retornar sinDatos=true cuando programadas es 0", () => {
      const resultado = estructurarIsa(
        {
          programadas: 0,
          publicadasATiempo: 0,
          publicadasFueraDePlazo: 0,
          pendientes: 0,
          vistasPorFamilia: 0,
        },
        false,
      );
      expect(resultado.sinDatos).toBe(true);
      expect(resultado.porcentaje).toBeNull();
    });
  });

  describe("estructurarIgm", () => {
    it("debe excluir materiales extra del numerador y denominador", () => {
      const resultado = estructurarIgm(
        {
          planificados: 250,
          publicadosATiempo: 220,
          publicadosFueraDePlazo: 20,
          pendientes: 10,
          extras: 30,
        },
        true,
      );
      expect(resultado.numerador).toBe(220);
      expect(resultado.denominador).toBe(250);
      expect(resultado.porcentaje).toBe(88.0);
      expect(resultado.enCurso).toBe(true);
      expect(resultado.desglose.extras).toBe(30);
    });

    it("debe retornar sinDatos=true cuando planificados es 0", () => {
      const resultado = estructurarIgm(
        {
          planificados: 0,
          publicadosATiempo: 0,
          publicadosFueraDePlazo: 0,
          pendientes: 0,
          extras: 10,
        },
        false,
      );
      expect(resultado.sinDatos).toBe(true);
      expect(resultado.porcentaje).toBeNull();
    });
  });
});
