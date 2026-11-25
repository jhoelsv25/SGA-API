import { ForbiddenException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { AnioLectivoCls } from "../../../common/anio-lectivo";
import { sinFichaDocente } from "../../../common/utils/ficha-docente.util";
import { CacheService } from "../../../core/cache/cache.service";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import type {
  HorarioEstudianteResponseDto,
  ListarPorSeccionResponseDto,
  MiHorarioResponseDto,
  ResumenHorasCursoDto,
} from "../dto";
import { HorariosRepository } from "../repositories";
import {
  claveCacheHorarioSeccion,
  construirAdvertenciasDesdeResumen,
  resolverAnioHorario,
  TTL_CACHE_HORARIO_SECCION_SEGUNDOS,
} from "./horarios-base.helper";

export interface UsuarioConsultaEstudiante {
  id: string;
  personaId?: string;
  role?: string;
  rol?: string;
}

/**
 * Servicio especializado en consultas de horarios por sección, docente,
 * estudiante y consolidado anual, con caché Redis.
 */
@Injectable()
export class HorariosConsultaService {
  constructor(
    private readonly horariosRepo: HorariosRepository,
    private readonly aniosService: AniosAcademicosService,
    private readonly anioLectivoCls: AnioLectivoCls,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async invalidarCacheSeccion(seccionId: string): Promise<void> {
    await this.cacheService?.del(claveCacheHorarioSeccion(seccionId));
  }

  async listarPorSeccion(seccionId: string): Promise<ListarPorSeccionResponseDto> {
    if (!this.cacheService) {
      return this.resolverListarPorSeccion(seccionId);
    }
    return this.cacheService.getOrSet(
      claveCacheHorarioSeccion(seccionId),
      () => this.resolverListarPorSeccion(seccionId),
      TTL_CACHE_HORARIO_SECCION_SEGUNDOS,
    );
  }

  private async resolverListarPorSeccion(seccionId: string): Promise<ListarPorSeccionResponseDto> {
    if (this.horariosRepo.consultarHorarioSeccionSql) {
      const { bloques, resumenHoras } =
        await this.horariosRepo.consultarHorarioSeccionSql(seccionId);
      return {
        bloques,
        resumenHoras,
        advertencias: construirAdvertenciasDesdeResumen(resumenHoras),
      };
    }

    const [bloques, horasPlanMap, horasHorarioMap] = await Promise.all([
      this.horariosRepo.findBySeccion(seccionId),
      this.horariosRepo.horasPlanPorCurso(seccionId),
      this.horariosRepo.horasPorCurso(seccionId),
    ]);

    const resumenHoras: ResumenHorasCursoDto[] = Object.entries(horasPlanMap).map(
      ([cursoSeccionId, planInfo]) => ({
        cursoId: cursoSeccionId,
        cursoNombre: planInfo.cursoNombre,
        horasHorario: horasHorarioMap[cursoSeccionId] ?? 0,
        horasPlan: planInfo.horasPlan,
      }),
    );

    return {
      bloques,
      resumenHoras,
      advertencias: construirAdvertenciasDesdeResumen(resumenHoras),
    };
  }

  async listarBloquesConsolidados(filtros?: { gradoId?: string; seccionId?: string }) {
    const anio = await resolverAnioHorario(this.anioLectivoCls, this.aniosService, false);
    const secciones =
      (await this.horariosRepo.listarSeccionesYBloquesDeAnio?.(anio.id, filtros)) ?? [];
    return { anio: anio.anio, secciones };
  }

  async miHorario(personaId: string): Promise<MiHorarioResponseDto> {
    const anio = await resolverAnioHorario(this.anioLectivoCls, this.aniosService, false);

    const docente = await this.horariosRepo.docentePorPersonaId(personaId);
    if (!docente) {
      throw sinFichaDocente();
    }

    const bloques = await this.horariosRepo.findByDocente(anio.id, docente.id);

    return {
      docenteId: docente.id,
      bloques,
    };
  }

  async horarioDeEstudiante(
    estudianteId: string,
    usuario: UsuarioConsultaEstudiante,
  ): Promise<HorarioEstudianteResponseDto> {
    const rol = (usuario.role ?? usuario.rol ?? "").trim().toLowerCase();
    let idConsulta = estudianteId;

    if (rol === "estudiante") {
      const estudiantePersonaId = usuario.personaId ?? usuario.id;
      if (estudiantePersonaId !== estudianteId && usuario.id !== estudianteId) {
        throw new ForbiddenException(
          "No tiene permiso para consultar el horario de otro estudiante.",
        );
      }
      idConsulta = estudiantePersonaId;
    } else if (rol === "apoderado") {
      const apoderadoPersonaId = usuario.personaId ?? usuario.id;
      const esVinculado = await this.horariosRepo.esApoderadoDeEstudiante(
        apoderadoPersonaId,
        estudianteId,
      );
      if (!esVinculado) {
        throw new ForbiddenException(
          "No tiene permiso para consultar el horario de este estudiante.",
        );
      }
    }

    const anio = await resolverAnioHorario(this.anioLectivoCls, this.aniosService, false);

    const matricula = await this.horariosRepo.matriculaEstudiante(anio.id, idConsulta);
    if (!matricula || matricula.estado !== "matriculado") {
      throw new NotFoundException(
        "El estudiante no cuenta con matrícula activa en el año académico.",
      );
    }

    const bloques = await this.horariosRepo.findBySeccion(matricula.seccionId);

    return {
      seccionId: matricula.seccionId,
      bloques,
    };
  }
}
