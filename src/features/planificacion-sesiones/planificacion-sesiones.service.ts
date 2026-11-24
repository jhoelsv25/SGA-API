import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { InstitucionService } from "../institucion/institucion.service";
import { MENSAJES_PLANIFICACION } from "./constants";
import { ahoraEnColegio } from "../marcaciones/utils/marcacion-reglas.util";
import type { CopiarPlanificacionDto, GuardarPlanificacionDto, HistorialQueryDto } from "./dto";
import type {
  ActorPlanificacion,
  BloqueDocente,
  DatosGuardarPlanificacion,
  PlanificacionCompleta,
  PlanificacionFila,
} from "./interfaces";
import { PlanificacionSesionesRepository } from "./repositories";
import {
  diaSemanaIso,
  duracionBloqueMin,
  faltantesParaLista,
  generarSesionDocx,
  generarSesionPdf,
  hayMomentosRepetidos,
  lunesDe,
  sumarDiasFecha,
} from "./utils";

/** Planificación de la sesión de aprendizaje a cargo del docente (RF-024, HU2 a HU5). */
@Injectable()
export class PlanificacionSesionesService {
  constructor(
    private readonly repository: PlanificacionSesionesRepository,
    private readonly auditService: AuditService,
    private readonly institucion: InstitucionService,
  ) {}

  private async docenteDe(actor: ActorPlanificacion): Promise<string> {
    const docente = await this.repository.docenteDePersona(actor.personaId);
    if (!docente?.activo) throw new ForbiddenException(MENSAJES_PLANIFICACION.NO_ES_DOCENTE);
    return docente.id;
  }

  private async auditar(
    actor: ActorPlanificacion,
    accion: "crear" | "actualizar",
    id: string,
    valor: Record<string, unknown>,
  ): Promise<void> {
    await this.auditService.log({
      usuarioId: actor.id,
      accion,
      tabla: "planificaciones_sesion",
      registroId: id,
      valorNuevo: valor,
      valorAnterior: null,
    });
  }

  /** Bloques del docente de lunes a viernes de la semana con el estado de cada planificación. */
  async semana(actor: ActorPlanificacion, fechaRef: string) {
    const docenteId = await this.docenteDe(actor);
    const lunes = lunesDe(fechaRef);
    const viernes = sumarDiasFecha(lunes, 4);
    const [bloques, planes] = await Promise.all([
      this.repository.bloquesDeDocente(docenteId),
      this.repository.planificacionesDeDocente(docenteId, lunes, viernes),
    ]);
    const dias = bloques
      .filter((b) => b.diaSemana >= 1 && b.diaSemana <= 5)
      .map((b) => {
        const fecha = sumarDiasFecha(lunes, b.diaSemana - 1);
        const plan = planes.find((p) => p.horarioId === b.horarioId && p.fecha === fecha);
        return {
          fecha,
          bloque: b,
          planificacionId: plan?.id ?? null,
          titulo: plan?.titulo ?? null,
          estado: plan?.estado ?? "sin_planificar",
        };
      })
      .sort(
        (a, b) =>
          a.fecha.localeCompare(b.fecha) || a.bloque.horaInicio.localeCompare(b.bloque.horaInicio),
      );
    return { desde: lunes, hasta: viernes, bloques: dias };
  }

  /** Todas mis planificaciones, pasadas y futuras, en un rango de fechas. */
  async historial(actor: ActorPlanificacion, query: HistorialQueryDto) {
    const docenteId = await this.docenteDe(actor);
    return await this.repository.historial({ ...rangoDe(query), docenteId, estado: query.estado });
  }

  async obtener(id: string, actor: ActorPlanificacion): Promise<PlanificacionCompleta> {
    const docenteId = await this.docenteDe(actor);
    const fila = await this.cargar(id);
    if (fila.docenteId !== docenteId)
      throw new ForbiddenException(MENSAJES_PLANIFICACION.OTRO_DOCENTE);
    return await this.completar(fila);
  }

  /** Detalle completo; lo usan el docente y el supervisor (solo lectura). */
  async completar(fila: PlanificacionFila): Promise<PlanificacionCompleta> {
    const [bloque, competencias, momentos, comentarios] = await Promise.all([
      this.repository.bloque(fila.horarioId),
      this.repository.competenciasDe(fila.id),
      this.repository.momentosDe(fila.id),
      this.repository.comentariosDe(fila.id),
    ]);
    if (!bloque) throw new NotFoundException(MENSAJES_PLANIFICACION.BLOQUE_NO_ENCONTRADO);
    return { ...fila, bloque, competencias, momentos, comentarios };
  }

  async cargar(id: string): Promise<PlanificacionFila> {
    const fila = await this.repository.planificacion(id);
    if (!fila) throw new NotFoundException(MENSAJES_PLANIFICACION.NO_ENCONTRADA);
    return fila;
  }

  /** Crea o actualiza la planificación del bloque; siempre queda como `borrador`. */
  async guardar(dto: GuardarPlanificacionDto, actor: ActorPlanificacion) {
    const docenteId = await this.docenteDe(actor);
    const bloque = await this.bloqueDelDocente(dto.horarioId, docenteId, dto.fecha);
    await this.exigirBimestreAbierto(dto.fecha);
    const existente = await this.repository.planificacionDeBloque(dto.horarioId, dto.fecha);
    if (existente && existente.docenteId !== docenteId) {
      throw new ForbiddenException(MENSAJES_PLANIFICACION.OTRO_DOCENTE);
    }
    if (existente?.estado === "ejecutada") {
      throw new ConflictException(MENSAJES_PLANIFICACION.YA_EJECUTADA);
    }
    const datos = await this.armarDatos(
      dto,
      docenteId,
      bloque,
      "borrador",
      existente?.copiadaDeId ?? null,
    );
    const id = await this.repository.guardar(datos, existente?.id ?? null);
    await this.auditar(actor, existente ? "actualizar" : "crear", id, {
      horarioId: dto.horarioId,
      fecha: dto.fecha,
      estado: "borrador",
    });
    return {
      mensaje: MENSAJES_PLANIFICACION.GUARDADA,
      planificacion: await this.completar(await this.cargar(id)),
    };
  }

  async marcarLista(id: string, actor: ActorPlanificacion) {
    const docenteId = await this.docenteDe(actor);
    const fila = await this.cargar(id);
    if (fila.docenteId !== docenteId)
      throw new ForbiddenException(MENSAJES_PLANIFICACION.OTRO_DOCENTE);
    if (fila.estado === "ejecutada")
      throw new ConflictException(MENSAJES_PLANIFICACION.YA_EJECUTADA);
    await this.exigirBimestreAbierto(fila.fecha);
    const completa = await this.completar(fila);
    const faltas = faltantesParaLista(
      { ...completa },
      duracionBloqueMin(completa.bloque.horaInicio, completa.bloque.horaFin),
    );
    if (faltas.length > 0) throw new BadRequestException(faltas);
    await this.repository.cambiarEstado(id, "lista");
    await this.auditar(actor, "actualizar", id, { estado: "lista" });
    return {
      mensaje: MENSAJES_PLANIFICACION.LISTA,
      planificacion: await this.completar(await this.cargar(id)),
    };
  }

  /** Copia la planificación a otros bloques del mismo grado y área, o a otra fecha; quedan en borrador. */
  async copiar(id: string, dto: CopiarPlanificacionDto, actor: ActorPlanificacion) {
    if (dto.destinos.length === 0)
      throw new BadRequestException(MENSAJES_PLANIFICACION.COPIA_SIN_DESTINOS);
    const docenteId = await this.docenteDe(actor);
    const origen = await this.cargar(id);
    if (origen.docenteId !== docenteId)
      throw new ForbiddenException(MENSAJES_PLANIFICACION.OTRO_DOCENTE);
    const bloqueOrigen = await this.repository.bloque(origen.horarioId);
    const competencias = await this.repository.competenciasDe(id);
    const momentos = await this.repository.momentosDe(id);
    for (const destino of dto.destinos) {
      const bloque = await this.bloqueDelDocente(destino.horarioId, docenteId, destino.fecha);
      if (
        bloqueOrigen &&
        (bloque.areaCurricular !== bloqueOrigen.areaCurricular ||
          bloque.gradoNumero !== bloqueOrigen.gradoNumero)
      ) {
        throw new BadRequestException("Solo se puede copiar a bloques del mismo grado y área.");
      }
      await this.exigirBimestreAbierto(destino.fecha);
      const existente = await this.repository.planificacionDeBloque(
        destino.horarioId,
        destino.fecha,
      );
      if (existente?.estado === "ejecutada")
        throw new ConflictException(MENSAJES_PLANIFICACION.YA_EJECUTADA);
      const datos: DatosGuardarPlanificacion = {
        docenteId,
        cursoSeccionId: bloque.cursoSeccionId,
        horarioId: destino.horarioId,
        fecha: destino.fecha,
        numero: origen.numero,
        unidad: origen.unidad,
        titulo: origen.titulo,
        proposito: origen.proposito,
        evidencia: origen.evidencia,
        criterios: origen.criterios,
        instrumentoCodigo: origen.instrumentoCodigo,
        competenciasTransversales: origen.competenciasTransversales,
        enfoques: origen.enfoques,
        materiales: origen.materiales,
        referencias: origen.referencias,
        estado: "borrador",
        copiadaDeId: id,
        competencias: competencias.map(({ orden: _orden, ...c }) => c),
        momentos,
      };
      const nuevoId = await this.repository.guardar(datos, existente?.id ?? null);
      await this.auditar(actor, existente ? "actualizar" : "crear", nuevoId, { copiadaDe: id });
    }
    return { mensaje: MENSAJES_PLANIFICACION.COPIA_HECHA(dto.destinos.length) };
  }

  /** Vista previa del documento con el modelo estándar (HU4). */
  async documento(id: string, actor: ActorPlanificacion) {
    const completa = await this.obtener(id, actor);
    return await this.armarDocumento(completa);
  }

  async documentoPdf(id: string, actor: ActorPlanificacion): Promise<Buffer> {
    const doc = await this.documento(id, actor);
    return await generarSesionPdf(doc);
  }

  async documentoDocx(id: string, actor: ActorPlanificacion): Promise<Buffer> {
    const doc = await this.documento(id, actor);
    if (doc.borrador) throw new BadRequestException(MENSAJES_PLANIFICACION.WORD_SOLO_LISTA);
    return await generarSesionDocx(doc);
  }

  async armarDocumento(p: PlanificacionCompleta) {
    const [colegio, opciones, transversales, enfoques] = await Promise.all([
      this.institucion.get().catch(() => null),
      this.repository.opciones("instrumento_evaluacion"),
      this.repository.competenciasPorIds(
        (p.competenciasTransversales as { competenciaId: string }[]).map((t) => t.competenciaId),
      ),
      this.repository.enfoques(),
    ]);
    const materiales = p.materiales as Record<string, string[] | undefined>;
    return {
      institucion: colegio?.nombre ?? "I.E.",
      director: colegio?.director ?? "—",
      docente: p.docenteNombre,
      gradoSeccion: `${p.bloque.gradoNombre} / ${p.bloque.seccionNombre}`,
      area: p.bloque.cursoNombre,
      fecha: p.fecha,
      numero: p.numero,
      unidad: p.unidad,
      titulo: p.titulo,
      proposito: p.proposito,
      competencias: p.competencias,
      evidencia: p.evidencia,
      criterios: p.criterios,
      instrumento:
        opciones.find((o) => o.codigo === p.instrumentoCodigo)?.nombre ?? p.instrumentoCodigo,
      transversales: (
        p.competenciasTransversales as {
          competenciaId: string;
          capacidades: string[];
          desempeno?: string;
        }[]
      ).map((t) => ({
        competencia: transversales.find((x) => x.id === t.competenciaId)?.nombre ?? "—",
        capacidades: t.capacidades,
        desempeno: t.desempeno ?? null,
      })),
      enfoques: (p.enfoques as { enfoqueId: string; valores: string[]; acciones: string[] }[]).map(
        (e) => ({
          enfoque: enfoques.find((x) => x.id === e.enfoqueId)?.nombre ?? "—",
          valores: e.valores,
          acciones: e.acciones,
        }),
      ),
      materiales: {
        impresos: materiales.impresos ?? [],
        manipulativos: materiales.manipulativos ?? [],
        digitales: materiales.digitales ?? [],
      },
      momentos: p.momentos,
      referencias: p.referencias,
      borrador: p.estado === "borrador",
    };
  }

  /**
   * Se llama al firmar el ingreso en el kiosko (RF-011 V4): la planificación `lista` o `borrador`
   * del bloque pasa a `ejecutada`, queda ligada a la sesión y ya no se edita.
   */
  async vincularConSesion(sesionId: string): Promise<void> {
    const sesion = await this.repository.sesion(sesionId);
    if (!sesion) return;
    const plan = await this.repository.planificacionDeBloque(sesion.horarioId, sesion.fecha);
    if (!plan || plan.estado === "ejecutada") return;
    await this.repository.cambiarEstado(plan.id, "ejecutada", sesionId);
  }

  /** Título de la planificación del bloque de la sesión: sirve de tema si el docente no lo escribe. */
  async tituloDeSesion(sesionId: string): Promise<string | null> {
    const sesion = await this.repository.sesion(sesionId);
    if (!sesion) return null;
    const plan = await this.repository.planificacionDeBloque(sesion.horarioId, sesion.fecha);
    return plan && plan.docenteId === sesion.docenteId ? plan.titulo : null;
  }

  // ─── Reglas auxiliares ────────────────────────────────────────────────────

  private async bloqueDelDocente(
    horarioId: string,
    docenteId: string,
    fecha: string,
  ): Promise<BloqueDocente> {
    const bloque = await this.repository.bloque(horarioId);
    if (!bloque) throw new NotFoundException(MENSAJES_PLANIFICACION.BLOQUE_NO_ENCONTRADO);
    if (bloque.docenteId !== docenteId)
      throw new ForbiddenException(MENSAJES_PLANIFICACION.OTRO_DOCENTE);
    if (diaSemanaIso(fecha) !== bloque.diaSemana) {
      throw new BadRequestException(MENSAJES_PLANIFICACION.DIA_NO_COINCIDE);
    }
    return bloque;
  }

  private async exigirBimestreAbierto(fecha: string): Promise<void> {
    const periodo = await this.repository.periodoDeFecha(fecha);
    if (!periodo) throw new BadRequestException(MENSAJES_PLANIFICACION.FECHA_SIN_BIMESTRE);
    if (periodo.estado === "cerrado")
      throw new ForbiddenException(MENSAJES_PLANIFICACION.BIMESTRE_CERRADO);
  }

  private async armarDatos(
    dto: GuardarPlanificacionDto,
    docenteId: string,
    bloque: BloqueDocente,
    estado: "borrador",
    copiadaDeId: string | null,
  ): Promise<DatosGuardarPlanificacion> {
    const momentos = dto.momentos ?? [];
    if (hayMomentosRepetidos(momentos))
      throw new BadRequestException(MENSAJES_PLANIFICACION.MOMENTOS_REPETIDOS);

    const compDto = dto.competencias ?? [];
    const idsComp = [
      ...new Set([
        ...compDto.map((c) => c.competenciaId),
        ...(dto.competenciasTransversales ?? []).map((t) => t.competenciaId),
      ]),
    ];
    const catalogo = await this.repository.competenciasPorIds(idsComp);
    for (const id of idsComp) {
      if (!catalogo.some((c) => c.id === id)) {
        throw new BadRequestException(MENSAJES_PLANIFICACION.COMPETENCIA_NO_ENCONTRADA);
      }
    }
    for (const c of compDto) {
      const x = catalogo.find((k) => k.id === c.competenciaId)!;
      if (x.tipo !== "area" || x.areaCodigo !== bloque.areaCurricular) {
        throw new BadRequestException(MENSAJES_PLANIFICACION.COMPETENCIA_OTRA_AREA);
      }
    }
    for (const t of dto.competenciasTransversales ?? []) {
      if (catalogo.find((k) => k.id === t.competenciaId)!.tipo !== "transversal") {
        throw new BadRequestException(MENSAJES_PLANIFICACION.COMPETENCIA_OTRA_AREA);
      }
    }
    const idsDesempeno = compDto.flatMap((c) =>
      c.desempenos.flatMap((d) => (d.desempenoId ? [d.desempenoId] : [])),
    );
    const bases = await this.repository.desempenosPorIds(idsDesempeno);
    for (const id of idsDesempeno) {
      if (!bases.some((b) => b.id === id)) {
        throw new BadRequestException(MENSAJES_PLANIFICACION.DESEMPENO_NO_ENCONTRADO);
      }
    }

    return {
      docenteId,
      cursoSeccionId: bloque.cursoSeccionId,
      horarioId: dto.horarioId,
      fecha: dto.fecha,
      numero: dto.numero ?? null,
      unidad: dto.unidad?.trim() || null,
      titulo: dto.titulo.trim(),
      proposito: dto.proposito?.trim() || null,
      evidencia: dto.evidencia?.trim() || null,
      criterios: (dto.criterios ?? []).map((c) => c.trim()).filter(Boolean),
      instrumentoCodigo: dto.instrumentoCodigo ?? null,
      competenciasTransversales: dto.competenciasTransversales ?? [],
      enfoques: dto.enfoques ?? [],
      materiales: { ...(dto.materiales ?? {}) },
      referencias: (dto.referencias ?? []).map((r) => r.trim()).filter(Boolean),
      estado,
      copiadaDeId,
      competencias: compDto.map((c) => ({
        competenciaId: c.competenciaId,
        competenciaTexto: catalogo.find((k) => k.id === c.competenciaId)!.nombre,
        capacidades: c.capacidades,
        desempenos: c.desempenos.map((d) => ({
          desempenoId: d.desempenoId ?? null,
          base: d.desempenoId ? (bases.find((b) => b.id === d.desempenoId)?.texto ?? null) : null,
          texto: d.texto.trim(),
        })),
        campoTematico: c.campoTematico?.trim() || null,
      })),
      momentos: momentos.map((m) => ({
        momento: m.momento,
        actividades: m.actividades?.trim() || null,
        minutos: m.minutos ?? null,
      })),
    };
  }
}

/** Rango por defecto: 60 días atrás a 30 días adelante. */
export function rangoDe(query: { desde?: string; hasta?: string }): {
  desde: string;
  hasta: string;
} {
  const hoy = ahoraEnColegio().fecha;
  return {
    desde: query.desde ?? sumarDiasFecha(hoy, -60),
    hasta: query.hasta ?? sumarDiasFecha(hoy, 30),
  };
}
