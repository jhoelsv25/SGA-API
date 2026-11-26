import { sql } from "drizzle-orm";
import { docentes, personas, planificacionesSesion } from "../../../../core/database/schema";

export const nombrePersona = sql<string>`concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno})`;

export const camposPlanificacion = {
  id: planificacionesSesion.id,
  docenteId: planificacionesSesion.docenteId,
  docentePersonaId: docentes.personaId,
  docenteNombre: nombrePersona,
  cursoSeccionId: planificacionesSesion.cursoSeccionId,
  horarioId: planificacionesSesion.horarioId,
  sesionClaseId: planificacionesSesion.sesionClaseId,
  fecha: sql<string>`${planificacionesSesion.fecha}::text`,
  numero: planificacionesSesion.numero,
  unidad: planificacionesSesion.unidad,
  titulo: planificacionesSesion.titulo,
  proposito: planificacionesSesion.proposito,
  evidencia: planificacionesSesion.evidencia,
  criterios: planificacionesSesion.criterios,
  instrumentoCodigo: planificacionesSesion.instrumentoCodigo,
  competenciasTransversales: planificacionesSesion.competenciasTransversales,
  enfoques: planificacionesSesion.enfoques,
  materiales: planificacionesSesion.materiales,
  referencias: planificacionesSesion.referencias,
  estado: planificacionesSesion.estado,
  copiadaDeId: planificacionesSesion.copiadaDeId,
  actualizadoEn: sql<string>`${planificacionesSesion.actualizadoEn}::text`,
};
