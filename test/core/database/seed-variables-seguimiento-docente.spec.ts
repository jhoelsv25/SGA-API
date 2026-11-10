import { VARIABLES_SEGUIMIENTO_DOCENTE } from "../../../src/core/database/seed-variables-seguimiento-docente";

describe("Variables del seguimiento docente (RF-004 V3)", () => {
  const porCodigo = new Map(VARIABLES_SEGUIMIENTO_DOCENTE.map((v) => [v.codigo, v]));

  it("define las 11 variables nuevas sin códigos repetidos", () => {
    expect(VARIABLES_SEGUIMIENTO_DOCENTE).toHaveLength(11);
    expect(porCodigo.size).toBe(11);
  });

  it("CP-RF004-33: trae los valores por defecto del requerimiento", () => {
    const valores = Object.fromEntries(
      VARIABLES_SEGUIMIENTO_DOCENTE.map((v) => [v.codigo, v.valor]),
    );
    expect(valores).toMatchObject({
      "sesion.alerta_salida_minutos": "10",
      "sesion.alerta_minutos_perdidos_umbral": "45",
      "sesion.alerta_minutos_perdidos_umbral_semana": "120",
      "sesion.justificacion_aviso_dias": "3",
      "sesion.permisos_personales_max_anio": "3",
      "sesion.minutos_hora_pedagogica": "45",
      "consolidado.dias_para_decidir": "0",
      "observacion.anticipacion_minima_dias": "2",
      "observacion.cantidad_objetivo_anual": "2",
      "observacion.plazo_descargo_dias": "7",
      "sesion.justificacion_motivos_con_documento": "descanso_medico,comision_de_servicio,licencia",
    });
  });

  it("la cantidad de observaciones solo admite de 2 a 3", () => {
    const v = porCodigo.get("observacion.cantidad_objetivo_anual");
    expect([v?.valorMinimo, v?.valorMaximo]).toEqual([2, 3]);
  });

  it("los umbrales de alerta admiten 0 para desactivarlos", () => {
    for (const codigo of [
      "sesion.alerta_minutos_perdidos_umbral",
      "sesion.alerta_minutos_perdidos_umbral_semana",
    ]) {
      expect(porCodigo.get(codigo)?.valorMinimo).toBe(0);
    }
  });

  it("la hora pedagógica no admite 0 (evita dividir entre cero)", () => {
    expect(porCodigo.get("sesion.minutos_hora_pedagogica")?.valorMinimo).toBe(1);
  });

  it("todo valor numérico por defecto está dentro de su rango", () => {
    for (const v of VARIABLES_SEGUIMIENTO_DOCENTE.filter((x) => x.tipo === "entero")) {
      const n = Number(v.valor);
      if (v.valorMinimo !== null) expect(n).toBeGreaterThanOrEqual(v.valorMinimo);
      if (v.valorMaximo !== null) expect(n).toBeLessThanOrEqual(v.valorMaximo);
    }
  });
});
