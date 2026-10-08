import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../../../common/services/audit.service";
import {
  AddCursoPlanDto,
  PlanEstudioItemDto,
  PlanEstudioResponseDto,
  UpdateHorasPlanDto,
} from "../dto";
import { CursosRepository, GradosRepository, PlanEstudiosRepository } from "../repositories";

@Injectable()
export class PlanEstudiosService {
  constructor(
    private readonly repository: PlanEstudiosRepository,
    private readonly gradosRepository: GradosRepository,
    private readonly cursosRepository: CursosRepository,
    private readonly auditService: AuditService,
  ) {}

  async getPlanByGrado(gradoId: string): Promise<PlanEstudioResponseDto> {
    const grado = await this.gradosRepository.findById(gradoId);
    if (!grado) {
      throw new NotFoundException(`El grado con ID ${gradoId} no existe.`);
    }

    const cursos = await this.repository.findByGradoId(gradoId);
    const totalHoras = cursos.reduce((sum, item) => sum + item.horasSemanales, 0);

    return {
      gradoId,
      grado,
      totalHoras,
      cursos,
    };
  }

  async addCurso(
    gradoId: string,
    dto: AddCursoPlanDto,
    actorId: string,
    ip?: string,
  ): Promise<PlanEstudioItemDto> {
    const grado = await this.gradosRepository.findById(gradoId);
    if (!grado) {
      throw new NotFoundException(`El grado con ID ${gradoId} no existe.`);
    }

    if (!dto.horasSemanales || dto.horasSemanales <= 0) {
      throw new BadRequestException("Las horas semanales deben ser mayores que 0.");
    }

    const curso = await this.cursosRepository.findById(dto.cursoId);
    if (!curso || !curso.activo) {
      throw new BadRequestException("El curso no existe o se encuentra inactivo.");
    }

    const existingInPlan = await this.repository.findByGradoAndCurso(gradoId, dto.cursoId);
    if (existingInPlan) {
      throw new ConflictException("El curso ya está en el plan de estudios de este grado.");
    }

    const created = await this.repository.create(gradoId, dto.cursoId, dto.horasSemanales);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "plan_estudios",
      registroId: created.id,
      valorNuevo: {
        gradoId,
        cursoId: dto.cursoId,
        horasSemanales: dto.horasSemanales,
      },
      direccionIp: ip,
    });

    return created;
  }

  async updateHoras(
    id: string,
    dto: UpdateHorasPlanDto,
    actorId: string,
    ip?: string,
  ): Promise<PlanEstudioItemDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`La asignación en el plan de estudios con ID ${id} no existe.`);
    }

    if (!dto.horasSemanales || dto.horasSemanales <= 0) {
      throw new BadRequestException("Las horas semanales deben ser mayores que 0.");
    }

    const updated = await this.repository.updateHoras(id, dto.horasSemanales);
    if (!updated) {
      throw new NotFoundException(`La asignación en el plan de estudios con ID ${id} no existe.`);
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "plan_estudios",
      registroId: id,
      valorAnterior: { horasSemanales: existing.horasSemanales },
      valorNuevo: { horasSemanales: updated.horasSemanales },
      direccionIp: ip,
    });

    return updated;
  }

  async removeCurso(
    id: string,
    actorId: string,
    ip?: string,
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`La asignación en el plan de estudios con ID ${id} no existe.`);
    }

    const hasLoad = await this.repository.hasCargaAcademicaEnGrado(
      existing.gradoId,
      existing.cursoId,
    );
    if (hasLoad) {
      throw new ConflictException(
        "No se puede quitar: el curso tiene carga académica en secciones de este grado.",
      );
    }

    await this.repository.delete(id);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "eliminar",
      tabla: "plan_estudios",
      registroId: id,
      valorAnterior: {
        gradoId: existing.gradoId,
        cursoId: existing.cursoId,
        horasSemanales: existing.horasSemanales,
      },
      direccionIp: ip,
    });

    return {
      success: true,
      message: "Curso retirado del plan de estudios exitosamente.",
    };
  }

  async copyPlan(
    origenGradoId: string,
    destinoGradoId: string,
    actorId: string,
    ip?: string,
  ): Promise<{
    mensaje: string;
    totalHoras: number;
    cursos: PlanEstudioItemDto[];
  }> {
    if (origenGradoId === destinoGradoId) {
      throw new BadRequestException(
        "El grado de origen y el grado de destino deben ser diferentes.",
      );
    }

    const origenGrado = await this.gradosRepository.findById(origenGradoId);
    if (!origenGrado) {
      throw new NotFoundException(`El grado de origen con ID ${origenGradoId} no existe.`);
    }

    const destinoGrado = await this.gradosRepository.findById(destinoGradoId);
    if (!destinoGrado) {
      throw new NotFoundException(`El grado de destino con ID ${destinoGradoId} no existe.`);
    }

    const sourceCourses = await this.repository.findByGradoId(origenGradoId);
    if (sourceCourses.length === 0) {
      throw new BadRequestException("El grado de origen no tiene cursos en su plan de estudios.");
    }

    const targetCourses = await this.repository.findByGradoId(destinoGradoId);
    if (targetCourses.length > 0) {
      throw new ConflictException(
        "El grado de destino ya cuenta con un plan de estudios. Elimine los cursos existentes antes de copiar.",
      );
    }

    const copiedCourses = await this.repository.copyPlan(origenGradoId, destinoGradoId);
    const totalHoras = copiedCourses.reduce((sum, item) => sum + item.horasSemanales, 0);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "plan_estudios",
      registroId: destinoGradoId,
      valorNuevo: {
        operacion: "copiar_plan",
        origenGradoId,
        destinoGradoId,
        cursosCopiados: copiedCourses.length,
        totalHoras,
      },
      direccionIp: ip,
    });

    return {
      mensaje: "Se copió el plan de estudios. Revise las horas antes de guardar.",
      totalHoras,
      cursos: copiedCourses,
    };
  }
}
