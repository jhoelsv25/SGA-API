import { Injectable, Logger, OnModuleInit, Optional } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { QUEUES } from "../../core/queues/queues.constants";
import { AnioLectivoCls } from "../../common/anio-lectivo";
import { AuditService } from "../../common/services/audit.service";
import { AniosAcademicosService } from "../anio-escolar/anios.service";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import { CRON_RECORDATORIO_TAREAS, JOB_RECORDATORIO_TAREAS } from "./constants";
import { AulaVirtualRepository } from "./repositories";
import {
  AulaActividadService,
  AulaCalificacionesService,
  AulaEntregasService,
  AulaInteraccionService,
  AulaMaterialesService,
  AulaRecordatoriosService,
  AulaSolicitudesService,
  AulaTareasService,
  AulaUnidadesService,
  inicializarSubServiciosAula,
  type SubServiciosAula,
} from "./services";

/**
 * Fachada cohesiva de Aula Virtual que conserva compatibilidad con consumidores
 * externos y pruebas, delegando en servicios especializados por dominio.
 */
@Injectable()
export class AulaVirtualService implements OnModuleInit {
  private readonly logger = new Logger(AulaVirtualService.name);
  private readonly subs: SubServiciosAula;

  constructor(
    repository: AulaVirtualRepository,
    aniosService: AniosAcademicosService,
    anioLectivoCls: AnioLectivoCls,
    notificaciones: NotificacionesService,
    auditService: AuditService,
    @Optional() @InjectQueue(QUEUES.AULA_VIRTUAL) private readonly cola?: Queue,
    @Optional() unidadesSvc?: AulaUnidadesService,
    @Optional() materialesSvc?: AulaMaterialesService,
    @Optional() solicitudesSvc?: AulaSolicitudesService,
    @Optional() tareasSvc?: AulaTareasService,
    @Optional() entregasSvc?: AulaEntregasService,
    @Optional() calificacionesSvc?: AulaCalificacionesService,
    @Optional() recordatoriosSvc?: AulaRecordatoriosService,
    @Optional() interaccionSvc?: AulaInteraccionService,
    @Optional() actividadSvc?: AulaActividadService,
  ) {
    this.subs = inicializarSubServiciosAula(
      repository,
      aniosService,
      anioLectivoCls,
      notificaciones,
      auditService,
      {
        unidadesSvc,
        materialesSvc,
        solicitudesSvc,
        tareasSvc,
        entregasSvc,
        calificacionesSvc,
        recordatoriosSvc,
        interaccionSvc,
        actividadSvc,
      },
    );
  }

  async onModuleInit(): Promise<void> {
    if (!this.cola) return;
    try {
      await this.cola.upsertJobScheduler(
        JOB_RECORDATORIO_TAREAS,
        { pattern: CRON_RECORDATORIO_TAREAS, tz: "America/Lima" },
        { name: JOB_RECORDATORIO_TAREAS, data: {} },
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo programar el verificador de recordatorios de tareas: ${(error as Error).message}`,
      );
    }
  }

  procesarRecordatoriosYVencimientos(): ReturnType<
    AulaRecordatoriosService["procesarRecordatoriosYVencimientos"]
  > {
    return this.subs.recordatoriosSvc.procesarRecordatoriosYVencimientos();
  }

  misCursos(...args: Parameters<AulaUnidadesService["misCursos"]>) {
    return this.subs.unidadesSvc.misCursos(...args);
  }

  obtenerAula(...args: Parameters<AulaUnidadesService["obtenerAula"]>) {
    return this.subs.unidadesSvc.obtenerAula(...args);
  }

  crearUnidad(...args: Parameters<AulaUnidadesService["crearUnidad"]>) {
    return this.subs.unidadesSvc.crearUnidad(...args);
  }

  actualizarUnidad(...args: Parameters<AulaUnidadesService["actualizarUnidad"]>) {
    return this.subs.unidadesSvc.actualizarUnidad(...args);
  }

  planificarMaterial(...args: Parameters<AulaMaterialesService["planificarMaterial"]>) {
    return this.subs.materialesSvc.planificarMaterial(...args);
  }

  actualizarMaterial(...args: Parameters<AulaMaterialesService["actualizarMaterial"]>) {
    return this.subs.materialesSvc.actualizarMaterial(...args);
  }

  publicarPlanificado(...args: Parameters<AulaMaterialesService["publicarPlanificado"]>) {
    return this.subs.materialesSvc.publicarPlanificado(...args);
  }

  publicarExtra(...args: Parameters<AulaMaterialesService["publicarExtra"]>) {
    return this.subs.materialesSvc.publicarExtra(...args);
  }

  reemplazarMaterial(...args: Parameters<AulaMaterialesService["reemplazarMaterial"]>) {
    return this.subs.materialesSvc.reemplazarMaterial(...args);
  }

  retirarMaterial(...args: Parameters<AulaMaterialesService["retirarMaterial"]>) {
    return this.subs.materialesSvc.retirarMaterial(...args);
  }

  solicitarCambioFecha(...args: Parameters<AulaSolicitudesService["solicitarCambioFecha"]>) {
    return this.subs.solicitudesSvc.solicitarCambioFecha(...args);
  }

  listarSolicitudes(...args: Parameters<AulaSolicitudesService["listarSolicitudes"]>) {
    return this.subs.solicitudesSvc.listarSolicitudes(...args);
  }

  aprobarSolicitud(...args: Parameters<AulaSolicitudesService["aprobarSolicitud"]>) {
    return this.subs.solicitudesSvc.aprobarSolicitud(...args);
  }

  rechazarSolicitud(...args: Parameters<AulaSolicitudesService["rechazarSolicitud"]>) {
    return this.subs.solicitudesSvc.rechazarSolicitud(...args);
  }

  seguimiento(...args: Parameters<AulaSolicitudesService["seguimiento"]>) {
    return this.subs.solicitudesSvc.seguimiento(...args);
  }

  crearTarea(...args: Parameters<AulaTareasService["crearTarea"]>) {
    return this.subs.tareasSvc.crearTarea(...args);
  }

  publicarTarea(...args: Parameters<AulaTareasService["publicarTarea"]>) {
    return this.subs.tareasSvc.publicarTarea(...args);
  }

  actualizarTarea(...args: Parameters<AulaTareasService["actualizarTarea"]>) {
    return this.subs.tareasSvc.actualizarTarea(...args);
  }

  cerrarTarea(...args: Parameters<AulaTareasService["cerrarTarea"]>) {
    return this.subs.tareasSvc.cerrarTarea(...args);
  }

  eliminarTarea(...args: Parameters<AulaTareasService["eliminarTarea"]>) {
    return this.subs.tareasSvc.eliminarTarea(...args);
  }

  listarTareas(...args: Parameters<AulaTareasService["listarTareas"]>) {
    return this.subs.tareasSvc.listarTareas(...args);
  }

  obtenerDetalleTarea(...args: Parameters<AulaTareasService["obtenerDetalleTarea"]>) {
    return this.subs.tareasSvc.obtenerDetalleTarea(...args);
  }

  iniciarIntentoExamen(...args: Parameters<AulaEntregasService["iniciarIntentoExamen"]>) {
    return this.subs.entregasSvc.iniciarIntentoExamen(...args);
  }

  guardarProgresoIntento(...args: Parameters<AulaEntregasService["guardarProgresoIntento"]>) {
    return this.subs.entregasSvc.guardarProgresoIntento(...args);
  }

  entregarTarea(...args: Parameters<AulaEntregasService["entregarTarea"]>) {
    return this.subs.entregasSvc.entregarTarea(...args);
  }

  listarEntregasDeTarea(...args: Parameters<AulaEntregasService["listarEntregasDeTarea"]>) {
    return this.subs.entregasSvc.listarEntregasDeTarea(...args);
  }

  calificarEntrega(...args: Parameters<AulaEntregasService["calificarEntrega"]>) {
    return this.subs.entregasSvc.calificarEntrega(...args);
  }

  calificarDirecto(...args: Parameters<AulaEntregasService["calificarDirecto"]>) {
    return this.subs.entregasSvc.calificarDirecto(...args);
  }

  obtenerLibroNotas(...args: Parameters<AulaCalificacionesService["obtenerLibroNotas"]>) {
    return this.subs.calificacionesSvc.obtenerLibroNotas(...args);
  }

  exportarExcelLibroNotas(
    ...args: Parameters<AulaCalificacionesService["exportarExcelLibroNotas"]>
  ) {
    return this.subs.calificacionesSvc.exportarExcelLibroNotas(...args);
  }

  obtenerNotasEstudiante(...args: Parameters<AulaCalificacionesService["obtenerNotasEstudiante"]>) {
    return this.subs.calificacionesSvc.obtenerNotasEstudiante(...args);
  }

  listarPublicacionesMuro(...args: Parameters<AulaInteraccionService["listarPublicacionesMuro"]>) {
    return this.subs.interaccionSvc.listarPublicacionesMuro(...args);
  }

  crearPublicacion(...args: Parameters<AulaInteraccionService["crearPublicacion"]>) {
    return this.subs.interaccionSvc.crearPublicacion(...args);
  }

  editarPublicacion(...args: Parameters<AulaInteraccionService["editarPublicacion"]>) {
    return this.subs.interaccionSvc.editarPublicacion(...args);
  }

  fijarPublicacion(...args: Parameters<AulaInteraccionService["fijarPublicacion"]>) {
    return this.subs.interaccionSvc.fijarPublicacion(...args);
  }

  listarComentarios(...args: Parameters<AulaInteraccionService["listarComentarios"]>) {
    return this.subs.interaccionSvc.listarComentarios(...args);
  }

  crearComentario(...args: Parameters<AulaInteraccionService["crearComentario"]>) {
    return this.subs.interaccionSvc.crearComentario(...args);
  }

  editarComentario(...args: Parameters<AulaInteraccionService["editarComentario"]>) {
    return this.subs.interaccionSvc.editarComentario(...args);
  }

  listarMensajesChat(...args: Parameters<AulaInteraccionService["listarMensajesChat"]>) {
    return this.subs.interaccionSvc.listarMensajesChat(...args);
  }

  enviarMensajeChat(...args: Parameters<AulaInteraccionService["enviarMensajeChat"]>) {
    return this.subs.interaccionSvc.enviarMensajeChat(...args);
  }

  obtenerMensajesNoLeidosChat(
    ...args: Parameters<AulaInteraccionService["obtenerMensajesNoLeidosChat"]>
  ) {
    return this.subs.interaccionSvc.obtenerMensajesNoLeidosChat(...args);
  }

  marcarChatLeido(...args: Parameters<AulaInteraccionService["marcarChatLeido"]>) {
    return this.subs.interaccionSvc.marcarChatLeido(...args);
  }

  ocultarContenido(...args: Parameters<AulaInteraccionService["ocultarContenido"]>) {
    return this.subs.interaccionSvc.ocultarContenido(...args);
  }

  restaurarContenido(...args: Parameters<AulaInteraccionService["restaurarContenido"]>) {
    return this.subs.interaccionSvc.restaurarContenido(...args);
  }

  listarHistorialModeracion(
    ...args: Parameters<AulaInteraccionService["listarHistorialModeracion"]>
  ) {
    return this.subs.interaccionSvc.listarHistorialModeracion(...args);
  }

  registrarActividad(...args: Parameters<AulaActividadService["registrarActividad"]>) {
    return this.subs.actividadSvc.registrarActividad(...args);
  }

  obtenerActividadMaterial(...args: Parameters<AulaActividadService["obtenerActividadMaterial"]>) {
    return this.subs.actividadSvc.obtenerActividadMaterial(...args);
  }

  obtenerActividadTarea(...args: Parameters<AulaActividadService["obtenerActividadTarea"]>) {
    return this.subs.actividadSvc.obtenerActividadTarea(...args);
  }
}
