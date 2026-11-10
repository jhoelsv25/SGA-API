import {
  CANTIDAD_DESEMPENOS,
  DURACION_HABITUAL_MAX,
  DURACION_HABITUAL_MIN,
  NIVELES,
  nivelGrupo,
  NIVEL_NOMBRE,
  type Nivel,
} from "../constants";
import type { InstrumentoContenido } from "../interfaces";

/** "08:30" o "08:30:00" → minutos desde la medianoche. */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function minutosEntre(inicio: string, fin: string): number {
  return aMinutos(fin) - aMinutos(inicio);
}

export function duracionFueraDeRango(minutos: number): boolean {
  return minutos < DURACION_HABITUAL_MIN || minutos > DURACION_HABITUAL_MAX;
}

/** Los intervalos [ai, af) y [bi, bf) se cruzan. */
export function intervalosSeCruzan(ai: string, af: string, bi: string, bf: string): boolean {
  return aMinutos(ai) < aMinutos(bf) && aMinutos(bi) < aMinutos(af);
}

/** Días calendario de `desde` a `hasta` (ambos AAAA-MM-DD). */
export function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(`${desde}T00:00:00Z`);
  const b = Date.parse(`${hasta}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function sumarDias(fecha: string, dias: number): string {
  const t = Date.parse(`${fecha}T00:00:00Z`) + dias * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Día de la semana ISO (1 lunes … 7 domingo) de una fecha AAAA-MM-DD. */
export function diaSemanaIso(fecha: string): number {
  const d = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/**
 * Una nota debe ser una conducta observable. Se rechaza la vacía y la que declara un nivel
 * («alcanza el nivel III»), que es una calificación y no una evidencia.
 */
export function notaEsValida(texto: string | undefined | null): boolean {
  const limpio = (texto ?? "").trim();
  if (!limpio) return false;
  return !/\bnivel(?:es)?\s+(i{1,3}|iv|[1-4])\b/i.test(limpio);
}

export function contenidoInstrumentoCompleto(
  contenido: unknown,
): contenido is InstrumentoContenido {
  const desempenos = (contenido as InstrumentoContenido | null)?.desempenos;
  if (!Array.isArray(desempenos) || desempenos.length !== CANTIDAD_DESEMPENOS) return false;
  const numeros = new Set(desempenos.map((d) => d.numero));
  if (numeros.size !== CANTIDAD_DESEMPENOS) return false;
  for (let n = 1; n <= CANTIDAD_DESEMPENOS; n++) if (!numeros.has(n)) return false;
  return desempenos.every(
    (d) =>
      typeof d.nombre === "string" &&
      d.nombre.trim() !== "" &&
      Array.isArray(d.aspectos) &&
      Array.isArray(d.niveles) &&
      NIVELES.every((nivel) => {
        const fila = d.niveles.find((x) => x.nivel === nivel);
        return Boolean(fila && typeof fila.descripcion === "string" && fila.descripcion.trim());
      }),
  );
}

/** Completa el nombre y el grupo de cada nivel con los del instructivo (no se confía en el cliente). */
export function normalizarContenido(contenido: InstrumentoContenido): InstrumentoContenido {
  return {
    desempenos: contenido.desempenos.map((d) => ({
      numero: d.numero,
      nombre: d.nombre.trim(),
      aspectos: d.aspectos.map((a) => a.trim()).filter(Boolean),
      niveles: NIVELES.map((nivel) => {
        const origen = d.niveles.find((x) => x.nivel === nivel);
        return {
          nivel,
          nombre: NIVEL_NOMBRE[nivel],
          grupo: nivelGrupo(nivel),
          descripcion: (origen?.descripcion ?? "").trim(),
        };
      }),
    })),
  };
}

export type Evolucion = "sube" | "igual" | "baja";

export function evolucionDeNivel(anterior: Nivel, actual: Nivel): Evolucion {
  if (actual > anterior) return "sube";
  if (actual < anterior) return "baja";
  return "igual";
}

export function nombreCompleto(nombres: string, paterno: string, materno?: string | null): string {
  return [nombres, paterno, materno].filter(Boolean).join(" ");
}
