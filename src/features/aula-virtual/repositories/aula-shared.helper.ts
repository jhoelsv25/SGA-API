import { sql } from "drizzle-orm";
import {
  docentes,
  entregasTarea,
  grados,
  materiales,
  matriculas,
  personas,
  secciones,
  tareas,
  unidadesAprendizaje,
  usuarios,
} from "../../../core/database/schema";
import type {
  CalculoNotaIntentos,
  EstadoEntrega,
  EstadoTarea,
  RevelarRespuestas,
  TipoMaterial,
  TipoTarea,
} from "../constants";
import type { EntregaFila, MaterialFila, TareaFila } from "../interfaces";

/** Apellido paterno, materno si existe, y nombres. Sin materno no deja el espacio antes de la coma. */
export const nombreSql = (p: typeof personas) =>
  sql<string>`TRIM(${p.apellidoPaterno} || CASE WHEN NULLIF(BTRIM(COALESCE(${p.apellidoMaterno}, '')), '') IS NULL THEN '' ELSE ' ' || BTRIM(${p.apellidoMaterno}) END || ', ' || ${p.nombres})`;

export const seccionNombreSql = sql<string>`${grados.numero} || '.° ' || ${secciones.nombre}`;

export const docentePersonaSql = sql<string | null>`(
  SELECT TRIM(${personas.apellidoPaterno} || CASE WHEN NULLIF(BTRIM(COALESCE(${personas.apellidoMaterno}, '')), '') IS NULL THEN '' ELSE ' ' || BTRIM(${personas.apellidoMaterno}) END || ', ' || ${personas.nombres})
  FROM ${docentes}
  JOIN ${personas} ON ${personas.id} = ${docentes.personaId}
  WHERE ${docentes.id} = cursos_seccion.docente_id
)`;

export const totalEstudiantesSeccionSql = sql<number>`(
  SELECT count(*)::int FROM ${matriculas} m2
  WHERE m2.seccion_id = ${secciones.id}
    AND m2.estado IN ('matriculado', 'vigente')
)`;

/** RF-017: etiqueta del autor según sus roles vigentes, sea o no su rol principal. */
export const ROL_AUTOR_SQL = sql<string>`CASE WHEN EXISTS (
  SELECT 1 FROM usuario_roles ur
  JOIN roles r ON r.id = ur.rol_id
  WHERE ur.usuario_id = ${usuarios.id}
    AND ur.vigente
    AND LOWER(r.nombre) IN ('docente', 'director', 'subdirector', 'administrador')
) THEN 'docente' ELSE 'estudiante' END`;

export const columnasMaterial = {
  id: materiales.id,
  unidadId: materiales.unidadId,
  cursoSeccionId: unidadesAprendizaje.cursoSeccionId,
  periodoId: unidadesAprendizaje.periodoId,
  docenteId: materiales.publicadoPorId,
  titulo: materiales.titulo,
  descripcion: materiales.descripcion,
  tipo: materiales.tipo,
  url: materiales.url,
  archivoNombre: materiales.archivoNombre,
  archivoTamanoBytes: materiales.archivoTamanoBytes,
  horarioId: materiales.horarioId,
  esPlanificado: materiales.esPlanificado,
  fechaCongelada: materiales.fechaCongelada,
  vigente: materiales.vigente,
  visible: materiales.visible,
  orden: materiales.orden,
  fechaProgramada: materiales.fechaProgramada,
  publicadoEn: materiales.publicadoEn,
  sesionClaseId: materiales.sesionClaseId,
};

export type FilaMaterialBruta = Omit<MaterialFila, "tipo"> & { tipo: string };

export function aMaterial(fila: FilaMaterialBruta): MaterialFila {
  return { ...fila, tipo: fila.tipo as TipoMaterial };
}

export const columnasTarea = {
  id: tareas.id,
  cursoSeccionId: tareas.cursoSeccionId,
  periodoId: tareas.periodoId,
  unidadId: tareas.unidadId,
  sesionClaseId: tareas.sesionClaseId,
  titulo: tareas.titulo,
  instrucciones: tareas.instrucciones,
  tipo: tareas.tipo,
  puntajeMaximo: sql<number>`${tareas.puntajeMaximo}::float`,
  publicadaEn: tareas.publicadaEn,
  fechaLimite: tareas.fechaLimite,
  permiteEntregaTardia: tareas.permiteEntregaTardia,
  intentosMaximos: sql<number>`${tareas.intentosMaximos}::int`,
  limiteTiempoMinutos: tareas.limiteTiempoMinutos,
  calculoNotaIntentos: tareas.calculoNotaIntentos,
  revelarRespuestas: tareas.revelarRespuestas,
  tiposArchivo: tareas.tiposArchivo,
  estado: tareas.estado,
  creadoEn: tareas.creadoEn,
  actualizadoEn: tareas.actualizadoEn,
};

export function aTarea(fila: Record<string, unknown>): TareaFila {
  return {
    id: String(fila.id),
    cursoSeccionId: String(fila.cursoSeccionId),
    periodoId: (fila.periodoId as string | null) ?? null,
    unidadId: (fila.unidadId as string | null) ?? null,
    sesionClaseId: (fila.sesionClaseId as string | null) ?? null,
    titulo: String(fila.titulo),
    instrucciones: (fila.instrucciones as string | null) ?? null,
    tipo: (fila.tipo as TipoTarea) || "trabajo",
    puntajeMaximo: Number(fila.puntajeMaximo) || 20,
    publicadaEn: (fila.publicadaEn as string | null) ?? null,
    fechaLimite: String(fila.fechaLimite),
    permiteEntregaTardia: Boolean(fila.permiteEntregaTardia),
    intentosMaximos: Number(fila.intentosMaximos) || 1,
    limiteTiempoMinutos:
      fila.limiteTiempoMinutos !== null && fila.limiteTiempoMinutos !== undefined
        ? Number(fila.limiteTiempoMinutos)
        : null,
    calculoNotaIntentos: (fila.calculoNotaIntentos as CalculoNotaIntentos) || "mas_alta",
    revelarRespuestas: (fila.revelarRespuestas as RevelarRespuestas) || "al_terminar_intentos",
    tiposArchivo: (fila.tiposArchivo as string | null) ?? null,
    estado: (fila.estado as EstadoTarea) || "borrador",
    creadoEn: String(fila.creadoEn),
    actualizadoEn: String(fila.actualizadoEn),
  };
}

export const columnasEntrega = {
  id: entregasTarea.id,
  tareaId: entregasTarea.tareaId,
  matriculaId: entregasTarea.matriculaId,
  intento: sql<number>`${entregasTarea.intento}::int`,
  iniciadoEn: entregasTarea.iniciadoEn,
  entregadaEn: entregasTarea.entregadaEn,
  texto: entregasTarea.texto,
  archivoUrl: entregasTarea.archivoUrl,
  archivoNombre: entregasTarea.archivoNombre,
  archivoTamanoBytes: entregasTarea.archivoTamanoBytes,
  enlaceUrl: entregasTarea.enlaceUrl,
  respuestas: entregasTarea.respuestas,
  esTardia: entregasTarea.esTardia,
  estado: entregasTarea.estado,
  nota: sql<number | null>`${entregasTarea.nota}::float`,
  retroalimentacion: entregasTarea.retroalimentacion,
  calificadaPorId: entregasTarea.calificadaPorId,
  calificadaEn: entregasTarea.calificadaEn,
};

export function aEntrega(fila: Record<string, unknown>): EntregaFila {
  return {
    id: String(fila.id),
    tareaId: String(fila.tareaId),
    matriculaId: String(fila.matriculaId),
    estudianteId: typeof fila.estudianteId === "string" ? fila.estudianteId : undefined,
    estudianteNombre: typeof fila.estudianteNombre === "string" ? fila.estudianteNombre : undefined,
    intento: Number(fila.intento) || 1,
    iniciadoEn: String(fila.iniciadoEn),
    entregadaEn: (fila.entregadaEn as string | null) ?? null,
    texto: (fila.texto as string | null) ?? null,
    archivoUrl: (fila.archivoUrl as string | null) ?? null,
    archivoNombre: (fila.archivoNombre as string | null) ?? null,
    archivoTamanoBytes:
      fila.archivoTamanoBytes !== null && fila.archivoTamanoBytes !== undefined
        ? Number(fila.archivoTamanoBytes)
        : null,
    enlaceUrl: (fila.enlaceUrl as string | null) ?? null,
    respuestas: (fila.respuestas as Record<string, unknown> | null) ?? null,
    esTardia: Boolean(fila.esTardia),
    estado: (fila.estado as EstadoEntrega) || "entregada",
    nota: fila.nota !== null && fila.nota !== undefined ? Number(fila.nota) : null,
    retroalimentacion: (fila.retroalimentacion as string | null) ?? null,
    calificadaPorId: (fila.calificadaPorId as string | null) ?? null,
    calificadaEn: (fila.calificadaEn as string | null) ?? null,
  };
}
