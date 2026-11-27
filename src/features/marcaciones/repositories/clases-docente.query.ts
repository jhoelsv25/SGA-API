import { and, eq, inArray, or, sql } from "drizzle-orm";
import type { Database } from "../../../core/database";
import {
  aniosAcademicos,
  cursosSeccion,
  docentes,
  horarios,
  secciones,
  sesionesClase,
} from "../../../core/database/schema";
import { diaIsoDeFecha, type BloqueDeClase } from "../utils";

export const claveClases = (personaId: string, fecha: string): string => `${personaId}|${fecha}`;

/**
 * Clases de cada docente por fecha. Manda lo generado en `sesiones_clase` (refleja reemplazos y no cambia si luego
 * se edita el horario). Si ese día no tiene sesiones, se usa el horario semanal del año académico en curso, dentro
 * de sus fechas. Un docente reemplazado en todas sus clases queda sin clases ese día.
 */
export async function clasesDeDocentes(
  db: Database,
  personaIds: readonly string[],
  fechas: readonly string[],
): Promise<Map<string, BloqueDeClase[]>> {
  const resultado = new Map<string, BloqueDeClase[]>();
  if (personaIds.length === 0 || fechas.length === 0) return resultado;

  const fichas = await db
    .select({ id: docentes.id, personaId: docentes.personaId })
    .from(docentes)
    .where(inArray(docentes.personaId, [...personaIds]));
  if (fichas.length === 0) return resultado;
  const ids = fichas.map((f) => f.id);
  const personaDe = new Map(fichas.map((f) => [f.id, f.personaId]));

  const generadas = await db
    .select({
      docenteId: sesionesClase.docenteId,
      titularId: sesionesClase.docenteTitularId,
      fecha: sesionesClase.fecha,
      horaInicio: sql<string>`COALESCE(${sesionesClase.horaInicioPlan}, ${horarios.horaInicio})::text`,
      horaFin: sql<string>`COALESCE(${sesionesClase.horaFinPlan}, ${horarios.horaFin})::text`,
    })
    .from(sesionesClase)
    .innerJoin(horarios, eq(horarios.id, sesionesClase.horarioId))
    .where(
      and(
        inArray(sesionesClase.fecha, [...fechas]),
        or(inArray(sesionesClase.docenteId, ids), inArray(sesionesClase.docenteTitularId, ids)),
      ),
    );
  const conSesiones = new Set<string>();
  const agregar = (docenteId: string, fecha: string, bloque: BloqueDeClase) => {
    const personaId = personaDe.get(docenteId);
    if (!personaId) return;
    const clave = claveClases(personaId, fecha);
    resultado.set(clave, [...(resultado.get(clave) ?? []), bloque]);
  };
  for (const s of generadas) {
    for (const docenteId of [s.docenteId, s.titularId]) {
      const personaId = docenteId ? personaDe.get(docenteId) : undefined;
      if (personaId) conSesiones.add(claveClases(personaId, s.fecha));
    }
    agregar(s.docenteId, s.fecha, { horaInicio: s.horaInicio, horaFin: s.horaFin });
  }

  const semanales = await db
    .select({
      docenteId: cursosSeccion.docenteId,
      diaSemana: horarios.diaSemana,
      horaInicio: horarios.horaInicio,
      horaFin: horarios.horaFin,
      desde: aniosAcademicos.fechaInicio,
      hasta: aniosAcademicos.fechaFin,
    })
    .from(horarios)
    .innerJoin(cursosSeccion, eq(cursosSeccion.id, horarios.cursoSeccionId))
    .innerJoin(secciones, eq(secciones.id, horarios.seccionId))
    .innerJoin(aniosAcademicos, eq(aniosAcademicos.id, secciones.anioAcademicoId))
    .where(
      and(
        inArray(cursosSeccion.docenteId, ids),
        eq(secciones.estado, "activa"),
        eq(aniosAcademicos.estado, "en_curso"),
        eq(horarios.tipoBloque, "clase"),
      ),
    );
  for (const fecha of fechas) {
    const dia = diaIsoDeFecha(fecha);
    for (const h of semanales) {
      if (!h.docenteId || h.diaSemana !== dia) continue;
      if (fecha < h.desde.slice(0, 10) || fecha > h.hasta.slice(0, 10)) continue;
      const personaId = personaDe.get(h.docenteId);
      if (!personaId || conSesiones.has(claveClases(personaId, fecha))) continue;
      agregar(h.docenteId, fecha, { horaInicio: h.horaInicio, horaFin: h.horaFin });
    }
  }
  return resultado;
}
