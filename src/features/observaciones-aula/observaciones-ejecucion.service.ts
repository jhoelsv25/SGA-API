import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
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
import { QUEUES } from "../../core/queues/queues.constants";
import { MENU_OBSERVACIONES_AULA } from "../../common/constants";
import { ahoraEnColegio } from "../marcaciones/utils";
import {
  ARCHIVO_MIME_TYPES,
  ARCHIVO_TAMANO_MAXIMO_BYTES,
  CRON_RECORDAR_COMPROMISOS_OBS,
  CANTIDAD_DESEMPENOS,
  mensajeCompromisoCerradoObs,
  mensajeDuracionFuera,
  mensajeNuevaVersion,
  mensajeRecordatorioRevision,
  MENSAJES_OBSERVACION,
  QUEUE_JOB_RECORDAR_COMPROMISOS_OBS,
  ROLES_CORRIGEN,
  type EstadoObservacion,
} from "./constants";
import type {
  AgregarCompromisoDto,
  CalificarDesempenoDto,
  CerrarCompromisoObsDto,
  CerrarNotasDto,
  CerrarRetroalimentacionDto,
  CorregirCalificacionDto,
  CorregirCompromisoDto,
  EditarNotaDto,
  IniciarObservacionDto,
  RegistrarNotaDto,
  RegistrarReunionDto,
} from "./dto";
import type { ActorObservacion, CompromisoObsFila, ObservacionFila } from "./interfaces";
import { ObservacionesComunService } from "./observaciones-comun.service";
import { duracionFueraDeRango, minutosEntre, notaEsValida } from "./utils";

/** Toma de notas, calificación, retroalimentación y compromisos (RF-023, HU2 a HU5). */
@Injectable()
export class ObservacionesEjecucionService implements OnModuleInit {
  private readonly logger = new Logger(ObservacionesEjecucionService.name);

  constructor(
    private readonly comun: ObservacionesComunService,
    @Optional()
    @InjectQueue(QUEUES.OBSERVACIONES_AULA)
    private readonly cola?: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.cola) return;
    try {
      await this.cola.upsertJobScheduler(
        QUEUE_JOB_RECORDAR_COMPROMISOS_OBS,
        { pattern: CRON_RECORDAR_COMPROMISOS_OBS, tz: "America/Lima" },
        { name: QUEUE_JOB_RECORDAR_COMPROMISOS_OBS, data: {} },
      );
    } catch (error) {
      this.logger.warn(`No se pudo programar el recordatorio: ${(error as Error).message}`);
    }
  }

  private get repo() {
    return this.comun.repository;
  }

  private exigirDesempeno(desempeno: number): void {
    if (!Number.isInteger(desempeno) || desempeno < 1 || desempeno > CANTIDAD_DESEMPENOS) {
      throw new BadRequestException(MENSAJES_OBSERVACION.DESEMPENO_INVALIDO);
    }
  }

  /** Quien consulta o da seguimiento sin ser el observador asignado, pero nunca el evaluado. */
  private exigirNoEvaluado(actor: ActorObservacion, obs: ObservacionFila): void {
    if (actor.personaId === obs.docentePersonaId) {
      throw new ForbiddenException(MENSAJES_OBSERVACION.NO_TIENE_PERMISO);
    }
  }

  private exigirCorrector(actor: ActorObservacion, obs: ObservacionFila): void {
    this.exigirNoEvaluado(actor, obs);
    if (!(ROLES_CORRIGEN as readonly string[]).includes(actor.role)) {
      throw new ForbiddenException(MENSAJES_OBSERVACION.SOLO_DIRECTOR);
    }
  }

  private exigirEstado(obs: ObservacionFila, estado: EstadoObservacion, mensaje: string): void {
    if (obs.estado !== estado) throw new BadRequestException(mensaje);
  }

  // ------------------------------------------------------------------ consulta
  private conVencimiento(c: CompromisoObsFila, hoy: string) {
    return { ...c, vencido: c.estado === "pendiente" && c.fechaRevision < hoy };
  }

  async detalle(id: string, actor: ActorObservacion) {
    const obs = await this.comun.cargar(id);
    this.exigirNoEvaluado(actor, obs);
    const contenido = await this.comun.instrumentoDe(obs);
    const hoy = ahoraEnColegio().fecha;
    const [notas, califs, histCalifs, compromisos, histComp, cambios, archivos, comentario] =
      await Promise.all([
        this.repo.notas(id),
        this.repo.calificacionesVigentes(id),
        this.repo.historialCalificaciones(id),
        this.repo.compromisosVigentes(id),
        this.repo.historialCompromisos(id),
        this.repo.cambios(id),
        this.repo.archivos(id),
        this.repo.comentarioDe(id),
      ]);
    return {
      observacion: { ...obs, vencida: obs.estado === "programada" && obs.fecha < hoy },
      instrumento: contenido,
      notas,
      calificaciones: califs.map((c) => this.comun.calificacionConDescripcion(c, contenido)),
      historialCalificaciones: histCalifs,
      compromisos: compromisos.map((c) => this.conVencimiento(c, hoy)),
      historialCompromisos: histComp,
      cambios,
      archivos,
      comentario,
    };
  }

  // ------------------------------------------------------------------ HU2: notas
  async iniciar(id: string, dto: IniciarObservacionDto, actor: ActorObservacion) {
    const obs = await this.comun.cargar(id);
    this.comun.exigirObservador(actor, obs);
    this.exigirEstado(obs, "programada", MENSAJES_OBSERVACION.SOLO_PROGRAMADA);
    this.comun.exigirBimestreAbierto(obs.periodoEstado);
    if (obs.fecha !== ahoraEnColegio().fecha) {
      throw new BadRequestException(MENSAJES_OBSERVACION.SOLO_EL_DIA);
    }
    await this.repo.actualizar(id, {
      estado: "en_observacion",
      horaInicioReal: dto.horaInicio,
      estudiantesPresentes: dto.estudiantesPresentes,
    });
    await this.comun.auditar(
      actor,
      "actualizar",
      "observaciones_aula",
      id,
      { estado: "en_observacion", horaInicio: dto.horaInicio },
      { estado: obs.estado },
    );
    const contenido = await this.comun.instrumentoDe(obs);
    return { observacion: await this.comun.cargar(id), fichaDeNotas: contenido.desempenos };
  }

  private async obsConNotasAbiertas(id: string, actor: ActorObservacion) {
    const obs = await this.comun.cargar(id);
    this.comun.exigirObservador(actor, obs);
    this.exigirEstado(obs, "en_observacion", MENSAJES_OBSERVACION.NOTAS_NO_ABIERTAS);
    this.comun.exigirBimestreAbierto(obs.periodoEstado);
    return obs;
  }

  async registrarNota(id: string, dto: RegistrarNotaDto, actor: ActorObservacion) {
    await this.obsConNotasAbiertas(id, actor);
    this.exigirDesempeno(dto.desempeno);
    if (!notaEsValida(dto.texto)) throw new BadRequestException(MENSAJES_OBSERVACION.NOTA_VACIA);
    const nota = await this.repo.agregarNota({
      observacionId: id,
      desempeno: dto.desempeno,
      aspecto: dto.aspecto?.trim() || undefined,
      texto: dto.texto.trim(),
      horaAproximada: dto.horaAproximada,
    });
    await this.comun.auditar(actor, "crear", "observaciones_aula_notas", nota.id, {
      observacionId: id,
      desempeno: dto.desempeno,
    });
    return { nota };
  }

  async editarNota(id: string, notaId: string, dto: EditarNotaDto, actor: ActorObservacion) {
    await this.obsConNotasAbiertas(id, actor);
    const nota = await this.repo.obtenerNota(notaId);
    if (!nota || nota.observacionId !== id) {
      throw new NotFoundException(MENSAJES_OBSERVACION.NO_ENCONTRADA);
    }
    if (!notaEsValida(dto.texto)) throw new BadRequestException(MENSAJES_OBSERVACION.NOTA_VACIA);
    await this.repo.editarNota(notaId, dto.texto.trim());
    await this.comun.auditar(
      actor,
      "actualizar",
      "observaciones_aula_notas",
      notaId,
      { texto: dto.texto.trim() },
      { texto: nota.texto },
    );
    return { nota: await this.repo.obtenerNota(notaId) };
  }

  async cerrarNotas(id: string, dto: CerrarNotasDto, actor: ActorObservacion) {
    const obs = await this.obsConNotasAbiertas(id, actor);
    const inicio = obs.horaInicioReal ?? obs.horaInicioProgramada;
    const minutos = minutosEntre(inicio, dto.horaFin);
    if (minutos <= 0) throw new BadRequestException(MENSAJES_OBSERVACION.HORA_FIN_INVALIDA);
    if (duracionFueraDeRango(minutos) && !dto.confirmarDuracion) {
      // Avisa pero permite guardar con la confirmación del observador.
      throw new ConflictException({
        message: mensajeDuracionFuera(minutos),
        requiereConfirmacion: true,
        minutos,
      });
    }
    await this.repo.cerrarNotas(id, dto.horaFin, minutos);
    await this.comun.auditar(
      actor,
      "actualizar",
      "observaciones_aula",
      id,
      { estado: "notas_cerradas", minutos },
      { estado: obs.estado },
    );
    return {
      observacion: await this.comun.cargar(id),
      mensaje: MENSAJES_OBSERVACION.NOTAS_CERRADAS,
      advertenciaDuracion: duracionFueraDeRango(minutos) ? mensajeDuracionFuera(minutos) : null,
    };
  }

  // ------------------------------------------------------------------ HU3: calificación
  private async obsParaCalificar(id: string, actor: ActorObservacion) {
    const obs = await this.comun.cargar(id);
    this.comun.exigirObservador(actor, obs);
    if (obs.estado === "programada" || obs.estado === "en_observacion") {
      throw new BadRequestException(MENSAJES_OBSERVACION.CERRAR_NOTAS_PRIMERO);
    }
    if (obs.estado === "calificada" || obs.estado === "retroalimentada") {
      throw new BadRequestException(MENSAJES_OBSERVACION.YA_CALIFICADA);
    }
    if (obs.estado !== "notas_cerradas") {
      throw new BadRequestException(MENSAJES_OBSERVACION.NO_CALIFICABLE);
    }
    return obs;
  }

  /** Ficha de calificación: notas del desempeño y descripción de los niveles (no incluye al docente). */
  async fichaCalificacion(id: string, actor: ActorObservacion) {
    const obs = await this.obsParaCalificar(id, actor);
    const contenido = await this.comun.instrumentoDe(obs);
    const [notas, califs] = await Promise.all([
      this.repo.notas(id),
      this.repo.calificacionesVigentes(id),
    ]);
    return {
      observacion: obs,
      desempenos: contenido.desempenos.map((d) => {
        const guardada = califs.find((c) => c.desempeno === d.numero);
        return {
          ...d,
          notas: notas.filter((n) => n.desempeno === d.numero),
          calificacion: guardada
            ? this.comun.calificacionConDescripcion(guardada, contenido)
            : null,
        };
      }),
    };
  }

  async calificar(
    id: string,
    desempeno: number,
    dto: CalificarDesempenoDto,
    actor: ActorObservacion,
  ) {
    const obs = await this.obsParaCalificar(id, actor);
    this.exigirDesempeno(desempeno);
    const fundamento = dto.fundamento?.trim();
    if (!fundamento) throw new BadRequestException(MENSAJES_OBSERVACION.FUNDAMENTO);
    await this.repo.guardarBorrador(id, desempeno, dto.nivel, fundamento, actor.id);
    const [notas, califs, contenido] = await Promise.all([
      this.repo.notas(id),
      this.repo.calificacionesVigentes(id),
      this.comun.instrumentoDe(obs),
    ]);
    const propias = notas.filter((n) => n.desempeno === desempeno);
    const guardada = califs.find((c) => c.desempeno === desempeno);
    return {
      calificacion: guardada ? this.comun.calificacionConDescripcion(guardada, contenido) : null,
      notas: propias,
      advertencia: propias.length === 0 ? MENSAJES_OBSERVACION.SIN_EVIDENCIAS : null,
    };
  }

  async cerrarCalificacion(id: string, actor: ActorObservacion) {
    const obs = await this.obsParaCalificar(id, actor);
    const califs = await this.repo.calificacionesVigentes(id);
    if (califs.length < CANTIDAD_DESEMPENOS) {
      throw new BadRequestException(MENSAJES_OBSERVACION.CALIFICACION_INCOMPLETA);
    }
    await this.repo.actualizar(id, {
      estado: "calificada",
      calificadaEn: new Date().toISOString(),
    });
    await this.comun.auditar(
      actor,
      "actualizar",
      "observaciones_aula",
      id,
      { estado: "calificada" },
      { estado: obs.estado },
    );
    const contenido = await this.comun.instrumentoDe(obs);
    return {
      observacion: await this.comun.cargar(id),
      // Cinco niveles con su etiqueta; sin nota global (P-66).
      resumen: califs.map((c) => this.comun.calificacionConDescripcion(c, contenido)),
    };
  }

  async corregirCalificacion(
    id: string,
    desempeno: number,
    dto: CorregirCalificacionDto,
    actor: ActorObservacion,
  ) {
    const obs = await this.comun.cargar(id);
    this.exigirCorrector(actor, obs);
    this.exigirDesempeno(desempeno);
    if (obs.estado !== "calificada" && obs.estado !== "retroalimentada") {
      throw new BadRequestException(MENSAJES_OBSERVACION.NO_CALIFICABLE);
    }
    const motivo = dto.motivo?.trim();
    if (!motivo) throw new BadRequestException(MENSAJES_OBSERVACION.MOTIVO_CAMBIO);
    const vigente = (await this.repo.calificacionesVigentes(id)).find(
      (c) => c.desempeno === desempeno,
    );
    if (!vigente) throw new NotFoundException(MENSAJES_OBSERVACION.NO_ENCONTRADA);
    const nivel = dto.nivel ?? vigente.nivel;
    const fundamento = dto.fundamento?.trim() || vigente.fundamento;
    if (nivel === vigente.nivel && fundamento === vigente.fundamento) {
      throw new BadRequestException(MENSAJES_OBSERVACION.SIN_CAMBIOS);
    }
    const version = await this.repo.nuevaVersionCalificacion(
      vigente,
      { nivel, fundamento },
      motivo,
      actor.id,
    );
    await this.comun.auditar(
      actor,
      "actualizar",
      "observaciones_aula_calificaciones",
      vigente.id,
      { desempeno, nivel, version, motivo },
      { nivel: vigente.nivel, version: vigente.version },
    );
    // Si el docente ya podía verla, se le avisa del cambio.
    if (obs.estado === "retroalimentada") {
      await this.comun.notificarDocente(
        obs.docenteId,
        "Se corrigió la calificación de su observación",
        `Se corrigió el desempeño ${desempeno}. Motivo: ${motivo}`,
        id,
      );
    }
    return { mensaje: mensajeNuevaVersion(version), version };
  }

  // ------------------------------------------------------------------ HU4: retroalimentación
  async registrarReunion(id: string, dto: RegistrarReunionDto, actor: ActorObservacion) {
    const obs = await this.comun.cargar(id);
    this.comun.exigirObservador(actor, obs);
    this.exigirEstado(obs, "calificada", MENSAJES_OBSERVACION.RETRO_NO_DISPONIBLE);
    if (minutosEntre(dto.horaInicio, dto.horaFin) <= 0) {
      throw new BadRequestException(MENSAJES_OBSERVACION.HORA_FIN_INVALIDA);
    }
    await this.repo.actualizar(id, {
      retroFecha: dto.fecha,
      retroHoraInicio: dto.horaInicio,
      retroHoraFin: dto.horaFin,
      retroResumen: dto.resumen.trim(),
    });
    await this.comun.auditar(actor, "actualizar", "observaciones_aula", id, {
      reunion: dto.fecha,
    });
    return { observacion: await this.comun.cargar(id) };
  }

  private exigirFechaRevision(obs: ObservacionFila, fecha: string): void {
    if (!obs.retroFecha) throw new BadRequestException(MENSAJES_OBSERVACION.RETRO_SIN_REUNION);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha <= obs.retroFecha) {
      throw new BadRequestException(MENSAJES_OBSERVACION.REVISION_ANTERIOR);
    }
  }

  async agregarCompromiso(id: string, dto: AgregarCompromisoDto, actor: ActorObservacion) {
    const obs = await this.comun.cargar(id);
    this.comun.exigirObservador(actor, obs);
    this.exigirEstado(obs, "calificada", MENSAJES_OBSERVACION.RETRO_NO_DISPONIBLE);
    const descripcion = dto.descripcion?.trim();
    if (!descripcion || !dto.fechaRevision) {
      throw new BadRequestException(MENSAJES_OBSERVACION.COMPROMISO_INCOMPLETO);
    }
    this.exigirDesempeno(dto.desempeno);
    this.exigirFechaRevision(obs, dto.fechaRevision);
    const compromiso = await this.repo.crearCompromiso({
      observacionId: id,
      desempeno: dto.desempeno,
      descripcion,
      fechaRevision: dto.fechaRevision,
      creadoPorId: actor.id,
    });
    await this.comun.auditar(actor, "crear", "observaciones_aula_compromisos", compromiso.id, {
      observacionId: id,
      desempeno: dto.desempeno,
      fechaRevision: dto.fechaRevision,
    });
    return { compromiso };
  }

  async corregirCompromiso(
    id: string,
    compromisoId: string,
    dto: CorregirCompromisoDto,
    actor: ActorObservacion,
  ) {
    const obs = await this.comun.cargar(id);
    const actual = await this.repo.compromisoVigente(compromisoId);
    if (!actual || actual.observacionId !== id) {
      throw new NotFoundException(MENSAJES_OBSERVACION.COMPROMISO_NO_ENCONTRADO);
    }
    const descripcion = dto.descripcion?.trim() || actual.descripcion;
    const fechaRevision = dto.fechaRevision ?? actual.fechaRevision;
    if (descripcion === actual.descripcion && fechaRevision === actual.fechaRevision) {
      throw new BadRequestException(MENSAJES_OBSERVACION.SIN_CAMBIOS);
    }
    if (fechaRevision !== actual.fechaRevision) this.exigirFechaRevision(obs, fechaRevision);

    if (obs.estado === "calificada") {
      // Borrador: el observador edita libremente, sin versión.
      this.comun.exigirObservador(actor, obs);
      await this.repo.editarCompromisoEnSitio(actual.id, descripcion, fechaRevision);
      return { compromiso: await this.repo.compromisoVigente(compromisoId) };
    }
    if (obs.estado !== "retroalimentada") {
      throw new BadRequestException(MENSAJES_OBSERVACION.RETRO_NO_DISPONIBLE);
    }
    this.exigirCorrector(actor, obs);
    const motivo = dto.motivo?.trim();
    if (!motivo) throw new BadRequestException(MENSAJES_OBSERVACION.MOTIVO_CAMBIO);
    const version = await this.repo.nuevaVersionCompromiso(
      actual,
      { descripcion, fechaRevision },
      motivo,
      actor.id,
    );
    await this.comun.auditar(
      actor,
      "actualizar",
      "observaciones_aula_compromisos",
      actual.id,
      { version, descripcion, fechaRevision, motivo },
      { version: actual.version, descripcion: actual.descripcion },
    );
    await this.comun.notificarDocente(
      obs.docenteId,
      "Se corrigió un compromiso de mejora",
      `Se actualizó el compromiso: ${descripcion}. Motivo: ${motivo}`,
      id,
    );
    return { compromiso: await this.repo.compromisoVigente(compromisoId), version };
  }

  async cerrarRetroalimentacion(
    id: string,
    dto: CerrarRetroalimentacionDto,
    actor: ActorObservacion,
  ) {
    const obs = await this.comun.cargar(id);
    this.comun.exigirObservador(actor, obs);
    this.exigirEstado(obs, "calificada", MENSAJES_OBSERVACION.RETRO_NO_DISPONIBLE);
    if (!obs.retroFecha) throw new BadRequestException(MENSAJES_OBSERVACION.RETRO_SIN_REUNION);
    const compromisos = await this.repo.compromisosVigentes(id);
    if (compromisos.length === 0) {
      const califs = await this.repo.calificacionesVigentes(id);
      const todosIV = califs.length === CANTIDAD_DESEMPENOS && califs.every((c) => c.nivel === 4);
      if (!(dto.sinCompromisos && todosIV)) {
        throw new BadRequestException(MENSAJES_OBSERVACION.RETRO_SIN_COMPROMISOS);
      }
    }
    await this.repo.actualizar(id, {
      estado: "retroalimentada",
      retroalimentadaEn: new Date().toISOString(),
    });
    await this.comun.auditar(
      actor,
      "actualizar",
      "observaciones_aula",
      id,
      { estado: "retroalimentada", sinCompromisos: compromisos.length === 0 },
      { estado: obs.estado },
    );
    await this.comun.notificarDocente(
      obs.docenteId,
      "Su observación de aula ya está disponible",
      MENSAJES_OBSERVACION.RETRO_REGISTRADA,
      id,
    );
    return {
      observacion: await this.comun.cargar(id),
      mensaje: MENSAJES_OBSERVACION.RETRO_REGISTRADA,
    };
  }

  async subirArchivoFirmado(
    id: string,
    archivo: Express.Multer.File | undefined,
    actor: ActorObservacion,
  ) {
    const obs = await this.comun.cargar(id);
    this.comun.exigirObservador(actor, obs);
    this.exigirEstado(obs, "retroalimentada", MENSAJES_OBSERVACION.SOLO_RETROALIMENTADA);
    const valido =
      archivo &&
      (ARCHIVO_MIME_TYPES as readonly string[]).includes(archivo.mimetype) &&
      archivo.size <= ARCHIVO_TAMANO_MAXIMO_BYTES;
    if (!archivo || !valido) throw new BadRequestException(MENSAJES_OBSERVACION.ARCHIVO_INVALIDO);
    const extension =
      archivo.mimetype === "application/pdf"
        ? ".pdf"
        : archivo.mimetype === "image/png"
          ? ".png"
          : ".jpg";
    const nombre = `${randomUUID()}${extension}`;
    const carpeta = path.join(process.cwd(), "uploads", "observaciones");
    fs.mkdirSync(carpeta, { recursive: true });
    fs.writeFileSync(path.join(carpeta, nombre), archivo.buffer);
    const url = `/uploads/observaciones/${nombre}`;
    await this.repo.crearArchivo({
      observacionId: id,
      url,
      nombreOriginal: archivo.originalname,
      subidoPorId: actor.id,
    });
    await this.comun.auditar(actor, "crear", "observaciones_aula_archivos", id, { url });
    return { archivos: await this.repo.archivos(id) };
  }

  // ------------------------------------------------------------------ HU5: seguimiento
  async cerrarCompromiso(
    compromisoId: string,
    dto: CerrarCompromisoObsDto,
    actor: ActorObservacion,
  ) {
    const actual = await this.repo.compromisoVigente(compromisoId);
    if (!actual) throw new NotFoundException(MENSAJES_OBSERVACION.COMPROMISO_NO_ENCONTRADO);
    const obs = await this.comun.cargar(actual.observacionId);
    this.exigirNoEvaluado(actor, obs);
    if (actual.estado !== "pendiente") {
      throw new ConflictException(MENSAJES_OBSERVACION.COMPROMISO_CERRADO);
    }
    const observacion = dto.observacion?.trim();
    if (!observacion) throw new BadRequestException(MENSAJES_OBSERVACION.SIN_MOTIVO);
    // El cierre del bimestre no bloquea el seguimiento de compromisos.
    await this.repo.cerrarCompromiso(actual.id, dto.resultado, observacion, actor.id);
    await this.comun.auditar(
      actor,
      "actualizar",
      "observaciones_aula_compromisos",
      actual.id,
      { estado: dto.resultado, observacion },
      { estado: actual.estado },
    );
    return {
      compromiso: await this.repo.compromisoVigente(compromisoId),
      mensaje: mensajeCompromisoCerradoObs(dto.resultado),
      sugerirReobservacion: dto.resultado === "no_cumplido",
    };
  }

  /** «Seguimientos por revisar»: compromisos pendientes cuya fecha de revisión llegó. */
  async seguimientosPorRevisar() {
    const hoy = ahoraEnColegio().fecha;
    const filas = await this.repo.compromisosPorRevisar(hoy);
    return filas.map((f) => ({ ...f, vencido: f.fechaRevision < hoy }));
  }

  /**
   * Recordatorio del día de revisión: al observador y a quien tenga la opción «Observaciones de
   * aula», una sola vez por compromiso y fecha, y una sola notificación por persona (P-71, P-72).
   * Si el sistema estuvo caído, el recordatorio sale al reanudarse.
   */
  async recordarRevisiones(hoy = ahoraEnColegio().fecha): Promise<number> {
    const compromisos = await this.repo.compromisosPorRevisar(hoy);
    const conOpcion = compromisos.length
      ? await this.repo.usuariosConOpcion(MENU_OBSERVACIONES_AULA)
      : [];
    let enviados = 0;
    for (const c of compromisos) {
      const clave = `obs-compromiso:${c.compromisoId}:${c.fechaRevision}`;
      if (!(await this.repo.registrarAlertaEnviada(clave))) continue;
      const destinatarios = new Set<string>(conOpcion);
      if (await this.repo.usuarioActivo(c.observadorUsuarioId)) {
        destinatarios.add(c.observadorUsuarioId);
      }
      for (const usuarioId of destinatarios) {
        await this.comun.notificarUsuario(
          usuarioId,
          "Revisión de compromiso de mejora",
          mensajeRecordatorioRevision(c.docenteApellido, c.descripcion),
          "recordatorio",
          c.observacionId,
        );
        enviados += 1;
      }
    }
    return enviados;
  }
}
