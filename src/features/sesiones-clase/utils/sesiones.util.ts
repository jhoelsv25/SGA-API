import { minutosDelDia } from "../../marcaciones/utils";
import { TIPO_BLOQUE_CLASE } from "../constants";

export interface BloqueDelDia {
  horarioId: string;
  seccionId: string;
  cursoSeccionId: string | null;
  docenteId: string | null;
  tipoBloque: string;
  horaInicio: string;
  horaFin: string;
}

export interface SesionPlanificada {
  horarioId: string;
  docenteId: string;
  horaInicio: string;
  horaFin: string;
}

/** "HH:mm" a partir de minutos desde la medianoche. */
export function horaDeMinutos(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Una sesión por bloque de clase con docente. Dos bloques seguidos del mismo curso en la
 * misma sección (bloque doble) forman una sola sesión (P-04); un recreo entre ellos los separa.
 */
export function planificarSesiones(bloques: readonly BloqueDelDia[]): SesionPlanificada[] {
  const porSeccion = new Map<string, BloqueDelDia[]>();
  for (const b of bloques) {
    const lista = porSeccion.get(b.seccionId) ?? [];
    lista.push(b);
    porSeccion.set(b.seccionId, lista);
  }

  const sesiones: SesionPlanificada[] = [];
  for (const lista of porSeccion.values()) {
    lista.sort((a, b) => minutosDelDia(a.horaInicio) - minutosDelDia(b.horaInicio));
    let actual: (SesionPlanificada & { cursoSeccionId: string }) | null = null;
    for (const b of lista) {
      const esClase = b.tipoBloque === TIPO_BLOQUE_CLASE && b.cursoSeccionId && b.docenteId;
      const continua =
        esClase &&
        actual !== null &&
        actual.cursoSeccionId === b.cursoSeccionId &&
        actual.docenteId === b.docenteId &&
        minutosDelDia(actual.horaFin) === minutosDelDia(b.horaInicio);
      if (continua && actual) {
        actual.horaFin = b.horaFin;
        continue;
      }
      if (actual) sesiones.push(sinCurso(actual));
      actual = esClase
        ? {
            horarioId: b.horarioId,
            cursoSeccionId: b.cursoSeccionId!,
            docenteId: b.docenteId!,
            horaInicio: b.horaInicio,
            horaFin: b.horaFin,
          }
        : null;
    }
    if (actual) sesiones.push(sinCurso(actual));
  }
  return sesiones;
}

function sinCurso(s: SesionPlanificada & { cursoSeccionId: string }): SesionPlanificada {
  return {
    horarioId: s.horarioId,
    docenteId: s.docenteId,
    horaInicio: s.horaInicio,
    horaFin: s.horaFin,
  };
}

export type EvaluacionIngreso =
  | { tipo: "antes"; habilitaA: string }
  | { tipo: "despues" }
  | { tipo: "ok"; minutosRetraso: number };

/** Ventana: desde `minutosAntes` antes del inicio hasta el fin del bloque. */
export function evaluarIngreso(params: {
  horaInicio: string;
  horaFin: string;
  ahora: string;
  minutosAntes: number;
  toleranciaIngreso: number;
}): EvaluacionIngreso {
  const inicio = minutosDelDia(params.horaInicio);
  const fin = minutosDelDia(params.horaFin);
  const ahora = minutosDelDia(params.ahora);
  const apertura = inicio - params.minutosAntes;
  if (ahora < apertura) return { tipo: "antes", habilitaA: horaDeMinutos(apertura) };
  if (ahora >= fin) return { tipo: "despues" };
  const tarde = ahora - inicio;
  return { tipo: "ok", minutosRetraso: tarde > params.toleranciaIngreso ? tarde : 0 };
}

/** Minutos de salida antes de tiempo que superan la tolerancia. */
export function minutosSalidaAnticipada(
  horaFin: string,
  ahora: string,
  tolerancia: number,
): number {
  const antes = minutosDelDia(horaFin) - minutosDelDia(ahora);
  return antes > tolerancia ? antes : 0;
}

/** Ya en ventana o dentro del bloque: la sesión que conviene destacar en el kiosko. */
export function elegirDestacada<
  T extends { id: string; estado: string; horaInicio: string; horaFin: string },
>(sesiones: readonly T[], ahora: string, minutosAntes: number): string | null {
  const minutoActual = minutosDelDia(ahora);
  const abiertas = sesiones.filter((s) => s.estado === "pendiente" || s.estado === "en_curso");
  const enCurso = abiertas.find(
    (s) =>
      minutosDelDia(s.horaInicio) - minutosAntes <= minutoActual &&
      minutoActual < minutosDelDia(s.horaFin),
  );
  if (enCurso) return enCurso.id;
  const siguiente = abiertas
    .filter((s) => minutosDelDia(s.horaInicio) > minutoActual)
    .sort((a, b) => minutosDelDia(a.horaInicio) - minutosDelDia(b.horaInicio))[0];
  return siguiente?.id ?? abiertas.find((s) => s.estado === "en_curso")?.id ?? null;
}

const MS_DIA = 24 * 60 * 60 * 1000;

/**
 * Días hábiles transcurridos entre dos fechas AAAA-MM-DD, sin contar la de inicio y contando
 * la de fin: lunes a viernes que no estén en `diasSinClases` (feriados y suspensiones, P-46).
 */
export function diasHabilesTranscurridos(
  desde: string,
  hasta: string,
  diasSinClases: ReadonlySet<string> = new Set(),
): number {
  const inicio = Date.parse(`${desde}T00:00:00Z`);
  const fin = Date.parse(`${hasta}T00:00:00Z`);
  let total = 0;
  for (let t = inicio + MS_DIA; t <= fin; t += MS_DIA) {
    const dia = new Date(t);
    const diaSemana = dia.getUTCDay();
    if (diaSemana === 0 || diaSemana === 6) continue;
    if (diasSinClases.has(dia.toISOString().slice(0, 10))) continue;
    total += 1;
  }
  return total;
}

/** Lunes de la semana de una fecha AAAA-MM-DD. */
export function lunesDeLaSemana(fecha: string): string {
  const t = Date.parse(`${fecha}T00:00:00Z`);
  const diasDesdeLunes = (new Date(t).getUTCDay() + 6) % 7;
  return new Date(t - diasDesdeLunes * MS_DIA).toISOString().slice(0, 10);
}

/** Viernes de la semana de una fecha AAAA-MM-DD (la semana de seguimiento es de lunes a viernes). */
export function viernesDeLaSemana(fecha: string): string {
  const lunes = Date.parse(`${lunesDeLaSemana(fecha)}T00:00:00Z`);
  return new Date(lunes + 4 * MS_DIA).toISOString().slice(0, 10);
}

/** Apellido para los mensajes: "Quispe, Juan" → "Quispe". */
export function apellidoDeNombre(nombreCompleto: string): string {
  return nombreCompleto.split(",")[0].trim();
}
