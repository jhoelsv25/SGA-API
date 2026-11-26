import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import {
  MENSAJES_CONSOLIDADO,
  VARIABLES_CONSOLIDADO,
  mensajeConsolidadosGenerados,
} from "../../constants";
import type { ConsolidadoQueryDto, GenerarConsolidadoDto } from "../../dto";
import type { ActorConsolidado, ConsolidadoResumenItem } from "../../interfaces";
import { puedeGenerarConsolidadoPeriodo } from "../../utils";
import type { ConsolidadoDocenteServiceDeps, ConsolidadoDocenteServiceCalls } from "./deps";

export function exigirDirectorOAdmin(actor: ActorConsolidado) {
  if (actor.role !== "Director" && actor.role !== "Administrador") {
    throw new ForbiddenException(MENSAJES_CONSOLIDADO.NO_TIENE_PERMISO);
  }
}

export function exigirAccesoGeneral(actor: ActorConsolidado) {
  if (actor.role !== "Director" && actor.role !== "Subdirector" && actor.role !== "Administrador") {
    throw new ForbiddenException(MENSAJES_CONSOLIDADO.NO_TIENE_PERMISO);
  }
}

export async function minutosHoraPedagogica(deps: ConsolidadoDocenteServiceDeps): Promise<number> {
  const valor = await deps.repository.valorVariable(VARIABLES_CONSOLIDADO.MINUTOS_HORA_PEDAGOGICA);
  const minutos = Number.parseInt(valor ?? "", 10);
  if (Number.isNaN(minutos) || minutos < 1) {
    throw new InternalServerErrorException(
      MENSAJES_CONSOLIDADO.VARIABLE_FALTANTE(VARIABLES_CONSOLIDADO.MINUTOS_HORA_PEDAGOGICA),
    );
  }
  return minutos;
}

export async function generarConsolidados(
  deps: ConsolidadoDocenteServiceDeps,
  calls: ConsolidadoDocenteServiceCalls,
  dto: GenerarConsolidadoDto,
  actor: ActorConsolidado,
) {
  calls.exigirDirectorOAdmin(actor);

  const periodo = await deps.repository.obtenerPeriodo(dto.periodoId);
  if (!periodo) {
    throw new NotFoundException("Bimestre no encontrado.");
  }

  // Validar ventana de generación (última semana o cerrado) - CP-RF013-03
  const hoyIso = new Date().toISOString().split("T")[0];
  const puedeGenerar = puedeGenerarConsolidadoPeriodo(periodo.fechaFin, periodo.estado, hoyIso);
  if (!puedeGenerar) {
    throw new BadRequestException(MENSAJES_CONSOLIDADO.BIMESTRE_AUN_ABIERTO);
  }

  const minutosHoraPedagogica = await calls.minutosHoraPedagogica();

  // Generación individual
  if (dto.docenteId) {
    const existente = await deps.repository.obtenerConsolidadoVigenteDocente(
      dto.docenteId,
      periodo.id,
    );
    if (existente) {
      throw new ConflictException(MENSAJES_CONSOLIDADO.YA_EXISTE_CONSOLIDADO);
    }

    const metricas = await deps.repository.calcularMetricasDocente(
      dto.docenteId,
      periodo.fechaInicio,
      periodo.fechaFin,
    );

    const consolidado = await deps.repository.crearConsolidado({
      docenteId: dto.docenteId,
      periodoId: periodo.id,
      ...metricas,
      minutosHoraPedagogica,
      generadoPorId: actor.id,
    });

    await deps.auditService.log({
      usuarioId: actor.id,
      accion: "crear",
      tabla: "consolidados_docente",
      registroId: consolidado.id,
      valorNuevo: consolidado,
    });

    return {
      id: consolidado.id,
      mensaje: `Consolidado del ${periodo.nombre} generado exitosamente.`,
    };
  }

  // Generación masiva para todos los docentes con sesiones en el bimestre - CP-RF013-01
  const docentes = await deps.repository.listarDocentesConSesionesEnPeriodo(
    periodo.fechaInicio,
    periodo.fechaFin,
  );

  let creados = 0;
  for (const docente of docentes) {
    const existente = await deps.repository.obtenerConsolidadoVigenteDocente(
      docente.docenteId,
      periodo.id,
    );
    if (existente) continue;

    const metricas = await deps.repository.calcularMetricasDocente(
      docente.docenteId,
      periodo.fechaInicio,
      periodo.fechaFin,
    );

    const consolidado = await deps.repository.crearConsolidado({
      docenteId: docente.docenteId,
      periodoId: periodo.id,
      ...metricas,
      minutosHoraPedagogica,
      generadoPorId: actor.id,
    });

    creados++;

    await deps.auditService.log({
      usuarioId: actor.id,
      accion: "crear",
      tabla: "consolidados_docente",
      registroId: consolidado.id,
      valorNuevo: consolidado,
    });

    if (docente.usuarioId) {
      await deps.notificacionesService.enviar({
        usuarioId: docente.usuarioId,
        tipo: "informacion",
        titulo: "Consolidado de seguimiento disponible",
        mensaje: `Se ha generado tu consolidado de seguimiento del ${periodo.nombre}.`,
        enlaceUrl: `/admin/mi-seguimiento?periodoId=${periodo.id}`,
      });
    }
  }

  return {
    creados,
    mensaje: mensajeConsolidadosGenerados(creados, periodo.nombre),
  };
}

export async function listarConsolidadosPeriodo(
  deps: ConsolidadoDocenteServiceDeps,
  calls: ConsolidadoDocenteServiceCalls,
  dto: ConsolidadoQueryDto,
  actor: ActorConsolidado,
): Promise<ConsolidadoResumenItem[]> {
  calls.exigirAccesoGeneral(actor);

  const consolidados = await deps.repository.obtenerConsolidadosVigentesPeriodo(dto.periodoId);

  if (dto.ordenarPor) {
    const campo = dto.ordenarPor as keyof ConsolidadoResumenItem;
    const asc = dto.orden === "asc";
    consolidados.sort((a, b) => {
      const valA = a[campo];
      const valB = b[campo];
      if (typeof valA === "number" && typeof valB === "number") {
        return asc ? valA - valB : valB - valA;
      }
      return asc
        ? String(valA || "").localeCompare(String(valB || ""))
        : String(valB || "").localeCompare(String(valA || ""));
    });
  }

  return consolidados;
}
