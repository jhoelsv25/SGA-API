import { leyendaAnexo03 } from "@/features/asistencia-ugel/constants";
import {
  aplicarTerceraTardanza,
  evaluarDia,
  horasYMinutos,
  totalizar,
  type DiaAEvaluar,
  type MarcaDelDia,
} from "@/features/asistencia-ugel/utils/reporte-ugel.util";

const marca = (hora: string, extra: Partial<MarcaDelDia> = {}): MarcaDelDia => ({
  hora,
  resultado: "puntual",
  minutosTardanza: 0,
  justificada: false,
  ...extra,
});

const base: DiaAEvaluar = {
  laborable: true,
  entrada: marca("07:25:00"),
  salida: marca("13:35:00"),
  novedad: null,
  horario: { horaEntrada: "07:30:00", horaSalida: "13:30:00", toleranciaMin: 0 },
  incompletaEsInasistencia: true,
};
const evaluar = (cambio: Partial<DiaAEvaluar>) => evaluarDia({ ...base, ...cambio });
const tarde = marca("07:38:00", { resultado: "tardanza", minutosTardanza: 8 });

describe("evaluarDia (Anexo 03, RSG 326-2017)", () => {
  it("día completo y puntual: A; no laborable: vacío", () => {
    expect(evaluar({}).codigo).toBe("A");
    expect(evaluar({ laborable: false, entrada: null, salida: null }).codigo).toBe("");
  });

  it("sin marcas: I", () => {
    expect(evaluar({ entrada: null, salida: null }).codigo).toBe("I");
  });

  it.each([
    [{ salida: null }, "sin_salida"],
    [{ entrada: null }, "sin_ingreso"],
    [{ salida: marca("12:00:00", { resultado: "salida_anticipada" }) }, "salida_anticipada"],
    [{ salida: marca("09:00:00", { resultado: "fuera_de_turno" }) }, "salida_anticipada"],
  ])("5.3.2: %j es inasistencia (%s)", (cambio, motivo) => {
    expect(evaluar(cambio)).toMatchObject({ codigo: "I", motivo });
  });

  it("si la regla de marca incompleta se desactiva, el día cuenta como laborado", () => {
    expect(evaluar({ salida: null, incompletaEsInasistencia: false }).codigo).toBe("A");
  });

  it("una salida anticipada justificada no es inasistencia", () => {
    const salida = marca("12:00:00", { resultado: "salida_anticipada", justificada: true });
    expect(evaluar({ salida }).codigo).toBe("A");
  });

  it("tardanza: T con sus minutos; justificada: A", () => {
    expect(evaluar({ entrada: tarde })).toMatchObject({ codigo: "T", minutosTardanza: 8 });
    expect(evaluar({ entrada: { ...tarde, justificada: true } })).toMatchObject({
      codigo: "A",
      minutosTardanza: 0,
    });
  });

  it("una llegada fuera de la ventana del reloj también cuenta como tardanza", () => {
    const entrada = marca("11:00:00", { resultado: "fuera_de_turno" });
    expect(evaluar({ entrada })).toMatchObject({ codigo: "T", minutosTardanza: 210 });
  });

  it.each([
    ["licencia_con_goce", "J"],
    ["permiso_con_goce", "J"],
    ["vacaciones", "J"],
    ["licencia_sin_goce", "L"],
    ["huelga", "H"],
  ] as const)("%s sale como %s aunque no haya marcas", (tipo, codigo) => {
    const r = evaluar({ entrada: null, salida: null, novedad: { tipo, minutos: null } });
    expect(r.codigo).toBe(codigo);
  });

  it("el permiso sin goce sale como P y suma sus minutos", () => {
    const r = evaluar({ novedad: { tipo: "permiso_sin_goce", minutos: 90 } });
    expect(r).toMatchObject({ codigo: "P", minutosPermisoSinGoce: 90 });
  });

  const omision = (marcaOmitida: "ingreso" | "salida") => ({
    tipo: "omision_justificada" as const,
    minutos: null,
    marcaOmitida,
  });

  it("6.1.5: justificar la salida omitida deja de ser inasistencia y mantiene la tardanza", () => {
    expect(evaluar({ salida: null, novedad: omision("salida") }).codigo).toBe("A");
    expect(evaluar({ entrada: tarde, salida: null, novedad: omision("salida") }).codigo).toBe("T");
  });

  it("justificar una marca no cubre la otra", () => {
    expect(evaluar({ salida: null, novedad: omision("ingreso") }).codigo).toBe("I");
    expect(evaluar({ entrada: null, novedad: omision("salida") }).codigo).toBe("I");
    expect(evaluar({ entrada: null, salida: null, novedad: omision("salida") }).codigo).toBe("I");
  });

  it("ingreso omitido: la única marca hecha desde la hora de salida es la salida", () => {
    const entrada = marca("14:03:00", { resultado: "fuera_de_turno" });
    const r = evaluar({ entrada, salida: null, novedad: omision("ingreso") });
    expect(r).toMatchObject({ codigo: "A", minutosTardanza: 0 });
  });

  it("ingreso omitido con una única marca antes de la hora de salida: sigue faltando la salida", () => {
    const entrada = marca("11:00:00", { resultado: "fuera_de_turno" });
    const r = evaluar({ entrada, salida: null, novedad: omision("ingreso") });
    expect(r).toMatchObject({ codigo: "I", motivo: "sin_salida" });
  });
});

describe("reglas del mes", () => {
  const tardanzas = [1, 2, 3, 4].map(() => evaluar({ entrada: tarde }));

  it("solo la tercera tardanza sale como 3T, y 0 lo desactiva", () => {
    expect(aplicarTerceraTardanza(tardanzas, 3).map((d) => d.codigo)).toEqual([
      "T",
      "T",
      "3T",
      "T",
    ]);
    expect(aplicarTerceraTardanza(tardanzas, 0).map((d) => d.codigo)).toEqual(["T", "T", "T", "T"]);
  });

  it("el Anexo 04 suma la 3T como inasistencia y todos los minutos de tardanza", () => {
    expect(totalizar(aplicarTerceraTardanza(tardanzas, 3))).toEqual({
      diasInasistencia: 1,
      minutosTardanza: 32,
      minutosPermisoSinGoce: 0,
      diasHuelga: 0,
    });
    expect(horasYMinutos(135)).toEqual({ horas: 2, minutos: 15 });
  });
});

describe("leyenda del Anexo 03", () => {
  it("sin 3T, como el modificado por la RSG 121-2018, salvo que se active", () => {
    expect(leyendaAnexo03(false).map(([c]) => c)).toEqual(["A", "I", "J", "L", "P", "T", "H"]);
    expect(leyendaAnexo03(true).map(([c]) => c)).toContain("3T");
  });
});
