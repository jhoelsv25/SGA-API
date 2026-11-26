import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, OnModuleInit, Optional } from "@nestjs/common";
import { Queue } from "bullmq";
import { AuditService } from "../../common/services/audit.service";
import { CacheService } from "../../core/cache/cache.service";
import { IaService } from "../../core/ia/ia.service";
import { QUEUES } from "../../core/queues/queues.constants";
import { AniosAcademicosService } from "../anio-escolar/anios.service";
import { AulaVirtualService } from "../aula-virtual/aula-virtual.service";
import { CalendarioService } from "../calendario/calendario.service";
import { ConsolidadoDocenteService } from "../consolidado-docente/services/consolidado-docente.service";
import { EquiposService } from "../equipos/equipos.service";
import { MarcacionesService } from "../marcaciones/services/marcaciones.service";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import { PlanificacionSesionesService } from "../planificacion-sesiones/services/planificacion-sesiones.service";
import { VariablesSistemaService } from "../variables-sistema/variables-sistema.service";
import {
  CRON_AVISAR_JUSTIFICACIONES_VENCIDAS,
  CRON_CERRAR_SESIONES,
  CRON_EVALUAR_ALERTAS,
  CRON_GENERAR_SESIONES,
  JOB_AVISAR_JUSTIFICACIONES_VENCIDAS,
  JOB_CERRAR_SESIONES,
  JOB_EVALUAR_ALERTAS,
  JOB_GENERAR_SESIONES,
} from "./constants";
import { SesionesClaseRepository } from "./repositories";
import {
  SesionesCicloService,
  SesionesFirmasService,
  SesionesIaService,
  SesionesJustificacionesService,
  SesionesPanelService,
  inicializarSubServiciosSesiones,
  type SubServiciosSesiones,
} from "./services";

/**
 * Fachada cohesiva de Sesiones de Clase que conserva compatibilidad con controladores,
 * colas y pruebas unitarias, delegando en servicios especializados por dominio.
 */
@Injectable()
export class SesionesClaseService implements OnModuleInit {
  private readonly logger = new Logger(SesionesClaseService.name);
  private readonly subs: SubServiciosSesiones;

  constructor(
    repository: SesionesClaseRepository,
    equiposService: EquiposService,
    marcacionesService: MarcacionesService,
    aniosService: AniosAcademicosService,
    calendarioService: CalendarioService,
    auditService: AuditService,
    @Optional() consolidadoService?: ConsolidadoDocenteService,
    @Optional() @InjectQueue(QUEUES.SESIONES_CLASE) private readonly cola?: Queue,
    @Optional() notificacionesService?: NotificacionesService,
    @Optional() variablesService?: VariablesSistemaService,
    @Optional() aulaVirtualService?: AulaVirtualService,
    @Optional() iaService?: IaService,
    @Optional() cacheService?: CacheService,
    @Optional() planificacionesService?: PlanificacionSesionesService,
    @Optional() cicloSvc?: SesionesCicloService,
    @Optional() iaSvc?: SesionesIaService,
    @Optional() firmasSvc?: SesionesFirmasService,
    @Optional() panelSvc?: SesionesPanelService,
    @Optional() justificacionesSvc?: SesionesJustificacionesService,
  ) {
    this.subs = inicializarSubServiciosSesiones(
      {
        repository,
        equiposService,
        marcacionesService,
        aniosService,
        calendarioService,
        auditService,
        consolidadoService,
        notificacionesService,
        variablesService,
        aulaVirtualService,
        iaService,
        cacheService,
        planificacionesService,
      },
      { cicloSvc, iaSvc, firmasSvc, panelSvc, justificacionesSvc },
    );
  }

  async onModuleInit(): Promise<void> {
    if (!this.cola) return;
    try {
      await this.cola.upsertJobScheduler(
        JOB_GENERAR_SESIONES,
        { pattern: CRON_GENERAR_SESIONES, tz: "America/Lima" },
        { name: JOB_GENERAR_SESIONES, data: {} },
      );
      await this.cola.upsertJobScheduler(
        JOB_AVISAR_JUSTIFICACIONES_VENCIDAS,
        { pattern: CRON_AVISAR_JUSTIFICACIONES_VENCIDAS, tz: "America/Lima" },
        { name: JOB_AVISAR_JUSTIFICACIONES_VENCIDAS, data: {} },
      );
      await this.cola.upsertJobScheduler(
        JOB_EVALUAR_ALERTAS,
        { pattern: CRON_EVALUAR_ALERTAS, tz: "America/Lima" },
        { name: JOB_EVALUAR_ALERTAS, data: {} },
      );
      await this.cola.upsertJobScheduler(
        JOB_CERRAR_SESIONES,
        { pattern: CRON_CERRAR_SESIONES, tz: "America/Lima" },
        { name: JOB_CERRAR_SESIONES, data: {} },
      );
    } catch (error) {
      this.logger.warn(`No se pudieron programar las sesiones: ${(error as Error).message}`);
    }
  }

  generarDelDia(...args: Parameters<SesionesCicloService["generarDelDia"]>) {
    return this.subs.cicloSvc.generarDelDia(...args);
  }

  cerrarDelDia(...args: Parameters<SesionesCicloService["cerrarDelDia"]>) {
    return this.subs.cicloSvc.cerrarDelDia(...args);
  }

  sesionesEnKiosko(...args: Parameters<SesionesFirmasService["sesionesEnKiosko"]>) {
    return this.subs.firmasSvc.sesionesEnKiosko(...args);
  }

  firmarIngreso(...args: Parameters<SesionesFirmasService["firmarIngreso"]>) {
    return this.subs.firmasSvc.firmarIngreso(...args);
  }

  firmarSalida(...args: Parameters<SesionesFirmasService["firmarSalida"]>) {
    return this.subs.firmasSvc.firmarSalida(...args);
  }

  panelDeHoy() {
    return this.subs.panelSvc.panelDeHoy();
  }

  evaluarAlertas() {
    return this.subs.panelSvc.evaluarAlertas();
  }

  avisarSolicitudesVencidas() {
    return this.subs.justificacionesSvc.avisarSolicitudesVencidas();
  }

  asignarReemplazo(...args: Parameters<SesionesPanelService["asignarReemplazo"]>) {
    return this.subs.panelSvc.asignarReemplazo(...args);
  }

  justificacionesSolicitadas(
    ...args: Parameters<SesionesJustificacionesService["justificacionesSolicitadas"]>
  ) {
    return this.subs.justificacionesSvc.justificacionesSolicitadas(...args);
  }

  detalleSolicitud(...args: Parameters<SesionesJustificacionesService["detalleSolicitud"]>) {
    return this.subs.justificacionesSvc.detalleSolicitud(...args);
  }

  motivosJustificacion() {
    return this.subs.justificacionesSvc.motivosJustificacion();
  }

  aprobarJustificacion(
    ...args: Parameters<SesionesJustificacionesService["aprobarJustificacion"]>
  ) {
    return this.subs.justificacionesSvc.aprobarJustificacion(...args);
  }

  rechazarJustificacion(
    ...args: Parameters<SesionesJustificacionesService["rechazarJustificacion"]>
  ) {
    return this.subs.justificacionesSvc.rechazarJustificacion(...args);
  }

  miJornadaHoy(...args: Parameters<SesionesFirmasService["miJornadaHoy"]>) {
    return this.subs.firmasSvc.miJornadaHoy(...args);
  }

  firmarIngresoWeb(...args: Parameters<SesionesFirmasService["firmarIngresoWeb"]>) {
    return this.subs.firmasSvc.firmarIngresoWeb(...args);
  }

  sugerirTema(...args: Parameters<SesionesIaService["sugerirTema"]>) {
    return this.subs.iaSvc.sugerirTema(...args);
  }

  firmarSalidaWeb(...args: Parameters<SesionesFirmasService["firmarSalidaWeb"]>) {
    return this.subs.firmasSvc.firmarSalidaWeb(...args);
  }

  misSesiones(...args: Parameters<SesionesFirmasService["misSesiones"]>) {
    return this.subs.firmasSvc.misSesiones(...args);
  }

  corregirTema(...args: Parameters<SesionesFirmasService["corregirTema"]>) {
    return this.subs.firmasSvc.corregirTema(...args);
  }

  solicitarJustificacion(
    ...args: Parameters<SesionesJustificacionesService["solicitarJustificacion"]>
  ) {
    return this.subs.justificacionesSvc.solicitarJustificacion(...args);
  }
}
