import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import { alias, type AnyPgColumn } from "drizzle-orm/pg-core";
import type { Database } from "../../../core/database";
import {
  cursos,
  cursosSeccion,
  docentes,
  grados,
  horarios,
  personas,
  planificacionesSesion,
  secciones,
  sesionesClase,
} from "../../../core/database/schema";
import type { EstadoJustificacion, EstadoSesion } from "../constants";
import type { SesionResponseDto } from "../dto";

export const personaDocente = alias(personas, "persona_docente");
export const docenteTitular = alias(docentes, "docente_titular");
export const personaTitular = alias(personas, "persona_titular");

export const nombreSql = (p: {
  apellidoPaterno: AnyPgColumn;
  apellidoMaterno: AnyPgColumn;
  nombres: AnyPgColumn;
}) =>
  sql<string>`TRIM(${p.apellidoPaterno} || ' ' || COALESCE(${p.apellidoMaterno}, '') || ', ' || ${p.nombres})`;

export const hhmmSql = (columna: SQL | AnyPgColumn) =>
  sql<string | null>`to_char(${columna}, 'HH24:MI')`;

export function ordenDelDia() {
  return [
    asc(sesionesClase.fecha),
    asc(sql`COALESCE(${sesionesClase.horaInicioPlan}, ${horarios.horaInicio})`),
    asc(grados.numero),
    asc(secciones.nombre),
  ];
}

export function consultaBaseSesiones(db: Database) {
  return db
    .select({
      id: sesionesClase.id,
      fecha: sesionesClase.fecha,
      horaInicio: hhmmSql(sql`COALESCE(${sesionesClase.horaInicioPlan}, ${horarios.horaInicio})`),
      horaFin: hhmmSql(sql`COALESCE(${sesionesClase.horaFinPlan}, ${horarios.horaFin})`),
      cursoNombre: cursos.nombre,
      seccionNombre: sql<string>`${grados.numero} || '.° ' || ${secciones.nombre}`,
      docenteId: sesionesClase.docenteId,
      docenteNombre: nombreSql(personaDocente),
      docenteTitularNombre: sql<
        string | null
      >`CASE WHEN ${personaTitular.id} IS NULL THEN NULL ELSE ${nombreSql(personaTitular)} END`,
      estado: sesionesClase.estado,
      tema: sesionesClase.tema,
      horaIngreso: hhmmSql(sesionesClase.horaInicioReal),
      horaSalida: hhmmSql(sesionesClase.horaFinReal),
      minutosRetraso: sesionesClase.minutosRetraso,
      minutosPerdidos: sesionesClase.minutosPerdidos,
      salidaAutomatica: sesionesClase.salidaAutomatica,
      observaciones: sesionesClase.observaciones,
      justificacionEstado: sesionesClase.justificacionEstado,
      justificacionMotivo: sesionesClase.justificacion,
      justificacionMotivoCodigo: sesionesClase.justificacionMotivoCodigo,
      justificacionDocumentoUrl: sesionesClase.justificacionDocumentoUrl,
      justificacionComentario: sesionesClase.justificacionComentario,
      justificacionSolicitadaEn: sesionesClase.justificacionSolicitadaEn,
      justificacionRevisadaEn: sesionesClase.justificacionRevisadaEn,
      planificacionId: planificacionesSesion.id,
      planificacionEstado: planificacionesSesion.estado,
    })
    .from(sesionesClase)
    .innerJoin(horarios, eq(horarios.id, sesionesClase.horarioId))
    .innerJoin(secciones, eq(secciones.id, horarios.seccionId))
    .innerJoin(grados, eq(grados.id, secciones.gradoId))
    .innerJoin(cursosSeccion, eq(cursosSeccion.id, horarios.cursoSeccionId))
    .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
    .innerJoin(docentes, eq(docentes.id, sesionesClase.docenteId))
    .innerJoin(personaDocente, eq(personaDocente.id, docentes.personaId))
    .leftJoin(docenteTitular, eq(docenteTitular.id, sesionesClase.docenteTitularId))
    .leftJoin(personaTitular, eq(personaTitular.id, docenteTitular.personaId))
    .leftJoin(
      planificacionesSesion,
      and(
        eq(planificacionesSesion.horarioId, sesionesClase.horarioId),
        eq(planificacionesSesion.fecha, sesionesClase.fecha),
      ),
    );
}

export function mapearSesionDto(
  fila: Awaited<ReturnType<typeof consultaBaseSesiones>>[number],
): SesionResponseDto {
  return {
    id: fila.id,
    fecha: fila.fecha,
    horaInicio: fila.horaInicio ?? "",
    horaFin: fila.horaFin ?? "",
    cursoNombre: fila.cursoNombre,
    seccionNombre: fila.seccionNombre,
    docenteId: fila.docenteId,
    docenteNombre: fila.docenteNombre,
    docenteTitularNombre: fila.docenteTitularNombre,
    estado: fila.estado as EstadoSesion,
    tema: fila.tema,
    horaIngreso: fila.horaIngreso,
    horaSalida: fila.horaSalida,
    minutosRetraso: fila.minutosRetraso,
    minutosPerdidos: fila.minutosPerdidos,
    salidaAutomatica: fila.salidaAutomatica,
    observaciones: fila.observaciones,
    justificacion: fila.justificacionEstado
      ? {
          estado: fila.justificacionEstado as EstadoJustificacion,
          motivo: fila.justificacionMotivo ?? "",
          motivoCodigo: fila.justificacionMotivoCodigo,
          documentoUrl: fila.justificacionDocumentoUrl,
          comentario: fila.justificacionComentario,
          solicitadaEn: fila.justificacionSolicitadaEn,
          revisadaEn: fila.justificacionRevisadaEn,
        }
      : null,
    planificacion: fila.planificacionId
      ? { id: fila.planificacionId, estado: fila.planificacionEstado ?? "borrador" }
      : null,
  };
}
