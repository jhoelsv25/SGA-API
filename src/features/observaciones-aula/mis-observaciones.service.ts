import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ahoraEnColegio } from "../marcaciones/utils";
import { MENSAJES_OBSERVACION, mensajePlazoVencido } from "./constants";
import type { ComentarioDocenteDto } from "./dto";
import type { ActorObservacion, ObservacionFila } from "./interfaces";
import { ObservacionesComunService } from "./observaciones-comun.service";

/** «Mis observaciones» del docente: solo lo propio y solo tras la retroalimentación (RF-023, HU6). */
@Injectable()
export class MisObservacionesService {
  constructor(private readonly comun: ObservacionesComunService) {}

  private get repo() {
    return this.comun.repository;
  }

  private async docenteDe(actor: ActorObservacion) {
    const docente = await this.repo.obtenerDocenteDePersona(actor.personaId);
    if (!docente) throw new ForbiddenException(MENSAJES_OBSERVACION.NO_TIENE_PERMISO);
    return docente;
  }

  /** Aviso de una observación futura: fecha, hora, curso, sección y observador; sin notas ni niveles. */
  private aviso(o: ObservacionFila) {
    return {
      id: o.id,
      estado: o.estado,
      fecha: o.fecha,
      hora: o.horaInicioProgramada.slice(0, 5),
      curso: o.cursoNombre,
      grado: o.gradoNombre,
      seccion: o.seccionNombre,
      observador: o.observadorNombre,
      motivoCancelacion: o.motivoCancelacion,
    };
  }

  async listar(actor: ActorObservacion) {
    const docente = await this.docenteDe(actor);
    const filas = await this.repo.listarDelDocente(docente.id);
    const hoy = ahoraEnColegio().fecha;
    const retroalimentadas = filas.filter((f) => f.estado === "retroalimentada");
    const detalle = await Promise.all(
      retroalimentadas.map(async (o) => {
        const contenido = await this.comun.instrumentoDe(o);
        const califs = await this.repo.calificacionesVigentes(o.id);
        return {
          id: o.id,
          fecha: o.fecha,
          curso: o.cursoNombre,
          grado: o.gradoNombre,
          seccion: o.seccionNombre,
          observador: o.observadorNombre,
          enteradoEn: o.enteradoEn,
          niveles: califs.map((c) => this.comun.calificacionConDescripcion(c, contenido)),
          compromisos: (await this.repo.compromisosVigentes(o.id)).map((c) => ({
            ...c,
            vencido: c.estado === "pendiente" && c.fechaRevision < hoy,
          })),
        };
      }),
    );
    return {
      proximas: filas.filter((f) => f.estado === "programada").map((f) => this.aviso(f)),
      retroalimentadas: detalle,
    };
  }

  async detalle(id: string, actor: ActorObservacion) {
    const docente = await this.docenteDe(actor);
    const obs = await this.comun.cargar(id);
    if (obs.docenteId !== docente.id) {
      throw new ForbiddenException(MENSAJES_OBSERVACION.NO_TIENE_PERMISO);
    }
    if (obs.estado === "programada" || obs.estado === "cancelada") {
      return { observacion: this.aviso(obs) };
    }
    if (obs.estado !== "retroalimentada") {
      // Calificada pero sin retroalimentar (o aún en curso): no se muestran notas ni niveles.
      throw new ForbiddenException(MENSAJES_OBSERVACION.NO_VISIBLE);
    }
    const contenido = await this.comun.instrumentoDe(obs);
    const hoy = ahoraEnColegio().fecha;
    const [notas, califs, compromisos, comentario, limite] = await Promise.all([
      this.repo.notas(id),
      this.repo.calificacionesVigentes(id),
      this.repo.compromisosVigentes(id),
      this.repo.comentarioDe(id),
      this.comun.fechaLimiteComentario(obs),
    ]);
    // Solo la versión vigente; el historial de versiones no se muestra al docente.
    return {
      observacion: {
        ...this.aviso(obs),
        horaInicio: obs.horaInicioReal,
        horaFin: obs.horaFinReal,
        minutos: obs.minutosTotales,
        estudiantesPresentes: obs.estudiantesPresentes,
        reunion: {
          fecha: obs.retroFecha,
          horaInicio: obs.retroHoraInicio,
          horaFin: obs.retroHoraFin,
          resumen: obs.retroResumen,
        },
        enteradoEn: obs.enteradoEn,
      },
      evidencias: notas.map((n) => ({
        desempeno: n.desempeno,
        aspecto: n.aspecto,
        texto: n.texto,
        horaAproximada: n.horaAproximada,
      })),
      calificaciones: califs.map((c) => this.comun.calificacionConDescripcion(c, contenido)),
      compromisos: compromisos.map((c) => ({
        compromisoId: c.compromisoId,
        desempeno: c.desempeno,
        descripcion: c.descripcion,
        fechaRevision: c.fechaRevision,
        estado: c.estado,
        observacionCierre: c.observacionCierre,
        vencido: c.estado === "pendiente" && c.fechaRevision < hoy,
      })),
      comentario,
      fechaLimiteComentario: limite,
      puedeComentar: !comentario && limite !== null && hoy <= limite,
    };
  }

  private async propiaRetroalimentada(id: string, actor: ActorObservacion) {
    const docente = await this.docenteDe(actor);
    const obs = await this.comun.cargar(id);
    if (obs.docenteId !== docente.id) {
      throw new ForbiddenException(MENSAJES_OBSERVACION.NO_TIENE_PERMISO);
    }
    if (obs.estado !== "retroalimentada") {
      throw new ForbiddenException(MENSAJES_OBSERVACION.NO_VISIBLE);
    }
    return obs;
  }

  /** Acuse con fecha; un segundo «enterado» conserva la primera fecha. */
  async enterado(id: string, actor: ActorObservacion) {
    const obs = await this.propiaRetroalimentada(id, actor);
    if (!obs.enteradoEn) {
      await this.repo.actualizar(id, { enteradoEn: new Date().toISOString() });
      await this.comun.auditar(actor, "actualizar", "observaciones_aula", id, { enterado: true });
    }
    return {
      observacion: await this.comun.cargar(id),
      mensaje: MENSAJES_OBSERVACION.ENTERADO,
    };
  }

  /** Un solo comentario por observación, dentro del plazo; no modifica la calificación. */
  async comentar(id: string, dto: ComentarioDocenteDto, actor: ActorObservacion) {
    const obs = await this.propiaRetroalimentada(id, actor);
    const texto = dto.texto?.trim();
    if (!texto) throw new BadRequestException(MENSAJES_OBSERVACION.COMENTARIO_VACIO);
    if (await this.repo.comentarioDe(id)) {
      throw new ConflictException(MENSAJES_OBSERVACION.COMENTARIO_REPETIDO);
    }
    const limite = await this.comun.fechaLimiteComentario(obs);
    if (limite && ahoraEnColegio().fecha > limite) {
      throw new ForbiddenException(mensajePlazoVencido(limite));
    }
    if (!(await this.repo.crearComentario(id, texto, actor.id))) {
      throw new ConflictException(MENSAJES_OBSERVACION.COMENTARIO_REPETIDO);
    }
    await this.comun.auditar(actor, "crear", "observaciones_aula_comentarios", id, {
      observacionId: id,
    });
    await this.comun.notificarUsuario(
      obs.observadorUsuarioId,
      "El docente comentó su observación",
      `${obs.docenteApellido} dejó un comentario sobre la observación del ${obs.fecha
        .split("-")
        .reverse()
        .join("/")}.`,
      "informacion",
      id,
    );
    return {
      comentario: await this.repo.comentarioDe(id),
      mensaje: MENSAJES_OBSERVACION.COMENTARIO_REGISTRADO,
    };
  }
}
