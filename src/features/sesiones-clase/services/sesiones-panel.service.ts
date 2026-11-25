import { BadRequestException, Injectable, Logger, Optional } from "@nestjs/common";
import { MENU_SESIONES_HOY } from "../../../common/constants";
import { AuditService } from "../../../common/services/audit.service";
import { ahoraEnColegio, minutosDelDia } from "../../marcaciones/utils";
import { NotificacionesService } from "../../notificaciones/notificaciones.service";
import {
  MENSAJES_SESION,
  ROLES_ALERTA_SESION,
  VARIABLES_ALERTA,
  mensajeAlertaMinutos,
  mensajeAlertaSalida,
} from "../constants";
import type {
  AlertaMinutosDocenteDto,
  PanelSesionesResponseDto,
  ReemplazoSesionDto,
  SesionResponseDto,
} from "../dto";
import { SesionesClaseRepository } from "../repositories";
import { apellidoDeNombre, lunesDeLaSemana, viernesDeLaSemana } from "../utils";
import { SesionesCicloService } from "./sesiones-ciclo.service";
import { SesionesContextoHelper } from "./sesiones-contexto.helper";

interface ConfiguracionAlertas {
  salidaMinutos: number | null;
  umbralDia: number | null;
  umbralSemana: number | null;
}

/**
 * Servicio especializado en el panel de seguimiento del Subdirector,
 * evaluación/notificación de alertas y reemplazo de sesiones pendientes (RF-011 HU3).
 */
@Injectable()
export class SesionesPanelService {
  private readonly logger = new Logger(SesionesPanelService.name);

  constructor(
    private readonly repository: SesionesClaseRepository,
    private readonly auditService: AuditService,
    private readonly ctx: SesionesContextoHelper,
    private readonly cicloSvc: SesionesCicloService,
    @Optional() private readonly notificacionesService?: NotificacionesService,
  ) {}

  async panelDeHoy(): Promise<PanelSesionesResponseDto> {
    const panel = await this.calcularPanel();
    await this.notificarAlertas(panel);
    return panel;
  }

  /** Tarea periódica: avisa aunque nadie tenga abierto el panel. */
  async evaluarAlertas(): Promise<void> {
    await this.notificarAlertas(await this.calcularPanel());
  }

  async asignarReemplazo(
    sesionId: string,
    dto: ReemplazoSesionDto,
    actorId: string,
    ip?: string,
  ): Promise<SesionResponseDto> {
    const sesion = await this.ctx.requireSesion(sesionId);
    if (sesion.estado !== "pendiente") {
      throw new BadRequestException(MENSAJES_SESION.REEMPLAZO_SOLO_PENDIENTE);
    }
    if (sesion.docenteId === dto.docenteId) {
      throw new BadRequestException(MENSAJES_SESION.REEMPLAZO_MISMO_DOCENTE);
    }
    await this.ctx.exigirBimestreAbierto(sesion.fecha, sesion.docenteId);
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
    return this.ctx.requireSesion(sesionId);
  }

  private async calcularPanel(): Promise<PanelSesionesResponseDto> {
    const { fecha, hora } = ahoraEnColegio();
    await this.cicloSvc.asegurarGeneracion(fecha);
    const { toleranciaIngreso } = await this.ctx.configuracion();
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
      this.logger.warn(
        `No se pudieron enviar las alertas de sesiones: ${(error as Error).message}`,
      );
    }
  }

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
}
