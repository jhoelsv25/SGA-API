import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ahoraEnColegio } from "../../marcaciones/utils";
import {
  CANTIDAD_DESEMPENOS,
  mensajeDuracionFuera,
  mensajeNuevaVersion,
  MENSAJES_OBSERVACION,
} from "../constants";
import type {
  CalificarDesempenoDto,
  CerrarNotasDto,
  CorregirCalificacionDto,
  EditarNotaDto,
  IniciarObservacionDto,
  RegistrarNotaDto,
} from "../dto";
import type { ActorObservacion } from "../interfaces";
import { duracionFueraDeRango, minutosEntre, notaEsValida } from "../utils";
import { ObservacionesComunService } from "./observaciones-comun.service";
import {
  conVencimiento,
  exigirCorrector,
  exigirDesempeno,
  exigirEstado,
  exigirNoEvaluado,
} from "./observaciones-ejecucion.helper";

/** Detalle, toma de notas en clase y calificación de desempeños (RF-023, HU2 y HU3). */
@Injectable()
export class ObservacionesNotasService {
  constructor(private readonly comun: ObservacionesComunService) {}

  private get repo() {
    return this.comun.repository;
  }

  async detalle(id: string, actor: ActorObservacion) {
    const obs = await this.comun.cargar(id);
    exigirNoEvaluado(actor, obs);
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
      compromisos: compromisos.map((c) => conVencimiento(c, hoy)),
      historialCompromisos: histComp,
      cambios,
      archivos,
      comentario,
    };
  }

  async iniciar(id: string, dto: IniciarObservacionDto, actor: ActorObservacion) {
    const obs = await this.comun.cargar(id);
    this.comun.exigirObservador(actor, obs);
    exigirEstado(obs, "programada", MENSAJES_OBSERVACION.SOLO_PROGRAMADA);
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
    exigirEstado(obs, "en_observacion", MENSAJES_OBSERVACION.NOTAS_NO_ABIERTAS);
    this.comun.exigirBimestreAbierto(obs.periodoEstado);
    return obs;
  }

  async registrarNota(id: string, dto: RegistrarNotaDto, actor: ActorObservacion) {
    await this.obsConNotasAbiertas(id, actor);
    exigirDesempeno(dto.desempeno);
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
    exigirDesempeno(desempeno);
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
    exigirCorrector(actor, obs);
    exigirDesempeno(desempeno);
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
        true,
      );
    }
    return { mensaje: mensajeNuevaVersion(version), version };
  }
}
