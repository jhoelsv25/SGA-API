import { minutosDelDia } from "../../marcaciones/utils/marcacion-reglas.util";
import { TIPOS_NOVEDAD, type CodigoDia, type TipoNovedad } from "../constants";

export interface MarcaDelDia {
  /** HH:MM[:SS] */
  hora: string;
  resultado: string;
  minutosTardanza: number;
  justificada: boolean;
}

export type MarcaOmitida = "ingreso" | "salida";

export interface DiaAEvaluar {
  /** Día en que la persona debía trabajar. */
  laborable: boolean;
  entrada: MarcaDelDia | null;
  salida: MarcaDelDia | null;
  novedad: { tipo: TipoNovedad; minutos: number | null; marcaOmitida?: MarcaOmitida | null } | null;
  horario: { horaEntrada: string; horaSalida: string; toleranciaMin: number };
  incompletaEsInasistencia: boolean;
}

export interface DiaEvaluado {
  codigo: CodigoDia;
  minutosTardanza: number;
  minutosPermisoSinGoce: number;
  /** Por qué se marcó inasistencia habiendo alguna marca. */
  motivo: "sin_ingreso" | "sin_salida" | "salida_anticipada" | null;
}

const dia = (codigo: CodigoDia, extra: Partial<DiaEvaluado> = {}): DiaEvaluado => ({
  codigo,
  minutosTardanza: 0,
  minutosPermisoSinGoce: 0,
  motivo: null,
  ...extra,
});

/** Minutos de tardanza de una entrada. Fuera de la ventana el reloj no los calculó: se calculan aquí. */
function minutosTarde(entrada: MarcaDelDia, horario: DiaAEvaluar["horario"]): number {
  if (entrada.justificada) return 0;
  if (entrada.resultado === "tardanza") return entrada.minutosTardanza;
  if (entrada.resultado !== "fuera_de_turno") return 0;
  return Math.max(
    0,
    minutosDelDia(entrada.hora) - minutosDelDia(horario.horaEntrada) - horario.toleranciaMin,
  );
}

const salioAntes = (salida: MarcaDelDia, horario: DiaAEvaluar["horario"]): boolean =>
  !salida.justificada &&
  (salida.resultado === "salida_anticipada" ||
    (salida.resultado === "fuera_de_turno" &&
      minutosDelDia(salida.hora) < minutosDelDia(horario.horaSalida)));

const esHoraDeSalida = (m: MarcaDelDia, horario: DiaAEvaluar["horario"]): boolean =>
  minutosDelDia(m.hora) >= minutosDelDia(horario.horaSalida);

/** Código del Anexo 03 para un día (sin la regla de la tercera tardanza, que es del mes). */
export function evaluarDia(d: DiaAEvaluar): DiaEvaluado {
  if (!d.laborable) return dia("");
  const codigoNovedad = d.novedad ? TIPOS_NOVEDAD[d.novedad.tipo].codigo : null;
  if (codigoNovedad) {
    return dia(codigoNovedad, {
      minutosPermisoSinGoce: codigoNovedad === "P" ? (d.novedad?.minutos ?? 0) : 0,
    });
  }
  const omitida = d.novedad?.tipo === "omision_justificada" ? d.novedad.marcaOmitida : null;
  let { entrada, salida } = d;
  // Si olvidó el ingreso y marcó al irse, esa única marca quedó como entrada: es la salida.
  if (omitida === "ingreso" && entrada && !salida && esHoraDeSalida(entrada, d.horario)) {
    salida = entrada;
    entrada = null;
  }
  // Una omisión cubre una sola marca: sin ninguna, no se acredita el día.
  if (!entrada && !salida) return dia("I");
  if (d.incompletaEsInasistencia) {
    if (!entrada && omitida !== "ingreso") return dia("I", { motivo: "sin_ingreso" });
    if (omitida !== "salida") {
      if (!salida) return dia("I", { motivo: "sin_salida" });
      if (salioAntes(salida, d.horario)) return dia("I", { motivo: "salida_anticipada" });
    }
  }
  // Justificado el ingreso, la primera marca registrada no prueba a qué hora llegó.
  const tarde = entrada && omitida !== "ingreso" ? minutosTarde(entrada, d.horario) : 0;
  return tarde > 0 ? dia("T", { minutosTardanza: tarde }) : dia("A");
}

/** La tardanza número `numero` del mes sale como 3T (RSG 326-2017, 6.3.1.2). 0 lo desactiva. */
export function aplicarTerceraTardanza(dias: DiaEvaluado[], numero: number): DiaEvaluado[] {
  let cuenta = 0;
  return dias.map((d) => {
    if (d.codigo !== "T") return d;
    cuenta += 1;
    return cuenta === numero ? { ...d, codigo: "3T" } : d;
  });
}

export interface TotalesDelMes {
  /** Incluye las 3T, como piden las instrucciones del Anexo 04. */
  diasInasistencia: number;
  minutosTardanza: number;
  minutosPermisoSinGoce: number;
  diasHuelga: number;
}

export function totalizar(dias: readonly DiaEvaluado[]): TotalesDelMes {
  const suma = (f: (d: DiaEvaluado) => number) => dias.reduce((a, d) => a + f(d), 0);
  return {
    diasInasistencia: suma((d) => (d.codigo === "I" || d.codigo === "3T" ? 1 : 0)),
    minutosTardanza: suma((d) => d.minutosTardanza),
    minutosPermisoSinGoce: suma((d) => d.minutosPermisoSinGoce),
    diasHuelga: suma((d) => (d.codigo === "H" ? 1 : 0)),
  };
}

export const horasYMinutos = (total: number): { horas: number; minutos: number } => ({
  horas: Math.floor(total / 60),
  minutos: total % 60,
});
