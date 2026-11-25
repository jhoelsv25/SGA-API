import { BadRequestException } from "@nestjs/common";
import { AnioLectivoCls } from "../../../common/anio-lectivo";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import { MENSAJES_HORARIOS } from "../constants";
import type { BloqueHorarioResponseDto, ResumenHorasCursoDto } from "../dto";
import type { IHorariosRepository } from "../interfaces";
import { construirAdvertenciaHorasPlan } from "../utils";

export const TTL_CACHE_HORARIO_SECCION_SEGUNDOS = 300;

export const claveCacheHorarioSeccion = (seccionId: string): string =>
  `horarios:seccion:${seccionId}`;

export function exigirSeccionAbierta(seccion: { estado: string } | null | undefined): void {
  if (seccion?.estado === "cerrada") {
    throw new BadRequestException(MENSAJES_HORARIOS.SECCION_CERRADA);
  }
}

export async function resolverAnioHorario(
  anioLectivoCls: AnioLectivoCls,
  aniosService: AniosAcademicosService,
  requiereEscritura: boolean,
) {
  const id = anioLectivoCls.id();
  const anio = id ? await aniosService.findById(id) : await aniosService.findEnCurso();
  if (requiereEscritura && anio.estado === "cerrado") {
    throw new BadRequestException(MENSAJES_HORARIOS.ANIO_CERRADO);
  }
  return anio;
}

export function construirAdvertenciasDesdeResumen(resumenHoras: ResumenHorasCursoDto[]): string[] {
  return resumenHoras
    .filter((item) => item.horasHorario !== item.horasPlan)
    .map((item) =>
      construirAdvertenciaHorasPlan(item.cursoNombre, item.horasHorario, item.horasPlan),
    );
}

export async function calcularAdvertenciasSeccion(
  horariosRepo: Pick<IHorariosRepository, "horasPlanPorCurso" | "horasPorCurso">,
  seccionId: string,
): Promise<string[]> {
  const [horasPlanMap, horasHorarioMap] = await Promise.all([
    horariosRepo.horasPlanPorCurso(seccionId),
    horariosRepo.horasPorCurso(seccionId),
  ]);

  if (!horasPlanMap || !horasHorarioMap) {
    return [];
  }

  const advertencias: string[] = [];
  for (const [cursoSeccionId, planInfo] of Object.entries(horasPlanMap)) {
    const horasHorario = horasHorarioMap[cursoSeccionId] ?? 0;
    if (horasHorario !== planInfo.horasPlan) {
      advertencias.push(
        construirAdvertenciaHorasPlan(planInfo.cursoNombre, horasHorario, planInfo.horasPlan),
      );
    }
  }
  return advertencias;
}

export function serializarBloqueAuditoria(
  bloque: BloqueHorarioResponseDto,
): Record<string, unknown> {
  return {
    id: bloque.id,
    seccionId: bloque.seccionId,
    cursoSeccionId: bloque.cursoSeccionId,
    cursoNombre: bloque.cursoNombre,
    docenteNombre: bloque.docenteNombre,
    diaSemana: bloque.diaSemana,
    horaInicio: bloque.horaInicio,
    horaFin: bloque.horaFin,
    tipoBloque: bloque.tipoBloque,
    aula: bloque.aula,
  };
}
