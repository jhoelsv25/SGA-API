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
  JOB_GENERAR_SESIONES,
  MENSAJES_SESION,
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
  CredencialesKioskoDto,
  FirmaSesionResponseDto,
  FirmarIngresoDto,
  MensajeSesionResponseDto,
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
  elegirDestacada,
  evaluarIngreso,
  minutosSalidaAnticipada,
  planificarSesiones,
} from "./utils";
import { minutosDelDia } from "../marcaciones/utils";

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
    const sesion = await this.sesionDelDocente(sesionId, docente.docenteId);
    const { fecha, hora } = ahoraEnColegio();
    if (sesion.estado !== "pendiente") {
      throw new ConflictException(MENSAJES_SESION.INGRESO_YA_FIRMADO);
    }
    if (sesion.fecha !== fecha) {
      throw new BadRequestException(MENSAJES_SESION.SESION_TERMINADA);
    }
    const tema = dto.tema?.trim();
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

    const firmada = await this.repository.firmarIngreso(sesion.id, docente.docenteId, {
      hora,
      tema,
      minutosRetraso: evaluacion.minutosRetraso,
      equipoId: docente.equipoId,
    });
    if (!firmada) {
      throw new ConflictException(MENSAJES_SESION.INGRESO_YA_FIRMADO);
    }
    await this.auditService.log({
      accion: "actualizar",
      tabla: "sesiones_clase",
      registroId: sesion.id,
      valorAnterior: { estado: "pendiente" },
      valorNuevo: {
        estado: "en_curso",
        firma: "ingreso",
        hora,
        tema,
        minutosRetraso: evaluacion.minutosRetraso,
        equipoId: docente.equipoId,
      },
      direccionIp: ip,
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

  async firmarSalida(
    token: string | undefined,
    sesionId: string,
    dto: CredencialesKioskoDto,
    ip?: string,
  ): Promise<FirmaSesionResponseDto> {
    const docente = await this.identificarEnKiosko(token, dto);
    const sesion = await this.sesionDelDocente(sesionId, docente.docenteId);
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

    const firmada = await this.repository.firmarSalida(sesion.id, docente.docenteId, {
      hora,
      minutosPerdidos,
      estado,
      equipoId: docente.equipoId,
    });
    if (!firmada) {
      throw new ConflictException(MENSAJES_SESION.SALIDA_YA_FIRMADA);
    }
    await this.auditService.log({
      accion: "actualizar",
      tabla: "sesiones_clase",
      registroId: sesion.id,
      valorAnterior: { estado: "en_curso" },
      valorNuevo: { estado, firma: "salida", hora, minutosPerdidos, equipoId: docente.equipoId },
      direccionIp: ip,
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

  // --- HU3: seguimiento del subdirector -------------------------------------------

  async panelDeHoy(): Promise<PanelSesionesResponseDto> {
    const { fecha, hora } = ahoraEnColegio();
    await this.asegurarGeneracion(fecha);
    const { toleranciaIngreso } = await this.configuracion();
    const minutoActual = minutosDelDia(hora);
    const sesiones = (await this.repository.sesionesDelDia(fecha)).map((s) => ({
      ...s,
      alerta:
        s.estado === "pendiente" && minutoActual > minutosDelDia(s.horaInicio) + toleranciaIngreso,
    }));
    return { fecha, sesiones, totalAlertas: sesiones.filter((s) => s.alerta).length };
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

  async justificacionesSolicitadas(): Promise<SesionResponseDto[]> {
    return this.repository.justificacionesPorEstado("solicitada");
  }

  async aprobarJustificacion(
    sesionId: string,
    actorId: string,
    ip?: string,
  ): Promise<MensajeSesionResponseDto> {
    const sesion = await this.requireJustificacionSolicitada(sesionId);
    await this.exigirBimestreAbierto(sesion.fecha, sesion.docenteId);
    await this.repository.resolverJustificacion(sesionId, "aprobada", actorId, null);
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "sesiones_clase",
      registroId: sesionId,
      valorAnterior: { estado: sesion.estado, justificacion: "solicitada" },
      valorNuevo: { estado: "justificada", justificacion: "aprobada" },
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

  // --- HU4: mis sesiones y justificación ------------------------------------------

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
    const motivo = dto.motivo?.trim();
    if (!motivo) {
      throw new BadRequestException(MENSAJES_SESION.JUSTIFICACION_SIN_MOTIVO);
    }
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
    const documentoUrl = dto.documentoUrl?.trim() || null;
    await this.repository.solicitarJustificacion(sesionId, motivo, documentoUrl);
    await this.auditService.log({
      usuarioId: usuario.id,
      accion: "actualizar",
      tabla: "sesiones_clase",
      registroId: sesionId,
      valorNuevo: { justificacion: "solicitada", motivo, documentoUrl },
      direccionIp: ip,
    });
    return {
      mensaje: MENSAJES_SESION.JUSTIFICACION_ENVIADA,
      sesion: await this.requireSesion(sesionId),
    };
  }

  // --- privados ------------------------------------------------------------------

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
      throw new ForbiddenException(MENSAJES_SESION.NO_ES_DOCENTE);
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
