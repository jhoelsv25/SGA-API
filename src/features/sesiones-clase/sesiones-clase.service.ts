import { sinFichaDocente } from "../../common/utils/ficha-docente.util";
import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import { Queue } from "bullmq";
import { MENU_JUSTIFICACIONES_SESION, MENU_SESIONES_HOY } from "../../common/constants";
import { AuditService } from "../../common/services/audit.service";
import { QUEUES } from "../../core/queues/queues.constants";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { AniosAcademicosService } from "../anio-escolar/anios.service";
import { CalendarioService } from "../calendario/calendario.service";
import { ConsolidadoDocenteService } from "../consolidado-docente/consolidado-docente.service";
import { EquiposService } from "../equipos/equipos.service";
import { MarcacionesService } from "../marcaciones/marcaciones.service";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import { VariablesSistemaService } from "../variables-sistema/variables-sistema.service";
import { ahoraEnColegio, diaIsoDeFecha, horaCorta } from "../marcaciones/utils";
import {
  CRON_CERRAR_SESIONES,
  CRON_GENERAR_SESIONES,
  JOB_CERRAR_SESIONES,
  CRON_AVISAR_JUSTIFICACIONES_VENCIDAS,
  CRON_EVALUAR_ALERTAS,
  JOB_AVISAR_JUSTIFICACIONES_VENCIDAS,
  JOB_EVALUAR_ALERTAS,
  JOB_GENERAR_SESIONES,
  MENSAJES_SESION,
  ROLES_ALERTA_SESION,
  ROLES_APROBADOR_JUSTIFICACION,
  mensajeSolicitudVencida,
  VARIABLES_ALERTA,
  mensajeAlertaMinutos,
  mensajeAlertaSalida,
  MOTIVOS_CON_AVISO_NORMA,
  MOTIVOS_JUSTIFICACION,
  MOTIVO_OTRO,
  MOTIVO_PERMISO_PERSONAL,
  VARIABLES_JUSTIFICACION,
  mensajeContadorPermisos,
  mensajeTopePermisosSuperado,
  OBSERVACION_SIN_SALIDA,
  PROPOSITO_EQUIPO_SESIONES,
  VARIABLES_SESION,
  mensajeAntesDeVentana,
  mensajeIngreso,
  mensajeIngresoConRetraso,
  mensajeSalidaCumplida,
  mensajeSalidaParcial,
} from "./constants";
import type {
  AlertaMinutosDocenteDto,
  AprobarJustificacionDto,
  ContadorPermisosDto,
  CredencialesKioskoDto,
  DetalleSolicitudJustificacionDto,
  FiltrosBandejaJustificacionesDto,
  MotivoJustificacionDto,
  SolicitudJustificacionDto,
  FirmaSesionResponseDto,
  FirmarIngresoDto,
  MensajeSesionResponseDto,
  MiJornadaHoyResponseDto,
  MisSesionesResponseDto,
  PanelSesionesResponseDto,
  RangoSesionesQueryDto,
  RechazarJustificacionDto,
  ReemplazoSesionDto,
  SesionResponseDto,
  SesionesKioskoResponseDto,
  SolicitarJustificacionDto,
  TemaSesionDto,
} from "./dto";
import { SesionesClaseRepository } from "./repositories";
import {
  apellidoDeNombre,
  diasHabilesTranscurridos,
  lunesDeLaSemana,
  viernesDeLaSemana,
  elegirDestacada,
  evaluarIngreso,
  minutosSalidaAnticipada,
  planificarSesiones,
} from "./utils";
import { minutosDelDia } from "../marcaciones/utils";

interface ConfiguracionAlertas {
  salidaMinutos: number | null;
  umbralDia: number | null;
  umbralSemana: number | null;
}

interface ConfiguracionSesion {
  minutosAntes: number;
  toleranciaIngreso: number;
  toleranciaSalida: number;
  salidaAutomatica: boolean;
}

interface DocenteEnKiosko {
  docenteId: string;
  nombre: string;
  equipoId: string;
}

@Injectable()
export class SesionesClaseService implements OnModuleInit {
  private readonly logger = new Logger(SesionesClaseService.name);
  /** Fechas ya generadas en este proceso: evita repetir la generación en cada consulta. */
  private readonly fechasGeneradas = new Set<string>();

  constructor(
    private readonly repository: SesionesClaseRepository,
    private readonly equiposService: EquiposService,
    private readonly marcacionesService: MarcacionesService,
    private readonly aniosService: AniosAcademicosService,
    private readonly calendarioService: CalendarioService,
    private readonly auditService: AuditService,
    @Optional()
    private readonly consolidadoService?: ConsolidadoDocenteService,
    @Optional()
    @InjectQueue(QUEUES.SESIONES_CLASE)
    private readonly cola?: Queue,
    @Optional()
    private readonly notificacionesService?: NotificacionesService,
    @Optional()
    private readonly variablesService?: VariablesSistemaService,
  ) {}

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

  // --- HU1: generación y cierre ------------------------------------------------

  /** Crea las sesiones `pendiente` del día. Idempotente: no duplica las existentes. */
  async generarDelDia(fecha = ahoraEnColegio().fecha): Promise<number> {
    const anio = await this.aniosService.anioVigente();
    if (!anio || anio.estado !== "en_curso") return 0;
    const enBimestre = anio.bimestres.some(
      (b) => b.fechaInicio.slice(0, 10) <= fecha && fecha <= b.fechaFin.slice(0, 10),
    );
    if (!enBimestre) return 0;
    if (await this.calendarioService.suspendeClasesEn(fecha)) return 0;

    const bloques = await this.repository.bloquesDelDia(anio.id, diaIsoDeFecha(fecha));
    const creadas = await this.repository.insertarSesiones(fecha, planificarSesiones(bloques));
    this.fechasGeneradas.add(fecha);
    if (creadas > 0) {
      await this.auditService.log({
        accion: "crear",
        tabla: "sesiones_clase",
        valorNuevo: { proceso: "generacion_diaria", fecha, sesiones: creadas },
      });
    }
    return creadas;
  }

  /** Cierre del día: pendiente → no_cumplida; en_curso → parcial "Sin firma de salida". */
  async cerrarDelDia(fecha = ahoraEnColegio().fecha): Promise<void> {
    const { salidaAutomatica } = await this.configuracion();
    const resultado = await this.repository.cerrarDia(
      fecha,
      salidaAutomatica,
      OBSERVACION_SIN_SALIDA,
    );
    if (resultado.noCumplidas + resultado.parciales > 0) {
      await this.auditService.log({
        accion: "actualizar",
        tabla: "sesiones_clase",
        valorNuevo: { proceso: "cierre_diario", fecha, salidaAutomatica, ...resultado },
      });

      if (resultado.docentesAfectados && resultado.docentesAfectados.length > 0) {
        await this.notificarDocentesSesionesCerradas(resultado.docentesAfectados, fecha);
      }
    }
  }

  /**
   * Notifica a los docentes si el switch 'notificacion.recordatorio_sesiones_docente'
   * está habilitado en la base de datos (RF-011 / RF-004).
   */
  private async notificarDocentesSesionesCerradas(
    docenteIds: string[],
    fecha: string,
  ): Promise<void> {
    if (!this.notificacionesService || !this.variablesService || docenteIds.length === 0) return;

    try {
      const activo = await this.variablesService.isActiva(
        "notificacion.recordatorio_sesiones_docente",
        true,
      );
      if (!activo) return;

      const userIds = await this.repository.findUsuariosDeDocentes(docenteIds);
      for (const usuarioId of userIds) {
        await this.notificacionesService.enviar({
          usuarioId,
          titulo: "Cierre de jornada escolar",
          mensaje: `Se ha registrado el cierre de tus sesiones de clase correspondientes al ${fecha}. Recuerda registrar y firmar tus sesiones a tiempo.`,
          tipo: "recordatorio",
          enlaceUrl: "/admin/mis-sesiones",
        });
      }
    } catch {
      // Silenciar para no frenar el cierre automático
    }
  }

  // --- HU2: kiosko de sesiones ---------------------------------------------------

  async sesionesEnKiosko(
    token: string | undefined,
    dto: CredencialesKioskoDto,
  ): Promise<SesionesKioskoResponseDto> {
    const docente = await this.identificarEnKiosko(token, dto);
    const { fecha, hora } = ahoraEnColegio();
    await this.asegurarGeneracion(fecha);
    const sesiones = await this.repository.sesionesDeDocente(docente.docenteId, fecha, fecha);
    const { minutosAntes } = await this.configuracion();
    return {
      docenteNombre: docente.nombre,
      sesiones,
      destacadaId: elegirDestacada(sesiones, hora, minutosAntes),
      ...(sesiones.length === 0 ? { mensaje: MENSAJES_SESION.SIN_SESIONES_HOY } : {}),
    };
  }

  async firmarIngreso(
    token: string | undefined,
    sesionId: string,
    dto: FirmarIngresoDto,
    ip?: string,
  ): Promise<FirmaSesionResponseDto> {
    const docente = await this.identificarEnKiosko(token, dto);
    return this.ejecutarFirmaIngreso({
      sesionId,
      docenteId: docente.docenteId,
      temaRaw: dto.tema,
      equipoId: docente.equipoId,
      canal: "kiosko",
      ip,
    });
  }

  async firmarSalida(
    token: string | undefined,
    sesionId: string,
    dto: CredencialesKioskoDto,
    ip?: string,
  ): Promise<FirmaSesionResponseDto> {
    const docente = await this.identificarEnKiosko(token, dto);
    return this.ejecutarFirmaSalida({
      sesionId,
      docenteId: docente.docenteId,
      equipoId: docente.equipoId,
      canal: "kiosko",
      ip,
    });
  }

  // --- HU3: seguimiento del subdirector -------------------------------------------

  async panelDeHoy(): Promise<PanelSesionesResponseDto> {
    const panel = await this.calcularPanel();
    // Mirar el panel también dispara el aviso; la clave de cada alerta evita repetirlo.
    await this.notificarAlertas(panel);
    return panel;
  }

  /** Tarea periódica: avisa aunque nadie tenga abierto el panel. */
  async evaluarAlertas(): Promise<void> {
    await this.notificarAlertas(await this.calcularPanel());
  }

  private async calcularPanel(): Promise<PanelSesionesResponseDto> {
    const { fecha, hora } = ahoraEnColegio();
    await this.asegurarGeneracion(fecha);
    const { toleranciaIngreso } = await this.configuracion();
    const alertas = await this.configuracionAlertas();
    const minutoActual = minutosDelDia(hora);
    const sesiones = (await this.repository.sesionesDelDia(fecha)).map((s) => ({
      ...s,
      alerta:
        s.estado === "pendiente" && minutoActual > minutosDelDia(s.horaInicio) + toleranciaIngreso,
      alertaSalida: this.alertaDeSalida(s, minutoActual, alertas.salidaMinutos),
    }));
    const alertasMinutos = await this.alertasDeMinutos(fecha, alertas);
    const totalAlertas =
      sesiones.filter((s) => s.alerta || s.alertaSalida).length + alertasMinutos.length;
    return { fecha, sesiones, alertasMinutos, totalAlertas };
  }

  /** Sesión `en_curso` a `alerta_salida_minutos` o menos de terminar sin firma de salida. */
  private alertaDeSalida(
    s: SesionResponseDto,
    minutoActual: number,
    anticipacion: number | null,
  ): string | null {
    if (anticipacion === null || s.estado !== "en_curso" || s.horaSalida) return null;
    const faltan = minutosDelDia(s.horaFin) - minutoActual;
    if (faltan > anticipacion) return null;
    return mensajeAlertaSalida(
      s.cursoNombre,
      s.seccionNombre,
      apellidoDeNombre(s.docenteNombre),
      Math.max(0, faltan),
    );
  }

  /** Docentes con minutos perdidos sobre el umbral del día y de la semana (0 desactiva). */
  private async alertasDeMinutos(
    fecha: string,
    cfg: ConfiguracionAlertas,
  ): Promise<AlertaMinutosDocenteDto[]> {
    const resultado: AlertaMinutosDocenteDto[] = [];
    const periodos = [
      { periodo: "dia" as const, umbral: cfg.umbralDia, desde: fecha, hasta: fecha },
      {
        periodo: "semana" as const,
        umbral: cfg.umbralSemana,
        desde: lunesDeLaSemana(fecha),
        hasta: viernesDeLaSemana(fecha),
      },
    ];
    for (const { periodo, umbral, desde, hasta } of periodos) {
      if (!umbral) continue;
      const filas = await this.repository.minutosPerdidosPorDocente(desde, hasta);
      for (const f of filas.filter((x) => x.minutos >= umbral)) {
        resultado.push({
          docenteId: f.docenteId,
          docenteNombre: f.docenteNombre,
          periodo,
          minutos: f.minutos,
          umbral,
          mensaje: mensajeAlertaMinutos(
            apellidoDeNombre(f.docenteNombre),
            f.minutos,
            umbral,
            periodo,
          ),
        });
      }
    }
    return resultado;
  }

  /**
   * Revisión diaria: avisa al aprobador de cada solicitud vencida, una sola vez por solicitud.
   * Si el sistema estuvo caído, el aviso sale al reanudarse aunque la fecha ya haya pasado (P-72).
   */
  async avisarSolicitudesVencidas(): Promise<number> {
    if (!this.notificacionesService) return 0;
    const vencidas = await this.justificacionesSolicitadas({ vencidas: "true" });
    if (vencidas.length === 0) return 0;
    const aprobadores = [
      ...new Set(await this.repository.usuariosConRol(ROLES_APROBADOR_JUSTIFICACION)),
    ];
    let avisadas = 0;
    for (const s of vencidas) {
      // La fecha de solicitud entra en la clave: una nueva solicitud de la misma sesión vuelve a avisar.
      const clave = `justificacion-vencida:${s.id}:${s.justificacion?.solicitadaEn ?? ""}`;
      if (!(await this.repository.registrarAlertaEnviada(clave))) continue;
      const [, mes, dia] = s.fecha.split("-");
      const mensaje = mensajeSolicitudVencida(
        apellidoDeNombre(s.docenteNombre),
        s.cursoNombre,
        s.seccionNombre,
        `${dia}/${mes}`,
        s.antiguedadDias,
      );
      for (const usuarioId of aprobadores) {
        await this.notificacionesService.enviar({
          usuarioId,
          titulo: "Justificación sin respuesta",
          mensaje,
          tipo: "alerta",
          enlaceUrl: MENU_JUSTIFICACIONES_SESION,
          sesionClaseId: s.id,
        });
      }
      avisadas += 1;
    }
    return avisadas;
  }

  /** Una notificación por alerta al Subdirector y al Director; la clave evita duplicarla. */
  private async notificarAlertas(panel: PanelSesionesResponseDto): Promise<void> {
    if (!this.notificacionesService) return;
    try {
      const pendientes: { clave: string; mensaje: string; sesionId: string | null }[] = [];
      for (const s of panel.sesiones) {
        if (s.alertaSalida) {
          pendientes.push({ clave: `salida:${s.id}`, mensaje: s.alertaSalida, sesionId: s.id });
        }
      }
      for (const a of panel.alertasMinutos) {
        const inicio = a.periodo === "dia" ? panel.fecha : lunesDeLaSemana(panel.fecha);
        pendientes.push({
          clave: `minutos-${a.periodo}:${a.docenteId}:${inicio}`,
          mensaje: a.mensaje,
          sesionId: null,
        });
      }
      if (pendientes.length === 0) return;
      // Una persona con dos roles recibe una sola notificación por alerta (P-72).
      const destinatarios = [...new Set(await this.repository.usuariosConRol(ROLES_ALERTA_SESION))];
      for (const p of pendientes) {
        if (!(await this.repository.registrarAlertaEnviada(p.clave))) continue;
        for (const usuarioId of destinatarios) {
          await this.notificacionesService.enviar({
            usuarioId,
            titulo: "Alerta de seguimiento docente",
            mensaje: p.mensaje,
            tipo: "alerta",
            enlaceUrl: MENU_SESIONES_HOY,
            sesionClaseId: p.sesionId,
          });
        }
      }
    } catch (error) {
      // Una falla al avisar no debe romper el panel ni la tarea periódica.
      this.logger.warn(
        `No se pudieron enviar las alertas de sesiones: ${(error as Error).message}`,
      );
    }
  }

  /** Variables de las alertas; si faltan en la base, la alerta queda desactivada (no rompe el panel). */
  private async configuracionAlertas(): Promise<ConfiguracionAlertas> {
    const valores = await this.repository.valoresVariables(Object.values(VARIABLES_ALERTA));
    const entero = (codigo: string): number | null => {
      const n = Number.parseInt(valores.get(codigo) ?? "", 10);
      return Number.isNaN(n) || n < 0 ? null : n;
    };
    return {
      salidaMinutos: entero(VARIABLES_ALERTA.SALIDA_MINUTOS),
      umbralDia: entero(VARIABLES_ALERTA.UMBRAL_DIA),
      umbralSemana: entero(VARIABLES_ALERTA.UMBRAL_SEMANA),
    };
  }

  async asignarReemplazo(
    sesionId: string,
    dto: ReemplazoSesionDto,
    actorId: string,
    ip?: string,
  ): Promise<SesionResponseDto> {
    const sesion = await this.requireSesion(sesionId);
    if (sesion.estado !== "pendiente") {
      throw new BadRequestException(MENSAJES_SESION.REEMPLAZO_SOLO_PENDIENTE);
    }
    if (sesion.docenteId === dto.docenteId) {
      throw new BadRequestException(MENSAJES_SESION.REEMPLAZO_MISMO_DOCENTE);
    }
    await this.exigirBimestreAbierto(sesion.fecha, sesion.docenteId);
    if (!(await this.repository.docenteActivo(dto.docenteId))) {
      throw new BadRequestException(MENSAJES_SESION.DOCENTE_NO_DISPONIBLE);
    }
    if (!(await this.repository.reemplazar(sesionId, dto.docenteId))) {
      throw new BadRequestException(MENSAJES_SESION.REEMPLAZO_SOLO_PENDIENTE);
    }
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "sesiones_clase",
      registroId: sesionId,
      valorAnterior: { docenteId: sesion.docenteId },
      valorNuevo: { docenteId: dto.docenteId, motivo: "reemplazo" },
      direccionIp: ip,
    });
    return this.requireSesion(sesionId);
  }

  /** Bandeja del aprobador: de la más antigua a la más reciente, con antigüedad y "vencida". */
  async justificacionesSolicitadas(
    filtros: FiltrosBandejaJustificacionesDto = {},
  ): Promise<SolicitudJustificacionDto[]> {
    const solicitadas = await this.repository.justificacionesPorEstado("solicitada");
    const conAntiguedad = await this.conAntiguedad(solicitadas);
    const soloVencidas = filtros.vencidas === "true";
    return conAntiguedad
      .filter((s) => !filtros.motivo || s.justificacion?.motivoCodigo === filtros.motivo)
      .filter((s) => !soloVencidas || s.vencida)
      .sort((a, b) => b.antiguedadDias - a.antiguedadDias);
  }

  async detalleSolicitud(sesionId: string): Promise<DetalleSolicitudJustificacionDto> {
    const sesion = await this.requireJustificacionSolicitada(sesionId);
    const [solicitud] = await this.conAntiguedad([sesion]);
    return { solicitud, permisosPersonales: await this.contadorPermisos(sesion) };
  }

  /** Catálogo de motivos con la regla del documento y el aviso de la norma. */
  async motivosJustificacion(): Promise<MotivoJustificacionDto[]> {
    const conDocumento = await this.motivosConDocumento();
    return MOTIVOS_JUSTIFICACION.map((m) => ({
      codigo: m.codigo,
      etiqueta: m.etiqueta,
      requiereDocumento: conDocumento.has(m.codigo),
      requiereObservacion: m.codigo === MOTIVO_OTRO,
      aviso: MOTIVOS_CON_AVISO_NORMA.includes(m.codigo) ? MENSAJES_SESION.AVISO_NORMA : null,
    }));
  }

  async aprobarJustificacion(
    sesionId: string,
    actorId: string,
    ip?: string,
    dto: AprobarJustificacionDto = {},
  ): Promise<MensajeSesionResponseDto> {
    const sesion = await this.requireJustificacionSolicitada(sesionId);
    await this.exigirBimestreAbierto(sesion.fecha, sesion.docenteId);
    const superaTope = await this.superaTopePermisos(sesion);
    if (superaTope && !dto.confirmarTope) {
      throw new ConflictException({
        message: mensajeTopePermisosSuperado(superaTope.tope),
        requiereConfirmacion: true,
      });
    }
    await this.repository.resolverJustificacion(sesionId, "aprobada", actorId, null);
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "sesiones_clase",
      registroId: sesionId,
      valorAnterior: { estado: sesion.estado, justificacion: "solicitada" },
      valorNuevo: {
        estado: "justificada",
        justificacion: "aprobada",
        ...(superaTope ? { topePermisosSuperado: true, tope: superaTope.tope } : {}),
      },
      direccionIp: ip,
    });
    return {
      mensaje: MENSAJES_SESION.JUSTIFICACION_APROBADA,
      sesion: await this.requireSesion(sesionId),
    };
  }

  async rechazarJustificacion(
    sesionId: string,
    dto: RechazarJustificacionDto,
    actorId: string,
    ip?: string,
  ): Promise<MensajeSesionResponseDto> {
    const comentario = dto.comentario?.trim();
    if (!comentario) {
      throw new BadRequestException(MENSAJES_SESION.RECHAZO_SIN_COMENTARIO);
    }
    const sesion = await this.requireJustificacionSolicitada(sesionId);
    await this.exigirBimestreAbierto(sesion.fecha, sesion.docenteId);
    await this.repository.resolverJustificacion(sesionId, "rechazada", actorId, comentario);
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "sesiones_clase",
      registroId: sesionId,
      valorAnterior: { justificacion: "solicitada" },
      valorNuevo: { justificacion: "rechazada", comentario },
      direccionIp: ip,
    });
    return {
      mensaje: MENSAJES_SESION.JUSTIFICACION_RECHAZADA,
      sesion: await this.requireSesion(sesionId),
    };
  }

  // --- HU4: mis sesiones, firma web y justificación --------------------------------

  async miJornadaHoy(usuario: AuthenticatedUser): Promise<MiJornadaHoyResponseDto> {
    const docenteId = await this.docenteDelUsuario(usuario);
    const { fecha, hora } = ahoraEnColegio();
    await this.asegurarGeneracion(fecha);
    const sesiones = await this.repository.sesionesDeDocente(docenteId, fecha, fecha);
    const { minutosAntes } = await this.configuracion();
    const firmaWebHabilitada = await this.firmaWebHabilitada();
    return {
      fecha,
      docenteNombre: sesiones[0]?.docenteNombre ?? usuario.username,
      destacadaId: elegirDestacada(sesiones, hora, minutosAntes),
      minutosAntes,
      firmaWebHabilitada,
      sesiones,
    };
  }

  async firmarIngresoWeb(
    sesionId: string,
    dto: TemaSesionDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<FirmaSesionResponseDto> {
    if (usuario.impersonatedBy) {
      throw new ForbiddenException(MENSAJES_SESION.FIRMA_BLOQUEADA_SIMULACION);
    }
    if (!(await this.firmaWebHabilitada())) {
      throw new ForbiddenException(MENSAJES_SESION.FIRMA_WEB_DESHABILITADA);
    }
    const docenteId = await this.docenteDelUsuario(usuario);
    return this.ejecutarFirmaIngreso({
      sesionId,
      docenteId,
      temaRaw: dto.tema,
      equipoId: null,
      actorId: usuario.id,
      canal: "web",
      ip,
    });
  }

  async firmarSalidaWeb(
    sesionId: string,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<FirmaSesionResponseDto> {
    if (usuario.impersonatedBy) {
      throw new ForbiddenException(MENSAJES_SESION.FIRMA_BLOQUEADA_SIMULACION);
    }
    if (!(await this.firmaWebHabilitada())) {
      throw new ForbiddenException(MENSAJES_SESION.FIRMA_WEB_DESHABILITADA);
    }
    const docenteId = await this.docenteDelUsuario(usuario);
    return this.ejecutarFirmaSalida({
      sesionId,
      docenteId,
      equipoId: null,
      actorId: usuario.id,
      canal: "web",
      ip,
    });
  }

  async misSesiones(
    usuario: AuthenticatedUser,
    query: RangoSesionesQueryDto,
  ): Promise<MisSesionesResponseDto> {
    if (query.hasta < query.desde) {
      throw new BadRequestException(MENSAJES_SESION.RANGO_INVALIDO);
    }
    const docenteId = await this.docenteDelUsuario(usuario);
    const { fecha: hoy } = ahoraEnColegio();
    if (hoy >= query.desde && hoy <= query.hasta) {
      await this.asegurarGeneracion(hoy);
    }
    const sesiones = await this.repository.sesionesDeDocente(docenteId, query.desde, query.hasta);
    const cuenta = (estado: string) => sesiones.filter((s) => s.estado === estado).length;
    return {
      sesiones,
      totales: {
        cumplidas: cuenta("cumplida"),
        parciales: cuenta("parcial"),
        noCumplidas: cuenta("no_cumplida"),
        justificadas: cuenta("justificada"),
        pendientes: cuenta("pendiente") + cuenta("en_curso"),
      },
    };
  }

  async corregirTema(
    sesionId: string,
    dto: TemaSesionDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<SesionResponseDto> {
    const tema = dto.tema?.trim();
    if (!tema) {
      throw new BadRequestException(MENSAJES_SESION.FALTA_TEMA);
    }
    const docenteId = await this.docenteDelUsuario(usuario);
    const sesion = await this.requireSesion(sesionId);
    if (sesion.docenteId !== docenteId) {
      throw new ForbiddenException(MENSAJES_SESION.SESION_NO_ES_SUYA);
    }
    await this.exigirBimestreAbierto(sesion.fecha, sesion.docenteId);
    if (sesion.estado !== "pendiente" && sesion.estado !== "en_curso") {
      throw new BadRequestException(MENSAJES_SESION.TEMA_CERRADO);
    }
    await this.repository.actualizarTema(sesionId, tema);
    await this.auditService.log({
      usuarioId: usuario.id,
      accion: "actualizar",
      tabla: "sesiones_clase",
      registroId: sesionId,
      valorAnterior: { tema: sesion.tema },
      valorNuevo: { tema },
      direccionIp: ip,
    });
    return this.requireSesion(sesionId);
  }

  async solicitarJustificacion(
    sesionId: string,
    dto: SolicitarJustificacionDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<MensajeSesionResponseDto> {
    const catalogo = MOTIVOS_JUSTIFICACION.find((m) => m.codigo === dto.motivo);
    if (!catalogo) {
      throw new BadRequestException(MENSAJES_SESION.JUSTIFICACION_SIN_MOTIVO);
    }
    const documentoUrl = dto.documentoUrl?.trim() || null;
    const observacion = dto.observacion?.trim() || null;
    if (catalogo.codigo === MOTIVO_OTRO && !observacion) {
      throw new BadRequestException(MENSAJES_SESION.JUSTIFICACION_SIN_OBSERVACION);
    }
    if (!documentoUrl && (await this.motivosConDocumento()).has(catalogo.codigo)) {
      throw new BadRequestException(MENSAJES_SESION.JUSTIFICACION_SIN_DOCUMENTO);
    }
    const motivo = catalogo.codigo === MOTIVO_OTRO ? (observacion as string) : catalogo.etiqueta;
    const docenteId = await this.docenteDelUsuario(usuario);
    const sesion = await this.requireSesion(sesionId);
    if (sesion.docenteId !== docenteId) {
      throw new ForbiddenException(MENSAJES_SESION.SESION_NO_ES_SUYA);
    }
    await this.exigirBimestreAbierto(sesion.fecha, sesion.docenteId);
    if (sesion.estado !== "no_cumplida") {
      throw new BadRequestException(MENSAJES_SESION.SOLO_NO_CUMPLIDA);
    }
    if (sesion.justificacion?.estado === "solicitada") {
      throw new ConflictException(MENSAJES_SESION.JUSTIFICACION_EN_CURSO);
    }
    await this.repository.solicitarJustificacion(sesionId, {
      motivoCodigo: catalogo.codigo,
      motivo,
      documentoUrl,
    });
    await this.auditService.log({
      usuarioId: usuario.id,
      accion: "actualizar",
      tabla: "sesiones_clase",
      registroId: sesionId,
      valorNuevo: {
        justificacion: "solicitada",
        motivoCodigo: catalogo.codigo,
        motivo,
        documentoUrl,
      },
      direccionIp: ip,
    });
    return {
      mensaje: MENSAJES_SESION.JUSTIFICACION_ENVIADA,
      sesion: await this.requireSesion(sesionId),
    };
  }

  // --- privados ------------------------------------------------------------------

  private async firmaWebHabilitada(): Promise<boolean> {
    if (!this.variablesService) return true;
    return this.variablesService.isActiva(VARIABLES_SESION.PERMITIR_FIRMA_WEB, true);
  }

  private async ejecutarFirmaIngreso(params: {
    sesionId: string;
    docenteId: string;
    temaRaw: string | undefined;
    equipoId: string | null;
    actorId?: string;
    canal: "kiosko" | "web";
    ip?: string;
  }): Promise<FirmaSesionResponseDto> {
    const sesion = await this.sesionDelDocente(params.sesionId, params.docenteId);
    const { fecha, hora } = ahoraEnColegio();
    if (sesion.estado !== "pendiente") {
      throw new ConflictException(MENSAJES_SESION.INGRESO_YA_FIRMADO);
    }
    if (sesion.fecha !== fecha) {
      throw new BadRequestException(MENSAJES_SESION.SESION_TERMINADA);
    }
    const tema = params.temaRaw?.trim();
    if (!tema) {
      throw new BadRequestException(MENSAJES_SESION.FALTA_TEMA);
    }

    const config = await this.configuracion();
    const evaluacion = evaluarIngreso({
      horaInicio: sesion.horaInicio,
      horaFin: sesion.horaFin,
      ahora: hora,
      minutosAntes: config.minutosAntes,
      toleranciaIngreso: config.toleranciaIngreso,
    });
    if (evaluacion.tipo === "antes") {
      throw new BadRequestException(mensajeAntesDeVentana(evaluacion.habilitaA));
    }
    if (evaluacion.tipo === "despues") {
      throw new BadRequestException(MENSAJES_SESION.SESION_TERMINADA);
    }

    const firmada = await this.repository.firmarIngreso(sesion.id, params.docenteId, {
      hora,
      tema,
      minutosRetraso: evaluacion.minutosRetraso,
      equipoId: params.equipoId,
    });
    if (!firmada) {
      throw new ConflictException(MENSAJES_SESION.INGRESO_YA_FIRMADO);
    }
    await this.auditService.log({
      ...(params.actorId ? { usuarioId: params.actorId } : {}),
      accion: "actualizar",
      tabla: "sesiones_clase",
      registroId: sesion.id,
      valorAnterior: { estado: "pendiente" },
      valorNuevo: {
        estado: "en_curso",
        firma: "ingreso",
        canal: params.canal,
        hora,
        tema,
        minutosRetraso: evaluacion.minutosRetraso,
        equipoId: params.equipoId,
      },
      direccionIp: params.ip,
    });

    const horaFirma = horaCorta(hora);
    return {
      mensaje:
        evaluacion.minutosRetraso > 0
          ? mensajeIngresoConRetraso(horaFirma, evaluacion.minutosRetraso)
          : mensajeIngreso(horaFirma, sesion.cursoNombre, sesion.seccionNombre),
      sesion: await this.requireSesion(sesion.id),
    };
  }

  private async ejecutarFirmaSalida(params: {
    sesionId: string;
    docenteId: string;
    equipoId: string | null;
    actorId?: string;
    canal: "kiosko" | "web";
    ip?: string;
  }): Promise<FirmaSesionResponseDto> {
    const sesion = await this.sesionDelDocente(params.sesionId, params.docenteId);
    if (sesion.estado === "pendiente") {
      throw new BadRequestException(MENSAJES_SESION.SALIDA_SIN_INGRESO);
    }
    if (sesion.estado !== "en_curso") {
      throw new ConflictException(MENSAJES_SESION.SALIDA_YA_FIRMADA);
    }

    const { hora } = ahoraEnColegio();
    const { toleranciaSalida } = await this.configuracion();
    const salidaAntes = minutosSalidaAnticipada(sesion.horaFin, hora, toleranciaSalida);
    const minutosPerdidos = sesion.minutosRetraso + salidaAntes;
    const estado = minutosPerdidos === 0 ? "cumplida" : "parcial";

    const firmada = await this.repository.firmarSalida(sesion.id, params.docenteId, {
      hora,
      minutosPerdidos,
      estado,
      equipoId: params.equipoId,
    });
    if (!firmada) {
      throw new ConflictException(MENSAJES_SESION.SALIDA_YA_FIRMADA);
    }
    await this.auditService.log({
      ...(params.actorId ? { usuarioId: params.actorId } : {}),
      accion: "actualizar",
      tabla: "sesiones_clase",
      registroId: sesion.id,
      valorAnterior: { estado: "en_curso" },
      valorNuevo: {
        estado,
        firma: "salida",
        canal: params.canal,
        hora,
        minutosPerdidos,
        equipoId: params.equipoId,
      },
      direccionIp: params.ip,
    });

    const horaFirma = horaCorta(hora);
    return {
      mensaje:
        estado === "cumplida"
          ? mensajeSalidaCumplida(horaFirma)
          : mensajeSalidaParcial(horaFirma, minutosPerdidos),
      sesion: await this.requireSesion(sesion.id),
    };
  }

  private async identificarEnKiosko(
    token: string | undefined,
    dto: CredencialesKioskoDto,
  ): Promise<DocenteEnKiosko> {
    const { equipo } = await this.equiposService.validarKiosko(token);
    if (!equipo || equipo.proposito !== PROPOSITO_EQUIPO_SESIONES) {
      throw new ForbiddenException(MENSAJES_SESION.EQUIPO_NO_AUTORIZADO);
    }
    const { persona } = await this.marcacionesService.autenticarCredencial(dto.codigo, dto.pin);
    if (persona.tipoPersona !== "docentes") {
      throw new ForbiddenException(MENSAJES_SESION.SOLO_DOCENTES);
    }
    const docente = await this.repository.docenteDePersona(persona.personaId);
    if (!docente?.activo) {
      throw new ForbiddenException(MENSAJES_SESION.SOLO_DOCENTES);
    }
    return { docenteId: docente.id, nombre: persona.nombreCompleto, equipoId: equipo.id };
  }

  private async sesionDelDocente(sesionId: string, docenteId: string): Promise<SesionResponseDto> {
    const sesion = await this.requireSesion(sesionId);
    if (sesion.docenteId !== docenteId) {
      throw new ForbiddenException(MENSAJES_SESION.SESION_AJENA);
    }
    await this.exigirBimestreAbierto(sesion.fecha, sesion.docenteId);
    return sesion;
  }

  private async requireSesion(sesionId: string): Promise<SesionResponseDto> {
    const sesion = await this.repository.findById(sesionId);
    if (!sesion) {
      throw new NotFoundException(MENSAJES_SESION.SESION_NO_ENCONTRADA);
    }
    return sesion;
  }

  private async conAntiguedad(sesiones: SesionResponseDto[]): Promise<SolicitudJustificacionDto[]> {
    if (sesiones.length === 0) return [];
    const hoy = ahoraEnColegio().fecha;
    const desdes = sesiones.map((s) => (s.justificacion?.solicitadaEn ?? hoy).slice(0, 10));
    const masAntigua = desdes.reduce((a, b) => (a < b ? a : b));
    const sinClases = new Set(await this.repository.diasSinClases(masAntigua, hoy));
    const { avisoDias } = await this.variablesJustificacion();
    return sesiones.map((s, i) => {
      const antiguedadDias = diasHabilesTranscurridos(desdes[i], hoy, sinClases);
      return { ...s, antiguedadDias, vencida: antiguedadDias > avisoDias };
    });
  }

  /** Contador del año lectivo; solo aplica al motivo «Permiso personal». */
  private async contadorPermisos(sesion: SesionResponseDto): Promise<ContadorPermisosDto | null> {
    if (sesion.justificacion?.motivoCodigo !== MOTIVO_PERMISO_PERSONAL) return null;
    const { permisosMax } = await this.variablesJustificacion();
    const usados = (await this.repository.diasPermisoPersonal(sesion.docenteId, sesion.fecha))
      .length;
    return { usados, tope: permisosMax, mensaje: mensajeContadorPermisos(usados, permisosMax) };
  }

  /** Si aprobar esta sesión haría pasar el tope de días de permiso personal del año. */
  private async superaTopePermisos(sesion: SesionResponseDto): Promise<{ tope: number } | null> {
    if (sesion.justificacion?.motivoCodigo !== MOTIVO_PERMISO_PERSONAL) return null;
    const { permisosMax } = await this.variablesJustificacion();
    const dias = await this.repository.diasPermisoPersonal(sesion.docenteId, sesion.fecha);
    // Varias sesiones del mismo día cuentan un solo día.
    const total = dias.includes(sesion.fecha) ? dias.length : dias.length + 1;
    return total > permisosMax ? { tope: permisosMax } : null;
  }

  private async motivosConDocumento(): Promise<Set<string>> {
    const { motivosConDocumento } = await this.variablesJustificacion();
    return motivosConDocumento;
  }

  private async variablesJustificacion(): Promise<{
    avisoDias: number;
    permisosMax: number;
    motivosConDocumento: Set<string>;
  }> {
    const valores = await this.repository.valoresVariables(Object.values(VARIABLES_JUSTIFICACION));
    const leer = (codigo: string): string => {
      const valor = valores.get(codigo);
      if (valor === undefined) {
        throw new InternalServerErrorException(MENSAJES_SESION.VARIABLE_FALTANTE(codigo));
      }
      return valor;
    };
    const entero = (codigo: string): number => {
      const n = Number.parseInt(leer(codigo), 10);
      if (Number.isNaN(n) || n < 0) {
        throw new InternalServerErrorException(MENSAJES_SESION.VARIABLE_FALTANTE(codigo));
      }
      return n;
    };
    return {
      avisoDias: entero(VARIABLES_JUSTIFICACION.AVISO_DIAS),
      permisosMax: entero(VARIABLES_JUSTIFICACION.PERMISOS_MAX_ANIO),
      motivosConDocumento: new Set(
        leer(VARIABLES_JUSTIFICACION.MOTIVOS_CON_DOCUMENTO)
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
      ),
    };
  }

  private async requireJustificacionSolicitada(sesionId: string): Promise<SesionResponseDto> {
    const sesion = await this.requireSesion(sesionId);
    if (sesion.justificacion?.estado !== "solicitada") {
      throw new BadRequestException(MENSAJES_SESION.SIN_JUSTIFICACION_SOLICITADA);
    }
    return sesion;
  }

  private async exigirBimestreAbierto(fecha: string, docenteId?: string): Promise<void> {
    if (await this.aniosService.sesionesBloqueadasEn(fecha)) {
      throw new ForbiddenException(MENSAJES_SESION.BIMESTRE_CERRADO);
    }
    if (docenteId && this.consolidadoService) {
      await this.consolidadoService.validarModificacionPermitida(docenteId, fecha);
    }
  }

  private async docenteDelUsuario(usuario: AuthenticatedUser): Promise<string> {
    const docente = await this.repository.docenteDePersona(usuario.personaId);
    if (!docente) {
      throw sinFichaDocente();
    }
    return docente.id;
  }

  private async asegurarGeneracion(fecha: string): Promise<void> {
    if (this.fechasGeneradas.has(fecha)) return;
    await this.generarDelDia(fecha);
    this.fechasGeneradas.add(fecha);
  }

  /** Lee de las variables de sistema; ningún valor de negocio va escrito en el código. */
  private async configuracion(): Promise<ConfiguracionSesion> {
    const codigos = Object.values(VARIABLES_SESION);
    const valores = await this.repository.valoresVariables(codigos);
    const entero = (codigo: string): number => {
      const valor = Number.parseInt(valores.get(codigo) ?? "", 10);
      if (Number.isNaN(valor) || valor < 0) {
        throw new InternalServerErrorException(MENSAJES_SESION.VARIABLE_FALTANTE(codigo));
      }
      return valor;
    };
    const booleano = valores.get(VARIABLES_SESION.SALIDA_AUTOMATICA);
    if (booleano === undefined) {
      throw new InternalServerErrorException(
        MENSAJES_SESION.VARIABLE_FALTANTE(VARIABLES_SESION.SALIDA_AUTOMATICA),
      );
    }
    return {
      minutosAntes: entero(VARIABLES_SESION.MINUTOS_ANTES_FIRMA_INGRESO),
      toleranciaIngreso: entero(VARIABLES_SESION.TOLERANCIA_INGRESO),
      toleranciaSalida: entero(VARIABLES_SESION.TOLERANCIA_SALIDA),
      salidaAutomatica: booleano.trim().toLowerCase() === "true",
    };
  }
}
