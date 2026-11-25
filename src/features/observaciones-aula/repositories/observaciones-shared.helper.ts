import { eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Database } from "../../../core/database";
import {
  cursos,
  cursosSeccion,
  docentes,
  grados,
  observacionesAula,
  periodosAcademicos,
  personas,
  secciones,
  usuarios,
} from "../../../core/database/schema";
import type { EstadoObservacion } from "../constants";

export const personaDocente = alias(personas, "persona_docente");
export const personaObservador = alias(personas, "persona_observador");

export const nombreSql = (p: {
  nombres: unknown;
  apellidoPaterno: unknown;
  apellidoMaterno: unknown;
}) => sql<string>`concat_ws(' ', ${p.nombres}, ${p.apellidoPaterno}, ${p.apellidoMaterno})`;

export const textoSql = (columna: unknown) => sql<string>`${columna}::text`;
export const textoNuloSql = (columna: unknown) => sql<string | null>`${columna}::text`;

export const camposObservacion = {
  id: observacionesAula.id,
  docenteId: observacionesAula.docenteId,
  docentePersonaId: docentes.personaId,
  docenteNombre: nombreSql(personaDocente),
  docenteApellido: personaDocente.apellidoPaterno,
  docenteDocumento: personaDocente.numeroDocumento,
  cursoSeccionId: observacionesAula.cursoSeccionId,
  cursoNombre: cursos.nombre,
  seccionNombre: secciones.nombre,
  gradoNombre: grados.nombre,
  horarioId: observacionesAula.horarioId,
  sesionClaseId: observacionesAula.sesionClaseId,
  periodoId: observacionesAula.periodoId,
  periodoNombre: periodosAcademicos.nombre,
  periodoEstado: periodosAcademicos.estado,
  observadorUsuarioId: observacionesAula.observadorUsuarioId,
  observadorPersonaId: usuarios.personaId,
  observadorNombre: nombreSql(personaObservador),
  instrumentoId: observacionesAula.instrumentoId,
  observacionAnteriorId: observacionesAula.observacionAnteriorId,
  fecha: textoSql(observacionesAula.fecha),
  horaInicioProgramada: textoSql(observacionesAula.horaInicioProgramada),
  horaFinProgramada: textoSql(observacionesAula.horaFinProgramada),
  estado: sql<EstadoObservacion>`${observacionesAula.estado}`,
  avisadoEn: textoNuloSql(observacionesAula.avisadoEn),
  horaInicioReal: textoNuloSql(observacionesAula.horaInicioReal),
  horaFinReal: textoNuloSql(observacionesAula.horaFinReal),
  minutosTotales: observacionesAula.minutosTotales,
  estudiantesPresentes: observacionesAula.estudiantesPresentes,
  retroFecha: textoNuloSql(observacionesAula.retroFecha),
  retroHoraInicio: textoNuloSql(observacionesAula.retroHoraInicio),
  retroHoraFin: textoNuloSql(observacionesAula.retroHoraFin),
  retroResumen: observacionesAula.retroResumen,
  retroalimentadaEn: textoNuloSql(observacionesAula.retroalimentadaEn),
  enteradoEn: textoNuloSql(observacionesAula.enteradoEn),
  motivoCancelacion: observacionesAula.motivoCancelacion,
  creadoEn: textoSql(observacionesAula.creadoEn),
};

export interface DatosNuevaObservacion {
  docenteId: string;
  cursoSeccionId: string;
  horarioId: string;
  sesionClaseId: string | null;
  periodoId: string;
  observadorUsuarioId: string;
  instrumentoId: string;
  observacionAnteriorId: string | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  creadoPorId: string;
}

export interface BloqueHorario {
  id: string;
  horaInicio: string;
  horaFin: string;
}

export function consultaBaseObservaciones(db: Database) {
  return db
    .select(camposObservacion)
    .from(observacionesAula)
    .innerJoin(docentes, eq(docentes.id, observacionesAula.docenteId))
    .innerJoin(personaDocente, eq(personaDocente.id, docentes.personaId))
    .innerJoin(cursosSeccion, eq(cursosSeccion.id, observacionesAula.cursoSeccionId))
    .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
    .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
    .innerJoin(grados, eq(grados.id, secciones.gradoId))
    .innerJoin(periodosAcademicos, eq(periodosAcademicos.id, observacionesAula.periodoId))
    .innerJoin(usuarios, eq(usuarios.id, observacionesAula.observadorUsuarioId))
    .innerJoin(personaObservador, eq(personaObservador.id, usuarios.personaId));
}
