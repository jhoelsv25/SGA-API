import { Injectable, Logger, Optional } from "@nestjs/common";
import { createHash } from "node:crypto";
import { CacheService } from "../../../core/cache/cache.service";
import { IaService } from "../../../core/ia/ia.service";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { AulaVirtualService } from "../../aula-virtual/aula-virtual.service";
import type { SesionResponseDto, SugerirTemaDto, SugerirTemaResponseDto } from "../dto";
import {
  construirPromptSugerirTema,
  construirPromptUnidadAulaVirtual,
  INSTRUCCION_SISTEMA_SUGERIR_TEMA,
  INSTRUCCION_SISTEMA_UNIDAD_AULA_VIRTUAL,
} from "../prompts";
import { SesionesClaseRepository } from "../repositories";
import { SesionesContextoHelper } from "./sesiones-contexto.helper";

/**
 * Servicio especializado en sugerencia de temas con IA y creación opcional
 * de unidad borrador en Aula Virtual al firmar sesión.
 */
@Injectable()
export class SesionesIaService {
  private readonly logger = new Logger(SesionesIaService.name);

  constructor(
    private readonly repository: SesionesClaseRepository,
    private readonly aniosService: AniosAcademicosService,
    private readonly ctx: SesionesContextoHelper,
    @Optional() private readonly aulaVirtualService?: AulaVirtualService,
    @Optional() private readonly iaService?: IaService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async crearBorradorEnAulaVirtual(
    sesion: SesionResponseDto,
    tema: string,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<boolean> {
    if (!this.aulaVirtualService) return false;
    try {
      const cursoSeccionId = await this.repository.cursoSeccionDeSesion(sesion.id);
      if (!cursoSeccionId) return false;
      const anio = await this.aniosService.anioVigente();
      if (!anio) return false;
      const bimestre =
        anio.bimestres.find(
          (b) =>
            b.fechaInicio.slice(0, 10) <= sesion.fecha && sesion.fecha <= b.fechaFin.slice(0, 10),
        ) ?? anio.bimestres[0];
      if (!bimestre) return false;

      const contenido = await this.construirContenidoUnidad(sesion, tema);
      await this.aulaVirtualService.crearUnidad(
        cursoSeccionId,
        {
          titulo: contenido.titulo.slice(0, 150),
          descripcion: contenido.descripcion.slice(0, 1000),
          periodoId: bimestre.id,
          fechaInicio: bimestre.fechaInicio.slice(0, 10),
          fechaFin: bimestre.fechaFin.slice(0, 10),
          publicada: false,
        },
        usuario,
        ip,
      );
      return true;
    } catch (error) {
      this.logger.warn(
        `No se pudo crear borrador en Aula Virtual para sesión ${sesion.id}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  async sugerirTema(
    sesionId: string,
    dto: SugerirTemaDto,
    usuario: AuthenticatedUser,
  ): Promise<SugerirTemaResponseDto> {
    const docenteId = await this.ctx.docenteDelUsuario(usuario);
    const sesion = await this.ctx.sesionDelDocente(sesionId, docenteId);
    const recientes = await this.repository.ultimosTemasDocente(docenteId, sesion.fecha);
    const delCurso =
      recientes.find(
        (r) => r.cursoNombre === sesion.cursoNombre && r.seccionNombre === sesion.seccionNombre,
      )?.temas ?? [];

    const borrador = dto.borrador?.trim();
    if (!this.iaService?.estaHabilitada()) {
      return {
        sugerencias: borrador ? [borrador, ...delCurso].slice(0, 3) : delCurso.slice(0, 3),
      };
    }

    try {
      const claveCache = `ia:sugerir-tema:${sesion.id}:${createHash("sha256")
        .update(borrador ?? "")
        .digest("hex")
        .slice(0, 16)}`;
      const enCache = await this.cacheService?.get<string[]>(claveCache);
      if (enCache && enCache.length > 0) return { sugerencias: enCache };

      const respuesta = await this.iaService.generarEstructurado<{ sugerencias: string[] }>({
        instruccionSistema: INSTRUCCION_SISTEMA_SUGERIR_TEMA,
        prompt: construirPromptSugerirTema({
          cursoNombre: sesion.cursoNombre,
          seccionNombre: sesion.seccionNombre,
          temasRecientes: delCurso,
          borrador,
        }),
      });

      const sugerencias = (respuesta.datos.sugerencias ?? [])
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 3);

      if (sugerencias.length > 0) {
        await this.cacheService?.set(claveCache, sugerencias, 300);
        return { sugerencias };
      }
      return { sugerencias: delCurso.slice(0, 3) };
    } catch {
      return {
        sugerencias: borrador ? [borrador, ...delCurso].slice(0, 3) : delCurso.slice(0, 3),
      };
    }
  }

  private async construirContenidoUnidad(
    sesion: SesionResponseDto,
    tema: string,
  ): Promise<{ titulo: string; descripcion: string }> {
    const respaldo = {
      titulo: tema.slice(0, 150),
      descripcion: `Sesión de clase del ${sesion.fecha}: ${tema}`,
    };
    if (!this.iaService?.estaHabilitada()) return respaldo;
    try {
      const resultado = await this.iaService.generarEstructurado<{
        titulo: string;
        descripcion: string;
      }>({
        instruccionSistema: INSTRUCCION_SISTEMA_UNIDAD_AULA_VIRTUAL,
        prompt: construirPromptUnidadAulaVirtual({
          cursoNombre: sesion.cursoNombre,
          seccionNombre: sesion.seccionNombre,
          tema,
        }),
      });
      return {
        titulo: resultado.datos.titulo?.trim() || respaldo.titulo,
        descripcion: resultado.datos.descripcion?.trim() || respaldo.descripcion,
      };
    } catch {
      return respaldo;
    }
  }
}
