import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { MENU_PLANIFICACION_SESIONES } from "../../common/constants";
import { AuditService } from "../../common/services/audit.service";
import { ahoraEnColegio } from "../marcaciones/utils/marcacion-reglas.util";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import { MENSAJES_PLANIFICACION } from "./constants";
import type { VerificacionAulaDto } from "./dto";
import type { ActorPlanificacion } from "./interfaces";
import { PlanificacionSesionesService } from "./planificacion-sesiones.service";
import { PlanificacionSesionesRepository } from "./repositories";

const aMinutos = (hora: string): number => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Supervisión de la planificación (RF-024 HU5/HU6, RF-011 V4): el Director o el Subdirector solo
 * ven, comentan y registran las horas reales en el aula; nunca editan el contenido.
 */
@Injectable()
export class SupervisionPlanificacionService {
  private readonly logger = new Logger(SupervisionPlanificacionService.name);

  constructor(
    private readonly repository: PlanificacionSesionesRepository,
    private readonly planificaciones: PlanificacionSesionesService,
    private readonly auditService: AuditService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /** Sesiones del día con la marca «Sin planificación». */
  async panel(fecha?: string) {
    const dia = fecha ?? ahoraEnColegio().fecha;
    const filas = await this.repository.sesionesConPlanificacion(dia);
    return {
      fecha: dia,
      sesiones: filas.map((f) => ({
        ...f,
        sinPlanificacion: f.planificacionId === null,
      })),
    };
  }

  async detalle(id: string) {
    return await this.planificaciones.completar(await this.planificaciones.cargar(id));
  }

  async comentar(id: string, texto: string, actor: ActorPlanificacion) {
    const plan = await this.planificaciones.cargar(id);
    if (plan.docentePersonaId === actor.personaId) {
      throw new ForbiddenException(MENSAJES_PLANIFICACION.SUPERVISOR_NO_EDITA);
    }
    const comentarioId = await this.repository.agregarComentario(id, actor.id, texto.trim());
    await this.auditService.log({
      usuarioId: actor.id,
      accion: "crear",
      tabla: "planificaciones_comentarios",
      registroId: comentarioId,
      valorNuevo: { planificacionId: id },
      valorAnterior: null,
    });
    await this.avisarDocente(plan.docenteId, plan.titulo, id);
    return {
      mensaje: MENSAJES_PLANIFICACION.COMENTARIO_ENVIADO,
      comentarios: await this.repository.comentariosDe(id),
    };
  }

  /** Horas en que el supervisor vio al docente en el aula, o «no estuvo en el aula». */
  async registrarHorasReales(
    sesionId: string,
    dto: VerificacionAulaDto,
    actor: ActorPlanificacion,
  ) {
    const sesion = await this.repository.sesion(sesionId);
    if (!sesion) throw new NotFoundException(MENSAJES_PLANIFICACION.SESION_NO_ENCONTRADA);
    let horaInicio: string | null = null;
    let horaFin: string | null = null;
    if (dto.enAula) {
      if (!dto.horaInicio || !dto.horaFin)
        throw new BadRequestException(MENSAJES_PLANIFICACION.HORAS_FALTAN);
      if (aMinutos(dto.horaFin) <= aMinutos(dto.horaInicio)) {
        throw new BadRequestException(MENSAJES_PLANIFICACION.HORAS_INVALIDAS);
      }
      horaInicio = dto.horaInicio;
      horaFin = dto.horaFin;
    }
    await this.repository.guardarVerificacion(sesionId, {
      enAula: dto.enAula,
      horaInicio,
      horaFin,
      observacion: dto.observacion?.trim() || null,
      usuarioId: actor.id,
    });
    await this.auditService.log({
      usuarioId: actor.id,
      accion: "actualizar",
      tabla: "sesiones_verificacion_aula",
      registroId: sesionId,
      valorNuevo: { enAula: dto.enAula, horaInicio, horaFin },
      valorAnterior: null,
    });
    return {
      mensaje: MENSAJES_PLANIFICACION.HORAS_REGISTRADAS,
      verificacion: await this.repository.verificacionDeSesion(sesionId),
    };
  }

  /** Un aviso fallido no deshace el comentario ya guardado. */
  private async avisarDocente(
    docenteId: string,
    titulo: string,
    planificacionId: string,
  ): Promise<void> {
    try {
      const usuarioId = await this.repository.usuarioDeDocente(docenteId);
      if (!usuarioId) return;
      await this.notificaciones.enviar({
        usuarioId,
        titulo: "Comentario en su planificación",
        mensaje: `Hay un comentario nuevo en la sesión «${titulo}».`.slice(0, 500),
        tipo: "informacion",
        enlaceUrl: `${MENU_PLANIFICACION_SESIONES}/${planificacionId}`,
      });
    } catch (error) {
      this.logger.warn(`No se pudo avisar al docente: ${(error as Error).message}`);
    }
  }
}
