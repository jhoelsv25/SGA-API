import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { AnioLectivoCls } from "../../../common/anio-lectivo";
import { AuditService } from "../../../common/services/audit.service";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { ahoraEnColegio } from "../../marcaciones/utils";
import { NotificacionesService } from "../../notificaciones/notificaciones.service";
import {
  MENSAJES_AULA_VIRTUAL,
  ROLES_NOTIFICADOS_SOLICITUD,
  type EstadoSolicitudFecha,
} from "../constants";
import type {
  ResolverSolicitudDto,
  SeguimientoFilaResponse,
  SeguimientoResponse,
  SolicitarCambioFechaDto,
  SolicitudCambioResponse,
} from "../dto";
import type { SolicitudFila } from "../interfaces";
import { AulaVirtualRepository } from "../repositories";
import { estaEnVentana, formatearFecha, porcentajeATiempo } from "../utils";
import { AulaContextoHelper } from "./aula-contexto.helper";

/**
 * Servicio de dominio para solicitudes de cambio de fecha congelada
 * y seguimiento del Índice de Gestión de Materiales (IGM) (RF-015 HU3 & HU5).
 */
@Injectable()
export class AulaSolicitudesService {
  private readonly ctx: AulaContextoHelper;

  constructor(
    private readonly repository: AulaVirtualRepository,
    aniosService: AniosAcademicosService,
    anioLectivoCls: AnioLectivoCls,
    private readonly notificaciones: NotificacionesService,
    auditService: AuditService,
    @Optional() contexto?: AulaContextoHelper,
  ) {
    this.ctx =
      contexto ?? new AulaContextoHelper(repository, aniosService, anioLectivoCls, auditService);
  }

  async solicitarCambioFecha(
    materialId: string,
    dto: SolicitarCambioFechaDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<{ mensaje: string; id: string }> {
    const material = await this.ctx.requerirMaterial(materialId);
    const curso = await this.ctx.requerirCurso(material.cursoSeccionId);
    await this.ctx.exigirDocenteDelCurso(curso, usuario);
    if (!material.esPlanificado || !material.fechaProgramada) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.SOLO_PLANIFICADOS);
    }
    const periodo = await this.ctx.periodoDeMaterial(material);
    this.ctx.exigirBimestreAbierto(periodo);

    const motivo = dto.motivo?.trim();
    if (!motivo) throw new BadRequestException(MENSAJES_AULA_VIRTUAL.MOTIVO_REQUERIDO);

    const dias = await this.ctx.diasPlanificacion();
    const hoy = ahoraEnColegio().fecha;
    if (!material.fechaCongelada && estaEnVentana(hoy, periodo.fechaInicio, dias)) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.FECHA_NO_CONGELADA);
    }
    this.ctx.exigirDentroDelBimestre(dto.fechaSolicitada, periodo);
    if (await this.repository.findSolicitudAbierta(materialId)) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.SOLICITUD_REPETIDA);
    }

    const solicitud = await this.repository.crearSolicitud({
      materialId,
      fechaAnterior: material.fechaProgramada,
      fechaSolicitada: dto.fechaSolicitada,
      motivo,
      solicitadoPorId: usuario.id,
    });
    await this.ctx.auditar(
      "crear",
      "material_cambios_fecha",
      solicitud.id,
      usuario.id,
      null,
      {
        materialId,
        fechaAnterior: material.fechaProgramada,
        fechaSolicitada: dto.fechaSolicitada,
        motivo,
      },
      ip,
    );

    const destinatarios = await this.repository.usuariosConRol(ROLES_NOTIFICADOS_SOLICITUD);
    await Promise.all(
      destinatarios.map((usuarioId) =>
        this.notificaciones.enviar({
          usuarioId,
          titulo: "Solicitud de cambio de fecha",
          mensaje: `${curso.cursoNombre} ${curso.seccionNombre}: solicitan mover «${material.titulo}» al ${formatearFecha(dto.fechaSolicitada)}.`,
          tipo: "recordatorio",
          enlaceUrl: "/admin/solicitudes-cambio-fecha",
        }),
      ),
    );
    return { mensaje: MENSAJES_AULA_VIRTUAL.SOLICITUD_ENVIADA, id: solicitud.id };
  }

  /** Seguimiento: todas las del año, o un estado si se pide. Docente: las suyas. */
  async listarSolicitudes(
    usuario: AuthenticatedUser,
    estado?: EstadoSolicitudFecha,
  ): Promise<SolicitudCambioResponse[]> {
    const anioAcademicoId = await this.ctx.anioDeTrabajo();
    const filas = this.ctx.esRolDeSeguimiento(usuario)
      ? await this.repository.listarSolicitudes({ estado, anioAcademicoId })
      : await this.repository.listarSolicitudes({
          estado,
          anioAcademicoId,
          solicitadoPorId: usuario.id,
        });
    return filas.map((fila) => this.armarSolicitud(fila));
  }

  async aprobarSolicitud(
    solicitudId: string,
    dto: ResolverSolicitudDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<{ mensaje: string }> {
    const solicitud = await this.requerirSolicitudAbierta(solicitudId);
    await this.exigirBimestreAbiertoDeMaterial(solicitud.materialId);
    const respuesta = dto.respuesta?.trim() || null;
    await this.repository.aprobarSolicitud(solicitudId, usuario.id, respuesta);
    await this.ctx.auditar(
      "actualizar",
      "material_cambios_fecha",
      solicitudId,
      usuario.id,
      { estado: "solicitada", fechaProgramada: solicitud.fechaAnterior },
      { estado: "aprobada", fechaProgramada: solicitud.fechaSolicitada, respuesta },
      ip,
    );
    await this.notificaciones.enviar({
      usuarioId: solicitud.solicitadoPorId,
      titulo: "Cambio de fecha aprobado",
      mensaje: `«${solicitud.materialTitulo}» ahora tiene fecha programada ${formatearFecha(solicitud.fechaSolicitada)}.`,
      tipo: "informacion",
      enlaceUrl: `/admin/aula-virtual/${solicitud.cursoSeccionId}`,
    });
    return { mensaje: "Solicitud aprobada. El material tiene la nueva fecha programada." };
  }

  async rechazarSolicitud(
    solicitudId: string,
    dto: ResolverSolicitudDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<{ mensaje: string }> {
    const respuesta = dto.respuesta?.trim();
    if (!respuesta) throw new BadRequestException(MENSAJES_AULA_VIRTUAL.RESPUESTA_REQUERIDA);
    const solicitud = await this.requerirSolicitudAbierta(solicitudId);
    await this.repository.rechazarSolicitud(solicitudId, usuario.id, respuesta);
    await this.ctx.auditar(
      "actualizar",
      "material_cambios_fecha",
      solicitudId,
      usuario.id,
      { estado: "solicitada" },
      { estado: "rechazada", respuesta },
      ip,
    );
    await this.notificaciones.enviar({
      usuarioId: solicitud.solicitadoPorId,
      titulo: "Cambio de fecha rechazado",
      mensaje: `«${solicitud.materialTitulo}» conserva su fecha. Respuesta: ${respuesta}`,
      tipo: "alerta",
      enlaceUrl: `/admin/aula-virtual/${solicitud.cursoSeccionId}`,
    });
    return { mensaje: "Solicitud rechazada. El docente fue notificado." };
  }

  async seguimiento(
    periodoId: string | undefined,
    hoyInyectado?: string,
  ): Promise<SeguimientoResponse> {
    const periodo = periodoId
      ? await this.ctx.requerirPeriodo(periodoId)
      : await this.ctx.periodoEnCursoDelAnio();
    const hoy = hoyInyectado ?? ahoraEnColegio().fecha;
    const filas = await this.repository.seguimiento(periodo.id, hoy);
    const salida = filas.map<SeguimientoFilaResponse>((fila) => ({
      ...fila,
      porcentajeATiempo: porcentajeATiempo(fila.aTiempo, fila.planificados),
    }));
    const suma = (
      clave: "planificados" | "aTiempo" | "fueraDePlazo" | "noPublicados" | "solicitudesPendientes",
    ) => salida.reduce((total, fila) => total + fila[clave], 0);
    return {
      periodoId: periodo.id,
      periodoNombre: periodo.nombre,
      filas: salida,
      totales: {
        planificados: suma("planificados"),
        aTiempo: suma("aTiempo"),
        fueraDePlazo: suma("fueraDePlazo"),
        noPublicados: suma("noPublicados"),
        porcentajeATiempo: porcentajeATiempo(suma("aTiempo"), suma("planificados")),
        solicitudesPendientes: suma("solicitudesPendientes"),
      },
    };
  }

  private async requerirSolicitudAbierta(solicitudId: string): Promise<SolicitudFila> {
    const solicitud = await this.repository.findSolicitud(solicitudId);
    if (!solicitud) throw new NotFoundException(MENSAJES_AULA_VIRTUAL.SOLICITUD_NO_ENCONTRADA);
    if (solicitud.estado !== "solicitada") {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.SOLICITUD_RESUELTA);
    }
    return solicitud;
  }

  private async exigirBimestreAbiertoDeMaterial(materialId: string): Promise<void> {
    const material = await this.ctx.requerirMaterial(materialId);
    this.ctx.exigirBimestreAbierto(await this.ctx.periodoDeMaterial(material));
  }

  private armarSolicitud(fila: SolicitudFila): SolicitudCambioResponse {
    return {
      id: fila.id,
      materialId: fila.materialId,
      materialTitulo: fila.materialTitulo,
      cursoNombre: fila.cursoNombre,
      seccionNombre: fila.seccionNombre,
      docenteNombre: fila.docenteNombre,
      fechaAnterior: fila.fechaAnterior,
      fechaSolicitada: fila.fechaSolicitada,
      motivo: fila.motivo,
      estado: fila.estado,
      solicitadoEn: fila.solicitadoEn,
      resueltoEn: fila.resueltoEn,
      respuesta: fila.respuesta,
    };
  }
}
