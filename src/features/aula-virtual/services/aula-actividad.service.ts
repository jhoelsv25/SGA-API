import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { AnioLectivoCls } from "../../../common/anio-lectivo";
import { AuditService } from "../../../common/services/audit.service";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { MENSAJES_AULA_VIRTUAL, MENSAJES_TAREA } from "../constants";
import type { RegistrarActividadDto } from "../dto";
import type { ActividadEstudianteMaterial, ActividadEstudianteTarea } from "../interfaces";
import { AulaVirtualRepository } from "../repositories";
import { AulaContextoHelper } from "./aula-contexto.helper";

/**
 * Servicio de dominio para trazabilidad de visualizaciones/descargas de materiales
 * y apertura/completitud de tareas por estudiante (RF-017).
 */
@Injectable()
export class AulaActividadService {
  private readonly ctx: AulaContextoHelper;

  constructor(
    private readonly repository: AulaVirtualRepository,
    aniosService: AniosAcademicosService,
    anioLectivoCls: AnioLectivoCls,
    auditService: AuditService,
    @Optional() contexto?: AulaContextoHelper,
  ) {
    this.ctx =
      contexto ?? new AulaContextoHelper(repository, aniosService, anioLectivoCls, auditService);
  }

  async registrarActividad(
    dto: RegistrarActividadDto,
    usuario: AuthenticatedUser,
  ): Promise<{ ok: boolean }> {
    let seccionId: string;
    if (dto.materialId) {
      const m = await this.repository.findMaterial(dto.materialId);
      if (!m) throw new NotFoundException(MENSAJES_AULA_VIRTUAL.MATERIAL_NO_ENCONTRADO);
      const c = await this.ctx.requerirCurso(m.cursoSeccionId);
      seccionId = c.seccionId;
    } else if (dto.tareaId) {
      const t = await this.repository.findTarea(dto.tareaId);
      if (!t) throw new NotFoundException(MENSAJES_TAREA.TAREA_NO_ENCONTRADA);
      const c = await this.ctx.requerirCurso(t.cursoSeccionId);
      seccionId = c.seccionId;
    } else {
      throw new BadRequestException("Debe indicar materialId o tareaId.");
    }

    const matricula = await this.repository.obtenerMatriculaActivaEstudiante(
      usuario.personaId,
      seccionId,
    );
    if (!matricula) return { ok: true };

    await this.repository.registrarActividad({
      matriculaId: matricula.id,
      materialId: dto.materialId ?? null,
      tareaId: dto.tareaId ?? null,
      accion: dto.accion,
    });
    return { ok: true };
  }

  async obtenerActividadMaterial(
    materialId: string,
    usuario: AuthenticatedUser,
  ): Promise<ActividadEstudianteMaterial[]> {
    const material = await this.repository.findMaterial(materialId);
    if (!material) throw new NotFoundException(MENSAJES_AULA_VIRTUAL.MATERIAL_NO_ENCONTRADO);

    const curso = await this.ctx.requerirCurso(material.cursoSeccionId);
    const esDocente = await this.ctx.esDocenteDelCurso(curso, usuario);
    const esDirectivo = this.ctx.esRolDeSeguimiento(usuario);
    if (!esDocente && !esDirectivo) {
      throw new ForbiddenException(MENSAJES_AULA_VIRTUAL.SIN_ACCESO_AULA);
    }

    return this.repository.obtenerActividadMaterial(materialId, material.cursoSeccionId);
  }

  async obtenerActividadTarea(
    tareaId: string,
    usuario: AuthenticatedUser,
  ): Promise<ActividadEstudianteTarea[]> {
    const tarea = await this.repository.findTarea(tareaId);
    if (!tarea) throw new NotFoundException(MENSAJES_TAREA.TAREA_NO_ENCONTRADA);

    const curso = await this.ctx.requerirCurso(tarea.cursoSeccionId);
    const esDocente = await this.ctx.esDocenteDelCurso(curso, usuario);
    const esDirectivo = this.ctx.esRolDeSeguimiento(usuario);
    if (!esDocente && !esDirectivo) {
      throw new ForbiddenException(MENSAJES_AULA_VIRTUAL.SIN_ACCESO_AULA);
    }

    return this.repository.obtenerActividadTarea(tareaId, tarea.cursoSeccionId);
  }
}
