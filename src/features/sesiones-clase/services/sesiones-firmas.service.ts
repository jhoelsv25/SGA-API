import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  Optional,
} from "@nestjs/common";
import { AuditService } from "../../../common/services/audit.service";
import { CacheService } from "../../../core/cache/cache.service";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { EquiposService } from "../../equipos/equipos.service";
import { MarcacionesService } from "../../marcaciones/services/marcaciones.service";
import { ahoraEnColegio, horaCorta } from "../../marcaciones/utils";
import { PlanificacionSesionesService } from "../../planificacion-sesiones/services/planificacion-sesiones.service";
import {
  MENSAJES_SESION,
  PROPOSITO_EQUIPO_SESIONES,
  mensajeAntesDeVentana,
  mensajeIngreso,
  mensajeIngresoConRetraso,
  mensajeSalidaCumplida,
  mensajeSalidaParcial,
} from "../constants";
import type {
  CredencialesKioskoDto,
  FirmaSesionResponseDto,
  FirmarIngresoDto,
  MiJornadaHoyResponseDto,
  MisSesionesResponseDto,
  RangoSesionesQueryDto,
  SesionResponseDto,
  SesionesKioskoResponseDto,
  TemaSesionDto,
} from "../dto";
import type { TemaRecienteCurso } from "../interfaces";
import { SesionesClaseRepository } from "../repositories";
import { elegirDestacada, evaluarIngreso, minutosSalidaAnticipada } from "../utils";
import { SesionesCicloService } from "./sesiones-ciclo.service";
import { SesionesContextoHelper } from "./sesiones-contexto.helper";
import { SesionesIaService } from "./sesiones-ia.service";

interface DocenteEnKiosko {
  docenteId: string;
  nombre: string;
  equipoId: string;
}

/**
 * Servicio de dominio para jornada docente, firma en kiosko y web,
 * consulta de sesiones propias y corrección de tema (RF-011 HU2 & HU4).
 */
@Injectable()
export class SesionesFirmasService {
  private readonly logger = new Logger(SesionesFirmasService.name);

  constructor(
    private readonly repository: SesionesClaseRepository,
    private readonly equiposService: EquiposService,
    private readonly marcacionesService: MarcacionesService,
    private readonly auditService: AuditService,
    private readonly ctx: SesionesContextoHelper,
    private readonly cicloSvc: SesionesCicloService,
    private readonly iaSvc: SesionesIaService,
    @Optional() private readonly cacheService?: CacheService,
    @Optional() private readonly planificacionesService?: PlanificacionSesionesService,
  ) {}

  async sesionesEnKiosko(
    token: string | undefined,
    dto: CredencialesKioskoDto,
  ): Promise<SesionesKioskoResponseDto> {
    const docente = await this.identificarEnKiosko(token, dto);
    const { fecha, hora } = ahoraEnColegio();
    await this.cicloSvc.asegurarGeneracion(fecha);
    const sesiones = await this.repository.sesionesDeDocente(docente.docenteId, fecha, fecha);
    const { minutosAntes } = await this.ctx.configuracion();
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

  async miJornadaHoy(usuario: AuthenticatedUser): Promise<MiJornadaHoyResponseDto> {
    const docenteId = await this.ctx.docenteDelUsuario(usuario);
    const { fecha, hora } = ahoraEnColegio();
    await this.cicloSvc.asegurarGeneracion(fecha);
    const sesiones = await this.repository.sesionesDeDocente(docenteId, fecha, fecha);
    const claveTemas = `sesiones:ultimos-temas:${docenteId}:${fecha}`;
    const temasEnCache = await this.cacheService?.get<TemaRecienteCurso[]>(claveTemas);
    const temasRecientes =
      temasEnCache ?? (await this.repository.ultimosTemasDocente(docenteId, fecha));
    if (!temasEnCache && temasRecientes.length > 0) {
      await this.cacheService?.set(claveTemas, temasRecientes, 3600);
    }
    const { minutosAntes } = await this.ctx.configuracion();
    const firmaWebHabilitada = await this.ctx.firmaWebHabilitada();
    return {
      fecha,
      docenteNombre: sesiones[0]?.docenteNombre ?? usuario.username,
      destacadaId: elegirDestacada(sesiones, hora, minutosAntes),
      minutosAntes,
      firmaWebHabilitada,
      sesiones,
      temasRecientes,
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
    if (!(await this.ctx.firmaWebHabilitada())) {
      throw new ForbiddenException(MENSAJES_SESION.FIRMA_WEB_DESHABILITADA);
    }
    const docenteId = await this.ctx.docenteDelUsuario(usuario);
    const respuesta = await this.ejecutarFirmaIngreso({
      sesionId,
      docenteId,
      temaRaw: dto.tema,
      equipoId: null,
      actorId: usuario.id,
      canal: "web",
      ip,
    });
    if (dto.crearEnAulaVirtual) {
      const aulaVirtualCreada = await this.iaSvc.crearBorradorEnAulaVirtual(
        respuesta.sesion,
        dto.tema.trim(),
        usuario,
        ip,
      );
      return { ...respuesta, aulaVirtualCreada };
    }
    return respuesta;
  }

  async firmarSalidaWeb(
    sesionId: string,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<FirmaSesionResponseDto> {
    if (usuario.impersonatedBy) {
      throw new ForbiddenException(MENSAJES_SESION.FIRMA_BLOQUEADA_SIMULACION);
    }
    if (!(await this.ctx.firmaWebHabilitada())) {
      throw new ForbiddenException(MENSAJES_SESION.FIRMA_WEB_DESHABILITADA);
    }
    const docenteId = await this.ctx.docenteDelUsuario(usuario);
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
    const docenteId = await this.ctx.docenteDelUsuario(usuario);
    const { fecha: hoy } = ahoraEnColegio();
    if (hoy >= query.desde && hoy <= query.hasta) {
      await this.cicloSvc.asegurarGeneracion(hoy);
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
    if (!tema) throw new BadRequestException(MENSAJES_SESION.FALTA_TEMA);
    const docenteId = await this.ctx.docenteDelUsuario(usuario);
    const sesion = await this.ctx.requireSesion(sesionId);
    if (sesion.docenteId !== docenteId) {
      throw new ForbiddenException(MENSAJES_SESION.SESION_NO_ES_SUYA);
    }
    await this.ctx.exigirBimestreAbierto(sesion.fecha, sesion.docenteId);
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
    return this.ctx.requireSesion(sesionId);
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
    const sesion = await this.ctx.sesionDelDocente(params.sesionId, params.docenteId);
    const { fecha, hora } = ahoraEnColegio();
    if (sesion.estado !== "pendiente")
      throw new ConflictException(MENSAJES_SESION.INGRESO_YA_FIRMADO);
    if (sesion.fecha !== fecha) throw new BadRequestException(MENSAJES_SESION.SESION_TERMINADA);

    const tema =
      params.temaRaw?.trim() ||
      (await this.planificacionesService?.tituloDeSesion(sesion.id)) ||
      "";
    if (!tema) throw new BadRequestException(MENSAJES_SESION.FALTA_TEMA);

    const config = await this.ctx.configuracion();
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
    if (!firmada) throw new ConflictException(MENSAJES_SESION.INGRESO_YA_FIRMADO);

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

    try {
      await this.planificacionesService?.vincularConSesion(sesion.id);
    } catch (error) {
      this.logger.warn(`No se pudo vincular la planificación: ${(error as Error).message}`);
    }

    const horaFirma = horaCorta(hora);
    return {
      mensaje:
        evaluacion.minutosRetraso > 0
          ? mensajeIngresoConRetraso(horaFirma, evaluacion.minutosRetraso)
          : mensajeIngreso(horaFirma, sesion.cursoNombre, sesion.seccionNombre),
      sesion: await this.ctx.requireSesion(sesion.id),
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
    const sesion = await this.ctx.sesionDelDocente(params.sesionId, params.docenteId);
    if (sesion.estado === "pendiente") {
      throw new BadRequestException(MENSAJES_SESION.SALIDA_SIN_INGRESO);
    }
    if (sesion.estado !== "en_curso") {
      throw new ConflictException(MENSAJES_SESION.SALIDA_YA_FIRMADA);
    }

    const { hora } = ahoraEnColegio();
    const { toleranciaSalida } = await this.ctx.configuracion();
    const salidaAntes = minutosSalidaAnticipada(sesion.horaFin, hora, toleranciaSalida);
    const minutosPerdidos = sesion.minutosRetraso + salidaAntes;
    const estado = minutosPerdidos === 0 ? "cumplida" : "parcial";

    const firmada = await this.repository.firmarSalida(sesion.id, params.docenteId, {
      hora,
      minutosPerdidos,
      estado,
      equipoId: params.equipoId,
    });
    if (!firmada) throw new ConflictException(MENSAJES_SESION.SALIDA_YA_FIRMADA);

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
      sesion: await this.ctx.requireSesion(sesion.id),
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
}
