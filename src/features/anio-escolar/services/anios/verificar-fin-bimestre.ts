import { BadRequestException, NotFoundException } from "@nestjs/common";
import dayjs from "dayjs";
import { AnioPersistido } from "../../interfaces";
import { esFechaIso, mensajeSiRangoInvalido, validarBimestres } from "../../utils";
import type { AniosAcademicosServiceDeps, AniosAcademicosServiceCalls } from "./deps";

export async function verificarYNotificarFinBimestre(
  deps: AniosAcademicosServiceDeps,
  calls: AniosAcademicosServiceCalls,
  hoy: string,
): Promise<{
  docentesNotificados: number;
  directivosNotificados: number;
}> {
  if (!deps.notificacionesService) {
    return { docentesNotificados: 0, directivosNotificados: 0 };
  }

  const anio = await calls.anioVigente();
  if (!anio || anio.estado !== "en_curso") {
    return { docentesNotificados: 0, directivosNotificados: 0 };
  }

  const bimestreEnCurso = anio.bimestres.find((b) => b.estado === "en_curso");
  if (!bimestreEnCurso) {
    return { docentesNotificados: 0, directivosNotificados: 0 };
  }

  const fechaFinStr = bimestreEnCurso.fechaFin.slice(0, 10);
  const diasRestantes = dayjs(fechaFinStr).diff(dayjs(hoy), "day");

  let docentesNotificados = 0;
  let directivosNotificados = 0;

  // Caso 1: Faltan 5 días o 2 días -> Notificación preventiva a docentes
  if (diasRestantes === 5 || diasRestantes === 2) {
    const docentesUsuarios = await deps.aniosRepository.findDocentesUsuariosConCarga(anio.id);
    const esUrgente = diasRestantes === 2;
    const titulo = esUrgente
      ? `¡Atención! Faltan 48 horas para el cierre del Bimestre ${bimestreEnCurso.nombre}`
      : `Aviso preventivo: Cierre del Bimestre ${bimestreEnCurso.nombre} en ${diasRestantes} días`;

    const mensaje = `El Bimestre ${bimestreEnCurso.nombre} finaliza el ${fechaFinStr}. Recuerde registrar la asistencia de sus sesiones de clase, calificar las tareas y verificar sus materiales antes del cierre formal del periodo.`;

    for (const usuarioId of docentesUsuarios) {
      await deps.notificacionesService.enviar({
        usuarioId,
        titulo,
        mensaje,
        tipo: esUrgente ? "alerta" : "recordatorio",
        enlaceUrl: "/admin/aula-virtual",
        canales: ["in_app", "push"],
      });
      docentesNotificados++;
    }
  }

  // Caso 2: El día de la fecha de término -> Alerta a Directivos
  if (diasRestantes === 0) {
    const directivosUsuarios = await deps.aniosRepository.findDirectivosUsuarios();
    const titulo = `Bimestre ${bimestreEnCurso.nombre} culminado según calendario`;
    const mensaje = `El Bimestre ${bimestreEnCurso.nombre} ha cumplido su fecha programada (${fechaFinStr}). Puede revisar el consolidado docente y proceder con el cierre del periodo escolar desde el módulo de Año Escolar.`;

    for (const usuarioId of directivosUsuarios) {
      await deps.notificacionesService.enviar({
        usuarioId,
        titulo,
        mensaje,
        tipo: "alerta",
        enlaceUrl: "/admin/anio-escolar",
        canales: ["in_app", "push"],
      });
      directivosNotificados++;
    }
  }

  return { docentesNotificados, directivosNotificados };
}

export async function anioVigente(
  deps: AniosAcademicosServiceDeps,
): Promise<AnioPersistido | null> {
  return (await deps.aniosRepository.findEnCurso()) ?? (await deps.aniosRepository.findReabierto());
}

export async function requireAnio(
  deps: AniosAcademicosServiceDeps,
  id: string,
): Promise<AnioPersistido> {
  const anio = await deps.aniosRepository.findById(id);
  if (!anio) throw new NotFoundException("Año escolar no encontrado.");
  return anio;
}

export function assertPlanificado(anio: AnioPersistido): void {
  if (anio.estado !== "planificado") {
    throw new BadRequestException("Solo se pueden modificar las fechas de un año planificado.");
  }
}

export function assertRangoAnio(inicio: string, fin: string): void {
  if (!esFechaIso(inicio) || !esFechaIso(fin)) {
    throw new BadRequestException("Indique una fecha válida (AAAA-MM-DD).");
  }
  const mensaje = mensajeSiRangoInvalido(inicio, fin, false);
  if (mensaje) throw new BadRequestException(mensaje);
}

export function assertBimestres(
  anio: { fechaInicio: string; fechaFin: string },
  bimestres: { numero: number; fechaInicio: string; fechaFin: string }[],
): void {
  for (const bimestre of bimestres) {
    if (!esFechaIso(bimestre.fechaInicio) || !esFechaIso(bimestre.fechaFin)) {
      throw new BadRequestException("Indique una fecha válida (AAAA-MM-DD).");
    }
  }
  const mensaje = validarBimestres(anio, bimestres);
  if (mensaje) throw new BadRequestException(mensaje);
}

export function resumen(anio: AnioPersistido): Record<string, unknown> {
  return {
    anio: anio.anio,
    nombre: anio.nombre,
    fechaInicio: anio.fechaInicio,
    fechaFin: anio.fechaFin,
    estado: anio.estado,
    bimestres: anio.bimestres.map((bimestre) => ({
      numero: bimestre.numero,
      fechaInicio: bimestre.fechaInicio,
      fechaFin: bimestre.fechaFin,
      estado: bimestre.estado,
    })),
  };
}

export async function auditarEstado(
  deps: AniosAcademicosServiceDeps,
  tabla: string,
  registroId: string,
  anterior: string,
  nuevo: string,
  actorId: string,
  ip?: string,
): Promise<void> {
  await deps.auditService.log({
    usuarioId: actorId,
    accion: "actualizar",
    tabla,
    registroId,
    valorAnterior: { estado: anterior },
    valorNuevo: { estado: nuevo },
    direccionIp: ip,
  });
}
