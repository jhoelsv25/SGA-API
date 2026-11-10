import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { MENU_MIS_OBSERVACIONES, MENU_OBSERVACIONES_AULA } from "../../common/constants";
import { AuditService } from "../../common/services/audit.service";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import {
  ANTICIPACION_POR_DEFECTO,
  CANTIDAD_OBJETIVO_POR_DEFECTO,
  MENSAJES_OBSERVACION,
  NIVEL_NOMBRE,
  NIVEL_ROMANO,
  nivelGrupo,
  PLAZO_DESCARGO_POR_DEFECTO,
  ROL_ADMINISTRADOR,
  VARIABLES_OBSERVACION,
} from "./constants";
import type {
  ActorObservacion,
  CalificacionFila,
  InstrumentoContenido,
  ObservacionFila,
} from "./interfaces";
import { ObservacionesAulaRepository } from "./repositories";
import { sumarDias } from "./utils";

/** Piezas que comparten los servicios de observación de aula (RF-023). */
@Injectable()
export class ObservacionesComunService {
  private readonly logger = new Logger(ObservacionesComunService.name);

  constructor(
    readonly repository: ObservacionesAulaRepository,
    readonly auditService: AuditService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async cargar(id: string): Promise<ObservacionFila> {
    const fila = await this.repository.obtener(id);
    if (!fila) throw new NotFoundException(MENSAJES_OBSERVACION.NO_ENCONTRADA);
    return fila;
  }

  /**
   * Quien trabaja una observación es su observador (o el Administrador). El docente evaluado
   * nunca participa, aunque la misma cuenta tenga otro rol con la opción (RF-023, calificación).
   */
  exigirObservador(actor: ActorObservacion, obs: ObservacionFila): void {
    if (actor.personaId === obs.docentePersonaId) {
      throw new ForbiddenException(MENSAJES_OBSERVACION.NO_TIENE_PERMISO);
    }
    if (actor.role === ROL_ADMINISTRADOR) return;
    if (actor.id !== obs.observadorUsuarioId) {
      throw new ForbiddenException(MENSAJES_OBSERVACION.NO_TIENE_PERMISO);
    }
  }

  /** Con el bimestre cerrado no se programa, reprograma, cancela ni se toman notas. */
  exigirBimestreAbierto(estadoPeriodo: string): void {
    if (estadoPeriodo === "cerrado") {
      throw new ForbiddenException(MENSAJES_OBSERVACION.BIMESTRE_CERRADO);
    }
  }

  async entero(codigo: string, porDefecto: number): Promise<number> {
    const valores = await this.repository.valoresVariables([codigo]);
    const valor = Number(valores.get(codigo));
    return Number.isFinite(valor) ? valor : porDefecto;
  }

  anticipacionMinima(): Promise<number> {
    return this.entero(VARIABLES_OBSERVACION.ANTICIPACION, ANTICIPACION_POR_DEFECTO);
  }
  cantidadObjetivo(): Promise<number> {
    return this.entero(VARIABLES_OBSERVACION.CANTIDAD_OBJETIVO, CANTIDAD_OBJETIVO_POR_DEFECTO);
  }
  plazoDescargo(): Promise<number> {
    return this.entero(VARIABLES_OBSERVACION.PLAZO_DESCARGO, PLAZO_DESCARGO_POR_DEFECTO);
  }

  /** Último día para comentar: la fecha de la retroalimentación más el plazo (días calendario). */
  async fechaLimiteComentario(obs: ObservacionFila): Promise<string | null> {
    const base = obs.retroalimentadaEn?.slice(0, 10) ?? obs.retroFecha;
    if (!base) return null;
    return sumarDias(base, await this.plazoDescargo());
  }

  async instrumentoDe(obs: ObservacionFila): Promise<InstrumentoContenido> {
    const instrumento = await this.repository.instrumento(obs.instrumentoId);
    return instrumento?.contenido ?? { desempenos: [] };
  }

  /** Calificación con la descripción del nivel elegido y la etiqueta informativa (sin nota global). */
  calificacionConDescripcion(fila: CalificacionFila, contenido: InstrumentoContenido) {
    const desempeno = contenido.desempenos.find((d) => d.numero === fila.desempeno);
    const nivel = desempeno?.niveles.find((n) => n.nivel === fila.nivel);
    return {
      desempeno: fila.desempeno,
      desempenoNombre: desempeno?.nombre ?? null,
      nivel: fila.nivel,
      nivelRomano: NIVEL_ROMANO[fila.nivel],
      nivelNombre: NIVEL_NOMBRE[fila.nivel],
      grupo: nivelGrupo(fila.nivel),
      descripcionNivel: nivel?.descripcion ?? null,
      fundamento: fila.fundamento,
      version: fila.version,
    };
  }

  async auditar(
    actor: ActorObservacion,
    accion: "crear" | "actualizar",
    tabla: string,
    registroId: string,
    valorNuevo: Record<string, unknown>,
    valorAnterior?: Record<string, unknown>,
  ): Promise<void> {
    await this.auditService.log({
      usuarioId: actor.id,
      accion,
      tabla,
      registroId,
      valorNuevo,
      valorAnterior: valorAnterior ?? null,
    });
  }

  /** Un aviso fallido no debe deshacer lo ya guardado. */
  async notificarDocente(
    docenteId: string,
    titulo: string,
    mensaje: string,
    observacionId: string,
  ): Promise<void> {
    try {
      const usuarioId = await this.repository.usuarioDeDocente(docenteId);
      if (!usuarioId) return;
      await this.notificaciones.enviar({
        usuarioId,
        titulo,
        mensaje: mensaje.slice(0, 500),
        tipo: "informacion",
        enlaceUrl: `${MENU_MIS_OBSERVACIONES}?observacionId=${observacionId}`,
      });
    } catch (error) {
      this.logger.warn(`No se pudo notificar al docente: ${(error as Error).message}`);
    }
  }

  async notificarUsuario(
    usuarioId: string,
    titulo: string,
    mensaje: string,
    tipo: "informacion" | "recordatorio",
    observacionId: string,
  ): Promise<void> {
    try {
      await this.notificaciones.enviar({
        usuarioId,
        titulo,
        mensaje: mensaje.slice(0, 500),
        tipo,
        enlaceUrl: `${MENU_OBSERVACIONES_AULA}?observacionId=${observacionId}`,
      });
    } catch (error) {
      this.logger.warn(`No se pudo notificar: ${(error as Error).message}`);
    }
  }
}
