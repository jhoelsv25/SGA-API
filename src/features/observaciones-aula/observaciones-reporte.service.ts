import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { AnioLectivoCls } from "../../common/anio-lectivo";
import { generarReporteExcel, type ColumnaReporte } from "../../common/excel/reporte-excel.builder";
import { InstitucionService } from "../institucion/institucion.service";
import { MENSAJES_OBSERVACION, NIVEL_NOMBRE, NIVEL_ROMANO, type Nivel } from "./constants";
import type { MatrizQueryDto } from "./dto";
import type { ActorObservacion, FilaMatriz } from "./interfaces";
import { ObservacionesComunService } from "./observaciones-comun.service";
import { ObservacionesProgramacionService } from "./observaciones-programacion.service";
import { evolucionDeNivel, generarProtocoloPdf, type Evolucion } from "./utils";

/** Historial, matriz de desempeños, cobertura, protocolo en PDF y resumen del consolidado (RF-023). */
@Injectable()
export class ObservacionesReporteService {
  constructor(
    private readonly comun: ObservacionesComunService,
    private readonly programacion: ObservacionesProgramacionService,
    private readonly institucion: InstitucionService,
    private readonly anioLectivo: AnioLectivoCls,
  ) {}

  private get repo() {
    return this.comun.repository;
  }

  private async anioDe(anioAcademicoId?: string): Promise<string> {
    const id = anioAcademicoId ?? this.anioLectivo.id() ?? (await this.repo.anioEnCurso());
    if (!id) throw new BadRequestException(MENSAJES_OBSERVACION.SIN_ANIO);
    return id;
  }

  /** Cada observación calificada del docente y cómo cambió cada desempeño respecto a la anterior. */
  async historialDocente(docenteId: string, actor: ActorObservacion, anioAcademicoId?: string) {
    const docente = await this.repo.obtenerDocente(docenteId);
    if (!docente) throw new BadRequestException(MENSAJES_OBSERVACION.DOCENTE_NO_ENCONTRADO);
    if (docente.personaId === actor.personaId) {
      throw new ForbiddenException(MENSAJES_OBSERVACION.NO_TIENE_PERMISO);
    }
    const anio = await this.anioDe(anioAcademicoId);
    const filas = (await this.repo.calificacionesDelAnio(anio)).filter(
      (f) => f.docenteId === docenteId,
    );
    if (filas.length === 0) {
      return { docenteId, observaciones: [], mensaje: MENSAJES_OBSERVACION.SIN_OBSERVACIONES };
    }
    const porObservacion = new Map<
      string,
      { observacionId: string; fecha: string; observador: string; niveles: Record<number, Nivel> }
    >();
    for (const f of filas) {
      const actual = porObservacion.get(f.observacionId) ?? {
        observacionId: f.observacionId,
        fecha: f.fecha,
        observador: f.observadorNombre,
        niveles: {},
      };
      actual.niveles[f.desempeno] = f.nivel;
      porObservacion.set(f.observacionId, actual);
    }
    const ordenadas = [...porObservacion.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const observaciones = ordenadas.map((o, i) => {
      const anterior = i > 0 ? ordenadas[i - 1] : null;
      const evolucion: Record<number, Evolucion | null> = {};
      for (const [desempeno, nivel] of Object.entries(o.niveles)) {
        const previo = anterior?.niveles[Number(desempeno)];
        evolucion[Number(desempeno)] = previo ? evolucionDeNivel(previo, nivel) : null;
      }
      return { ...o, evolucion };
    });
    return { docenteId, observaciones };
  }

  /** Último nivel vigente de cada desempeño por docente, con la cobertura del cronograma. */
  async matriz(query: MatrizQueryDto) {
    const anio = await this.anioDe(query.anioAcademicoId);
    const [docentes, filas, cobertura] = await Promise.all([
      this.repo.docentesActivos(),
      this.repo.calificacionesDelAnio(anio),
      this.programacion.cronograma(anio),
    ]);
    const matriz: FilaMatriz[] = docentes.map((d) => {
      const niveles: FilaMatriz["niveles"] = { 1: null, 2: null, 3: null, 4: null, 5: null };
      // Las filas vienen por fecha ascendente: la última de cada desempeño es la vigente.
      for (const f of filas.filter((x) => x.docenteId === d.id)) {
        niveles[f.desempeno] = { nivel: f.nivel, fecha: f.fecha };
      }
      return { docenteId: d.id, docenteNombre: d.nombre, niveles };
    });
    const filtradas = matriz.filter((fila) => {
      const desempenos = query.desempeno ? [query.desempeno] : [1, 2, 3, 4, 5];
      const celdas = desempenos.map((n) => fila.niveles[n]);
      if (query.nivel) return celdas.some((c) => c?.nivel === query.nivel);
      return query.desempeno ? celdas.some((c) => c !== null) : true;
    });
    return { anioAcademicoId: anio, matriz: filtradas, cobertura };
  }

  async matrizExcel(query: MatrizQueryDto, generadoPor: string): Promise<Buffer> {
    const { matriz, cobertura } = await this.matriz(query);
    const institucion = await this.institucion.get().catch(() => null);
    const columnas: ColumnaReporte[] = [
      { header: "Docente", key: "docente", ancho: 34, requerido: true },
      ...[1, 2, 3, 4, 5].flatMap((n) => [
        { header: `Desempeño ${n}`, key: `d${n}`, ancho: 14 },
        { header: `Fecha desempeño ${n}`, key: `f${n}`, ancho: 14 },
      ]),
    ];
    const celda = (c: FilaMatriz["niveles"][number]) =>
      c ? NIVEL_ROMANO[c.nivel] : "Sin observar";
    return generarReporteExcel({
      titulo: "Observaciones de aula — matriz por desempeño",
      modulo: "observaciones-aula",
      columnas,
      filas: matriz.map((fila) => ({
        docente: fila.docenteNombre,
        ...Object.fromEntries(
          [1, 2, 3, 4, 5].flatMap((n) => [
            [`d${n}`, celda(fila.niveles[n])],
            [`f${n}`, fila.niveles[n]?.fecha ?? ""],
          ]),
        ),
      })),
      hojasExtra: [
        {
          nombre: "Cobertura",
          columnas: [
            { header: "Docente", key: "docente", ancho: 34 },
            { header: "Realizadas", key: "realizadas", ancho: 12, tipo: "numero" },
            { header: "Programadas", key: "programadas", ancho: 12, tipo: "numero" },
            { header: "Meta", key: "meta", ancho: 10, tipo: "numero" },
            { header: "Faltan para la meta", key: "faltan", ancho: 18, tipo: "numero" },
          ],
          filas: cobertura.docentes.map((d) => ({
            docente: d.docenteNombre,
            realizadas: d.realizadas,
            programadas: d.programadas,
            meta: d.meta,
            faltan: d.faltanParaMeta,
          })),
        },
      ],
      filtros: {
        Nivel: query.nivel ? NIVEL_ROMANO[query.nivel as Nivel] : undefined,
        Desempeño: query.desempeno ? String(query.desempeno) : undefined,
        Cobertura: `${cobertura.total.realizadas} de ${cobertura.total.meta} (${cobertura.total.porcentaje} %)`,
      },
      generadoPor,
      institucion: institucion?.nombre ?? "I.E.",
    });
  }

  /** Protocolo de retroalimentación para imprimir y firmar. La descarga queda en la bitácora. */
  async protocoloPdf(id: string, actor: ActorObservacion): Promise<Buffer> {
    const obs = await this.comun.cargar(id);
    if (actor.personaId === obs.docentePersonaId) {
      throw new ForbiddenException(MENSAJES_OBSERVACION.NO_TIENE_PERMISO);
    }
    if (obs.estado !== "retroalimentada") {
      throw new BadRequestException(MENSAJES_OBSERVACION.SOLO_RETROALIMENTADA);
    }
    const [instrumento, notas, califs, compromisos, colegio] = await Promise.all([
      this.repo.instrumento(obs.instrumentoId),
      this.repo.notas(id),
      this.repo.calificacionesVigentes(id),
      this.repo.compromisosVigentes(id),
      this.institucion.get().catch(() => null),
    ]);
    const contenido = instrumento?.contenido ?? { desempenos: [] };
    const pdf = await generarProtocoloPdf({
      colegio: {
        nombre: colegio?.nombre ?? "I.E.",
        codigoModular: colegio?.codigoModular,
        ugel: colegio?.ugel,
        dre: colegio?.dre,
      },
      docente: { nombre: obs.docenteNombre, documento: obs.docenteDocumento },
      curso: { curso: obs.cursoNombre, grado: obs.gradoNombre, seccion: obs.seccionNombre },
      visita: {
        fecha: obs.fecha,
        horaInicio: obs.horaInicioReal,
        horaFin: obs.horaFinReal,
        minutos: obs.minutosTotales,
        estudiantes: obs.estudiantesPresentes,
        observador: obs.observadorNombre,
        instrumento: instrumento?.nombre ?? "",
      },
      reunion: {
        fecha: obs.retroFecha,
        horaInicio: obs.retroHoraInicio,
        horaFin: obs.retroHoraFin,
        resumen: obs.retroResumen,
      },
      desempenos: contenido.desempenos.map((d) => {
        const c = califs.find((x) => x.desempeno === d.numero);
        const nivel = c?.nivel ?? 1;
        return {
          numero: d.numero,
          nombre: d.nombre,
          nivelRomano: NIVEL_ROMANO[nivel],
          nivelNombre: NIVEL_NOMBRE[nivel],
          fundamento: c?.fundamento ?? "",
          notas: notas.filter((n) => n.desempeno === d.numero).map((n) => n.texto),
        };
      }),
      compromisos: compromisos.map((c) => ({
        desempeno: c.desempeno,
        descripcion: c.descripcion,
        fechaRevision: c.fechaRevision,
      })),
    });
    await this.comun.auditar(actor, "crear", "observaciones_aula", id, {
      accion: "descarga_protocolo_pdf",
    });
    return pdf;
  }

  /**
   * Resumen de solo lectura de la última observación retroalimentada del docente en el bimestre,
   * para el consolidado (RF-013). No cambia los totales ni la decisión.
   */
  async resumenParaConsolidado(docenteId: string, periodoId: string, actor: ActorObservacion) {
    if (actor.role === "Docente") {
      const propio = await this.repo.obtenerDocenteDePersona(actor.personaId);
      if (!propio || propio.id !== docenteId) {
        throw new ForbiddenException(MENSAJES_OBSERVACION.NO_TIENE_PERMISO);
      }
    }
    const ultima = await this.repo.ultimaRetroalimentadaDelPeriodo(docenteId, periodoId);
    if (!ultima) return { observacion: null };
    const califs = await this.repo.calificacionesVigentes(ultima.id);
    return {
      observacion: {
        observacionId: ultima.id,
        fecha: ultima.fecha,
        niveles: califs.map((c) => ({
          desempeno: c.desempeno,
          nivel: c.nivel,
          nivelRomano: NIVEL_ROMANO[c.nivel],
        })),
      },
    };
  }
}
