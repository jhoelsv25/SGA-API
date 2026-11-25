import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Optional,
} from "@nestjs/common";
import { MENU_JUSTIFICACIONES_SESION } from "../../../common/constants";
import { AuditService } from "../../../common/services/audit.service";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { ahoraEnColegio } from "../../marcaciones/utils";
import { NotificacionesService } from "../../notificaciones/notificaciones.service";
import {
  MENSAJES_SESION,
  MOTIVOS_CON_AVISO_NORMA,
  MOTIVOS_JUSTIFICACION,
  MOTIVO_OTRO,
  MOTIVO_PERMISO_PERSONAL,
  ROLES_APROBADOR_JUSTIFICACION,
  VARIABLES_JUSTIFICACION,
  mensajeContadorPermisos,
  mensajeSolicitudVencida,
  mensajeTopePermisosSuperado,
} from "../constants";
import type {
  AprobarJustificacionDto,
  ContadorPermisosDto,
  DetalleSolicitudJustificacionDto,
  FiltrosBandejaJustificacionesDto,
  MensajeSesionResponseDto,
  MotivoJustificacionDto,
  RechazarJustificacionDto,
  SesionResponseDto,
  SolicitarJustificacionDto,
  SolicitudJustificacionDto,
} from "../dto";
import { SesionesClaseRepository } from "../repositories";
import { apellidoDeNombre, diasHabilesTranscurridos } from "../utils";
import { SesionesContextoHelper } from "./sesiones-contexto.helper";

/**
 * Servicio especializado en solicitud, bandeja, resolución y notificación
 * de justificaciones de sesiones no cumplidas (RF-011 HU3 & HU4).
 */
@Injectable()
export class SesionesJustificacionesService {
  constructor(
    private readonly repository: SesionesClaseRepository,
    private readonly auditService: AuditService,
    private readonly ctx: SesionesContextoHelper,
    @Optional() private readonly notificacionesService?: NotificacionesService,
  ) {}

  async avisarSolicitudesVencidas(): Promise<number> {
    if (!this.notificacionesService) return 0;
    const vencidas = await this.justificacionesSolicitadas({ vencidas: "true" });
    if (vencidas.length === 0) return 0;
    const aprobadores = [
      ...new Set(await this.repository.usuariosConRol(ROLES_APROBADOR_JUSTIFICACION)),
    ];
    let avisadas = 0;
    for (const s of vencidas) {
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
    await this.ctx.exigirBimestreAbierto(sesion.fecha, sesion.docenteId);
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
      sesion: await this.ctx.requireSesion(sesionId),
    };
  }

  async rechazarJustificacion(
    sesionId: string,
    dto: RechazarJustificacionDto,
    actorId: string,
    ip?: string,
  ): Promise<MensajeSesionResponseDto> {
    const comentario = dto.comentario?.trim();
    if (!comentario) throw new BadRequestException(MENSAJES_SESION.RECHAZO_SIN_COMENTARIO);
    const sesion = await this.requireJustificacionSolicitada(sesionId);
    await this.ctx.exigirBimestreAbierto(sesion.fecha, sesion.docenteId);
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
      sesion: await this.ctx.requireSesion(sesionId),
    };
  }

  async solicitarJustificacion(
    sesionId: string,
    dto: SolicitarJustificacionDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<MensajeSesionResponseDto> {
    const catalogo = MOTIVOS_JUSTIFICACION.find((m) => m.codigo === dto.motivo);
    if (!catalogo) throw new BadRequestException(MENSAJES_SESION.JUSTIFICACION_SIN_MOTIVO);
    const documentoUrl = dto.documentoUrl?.trim() || null;
    const observacion = dto.observacion?.trim() || null;
    if (catalogo.codigo === MOTIVO_OTRO && !observacion) {
      throw new BadRequestException(MENSAJES_SESION.JUSTIFICACION_SIN_OBSERVACION);
    }
    if (!documentoUrl && (await this.motivosConDocumento()).has(catalogo.codigo)) {
      throw new BadRequestException(MENSAJES_SESION.JUSTIFICACION_SIN_DOCUMENTO);
    }
    const motivo = catalogo.codigo === MOTIVO_OTRO ? (observacion as string) : catalogo.etiqueta;
    const docenteId = await this.ctx.docenteDelUsuario(usuario);
    const sesion = await this.ctx.requireSesion(sesionId);
    if (sesion.docenteId !== docenteId) {
      throw new ForbiddenException(MENSAJES_SESION.SESION_NO_ES_SUYA);
    }
    await this.ctx.exigirBimestreAbierto(sesion.fecha, sesion.docenteId);
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
      sesion: await this.ctx.requireSesion(sesionId),
    };
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

  private async contadorPermisos(sesion: SesionResponseDto): Promise<ContadorPermisosDto | null> {
    if (sesion.justificacion?.motivoCodigo !== MOTIVO_PERMISO_PERSONAL) return null;
    const { permisosMax } = await this.variablesJustificacion();
    const usados = (await this.repository.diasPermisoPersonal(sesion.docenteId, sesion.fecha))
      .length;
    return { usados, tope: permisosMax, mensaje: mensajeContadorPermisos(usados, permisosMax) };
  }

  private async superaTopePermisos(sesion: SesionResponseDto): Promise<{ tope: number } | null> {
    if (sesion.justificacion?.motivoCodigo !== MOTIVO_PERMISO_PERSONAL) return null;
    const { permisosMax } = await this.variablesJustificacion();
    const dias = await this.repository.diasPermisoPersonal(sesion.docenteId, sesion.fecha);
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
    const sesion = await this.ctx.requireSesion(sesionId);
    if (sesion.justificacion?.estado !== "solicitada") {
      throw new BadRequestException(MENSAJES_SESION.SIN_JUSTIFICACION_SOLICITADA);
    }
    return sesion;
  }
}
