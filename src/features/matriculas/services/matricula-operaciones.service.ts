import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { AuditService } from "../../../common/services/audit.service";
import { NotificacionesService } from "../../notificaciones/notificaciones.service";
import { MATRICULA_MESSAGES } from "../constants";
import {
  CambiarSeccionDto,
  MatriculaResponseDto,
  RetirarMatriculaDto,
  TrasladarMatriculaDto,
} from "../dto";
import { MatriculasRepository } from "../repositories";

@Injectable()
export class MatriculaOperacionesService {
  constructor(
    private readonly matriculasRepository: MatriculasRepository,
    private readonly auditService: AuditService,
    @Optional() private readonly notificacionesService?: NotificacionesService,
  ) {}

  /**
   * RF-009 HU3: Retirar a un estudiante matriculado.
   * La matrícula pasa a 'retirado', el estudiante pasa a 'retirado',
   * y se desactivan su cuenta y su credencial.
   */
  async retirar(
    id: string,
    dto: RetirarMatriculaDto,
    actorId: string,
    ip?: string,
  ): Promise<MatriculaResponseDto> {
    const matricula = await this.matriculasRepository.findMatriculaById(id);
    if (!matricula) {
      throw new NotFoundException(MATRICULA_MESSAGES.MATRICULA_NO_ENCONTRADA);
    }

    if (matricula.estado !== "matriculado") {
      throw new BadRequestException(
        `Solo se pueden retirar matrículas en estado matriculado (estado actual: ${matricula.estado}).`,
      );
    }

    if (!dto.fechaRetiro || !dto.motivoRetiro?.trim()) {
      throw new BadRequestException(MATRICULA_MESSAGES.RETIRO_INCOMPLETO);
    }

    // 1. Actualizar matrícula a 'retirado'
    await this.matriculasRepository.update(id, {
      estado: "retirado",
      fechaRetiro: dto.fechaRetiro,
      motivoRetiro: dto.motivoRetiro.trim(),
    });

    // 2. Desactivar estudiante y credenciales
    await this.matriculasRepository.desactivarEstudianteYCredenciales(
      matricula.estudiante.id,
      "retirado",
    );

    const updated = (await this.matriculasRepository.findMatriculaById(id))!;

    // 3. Auditoría
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "matriculas",
      registroId: id,
      valorAnterior: { estado: matricula.estado },
      valorNuevo: {
        estado: "retirado",
        fechaRetiro: dto.fechaRetiro,
        motivoRetiro: dto.motivoRetiro.trim(),
      },
      direccionIp: ip,
    });

    if (this.notificacionesService) {
      await this.notificacionesService
        .enviar({
          usuarioId: actorId,
          titulo: "Estudiante retirado",
          mensaje: `Se procesó el retiro de la matrícula para ${matricula.estudiante.nombres} ${matricula.estudiante.apellidos}.`,
          tipo: "alerta",
          enlaceUrl: `/admin/enrollment/${id}`,
          canales: ["in_app"],
        })
        .catch(() => undefined);
    }

    return updated;
  }

  /**
   * RF-009 HU3: Trasladar a un estudiante a otro colegio.
   * La matrícula pasa a 'trasladado', el estudiante pasa a 'trasladado',
   * y se desactivan su cuenta y su credencial.
   */
  async trasladar(
    id: string,
    dto: TrasladarMatriculaDto,
    actorId: string,
    ip?: string,
  ): Promise<MatriculaResponseDto> {
    const matricula = await this.matriculasRepository.findMatriculaById(id);
    if (!matricula) {
      throw new NotFoundException(MATRICULA_MESSAGES.MATRICULA_NO_ENCONTRADA);
    }

    if (matricula.estado !== "matriculado") {
      throw new BadRequestException(
        `Solo se pueden trasladar matrículas en estado matriculado (estado actual: ${matricula.estado}).`,
      );
    }

    if (!dto.fechaRetiro || !dto.colegioDestino?.trim()) {
      throw new BadRequestException(MATRICULA_MESSAGES.TRASLADO_INCOMPLETO);
    }

    const motivo = `Traslado a: ${dto.colegioDestino.trim()}${dto.motivo ? ` - ${dto.motivo.trim()}` : ""}`;

    // 1. Actualizar matrícula a 'trasladado'
    await this.matriculasRepository.update(id, {
      estado: "trasladado",
      fechaRetiro: dto.fechaRetiro,
      motivoRetiro: motivo,
    });

    // 2. Desactivar estudiante y credenciales
    await this.matriculasRepository.desactivarEstudianteYCredenciales(
      matricula.estudiante.id,
      "trasladado",
    );

    const updated = (await this.matriculasRepository.findMatriculaById(id))!;

    // 3. Auditoría
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "matriculas",
      registroId: id,
      valorAnterior: { estado: matricula.estado },
      valorNuevo: {
        estado: "trasladado",
        fechaRetiro: dto.fechaRetiro,
        motivoRetiro: motivo,
      },
      direccionIp: ip,
    });

    if (this.notificacionesService) {
      await this.notificacionesService
        .enviar({
          usuarioId: actorId,
          titulo: "Estudiante trasladado",
          mensaje: `Se procesó el traslado de ${matricula.estudiante.nombres} ${matricula.estudiante.apellidos} hacia ${dto.colegioDestino.trim()}.`,
          tipo: "alerta",
          enlaceUrl: `/admin/enrollment/${id}`,
          canales: ["in_app"],
        })
        .catch(() => undefined);
    }

    return updated;
  }

  /**
   * RF-009 HU3: Cambiar de sección dentro del mismo año y al MISMO GRADO con vacantes.
   */
  async cambiarSeccion(
    id: string,
    dto: CambiarSeccionDto,
    actorId: string,
    ip?: string,
  ): Promise<MatriculaResponseDto> {
    const matricula = await this.matriculasRepository.findMatriculaById(id);
    if (!matricula) {
      throw new NotFoundException(MATRICULA_MESSAGES.MATRICULA_NO_ENCONTRADA);
    }

    if (matricula.estado !== "matriculado") {
      throw new BadRequestException(
        "Solo se puede cambiar de sección a estudiantes en estado matriculado.",
      );
    }

    if (matricula.seccionId === dto.nuevaSeccionId) {
      throw new BadRequestException("La nueva sección es la misma que la sección actual.");
    }

    // 1. Validar que la nueva sección exista y esté activa
    const nuevaSeccion = await this.matriculasRepository.findSeccionById(dto.nuevaSeccionId);
    if (!nuevaSeccion || nuevaSeccion.estado !== "activa") {
      throw new BadRequestException(MATRICULA_MESSAGES.SECCION_NO_ENCONTRADA);
    }

    // 2. Validar que pertenezca al MISMO AÑO ACADÉMICO
    if (nuevaSeccion.anioAcademicoId !== matricula.anioAcademicoId) {
      throw new BadRequestException("La sección destino no pertenece al mismo año académico.");
    }

    // 3. Regla estricta: Solo se puede cambiar a una sección del MISMO GRADO
    if (nuevaSeccion.gradoId !== matricula.gradoId) {
      throw new BadRequestException(MATRICULA_MESSAGES.CAMBIO_OTRO_GRADO);
    }

    // 4. Validar que la nueva sección tenga vacantes disponibles
    if (nuevaSeccion.vacantesDisponibles <= 0) {
      throw new BadRequestException(
        `La sección ${nuevaSeccion.gradoNombre} ${nuevaSeccion.nombre} no tiene vacantes disponibles.`,
      );
    }

    // 5. Actualizar sección de la matrícula
    await this.matriculasRepository.update(id, {
      seccionId: dto.nuevaSeccionId,
    });

    const updated = (await this.matriculasRepository.findMatriculaById(id))!;

    // 6. Auditoría con motivo
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "matriculas",
      registroId: id,
      valorAnterior: { seccionId: matricula.seccionId, seccionNombre: matricula.seccionNombre },
      valorNuevo: {
        seccionId: nuevaSeccion.id,
        seccionNombre: nuevaSeccion.nombre,
        motivoCambio: dto.motivo.trim(),
      },
      direccionIp: ip,
    });

    if (this.notificacionesService) {
      await this.notificacionesService
        .enviar({
          usuarioId: actorId,
          titulo: "Cambio de sección",
          mensaje: `Se cambió la sección de ${matricula.estudiante.nombres} ${matricula.estudiante.apellidos} a ${nuevaSeccion.gradoNombre} - ${nuevaSeccion.nombre}.`,
          tipo: "informacion",
          enlaceUrl: `/admin/enrollment/${id}`,
          canales: ["in_app"],
        })
        .catch(() => undefined);
    }

    return updated;
  }

  /**
   * RF-009 HU3: Anular una matrícula registrada por error.
   * Regla estricta: Solo si el estudiante NO tiene actividad registrada (asistencias o tareas).
   */
  async anular(id: string, actorId: string, ip?: string): Promise<{ message: string }> {
    const matricula = await this.matriculasRepository.findMatriculaById(id);
    if (!matricula) {
      throw new NotFoundException(MATRICULA_MESSAGES.MATRICULA_NO_ENCONTRADA);
    }

    // 1. Validar si ya tiene actividad registrada
    const tieneActividad = await this.matriculasRepository.hasActividadRegistrada(id);
    if (tieneActividad) {
      throw new BadRequestException(MATRICULA_MESSAGES.ANULACION_CON_ACTIVIDAD);
    }

    // 2. Eliminar la matrícula para liberar la vacante
    await this.matriculasRepository.delete(id);

    // 3. Auditoría
    await this.auditService.log({
      usuarioId: actorId,
      accion: "eliminar",
      tabla: "matriculas",
      registroId: id,
      valorAnterior: {
        codigo: matricula.codigo,
        estudiante: matricula.estudiante.apellidos,
        seccion: matricula.seccionNombre,
      },
      direccionIp: ip,
    });

    return { message: "Matrícula anulada exitosamente." };
  }
}
