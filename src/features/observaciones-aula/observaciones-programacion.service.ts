import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AnioLectivoCls } from "../../common/anio-lectivo";
import { MENU_OBSERVACIONES_AULA } from "../../common/constants";
import { ahoraEnColegio } from "../marcaciones/utils";
import {
  MENSAJES_OBSERVACION,
  mensajeAvisoProgramada,
  mensajeProgramada,
  mensajeReprogramada,
  type EstadoObservacion,
} from "./constants";
import type {
  CancelarObservacionDto,
  FiltroObservacionesQueryDto,
  ProgramarObservacionDto,
  ReobservacionDto,
  ReprogramarObservacionDto,
} from "./dto";
import type { ActorObservacion, CoberturaDocente, ObservacionFila } from "./interfaces";
import { ObservacionesComunService } from "./observaciones-comun.service";
import { diaSemanaIso, diasEntre, intervalosSeCruzan } from "./utils";

interface DatosProgramacion {
  docenteId: string;
  cursoSeccionId: string;
  fecha: string;
  horaInicio?: string;
  observadorUsuarioId: string;
  observacionAnteriorId: string | null;
}

/** Cronograma de observaciones: programar, reprogramar, cancelar y cobertura (RF-023, HU1). */
@Injectable()
export class ObservacionesProgramacionService {
  constructor(
    private readonly comun: ObservacionesComunService,
    private readonly anioLectivo: AnioLectivoCls,
  ) {}

  private get repo() {
    return this.comun.repository;
  }

  /** Validaciones y datos derivados que comparten programar y reprogramar. */
  private async resolverProgramacion(
    datos: DatosProgramacion,
    actor: ActorObservacion,
    excluirObservacionId?: string,
  ) {
    const docente = await this.repo.obtenerDocente(datos.docenteId);
    if (!docente) throw new NotFoundException(MENSAJES_OBSERVACION.DOCENTE_NO_ENCONTRADO);
    const cursoSeccion = await this.repo.obtenerCursoSeccion(datos.cursoSeccionId);
    if (!cursoSeccion || cursoSeccion.docenteId !== docente.id) {
      throw new BadRequestException(MENSAJES_OBSERVACION.SIN_HORARIO);
    }

    const observador =
      datos.observadorUsuarioId === actor.id
        ? { id: actor.id, personaId: actor.personaId, estado: "activo" }
        : await this.repo.obtenerUsuario(datos.observadorUsuarioId);
    if (!observador || observador.estado !== "activo") {
      throw new BadRequestException(MENSAJES_OBSERVACION.OBSERVADOR_SIN_OPCION);
    }
    // Nadie observa su propia clase (una cuenta con dos roles, RF-002).
    if (observador.personaId === docente.personaId) {
      throw new BadRequestException(MENSAJES_OBSERVACION.OBSERVADOR_PROPIO);
    }
    if (
      datos.observadorUsuarioId !== actor.id &&
      !(await this.repo.usuarioTieneOpcion(observador.id, MENU_OBSERVACIONES_AULA))
    ) {
      throw new BadRequestException(MENSAJES_OBSERVACION.OBSERVADOR_SIN_OPCION);
    }

    const periodo = await this.repo.periodoDeFecha(datos.fecha);
    if (!periodo) throw new BadRequestException(MENSAJES_OBSERVACION.SIN_BIMESTRE);
    this.comun.exigirBimestreAbierto(periodo.estado);

    const anticipacion = await this.comun.anticipacionMinima();
    if (diasEntre(ahoraEnColegio().fecha, datos.fecha) < anticipacion) {
      throw new BadRequestException(MENSAJES_OBSERVACION.ANTICIPACION(anticipacion));
    }

    const bloques = await this.repo.bloquesDelCurso(
      datos.cursoSeccionId,
      diaSemanaIso(datos.fecha),
    );
    const horaPedida = datos.horaInicio?.slice(0, 5);
    const elegidos = horaPedida
      ? bloques.filter((b) => b.horaInicio.slice(0, 5) === horaPedida)
      : bloques;
    if (elegidos.length === 0) throw new BadRequestException(MENSAJES_OBSERVACION.SIN_HORARIO);
    if (elegidos.length > 1) throw new BadRequestException(MENSAJES_OBSERVACION.HORARIO_AMBIGUO);
    const bloque = elegidos[0];

    const otras = await this.repo.observacionesDelObservador(
      observador.id,
      datos.fecha,
      excluirObservacionId,
    );
    if (
      otras.some((o) =>
        intervalosSeCruzan(o.horaInicio, o.horaFin, bloque.horaInicio, bloque.horaFin),
      )
    ) {
      throw new ConflictException(MENSAJES_OBSERVACION.CRUCE);
    }

    return { docente, periodo, bloque, observadorId: observador.id };
  }

  async programar(
    dto: ProgramarObservacionDto,
    actor: ActorObservacion,
    anteriorId: string | null = null,
  ) {
    const r = await this.resolverProgramacion(
      {
        docenteId: dto.docenteId,
        cursoSeccionId: dto.cursoSeccionId,
        fecha: dto.fecha,
        horaInicio: dto.horaInicio,
        observadorUsuarioId: dto.observadorUsuarioId ?? actor.id,
        observacionAnteriorId: anteriorId,
      },
      actor,
    );
    // La observación usa la versión vigente del instrumento al programarse (HU3).
    const instrumento = await this.repo.instrumentoVigente();
    if (!instrumento) throw new ConflictException(MENSAJES_OBSERVACION.SIN_INSTRUMENTO);
    const sesionId = await this.repo.sesionDeHorario(r.bloque.id, dto.fecha);

    const id = await this.repo.crear({
      docenteId: dto.docenteId,
      cursoSeccionId: dto.cursoSeccionId,
      horarioId: r.bloque.id,
      sesionClaseId: sesionId,
      periodoId: r.periodo.id,
      observadorUsuarioId: r.observadorId,
      instrumentoId: instrumento.id,
      observacionAnteriorId: anteriorId,
      fecha: dto.fecha,
      horaInicio: r.bloque.horaInicio,
      horaFin: r.bloque.horaFin,
      creadoPorId: actor.id,
    });
    await this.comun.auditar(actor, "crear", "observaciones_aula", id, {
      docenteId: dto.docenteId,
      fecha: dto.fecha,
      observadorUsuarioId: r.observadorId,
      instrumentoId: instrumento.id,
      reobservacionDe: anteriorId,
    });
    const mensaje = mensajeProgramada(dto.fecha, r.bloque.horaInicio);
    const creada = await this.comun.cargar(id);
    await this.comun.notificarDocente(
      dto.docenteId,
      "Observación de aula programada",
      mensajeAvisoProgramada(
        dto.fecha,
        r.bloque.horaInicio,
        creada.cursoNombre,
        creada.seccionNombre,
        creada.observadorNombre,
      ),
      id,
    );
    return { observacion: creada, mensaje };
  }

  async reprogramar(id: string, dto: ReprogramarObservacionDto, actor: ActorObservacion) {
    const obs = await this.comun.cargar(id);
    this.comun.exigirObservador(actor, obs);
    const motivo = dto.motivo?.trim();
    if (!motivo) throw new BadRequestException(MENSAJES_OBSERVACION.SIN_MOTIVO);
    if (obs.estado !== "programada") {
      throw new BadRequestException(MENSAJES_OBSERVACION.SOLO_PROGRAMADA);
    }
    this.comun.exigirBimestreAbierto(obs.periodoEstado);

    const cursoSeccion = await this.repo.obtenerCursoSeccion(obs.cursoSeccionId);
    const r = await this.resolverProgramacion(
      {
        docenteId: obs.docenteId,
        cursoSeccionId: cursoSeccion?.id ?? obs.cursoSeccionId,
        fecha: dto.fecha,
        horaInicio: dto.horaInicio,
        observadorUsuarioId: obs.observadorUsuarioId,
        observacionAnteriorId: obs.observacionAnteriorId,
      },
      actor,
      obs.id,
    );
    const sesionId = await this.repo.sesionDeHorario(r.bloque.id, dto.fecha);
    await this.repo.registrarCambio({
      observacionId: obs.id,
      tipo: "reprogramacion",
      fechaAnterior: obs.fecha,
      horaAnterior: obs.horaInicioProgramada,
      fechaNueva: dto.fecha,
      horaNueva: r.bloque.horaInicio,
      motivo,
      usuarioId: actor.id,
    });
    await this.repo.actualizar(obs.id, {
      fecha: dto.fecha,
      horarioId: r.bloque.id,
      sesionClaseId: sesionId,
      periodoId: r.periodo.id,
      horaInicioProgramada: r.bloque.horaInicio,
      horaFinProgramada: r.bloque.horaFin,
      avisadoEn: new Date().toISOString(),
    });
    await this.comun.auditar(
      actor,
      "actualizar",
      "observaciones_aula",
      obs.id,
      { fecha: dto.fecha, motivo },
      { fecha: obs.fecha },
    );
    const mensaje = mensajeReprogramada(dto.fecha);
    await this.comun.notificarDocente(
      obs.docenteId,
      "Observación de aula reprogramada",
      mensaje,
      obs.id,
    );
    return { observacion: await this.comun.cargar(obs.id), mensaje };
  }

  async cancelar(id: string, dto: CancelarObservacionDto, actor: ActorObservacion) {
    const obs = await this.comun.cargar(id);
    this.comun.exigirObservador(actor, obs);
    const motivo = dto.motivo?.trim();
    if (!motivo) throw new BadRequestException(MENSAJES_OBSERVACION.SIN_MOTIVO);
    if (obs.estado !== "programada") {
      throw new BadRequestException(MENSAJES_OBSERVACION.SOLO_PROGRAMADA);
    }
    this.comun.exigirBimestreAbierto(obs.periodoEstado);

    await this.repo.registrarCambio({
      observacionId: obs.id,
      tipo: "cancelacion",
      fechaAnterior: obs.fecha,
      horaAnterior: obs.horaInicioProgramada,
      motivo,
      usuarioId: actor.id,
    });
    await this.repo.actualizar(obs.id, {
      estado: "cancelada",
      motivoCancelacion: motivo,
      canceladaEn: new Date().toISOString(),
      canceladaPorId: actor.id,
    });
    await this.comun.auditar(
      actor,
      "actualizar",
      "observaciones_aula",
      obs.id,
      { estado: "cancelada", motivo },
      { estado: obs.estado },
    );
    await this.comun.notificarDocente(
      obs.docenteId,
      "Observación de aula cancelada",
      `Se canceló la observación del ${obs.fecha.split("-").reverse().join("/")}. Motivo: ${motivo}`,
      obs.id,
    );
    return { observacion: await this.comun.cargar(obs.id) };
  }

  async programarReobservacion(id: string, dto: ReobservacionDto, actor: ActorObservacion) {
    const origen = await this.comun.cargar(id);
    this.comun.exigirObservador(actor, origen);
    if (origen.estado !== "retroalimentada") {
      throw new BadRequestException(MENSAJES_OBSERVACION.SOLO_RETROALIMENTADA);
    }
    return await this.programar(
      {
        docenteId: origen.docenteId,
        cursoSeccionId: origen.cursoSeccionId,
        fecha: dto.fecha,
        horaInicio: dto.horaInicio,
        observadorUsuarioId: actor.id,
      },
      actor,
      origen.id,
    );
  }

  /** «Vencida»: sigue programada y su fecha ya pasó. */
  private conVencimiento(obs: ObservacionFila, hoy: string) {
    return { ...obs, vencida: obs.estado === "programada" && obs.fecha < hoy };
  }

  async listar(filtros: FiltroObservacionesQueryDto) {
    const filas = await this.repo.listar({
      ...filtros,
      anioAcademicoId: filtros.anioAcademicoId,
    });
    const hoy = ahoraEnColegio().fecha;
    return filas.map((f) => this.conVencimiento(f, hoy));
  }

  /** Observaciones realizadas = la visita ya se hizo (notas cerradas en adelante). */
  private static readonly REALIZADAS: readonly EstadoObservacion[] = [
    "notas_cerradas",
    "calificada",
    "retroalimentada",
  ];

  async cronograma(anioAcademicoId?: string): Promise<{
    anioAcademicoId: string;
    meta: number;
    docentes: CoberturaDocente[];
    total: { realizadas: number; programadas: number; meta: number; porcentaje: number };
  }> {
    const anioId =
      anioAcademicoId ?? this.anioLectivo.id() ?? (await this.repo.anioEnCurso()) ?? undefined;
    if (!anioId) throw new BadRequestException(MENSAJES_OBSERVACION.SIN_ANIO);
    const meta = await this.comun.cantidadObjetivo();
    const [docentes, conteos] = await Promise.all([
      this.repo.docentesActivos(),
      this.repo.conteosPorDocente(anioId),
    ]);
    const filas: CoberturaDocente[] = docentes.map((d) => {
      const propias = conteos.filter((c) => c.docenteId === d.id);
      const realizadas = propias.filter((c) =>
        ObservacionesProgramacionService.REALIZADAS.includes(c.estado),
      ).length;
      const programadas = propias.filter(
        (c) => c.estado === "programada" || c.estado === "en_observacion",
      ).length;
      return {
        docenteId: d.id,
        docenteNombre: d.nombre,
        realizadas,
        programadas,
        meta,
        faltanParaMeta: Math.max(0, meta - realizadas),
        faltanPorProgramar: Math.max(0, meta - realizadas - programadas),
      };
    });
    const realizadas = filas.reduce((s, f) => s + f.realizadas, 0);
    const programadas = filas.reduce((s, f) => s + f.programadas, 0);
    const metaTotal = meta * filas.length;
    return {
      anioAcademicoId: anioId,
      meta,
      docentes: filas,
      total: {
        realizadas,
        programadas,
        meta: metaTotal,
        porcentaje: metaTotal === 0 ? 0 : Math.round((realizadas / metaTotal) * 100),
      },
    };
  }
}
