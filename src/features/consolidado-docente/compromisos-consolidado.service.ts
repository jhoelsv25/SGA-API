import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import type { Queue } from "bullmq";
import { AuditService } from "../../common/services/audit.service";
import { QUEUES } from "../../core/queues/queues.constants";
import { ahoraEnColegio } from "../marcaciones/utils";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import {
  CRON_RECORDAR_COMPROMISOS,
  DECISIONES_CON_COMPROMISO,
  JOB_RECORDAR_COMPROMISOS,
  MENSAJES_CONSOLIDADO,
  ROL_DIRECTOR,
  mensajeCompromisoCerrado,
  mensajeCompromisoRegistrado,
  mensajeRecordatorioCompromiso,
} from "./constants";
import type {
  AnularCompromisoDto,
  CerrarCompromisoDto,
  RegistrarCompromisoDto,
  ReprogramarCompromisoDto,
} from "./dto";
import type { ActorConsolidado, CompromisoItem, DetalleCompromisoResponse } from "./interfaces";
import { CompromisosConsolidadoRepository, ConsolidadoDocenteRepository } from "./repositories";
import type { FilaCompromiso } from "./repositories/compromisos-consolidado.repository";
import { fechaDdMmYyyy } from "./utils";

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Compromisos de mejora del consolidado, con seguimiento (RF-013 V2, HU5). */
@Injectable()
export class CompromisosConsolidadoService implements OnModuleInit {
  private readonly logger = new Logger(CompromisosConsolidadoService.name);

  constructor(
    private readonly repository: CompromisosConsolidadoRepository,
    private readonly consolidados: ConsolidadoDocenteRepository,
    private readonly auditService: AuditService,
    private readonly notificacionesService: NotificacionesService,
    @Optional()
    @InjectQueue(QUEUES.CONSOLIDADO_DOCENTE)
    private readonly cola?: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.cola) return;
    try {
      await this.cola.upsertJobScheduler(
        JOB_RECORDAR_COMPROMISOS,
        { pattern: CRON_RECORDAR_COMPROMISOS, tz: "America/Lima" },
        { name: JOB_RECORDAR_COMPROMISOS, data: {} },
      );
    } catch (error) {
      this.logger.warn(`No se pudo programar el recordatorio: ${(error as Error).message}`);
    }
  }

  private exigirDirectorOAdmin(actor: ActorConsolidado) {
    if (actor.role !== "Director" && actor.role !== "Administrador") {
      throw new ForbiddenException(MENSAJES_CONSOLIDADO.NO_TIENE_PERMISO);
    }
  }

  private conVencimiento(fila: FilaCompromiso, hoy = ahoraEnColegio().fecha): CompromisoItem {
    const { docenteApellido: _apellido, periodoId: _periodo, ...resto } = fila;
    return {
      ...resto,
      vencido: fila.estado === "pendiente" && !fila.anulado && fila.fechaRevision < hoy,
    };
  }

  private async exigirPropioSiEsDocente(actor: ActorConsolidado, docenteId: string) {
    if (actor.role !== "Docente") return;
    const docente = await this.consolidados.obtenerDocenteDePersona(actor.personaId);
    if (!docente || docente.id !== docenteId) {
      throw new ForbiddenException(MENSAJES_CONSOLIDADO.NO_TIENE_PERMISO);
    }
  }

  private exigirFechaDeRevision(fecha: string) {
    if (!FECHA_ISO.test(fecha) || fecha < ahoraEnColegio().fecha) {
      throw new BadRequestException(MENSAJES_CONSOLIDADO.COMPROMISO_FECHA_PASADA);
    }
  }

  private async obtenerVigente(compromisoId: string): Promise<FilaCompromiso> {
    const fila = await this.repository.obtenerVigente(compromisoId);
    if (!fila) throw new NotFoundException(MENSAJES_CONSOLIDADO.COMPROMISO_NO_ENCONTRADO);
    return fila;
  }

  async registrar(dto: RegistrarCompromisoDto, actor: ActorConsolidado) {
    this.exigirDirectorOAdmin(actor);
    const consolidado = await this.consolidados.obtenerConsolidadoPorId(dto.consolidadoId);
    if (!consolidado) throw new NotFoundException(MENSAJES_CONSOLIDADO.NO_ENCONTRADO);
    if (!DECISIONES_CON_COMPROMISO.includes(consolidado.decision)) {
      throw new BadRequestException(MENSAJES_CONSOLIDADO.COMPROMISO_DECISION_NO_ADMITE);
    }
    const descripcion = dto.descripcion?.trim();
    if (!descripcion) {
      throw new BadRequestException(MENSAJES_CONSOLIDADO.COMPROMISO_SIN_DESCRIPCION);
    }
    this.exigirFechaDeRevision(dto.fechaRevision);

    const creado = await this.repository.crear({
      consolidadoId: consolidado.id,
      docenteId: consolidado.docenteId,
      descripcion,
      fechaRevision: dto.fechaRevision,
      creadoPorId: actor.id,
    });
    await this.auditService.log({
      usuarioId: actor.id,
      accion: "crear",
      tabla: "compromisos_consolidado",
      registroId: creado.id,
      valorNuevo: {
        compromisoId: creado.compromisoId,
        descripcion,
        fechaRevision: dto.fechaRevision,
      },
    });
    await this.notificarDocente(
      creado.docenteId,
      "Nuevo compromiso de mejora",
      `Se registró un compromiso: ${descripcion}. Fecha de revisión: ${fechaDdMmYyyy(dto.fechaRevision)}.`,
      consolidado.periodoId,
    );
    return {
      compromiso: this.conVencimiento(creado),
      mensaje: mensajeCompromisoRegistrado(fechaDdMmYyyy(dto.fechaRevision)),
    };
  }

  /** Compromisos vigentes del docente en el bimestre del consolidado. */
  async listar(consolidadoId: string, actor: ActorConsolidado): Promise<CompromisoItem[]> {
    const consolidado = await this.consolidados.obtenerConsolidadoPorId(consolidadoId);
    if (!consolidado) throw new NotFoundException(MENSAJES_CONSOLIDADO.NO_ENCONTRADO);
    await this.exigirPropioSiEsDocente(actor, consolidado.docenteId);
    const filas = await this.repository.listarVigentesDelConsolidado(
      consolidado.docenteId,
      consolidado.periodoId,
    );
    const hoy = ahoraEnColegio().fecha;
    return filas.map((f) => this.conVencimiento(f, hoy));
  }

  /** Detalle; el historial de versiones solo lo ve quien no es docente. */
  async detalle(compromisoId: string, actor: ActorConsolidado): Promise<DetalleCompromisoResponse> {
    const vigente = await this.obtenerVigente(compromisoId);
    await this.exigirPropioSiEsDocente(actor, vigente.docenteId);
    const hoy = ahoraEnColegio().fecha;
    const historial =
      actor.role === "Docente"
        ? []
        : (await this.repository.historial(compromisoId)).map((f) => this.conVencimiento(f, hoy));
    return { compromiso: this.conVencimiento(vigente, hoy), historial };
  }

  async cerrar(compromisoId: string, dto: CerrarCompromisoDto, actor: ActorConsolidado) {
    this.exigirDirectorOAdmin(actor);
    const actual = await this.obtenerVigente(compromisoId);
    if (actual.anulado) throw new BadRequestException(MENSAJES_CONSOLIDADO.COMPROMISO_ANULADO);
    if (actual.estado !== "pendiente") {
      throw new ConflictException(MENSAJES_CONSOLIDADO.COMPROMISO_CERRADO);
    }
    const observacion = dto.observacion?.trim();
    if (!observacion) {
      throw new BadRequestException(MENSAJES_CONSOLIDADO.COMPROMISO_CIERRE_SIN_OBSERVACION);
    }
    await this.repository.cerrar(actual.id, dto.resultado, observacion, actor.id);
    await this.auditService.log({
      usuarioId: actor.id,
      accion: "actualizar",
      tabla: "compromisos_consolidado",
      registroId: actual.id,
      valorAnterior: { estado: actual.estado },
      valorNuevo: { estado: dto.resultado, observacion },
    });
    await this.notificarDocente(
      actual.docenteId,
      "Compromiso de mejora cerrado",
      `${mensajeCompromisoCerrado(dto.resultado)} ${observacion}`,
      actual.periodoId,
    );
    return {
      compromiso: await this.compromisoActualizado(compromisoId),
      mensaje: mensajeCompromisoCerrado(dto.resultado),
    };
  }

  /** Cambiar la fecha o la descripción crea una versión nueva; la anterior queda con vigencia 0. */
  async reprogramar(compromisoId: string, dto: ReprogramarCompromisoDto, actor: ActorConsolidado) {
    this.exigirDirectorOAdmin(actor);
    const actual = await this.obtenerVigente(compromisoId);
    if (actual.anulado) throw new BadRequestException(MENSAJES_CONSOLIDADO.COMPROMISO_ANULADO);
    if (actual.estado !== "pendiente") {
      throw new ConflictException(MENSAJES_CONSOLIDADO.COMPROMISO_NO_EDITABLE);
    }
    const fechaRevision = dto.fechaRevision ?? actual.fechaRevision;
    const descripcion = dto.descripcion?.trim() || actual.descripcion;
    if (fechaRevision === actual.fechaRevision && descripcion === actual.descripcion) {
      throw new BadRequestException(MENSAJES_CONSOLIDADO.COMPROMISO_SIN_CAMBIOS);
    }
    if (fechaRevision !== actual.fechaRevision) this.exigirFechaDeRevision(fechaRevision);

    const nuevaId = await this.repository.reprogramar(
      actual,
      { fechaRevision, descripcion },
      actor.id,
    );
    await this.auditService.log({
      usuarioId: actor.id,
      accion: "actualizar",
      tabla: "compromisos_consolidado",
      registroId: nuevaId,
      valorAnterior: { version: actual.version, fechaRevision: actual.fechaRevision },
      valorNuevo: { version: actual.version + 1, fechaRevision, descripcion },
    });
    return { compromiso: await this.compromisoActualizado(compromisoId) };
  }

  /** Baja lógica con motivo: queda visible como «Anulado» y deja de contar como pendiente. */
  async anular(compromisoId: string, dto: AnularCompromisoDto, actor: ActorConsolidado) {
    this.exigirDirectorOAdmin(actor);
    const actual = await this.obtenerVigente(compromisoId);
    if (actual.anulado) throw new BadRequestException(MENSAJES_CONSOLIDADO.COMPROMISO_ANULADO);
    const motivo = dto.motivo?.trim();
    if (!motivo) {
      throw new BadRequestException(MENSAJES_CONSOLIDADO.COMPROMISO_ANULACION_SIN_MOTIVO);
    }
    await this.repository.anular(actual.id, motivo, actor.id);
    await this.auditService.log({
      usuarioId: actor.id,
      accion: "actualizar",
      tabla: "compromisos_consolidado",
      registroId: actual.id,
      valorAnterior: { anulado: false },
      valorNuevo: { anulado: true, motivo },
    });
    return { compromiso: await this.compromisoActualizado(compromisoId) };
  }

  /** Acuse de lectura del docente: guarda fecha y hora, no cambia el estado ni es una aceptación. */
  async marcarEnterado(compromisoId: string, actor: ActorConsolidado) {
    if (actor.role !== "Docente") {
      throw new ForbiddenException(MENSAJES_CONSOLIDADO.NO_TIENE_PERMISO);
    }
    const actual = await this.obtenerVigente(compromisoId);
    await this.exigirPropioSiEsDocente(actor, actual.docenteId);
    await this.repository.marcarEnterado(actual.id);
    await this.auditService.log({
      usuarioId: actor.id,
      accion: "actualizar",
      tabla: "compromisos_consolidado",
      registroId: actual.id,
      valorNuevo: { enterado: true },
    });
    return {
      compromiso: await this.compromisoActualizado(compromisoId),
      mensaje: MENSAJES_CONSOLIDADO.ENTERADO,
    };
  }

  /**
   * Recordatorio del día de revisión al Director que registró el compromiso (o a los Directores
   * vigentes si ya no está activo). Una sola vez por compromiso y fecha de revisión (P-54).
   */
  async recordarCompromisosDeHoy(fecha = ahoraEnColegio().fecha): Promise<number> {
    const compromisos = await this.repository.pendientesDeRevisarEl(fecha);
    let enviados = 0;
    for (const c of compromisos) {
      if (
        !(await this.repository.registrarAlertaEnviada(`compromiso:${c.compromisoId}:${fecha}`))
      ) {
        continue;
      }
      const destinatarios = (await this.repository.usuarioActivo(c.creadoPorId))
        ? [c.creadoPorId]
        : await this.repository.usuariosConRol([ROL_DIRECTOR]);
      for (const usuarioId of destinatarios) {
        await this.notificacionesService.enviar({
          usuarioId,
          titulo: "Revisión de compromiso de mejora",
          mensaje: mensajeRecordatorioCompromiso(c.docenteApellido, c.descripcion),
          tipo: "recordatorio",
          enlaceUrl: `/admin/consolidados-docentes?periodoId=${c.periodoId}&compromisoId=${c.compromisoId}`,
        });
        enviados += 1;
      }
    }
    return enviados;
  }

  private async compromisoActualizado(compromisoId: string): Promise<CompromisoItem> {
    return this.conVencimiento(await this.obtenerVigente(compromisoId));
  }

  private async notificarDocente(
    docenteId: string,
    titulo: string,
    mensaje: string,
    periodoId: string,
  ): Promise<void> {
    try {
      const usuarioId = await this.repository.usuarioDeDocente(docenteId);
      if (!usuarioId) return;
      await this.notificacionesService.enviar({
        usuarioId,
        titulo,
        mensaje: mensaje.slice(0, 500),
        tipo: "informacion",
        enlaceUrl: `/admin/mi-seguimiento?periodoId=${periodoId}`,
      });
    } catch (error) {
      // Un aviso fallido no debe deshacer el compromiso ya guardado.
      this.logger.warn(`No se pudo notificar al docente: ${(error as Error).message}`);
    }
  }
}
