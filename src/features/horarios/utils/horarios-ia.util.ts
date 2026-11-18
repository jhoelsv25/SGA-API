import type { BloqueHorarioPropuestoIaDto } from "../dto";
import { convertirHoraAMinutos } from "./horarios.util";

export interface NecesidadCursoHorario {
  cursoSeccionId: string;
  cursoNombre: string;
  docenteId: string | null;
  bloquesRequeridos: number;
}

export interface BloqueOcupadoDocente {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

export interface AsignacionIaPropuesta {
  diaSemana: number;
  horaInicio: string;
  cursoSeccionId: string;
}

function claveSlot(diaSemana: number, horaInicio: string): string {
  return `${diaSemana}|${horaInicio}`;
}

function haySolapamiento(aInicio: string, aFin: string, bInicio: string, bFin: string): boolean {
  const iniA = convertirHoraAMinutos(aInicio);
  const finA = convertirHoraAMinutos(aFin);
  const iniB = convertirHoraAMinutos(bInicio);
  const finB = convertirHoraAMinutos(bFin);
  return iniA < finB && finA > iniB;
}

function docenteDisponible(
  docenteId: string | null,
  diaSemana: number,
  horaInicio: string,
  horaFin: string,
  ocupadoPorDocente: Map<string, BloqueOcupadoDocente[]>,
): boolean {
  if (!docenteId) return true;
  const bloques = ocupadoPorDocente.get(docenteId) ?? [];
  return !bloques.some(
    (b) =>
      b.diaSemana === diaSemana && haySolapamiento(horaInicio, horaFin, b.horaInicio, b.horaFin),
  );
}

function registrarOcupacion(
  docenteId: string | null,
  diaSemana: number,
  horaInicio: string,
  horaFin: string,
  ocupadoPorDocente: Map<string, BloqueOcupadoDocente[]>,
): void {
  if (!docenteId) return;
  const lista = ocupadoPorDocente.get(docenteId) ?? [];
  lista.push({ diaSemana, horaInicio, horaFin });
  ocupadoPorDocente.set(docenteId, lista);
}

/**
 * Valida las asignaciones sugeridas por la IA (cero cruces de docente, sin exceder horas del plan)
 * y completa de forma determinista los bloques faltantes.
 */
export function consolidarPropuestaHorario(params: {
  grillaBase: Array<{
    diaSemana: number;
    horaInicio: string;
    horaFin: string;
    tipoBloque: "clase" | "receso";
  }>;
  necesidades: NecesidadCursoHorario[];
  ocupadoPorDocente: Map<string, BloqueOcupadoDocente[]>;
  asignacionesIa: AsignacionIaPropuesta[];
}): { bloques: BloqueHorarioPropuestoIaDto[]; advertencias: string[] } {
  const advertencias: string[] = [];
  const cursosPorId = new Map(params.necesidades.map((n) => [n.cursoSeccionId, n]));
  const restantes = new Map(params.necesidades.map((n) => [n.cursoSeccionId, n.bloquesRequeridos]));
  const asignadoPorSlot = new Map<string, NecesidadCursoHorario>();
  const grillaClasePorSlot = new Map(
    params.grillaBase
      .filter((b) => b.tipoBloque === "clase")
      .map((b) => [claveSlot(b.diaSemana, b.horaInicio), b]),
  );

  for (const n of params.necesidades) {
    if (!n.docenteId) {
      advertencias.push(
        `El curso "${n.cursoNombre}" no tiene docente asignado; se ubicó sin validación de cruces.`,
      );
    }
  }

  // 1. Validar y aceptar sugerencias válidas de la IA
  for (const prop of params.asignacionesIa) {
    const key = claveSlot(prop.diaSemana, prop.horaInicio);
    const slot = grillaClasePorSlot.get(key);
    const curso = cursosPorId.get(prop.cursoSeccionId);
    if (!slot || !curso || asignadoPorSlot.has(key)) continue;

    const quedan = restantes.get(curso.cursoSeccionId) ?? 0;
    if (quedan <= 0) continue;

    if (
      !docenteDisponible(
        curso.docenteId,
        slot.diaSemana,
        slot.horaInicio,
        slot.horaFin,
        params.ocupadoPorDocente,
      )
    ) {
      continue;
    }

    asignadoPorSlot.set(key, curso);
    restantes.set(curso.cursoSeccionId, quedan - 1);
    registrarOcupacion(
      curso.docenteId,
      slot.diaSemana,
      slot.horaInicio,
      slot.horaFin,
      params.ocupadoPorDocente,
    );
  }

  // 2. Completar determinísticamente las horas faltantes repartiendo por días
  const slotsLibres = params.grillaBase.filter(
    (b) => b.tipoBloque === "clase" && !asignadoPorSlot.has(claveSlot(b.diaSemana, b.horaInicio)),
  );

  for (const curso of params.necesidades) {
    let quedan = restantes.get(curso.cursoSeccionId) ?? 0;
    if (quedan <= 0) continue;

    const diasConCurso = new Set<number>();
    for (const [k, c] of asignadoPorSlot.entries()) {
      if (c.cursoSeccionId === curso.cursoSeccionId) {
        diasConCurso.add(Number(k.split("|")[0]));
      }
    }

    // Priorizar días donde este curso aún no aparece
    const ordenados = [...slotsLibres].sort((a, b) => {
      const aTiene = diasConCurso.has(a.diaSemana) ? 1 : 0;
      const bTiene = diasConCurso.has(b.diaSemana) ? 1 : 0;
      return aTiene - bTiene || a.diaSemana - b.diaSemana;
    });

    for (const slot of ordenados) {
      if (quedan <= 0) break;
      const key = claveSlot(slot.diaSemana, slot.horaInicio);
      if (asignadoPorSlot.has(key)) continue;

      if (
        !docenteDisponible(
          curso.docenteId,
          slot.diaSemana,
          slot.horaInicio,
          slot.horaFin,
          params.ocupadoPorDocente,
        )
      ) {
        continue;
      }

      asignadoPorSlot.set(key, curso);
      diasConCurso.add(slot.diaSemana);
      quedan -= 1;
      restantes.set(curso.cursoSeccionId, quedan);
      registrarOcupacion(
        curso.docenteId,
        slot.diaSemana,
        slot.horaInicio,
        slot.horaFin,
        params.ocupadoPorDocente,
      );
    }

    if (quedan > 0) {
      advertencias.push(
        `No se pudieron ubicar ${quedan} hora(s) de "${curso.cursoNombre}" sin generar cruce de docente o falta de bloques libres.`,
      );
    }
  }

  const bloques: BloqueHorarioPropuestoIaDto[] = params.grillaBase.map((b) => {
    const asignado =
      b.tipoBloque === "clase"
        ? asignadoPorSlot.get(claveSlot(b.diaSemana, b.horaInicio))
        : undefined;
    return {
      diaSemana: b.diaSemana,
      horaInicio: b.horaInicio,
      horaFin: b.horaFin,
      tipoBloque: b.tipoBloque,
      cursoSeccionId: asignado?.cursoSeccionId ?? null,
      cursoNombre: asignado?.cursoNombre ?? null,
      docenteId: asignado?.docenteId ?? null,
    };
  });

  return { bloques, advertencias };
}
