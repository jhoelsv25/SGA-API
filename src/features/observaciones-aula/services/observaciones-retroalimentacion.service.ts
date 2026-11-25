import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MENU_OBSERVACIONES_AULA } from "../../../common/constants";
import { ahoraEnColegio } from "../../marcaciones/utils";
import {
  ARCHIVO_MIME_TYPES,
  ARCHIVO_TAMANO_MAXIMO_BYTES,
  CANTIDAD_DESEMPENOS,
  mensajeCompromisoCerradoObs,
  mensajeRecordatorioRevision,
  MENSAJES_OBSERVACION,
} from "../constants";
import type {
  AgregarCompromisoDto,
  CerrarCompromisoObsDto,
  CerrarRetroalimentacionDto,
  CorregirCompromisoDto,
  RegistrarReunionDto,
} from "../dto";
import type { ActorObservacion, ObservacionFila } from "../interfaces";
import { minutosEntre } from "../utils";
import { ObservacionesComunService } from "./observaciones-comun.service";
import {
  exigirCorrector,
  exigirDesempeno,
  exigirEstado,
  exigirNoEvaluado,
} from "./observaciones-ejecucion.helper";

/** Retroalimentación, compromisos de mejora, archivos firmados y seguimiento (RF-023, HU4 y HU5). */
@Injectable()
export class ObservacionesRetroalimentacionService {
  constructor(private readonly comun: ObservacionesComunService) {}

  private get repo() {
    return this.comun.repository;
  }

  async registrarReunion(id: string, dto: RegistrarReunionDto, actor: ActorObservacion) {
    const obs = await this.comun.cargar(id);
    this.comun.exigirObservador(actor, obs);
    exigirEstado(obs, "calificada", MENSAJES_OBSERVACION.RETRO_NO_DISPONIBLE);
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
    exigirEstado(obs, "calificada", MENSAJES_OBSERVACION.RETRO_NO_DISPONIBLE);
    const descripcion = dto.descripcion?.trim();
    if (!descripcion || !dto.fechaRevision) {
      throw new BadRequestException(MENSAJES_OBSERVACION.COMPROMISO_INCOMPLETO);
    }
    exigirDesempeno(dto.desempeno);
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
    exigirCorrector(actor, obs);
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
      true,
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
    exigirEstado(obs, "calificada", MENSAJES_OBSERVACION.RETRO_NO_DISPONIBLE);
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
      true,
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
    exigirEstado(obs, "retroalimentada", MENSAJES_OBSERVACION.SOLO_RETROALIMENTADA);
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

  async cerrarCompromiso(
    compromisoId: string,
    dto: CerrarCompromisoObsDto,
    actor: ActorObservacion,
  ) {
    const actual = await this.repo.compromisoVigente(compromisoId);
    if (!actual) throw new NotFoundException(MENSAJES_OBSERVACION.COMPROMISO_NO_ENCONTRADO);
    const obs = await this.comun.cargar(actual.observacionId);
    exigirNoEvaluado(actor, obs);
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
