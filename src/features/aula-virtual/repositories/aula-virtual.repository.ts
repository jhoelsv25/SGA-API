import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, inArray, isNotNull, isNull, max, or, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  actividadAula,
  aniosAcademicos,
  apoderados,
  chatLecturas,
  comentariosPublicacion,
  cursos,
  cursosSeccion,
  docentes,
  entregasTarea,
  estudianteApoderados,
  estudiantes,
  grados,
  horarios,
  materialCambiosFecha,
  materialVersiones,
  materiales,
  matriculas,
  mensajesChat,
  notificaciones,
  opcionesPregunta,
  periodosAcademicos,
  personas,
  preguntasTarea,
  publicacionesAula,
  roles,
  secciones,
  sesionesClase,
  tareas,
  unidadesAprendizaje,
  usuarioRoles,
  usuarios,
  variablesSistema,
} from "../../../core/database/schema";
import {
  VARIABLES_NOTA_PESO,
  type AccionActividadAula,
  type CalculoNotaIntentos,
  type EstadoEntrega,
  type EstadoSolicitudFecha,
  type EstadoTarea,
  type RevelarRespuestas,
  type TipoMaterial,
  type TipoModeracion,
  type TipoPregunta,
  type TipoTarea,
} from "../constants";
import type {
  ActividadEstudianteMaterial,
  ActividadEstudianteTarea,
  CambioFechaHistorial,
  ComentarioMuroFila,
  ContenidoMaterial,
  CursoAula,
  CursoAulaResumen,
  EntregaFila,
  FilaSeguimiento,
  HistorialModeracionFila,
  HorarioBloque,
  IAulaVirtualRepository,
  MaterialFila,
  MensajeChatFila,
  NuevaTarea,
  NuevaUnidad,
  NuevoMaterial,
  PeriodoAula,
  PreguntaConOpciones,
  PublicacionMuroFila,
  SesionEnlazada,
  SolicitudFila,
  TareaConPreguntas,
  TareaFila,
  UnidadFila,
} from "../interfaces";

const nombreSql = (p: typeof personas) =>
  sql<string>`TRIM(${p.apellidoPaterno} || ' ' || COALESCE(${p.apellidoMaterno}, '') || ', ' || ${p.nombres})`;

const seccionNombreSql = sql<string>`${grados.numero} || '.° ' || ${secciones.nombre}`;

const columnasMaterial = {
  id: materiales.id,
  unidadId: materiales.unidadId,
  cursoSeccionId: unidadesAprendizaje.cursoSeccionId,
  periodoId: unidadesAprendizaje.periodoId,
  docenteId: materiales.publicadoPorId,
  titulo: materiales.titulo,
  descripcion: materiales.descripcion,
  tipo: materiales.tipo,
  url: materiales.url,
  archivoNombre: materiales.archivoNombre,
  archivoTamanoBytes: materiales.archivoTamanoBytes,
  horarioId: materiales.horarioId,
  esPlanificado: materiales.esPlanificado,
  fechaCongelada: materiales.fechaCongelada,
  vigente: materiales.vigente,
  visible: materiales.visible,
  orden: materiales.orden,
  fechaProgramada: materiales.fechaProgramada,
  publicadoEn: materiales.publicadoEn,
  sesionClaseId: materiales.sesionClaseId,
};

type FilaMaterialBruta = Omit<MaterialFila, "tipo"> & { tipo: string };

function aMaterial(fila: FilaMaterialBruta): MaterialFila {
  return { ...fila, tipo: fila.tipo as TipoMaterial };
}

const columnasTarea = {
  id: tareas.id,
  cursoSeccionId: tareas.cursoSeccionId,
  periodoId: tareas.periodoId,
  unidadId: tareas.unidadId,
  sesionClaseId: tareas.sesionClaseId,
  titulo: tareas.titulo,
  instrucciones: tareas.instrucciones,
  tipo: tareas.tipo,
  puntajeMaximo: sql<number>`${tareas.puntajeMaximo}::float`,
  publicadaEn: tareas.publicadaEn,
  fechaLimite: tareas.fechaLimite,
  permiteEntregaTardia: tareas.permiteEntregaTardia,
  intentosMaximos: sql<number>`${tareas.intentosMaximos}::int`,
  limiteTiempoMinutos: tareas.limiteTiempoMinutos,
  calculoNotaIntentos: tareas.calculoNotaIntentos,
  revelarRespuestas: tareas.revelarRespuestas,
  tiposArchivo: tareas.tiposArchivo,
  estado: tareas.estado,
  creadoEn: tareas.creadoEn,
  actualizadoEn: tareas.actualizadoEn,
};

function aTarea(fila: Record<string, unknown>): TareaFila {
  return {
    id: String(fila.id),
    cursoSeccionId: String(fila.cursoSeccionId),
    periodoId: (fila.periodoId as string | null) ?? null,
    unidadId: (fila.unidadId as string | null) ?? null,
    sesionClaseId: (fila.sesionClaseId as string | null) ?? null,
    titulo: String(fila.titulo),
    instrucciones: (fila.instrucciones as string | null) ?? null,
    tipo: (fila.tipo as TipoTarea) || "trabajo",
    puntajeMaximo: Number(fila.puntajeMaximo) || 20,
    publicadaEn: (fila.publicadaEn as string | null) ?? null,
    fechaLimite: String(fila.fechaLimite),
    permiteEntregaTardia: Boolean(fila.permiteEntregaTardia),
    intentosMaximos: Number(fila.intentosMaximos) || 1,
    limiteTiempoMinutos:
      fila.limiteTiempoMinutos !== null && fila.limiteTiempoMinutos !== undefined
        ? Number(fila.limiteTiempoMinutos)
        : null,
    calculoNotaIntentos: (fila.calculoNotaIntentos as CalculoNotaIntentos) || "mas_alta",
    revelarRespuestas: (fila.revelarRespuestas as RevelarRespuestas) || "al_terminar_intentos",
    tiposArchivo: (fila.tiposArchivo as string | null) ?? null,
    estado: (fila.estado as EstadoTarea) || "borrador",
    creadoEn: String(fila.creadoEn),
    actualizadoEn: String(fila.actualizadoEn),
  };
}

const columnasEntrega = {
  id: entregasTarea.id,
  tareaId: entregasTarea.tareaId,
  matriculaId: entregasTarea.matriculaId,
  intento: sql<number>`${entregasTarea.intento}::int`,
  iniciadoEn: entregasTarea.iniciadoEn,
  entregadaEn: entregasTarea.entregadaEn,
  texto: entregasTarea.texto,
  archivoUrl: entregasTarea.archivoUrl,
  archivoNombre: entregasTarea.archivoNombre,
  archivoTamanoBytes: entregasTarea.archivoTamanoBytes,
  enlaceUrl: entregasTarea.enlaceUrl,
  respuestas: entregasTarea.respuestas,
  esTardia: entregasTarea.esTardia,
  estado: entregasTarea.estado,
  nota: sql<number | null>`${entregasTarea.nota}::float`,
  retroalimentacion: entregasTarea.retroalimentacion,
  calificadaPorId: entregasTarea.calificadaPorId,
  calificadaEn: entregasTarea.calificadaEn,
};

function aEntrega(fila: Record<string, unknown>): EntregaFila {
  return {
    id: String(fila.id),
    tareaId: String(fila.tareaId),
    matriculaId: String(fila.matriculaId),
    estudianteId: typeof fila.estudianteId === "string" ? fila.estudianteId : undefined,
    estudianteNombre: typeof fila.estudianteNombre === "string" ? fila.estudianteNombre : undefined,
    intento: Number(fila.intento) || 1,
    iniciadoEn: String(fila.iniciadoEn),
    entregadaEn: (fila.entregadaEn as string | null) ?? null,
    texto: (fila.texto as string | null) ?? null,
    archivoUrl: (fila.archivoUrl as string | null) ?? null,
    archivoNombre: (fila.archivoNombre as string | null) ?? null,
    archivoTamanoBytes:
      fila.archivoTamanoBytes !== null && fila.archivoTamanoBytes !== undefined
        ? Number(fila.archivoTamanoBytes)
        : null,
    enlaceUrl: (fila.enlaceUrl as string | null) ?? null,
    respuestas: (fila.respuestas as Record<string, unknown> | null) ?? null,
    esTardia: Boolean(fila.esTardia),
    estado: (fila.estado as EstadoEntrega) || "entregada",
    nota: fila.nota !== null && fila.nota !== undefined ? Number(fila.nota) : null,
    retroalimentacion: (fila.retroalimentacion as string | null) ?? null,
    calificadaPorId: (fila.calificadaPorId as string | null) ?? null,
    calificadaEn: (fila.calificadaEn as string | null) ?? null,
  };
}

@Injectable()
export class AulaVirtualRepository implements IAulaVirtualRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findDocenteIdPorPersona(personaId: string): Promise<string | null> {
    const [fila] = await this.db
      .select({ id: docentes.id })
      .from(docentes)
      .where(eq(docentes.personaId, personaId))
      .limit(1);
    return fila?.id ?? null;
  }

  async findCurso(cursoSeccionId: string): Promise<CursoAula | null> {
    const [fila] = await this.db
      .select({
        id: cursosSeccion.id,
        docenteId: cursosSeccion.docenteId,
        seccionId: cursosSeccion.seccionId,
        anioAcademicoId: secciones.anioAcademicoId,
        cursoNombre: cursos.nombre,
        seccionNombre: seccionNombreSql,
      })
      .from(cursosSeccion)
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .where(eq(cursosSeccion.id, cursoSeccionId))
      .limit(1);
    return fila ?? null;
  }

  async findPeriodo(periodoId: string): Promise<PeriodoAula | null> {
    const [fila] = await this.db
      .select({
        id: periodosAcademicos.id,
        anioAcademicoId: periodosAcademicos.anioAcademicoId,
        nombre: periodosAcademicos.nombre,
        fechaInicio: periodosAcademicos.fechaInicio,
        fechaFin: periodosAcademicos.fechaFin,
        estado: periodosAcademicos.estado,
      })
      .from(periodosAcademicos)
      .where(eq(periodosAcademicos.id, periodoId))
      .limit(1);
    return fila ?? null;
  }

  async findPeriodoEnCurso(anioAcademicoId: string): Promise<PeriodoAula | null> {
    const [fila] = await this.db
      .select({
        id: periodosAcademicos.id,
        anioAcademicoId: periodosAcademicos.anioAcademicoId,
        nombre: periodosAcademicos.nombre,
        fechaInicio: periodosAcademicos.fechaInicio,
        fechaFin: periodosAcademicos.fechaFin,
        estado: periodosAcademicos.estado,
      })
      .from(periodosAcademicos)
      .where(
        and(
          eq(periodosAcademicos.anioAcademicoId, anioAcademicoId),
          eq(periodosAcademicos.estado, "en_curso"),
        ),
      )
      .limit(1);
    return fila ?? null;
  }

  async leerVariableEntera(codigo: string, porDefecto: number): Promise<number> {
    const [fila] = await this.db
      .select({ valor: variablesSistema.valor })
      .from(variablesSistema)
      .where(and(eq(variablesSistema.codigo, codigo), eq(variablesSistema.vigente, true)))
      .limit(1);
    const numero = fila ? Number(fila.valor) : Number.NaN;
    return Number.isFinite(numero) ? numero : porDefecto;
  }

  async cursosDelDocente(docenteId: string, anioAcademicoId: string): Promise<CursoAulaResumen[]> {
    return this.db
      .select({
        cursoSeccionId: cursosSeccion.id,
        cursoNombre: cursos.nombre,
        seccionNombre: seccionNombreSql,
        docenteNombre: nombreSql(personas),
      })
      .from(cursosSeccion)
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .innerJoin(docentes, eq(docentes.id, cursosSeccion.docenteId))
      .innerJoin(personas, eq(personas.id, docentes.personaId))
      .where(
        and(eq(cursosSeccion.docenteId, docenteId), eq(secciones.anioAcademicoId, anioAcademicoId)),
      )
      .orderBy(asc(grados.numero), asc(secciones.nombre), asc(cursos.nombre));
  }

  async cursosDelEstudiante(
    personaId: string,
    anioAcademicoId: string,
  ): Promise<CursoAulaResumen[]> {
    const docentePersona = sql<string | null>`(
      SELECT ${nombreSql(personas)} FROM ${docentes}
      JOIN ${personas} ON ${personas.id} = ${docentes.personaId}
      WHERE ${docentes.id} = ${cursosSeccion.docenteId})`;
    return this.db
      .select({
        cursoSeccionId: cursosSeccion.id,
        cursoNombre: cursos.nombre,
        seccionNombre: seccionNombreSql,
        docenteNombre: docentePersona,
      })
      .from(matriculas)
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .innerJoin(secciones, eq(secciones.id, matriculas.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .innerJoin(cursosSeccion, eq(cursosSeccion.seccionId, secciones.id))
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .where(
        and(
          or(eq(estudiantes.personaId, personaId), eq(estudiantes.id, personaId)),
          eq(matriculas.anioAcademicoId, anioAcademicoId),
          inArray(matriculas.estado, ["matriculado", "vigente"]),
        ),
      )
      .orderBy(asc(cursos.nombre));
  }

  async estudianteTieneMatriculaEnSeccion(personaId: string, seccionId: string): Promise<boolean> {
    const [fila] = await this.db
      .select({ id: matriculas.id })
      .from(matriculas)
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .where(
        and(
          eq(estudiantes.personaId, personaId),
          eq(matriculas.seccionId, seccionId),
          inArray(matriculas.estado, ["matriculado", "vigente"]),
        ),
      )
      .limit(1);
    return Boolean(fila);
  }

  async cursosDelAnio(anioAcademicoId: string): Promise<CursoAulaResumen[]> {
    const docentePersona = sql<string | null>`(
      SELECT ${nombreSql(personas)} FROM ${docentes}
      JOIN ${personas} ON ${personas.id} = ${docentes.personaId}
      WHERE ${docentes.id} = ${cursosSeccion.docenteId})`;
    return this.db
      .select({
        cursoSeccionId: cursosSeccion.id,
        cursoNombre: cursos.nombre,
        seccionNombre: seccionNombreSql,
        docenteNombre: docentePersona,
      })
      .from(cursosSeccion)
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .where(eq(secciones.anioAcademicoId, anioAcademicoId))
      .orderBy(asc(grados.numero), asc(secciones.nombre), asc(cursos.nombre));
  }

  async cursosDelApoderado(
    apoderadoPersonaId: string,
    anioAcademicoId: string,
  ): Promise<CursoAulaResumen[]> {
    const docentePersona = sql<string | null>`(
      SELECT ${nombreSql(personas)} FROM ${docentes}
      JOIN ${personas} ON ${personas.id} = ${docentes.personaId}
      WHERE ${docentes.id} = ${cursosSeccion.docenteId})`;
    const filas = await this.db
      .select({
        cursoSeccionId: cursosSeccion.id,
        cursoNombre: cursos.nombre,
        seccionNombre: seccionNombreSql,
        docenteNombre: docentePersona,
      })
      .from(estudianteApoderados)
      .innerJoin(apoderados, eq(apoderados.id, estudianteApoderados.apoderadoId))
      .innerJoin(estudiantes, eq(estudiantes.id, estudianteApoderados.estudianteId))
      .innerJoin(matriculas, eq(matriculas.estudianteId, estudiantes.id))
      .innerJoin(secciones, eq(secciones.id, matriculas.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .innerJoin(cursosSeccion, eq(cursosSeccion.seccionId, secciones.id))
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .where(
        and(
          eq(apoderados.personaId, apoderadoPersonaId),
          isNull(apoderados.eliminadoEn),
          eq(matriculas.anioAcademicoId, anioAcademicoId),
          inArray(matriculas.estado, ["matriculado", "vigente"]),
        ),
      )
      .orderBy(asc(grados.numero), asc(secciones.nombre), asc(cursos.nombre));

    const vistos = new Set<string>();
    return filas.filter((f) => {
      if (vistos.has(f.cursoSeccionId)) return false;
      vistos.add(f.cursoSeccionId);
      return true;
    });
  }

  async apoderadoTieneHijoEnSeccion(
    apoderadoPersonaId: string,
    seccionId: string,
  ): Promise<boolean> {
    const [fila] = await this.db
      .select({ id: matriculas.id })
      .from(estudianteApoderados)
      .innerJoin(apoderados, eq(apoderados.id, estudianteApoderados.apoderadoId))
      .innerJoin(estudiantes, eq(estudiantes.id, estudianteApoderados.estudianteId))
      .innerJoin(matriculas, eq(matriculas.estudianteId, estudiantes.id))
      .where(
        and(
          eq(apoderados.personaId, apoderadoPersonaId),
          isNull(apoderados.eliminadoEn),
          eq(matriculas.seccionId, seccionId),
          inArray(matriculas.estado, ["matriculado", "vigente"]),
        ),
      )
      .limit(1);
    return Boolean(fila);
  }

  async esApoderadoDeEstudiante(
    apoderadoPersonaId: string,
    estudiantePersonaIdOId: string,
  ): Promise<boolean> {
    const [fila] = await this.db
      .select({ estudianteId: estudiantes.id })
      .from(estudianteApoderados)
      .innerJoin(apoderados, eq(apoderados.id, estudianteApoderados.apoderadoId))
      .innerJoin(estudiantes, eq(estudiantes.id, estudianteApoderados.estudianteId))
      .where(
        and(
          eq(apoderados.personaId, apoderadoPersonaId),
          isNull(apoderados.eliminadoEn),
          or(
            eq(estudiantes.personaId, estudiantePersonaIdOId),
            eq(estudiantes.id, estudiantePersonaIdOId),
          ),
        ),
      )
      .limit(1);
    return Boolean(fila);
  }

  async estudiantesDeApoderadoEnSeccion(
    apoderadoPersonaId: string,
    seccionId: string,
  ): Promise<
    Array<{
      estudianteId: string;
      personaId: string;
      matriculaId: string;
      nombreCompleto: string;
    }>
  > {
    return this.db
      .select({
        estudianteId: estudiantes.id,
        personaId: personas.id,
        matriculaId: matriculas.id,
        nombreCompleto: nombreSql(personas),
      })
      .from(estudianteApoderados)
      .innerJoin(apoderados, eq(apoderados.id, estudianteApoderados.apoderadoId))
      .innerJoin(estudiantes, eq(estudiantes.id, estudianteApoderados.estudianteId))
      .innerJoin(personas, eq(personas.id, estudiantes.personaId))
      .innerJoin(matriculas, eq(matriculas.estudianteId, estudiantes.id))
      .where(
        and(
          eq(apoderados.personaId, apoderadoPersonaId),
          isNull(apoderados.eliminadoEn),
          eq(matriculas.seccionId, seccionId),
          inArray(matriculas.estado, ["matriculado", "vigente"]),
        ),
      )
      .orderBy(asc(personas.apellidoPaterno), asc(personas.nombres));
  }

  async listarUnidades(cursoSeccionId: string, soloPublicadas: boolean): Promise<UnidadFila[]> {
    return this.db
      .select()
      .from(unidadesAprendizaje)
      .where(
        and(
          eq(unidadesAprendizaje.cursoSeccionId, cursoSeccionId),
          soloPublicadas ? eq(unidadesAprendizaje.publicada, true) : undefined,
        ),
      )
      .orderBy(asc(unidadesAprendizaje.orden), asc(unidadesAprendizaje.creadoEn));
  }

  async findUnidad(unidadId: string): Promise<UnidadFila | null> {
    const [fila] = await this.db
      .select()
      .from(unidadesAprendizaje)
      .where(eq(unidadesAprendizaje.id, unidadId))
      .limit(1);
    return fila ?? null;
  }

  async siguienteOrdenUnidad(cursoSeccionId: string): Promise<number> {
    const [fila] = await this.db
      .select({ maximo: max(unidadesAprendizaje.orden) })
      .from(unidadesAprendizaje)
      .where(eq(unidadesAprendizaje.cursoSeccionId, cursoSeccionId));
    return (fila?.maximo ?? 0) + 1;
  }

  async crearUnidad(datos: NuevaUnidad): Promise<UnidadFila> {
    const [fila] = await this.db.insert(unidadesAprendizaje).values(datos).returning();
    return fila;
  }

  async actualizarUnidad(unidadId: string, datos: Partial<NuevaUnidad>): Promise<UnidadFila> {
    const [fila] = await this.db
      .update(unidadesAprendizaje)
      .set({ ...datos, actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(unidadesAprendizaje.id, unidadId))
      .returning();
    return fila;
  }

  async listarMateriales(
    cursoSeccionId: string,
    opciones: { soloPublicados: boolean },
  ): Promise<MaterialFila[]> {
    const filas = await this.db
      .select(columnasMaterial)
      .from(materiales)
      .innerJoin(unidadesAprendizaje, eq(unidadesAprendizaje.id, materiales.unidadId))
      .where(
        and(
          eq(unidadesAprendizaje.cursoSeccionId, cursoSeccionId),
          opciones.soloPublicados
            ? and(
                isNotNull(materiales.publicadoEn),
                eq(materiales.vigente, true),
                eq(materiales.visible, true),
              )
            : eq(materiales.vigente, true),
        ),
      )
      .orderBy(asc(materiales.orden), asc(materiales.creadoEn));
    return filas.map(aMaterial);
  }

  async findMaterial(materialId: string): Promise<MaterialFila | null> {
    const [fila] = await this.db
      .select(columnasMaterial)
      .from(materiales)
      .innerJoin(unidadesAprendizaje, eq(unidadesAprendizaje.id, materiales.unidadId))
      .where(eq(materiales.id, materialId))
      .limit(1);
    return fila ? aMaterial(fila) : null;
  }

  async siguienteOrdenMaterial(unidadId: string): Promise<number> {
    const [fila] = await this.db
      .select({ maximo: max(materiales.orden) })
      .from(materiales)
      .where(eq(materiales.unidadId, unidadId));
    return (fila?.maximo ?? 0) + 1;
  }

  async crearMaterial(datos: NuevoMaterial): Promise<MaterialFila> {
    const [creado] = await this.db
      .insert(materiales)
      .values({
        unidadId: datos.unidadId,
        publicadoPorId: datos.docenteId,
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        tipo: datos.tipo,
        horarioId: datos.horarioId,
        esPlanificado: datos.esPlanificado,
        fechaCongelada: datos.fechaCongelada,
        fechaProgramada: datos.fechaProgramada,
        orden: datos.orden,
      })
      .returning({ id: materiales.id });
    return this.requerirMaterial(creado.id);
  }

  async actualizarMaterial(
    materialId: string,
    datos: Partial<{
      titulo: string;
      descripcion: string | null;
      horarioId: string | null;
      fechaProgramada: string | null;
      visible: boolean;
    }>,
  ): Promise<MaterialFila> {
    await this.db
      .update(materiales)
      .set({ ...datos, actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(materiales.id, materialId));
    return this.requerirMaterial(materialId);
  }

  async publicarMaterial(
    materialId: string,
    contenido: ContenidoMaterial,
    publicadoEn: string,
    actorId: string,
  ): Promise<MaterialFila> {
    await this.db.transaction(async (tx) => {
      await tx.insert(materialVersiones).values({
        materialId,
        url: contenido.url,
        archivoNombre: contenido.archivoNombre,
        archivoTamanoBytes: contenido.archivoTamanoBytes,
        creadoPorId: actorId,
      });
      await tx
        .update(materiales)
        .set({
          url: contenido.url,
          archivoNombre: contenido.archivoNombre,
          archivoTamanoBytes: contenido.archivoTamanoBytes,
          publicadoEn,
          actualizadoEn: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(materiales.id, materialId));
    });
    return this.requerirMaterial(materialId);
  }

  async reemplazarContenido(
    materialId: string,
    contenido: ContenidoMaterial,
    actorId: string,
  ): Promise<MaterialFila> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(materialVersiones)
        .set({ vigente: false })
        .where(
          and(eq(materialVersiones.materialId, materialId), eq(materialVersiones.vigente, true)),
        );
      await tx.insert(materialVersiones).values({
        materialId,
        url: contenido.url,
        archivoNombre: contenido.archivoNombre,
        archivoTamanoBytes: contenido.archivoTamanoBytes,
        creadoPorId: actorId,
      });
      await tx
        .update(materiales)
        .set({
          url: contenido.url,
          archivoNombre: contenido.archivoNombre,
          archivoTamanoBytes: contenido.archivoTamanoBytes,
          actualizadoEn: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(materiales.id, materialId));
    });
    return this.requerirMaterial(materialId);
  }

  async retirarMaterial(materialId: string): Promise<void> {
    await this.db
      .update(materiales)
      .set({ vigente: false, actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(materiales.id, materialId));
  }

  async findHorario(horarioId: string): Promise<HorarioBloque | null> {
    const [fila] = await this.db
      .select({
        id: horarios.id,
        cursoSeccionId: horarios.cursoSeccionId,
        diaSemana: horarios.diaSemana,
        horaInicio: horarios.horaInicio,
        horaFin: horarios.horaFin,
        tipoBloque: horarios.tipoBloque,
      })
      .from(horarios)
      .where(eq(horarios.id, horarioId))
      .limit(1);
    return fila ?? null;
  }

  async bloquesDelCurso(cursoSeccionId: string): Promise<HorarioBloque[]> {
    return this.db
      .select({
        id: horarios.id,
        cursoSeccionId: horarios.cursoSeccionId,
        diaSemana: horarios.diaSemana,
        horaInicio: horarios.horaInicio,
        horaFin: horarios.horaFin,
        tipoBloque: horarios.tipoBloque,
      })
      .from(horarios)
      .where(and(eq(horarios.cursoSeccionId, cursoSeccionId), eq(horarios.tipoBloque, "clase")))
      .orderBy(asc(horarios.diaSemana), asc(horarios.horaInicio));
  }

  /** La sesión (RF-011) se enlaza por bloque y fecha: no depende de cuándo se genere. */
  async findSesionDeBloque(horarioId: string, fecha: string): Promise<SesionEnlazada | null> {
    const [fila] = await this.db
      .select({ id: sesionesClase.id, fecha: sesionesClase.fecha, tema: sesionesClase.tema })
      .from(sesionesClase)
      .where(and(eq(sesionesClase.horarioId, horarioId), eq(sesionesClase.fecha, fecha)))
      .limit(1);
    return fila ?? null;
  }

  async findSolicitudAbierta(materialId: string): Promise<{ id: string } | null> {
    const [fila] = await this.db
      .select({ id: materialCambiosFecha.id })
      .from(materialCambiosFecha)
      .where(
        and(
          eq(materialCambiosFecha.materialId, materialId),
          eq(materialCambiosFecha.estado, "solicitada"),
        ),
      )
      .limit(1);
    return fila ?? null;
  }

  async crearSolicitud(datos: {
    materialId: string;
    fechaAnterior: string;
    fechaSolicitada: string;
    motivo: string;
    solicitadoPorId: string;
  }): Promise<{ id: string }> {
    const [fila] = await this.db
      .insert(materialCambiosFecha)
      .values(datos)
      .returning({ id: materialCambiosFecha.id });
    return fila;
  }

  private consultaSolicitudes() {
    const docentePersona = personas;
    return this.db
      .select({
        id: materialCambiosFecha.id,
        materialId: materialCambiosFecha.materialId,
        materialTitulo: materiales.titulo,
        cursoSeccionId: unidadesAprendizaje.cursoSeccionId,
        cursoNombre: cursos.nombre,
        seccionNombre: seccionNombreSql,
        docenteNombre: nombreSql(docentePersona),
        fechaAnterior: materialCambiosFecha.fechaAnterior,
        fechaSolicitada: materialCambiosFecha.fechaSolicitada,
        motivo: materialCambiosFecha.motivo,
        estado: materialCambiosFecha.estado,
        solicitadoPorId: materialCambiosFecha.solicitadoPorId,
        solicitadoEn: materialCambiosFecha.solicitadoEn,
        resueltoEn: materialCambiosFecha.resueltoEn,
        respuesta: materialCambiosFecha.respuesta,
      })
      .from(materialCambiosFecha)
      .innerJoin(materiales, eq(materiales.id, materialCambiosFecha.materialId))
      .innerJoin(unidadesAprendizaje, eq(unidadesAprendizaje.id, materiales.unidadId))
      .innerJoin(cursosSeccion, eq(cursosSeccion.id, unidadesAprendizaje.cursoSeccionId))
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .innerJoin(docentes, eq(docentes.id, materiales.publicadoPorId))
      .innerJoin(personas, eq(personas.id, docentes.personaId));
  }

  async findSolicitud(solicitudId: string): Promise<SolicitudFila | null> {
    const [fila] = await this.consultaSolicitudes()
      .where(eq(materialCambiosFecha.id, solicitudId))
      .limit(1);
    return fila ? { ...fila, estado: fila.estado as EstadoSolicitudFecha } : null;
  }

  async listarSolicitudes(filtro: {
    estado?: EstadoSolicitudFecha;
    solicitadoPorId?: string;
  }): Promise<SolicitudFila[]> {
    const filas = await this.consultaSolicitudes()
      .where(
        and(
          filtro.estado ? eq(materialCambiosFecha.estado, filtro.estado) : undefined,
          filtro.solicitadoPorId
            ? eq(materialCambiosFecha.solicitadoPorId, filtro.solicitadoPorId)
            : undefined,
        ),
      )
      .orderBy(desc(materialCambiosFecha.solicitadoEn));
    return filas.map((fila) => ({ ...fila, estado: fila.estado as EstadoSolicitudFecha }));
  }

  async historialCambiosFecha(materialId: string): Promise<CambioFechaHistorial[]> {
    const filas = await this.db
      .select({
        id: materialCambiosFecha.id,
        fechaAnterior: materialCambiosFecha.fechaAnterior,
        fechaSolicitada: materialCambiosFecha.fechaSolicitada,
        motivo: materialCambiosFecha.motivo,
        estado: materialCambiosFecha.estado,
        solicitadoEn: materialCambiosFecha.solicitadoEn,
        resueltoEn: materialCambiosFecha.resueltoEn,
        respuesta: materialCambiosFecha.respuesta,
      })
      .from(materialCambiosFecha)
      .where(eq(materialCambiosFecha.materialId, materialId))
      .orderBy(desc(materialCambiosFecha.solicitadoEn));
    return filas.map((fila) => ({ ...fila, estado: fila.estado as EstadoSolicitudFecha }));
  }

  async aprobarSolicitud(
    solicitudId: string,
    resueltoPorId: string,
    respuesta: string | null,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [solicitud] = await tx
        .update(materialCambiosFecha)
        .set({
          estado: "aprobada",
          resueltoPorId,
          resueltoEn: sql`CURRENT_TIMESTAMP`,
          respuesta,
        })
        .where(eq(materialCambiosFecha.id, solicitudId))
        .returning({
          materialId: materialCambiosFecha.materialId,
          fechaSolicitada: materialCambiosFecha.fechaSolicitada,
        });
      await tx
        .update(materiales)
        .set({ fechaProgramada: solicitud.fechaSolicitada, actualizadoEn: sql`CURRENT_TIMESTAMP` })
        .where(eq(materiales.id, solicitud.materialId));
    });
  }

  async rechazarSolicitud(
    solicitudId: string,
    resueltoPorId: string,
    respuesta: string,
  ): Promise<void> {
    await this.db
      .update(materialCambiosFecha)
      .set({ estado: "rechazada", resueltoPorId, resueltoEn: sql`CURRENT_TIMESTAMP`, respuesta })
      .where(eq(materialCambiosFecha.id, solicitudId));
  }

  async usuariosConRol(nombresRol: readonly string[]): Promise<string[]> {
    const filas = await this.db
      .selectDistinct({ id: usuarios.id })
      .from(usuarios)
      .innerJoin(usuarioRoles, eq(usuarioRoles.usuarioId, usuarios.id))
      .innerJoin(roles, eq(roles.id, usuarioRoles.rolId))
      .where(
        and(
          inArray(roles.nombre, [...nombresRol]),
          eq(usuarioRoles.vigente, true),
          isNull(usuarios.eliminadoEn),
          eq(usuarios.estado, "activo"),
        ),
      );
    return filas.map((fila) => fila.id);
  }

  async usuariosEstudiantesDeSeccion(
    seccionId: string,
    anioAcademicoId: string,
  ): Promise<string[]> {
    const filas = await this.db
      .selectDistinct({ id: usuarios.id })
      .from(matriculas)
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .innerJoin(usuarios, eq(usuarios.personaId, estudiantes.personaId))
      .where(
        and(
          eq(matriculas.seccionId, seccionId),
          eq(matriculas.anioAcademicoId, anioAcademicoId),
          eq(matriculas.estado, "matriculado"),
          isNull(usuarios.eliminadoEn),
        ),
      );
    return filas.map((fila) => fila.id);
  }

  async seguimiento(periodoId: string, hoy: string): Promise<FilaSeguimiento[]> {
    const publicadoDia = sql`(${materiales.publicadoEn})::date`;
    const aTiempo = sql<number>`COUNT(*) FILTER (WHERE ${materiales.publicadoEn} IS NOT NULL AND ${publicadoDia} <= ${materiales.fechaProgramada})::int`;
    const fuera = sql<number>`COUNT(*) FILTER (WHERE ${materiales.publicadoEn} IS NOT NULL AND ${publicadoDia} > ${materiales.fechaProgramada})::int`;
    const noPublicados = sql<number>`COUNT(*) FILTER (WHERE ${materiales.publicadoEn} IS NULL AND ${materiales.fechaProgramada} < ${hoy}::date)::int`;
    const pendientes = sql<number>`(
      SELECT COUNT(*)::int FROM ${materialCambiosFecha} s
      JOIN ${materiales} m2 ON m2.id = s.material_id
      JOIN ${unidadesAprendizaje} u2 ON u2.id = m2.unidad_id
      WHERE s.estado = 'solicitada' AND u2.periodo_id = ${periodoId}
        AND u2.curso_seccion_id = ${unidadesAprendizaje.cursoSeccionId})`;
    return this.db
      .select({
        docenteId: docentes.id,
        docenteNombre: nombreSql(personas),
        cursoSeccionId: cursosSeccion.id,
        cursoNombre: cursos.nombre,
        seccionNombre: seccionNombreSql,
        planificados: sql<number>`COUNT(*)::int`,
        aTiempo,
        fueraDePlazo: fuera,
        noPublicados,
        solicitudesPendientes: pendientes,
      })
      .from(materiales)
      .innerJoin(unidadesAprendizaje, eq(unidadesAprendizaje.id, materiales.unidadId))
      .innerJoin(cursosSeccion, eq(cursosSeccion.id, unidadesAprendizaje.cursoSeccionId))
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .innerJoin(docentes, eq(docentes.id, materiales.publicadoPorId))
      .innerJoin(personas, eq(personas.id, docentes.personaId))
      .where(and(eq(unidadesAprendizaje.periodoId, periodoId), eq(materiales.esPlanificado, true)))
      .groupBy(
        docentes.id,
        personas.id,
        cursosSeccion.id,
        cursos.id,
        grados.id,
        secciones.id,
        unidadesAprendizaje.cursoSeccionId,
      )
      .orderBy(asc(personas.apellidoPaterno), asc(cursos.nombre));
  }

  /* === RF-016: Tareas, Entregas y Calificación === */
  async listarTareas(
    cursoSeccionId: string,
    opciones: { soloPublicadas?: boolean; unidadId?: string; periodoId?: string },
  ): Promise<TareaFila[]> {
    const condiciones = [eq(tareas.cursoSeccionId, cursoSeccionId)];
    if (opciones.soloPublicadas) {
      condiciones.push(eq(tareas.estado, "publicada"));
    }
    if (opciones.unidadId) {
      condiciones.push(eq(tareas.unidadId, opciones.unidadId));
    }
    if (opciones.periodoId) {
      condiciones.push(eq(tareas.periodoId, opciones.periodoId));
    }

    const filas = await this.db
      .select(columnasTarea)
      .from(tareas)
      .where(and(...condiciones))
      .orderBy(asc(tareas.fechaLimite), asc(tareas.creadoEn));

    return filas.map(aTarea);
  }

  async findTarea(tareaId: string): Promise<TareaConPreguntas | null> {
    const [fila] = await this.db
      .select(columnasTarea)
      .from(tareas)
      .where(eq(tareas.id, tareaId))
      .limit(1);

    if (!fila) return null;
    const tareaBase = aTarea(fila);

    const filasPreguntas = await this.db
      .select({
        id: preguntasTarea.id,
        tareaId: preguntasTarea.tareaId,
        enunciado: preguntasTarea.enunciado,
        tipo: preguntasTarea.tipo,
        puntaje: sql<number>`${preguntasTarea.puntaje}::float`,
        orden: preguntasTarea.orden,
      })
      .from(preguntasTarea)
      .where(eq(preguntasTarea.tareaId, tareaId))
      .orderBy(asc(preguntasTarea.orden));

    const preguntasIds = filasPreguntas.map((p) => p.id);
    const filasOpciones =
      preguntasIds.length > 0
        ? await this.db
            .select({
              id: opcionesPregunta.id,
              preguntaId: opcionesPregunta.preguntaId,
              texto: opcionesPregunta.texto,
              esCorrecta: opcionesPregunta.esCorrecta,
              orden: opcionesPregunta.orden,
            })
            .from(opcionesPregunta)
            .where(inArray(opcionesPregunta.preguntaId, preguntasIds))
            .orderBy(asc(opcionesPregunta.orden))
        : [];

    const opcionesPorPregunta = new Map<
      string,
      Array<{ id: string; texto: string; esCorrecta: boolean; orden: number }>
    >();
    for (const o of filasOpciones) {
      const arr = opcionesPorPregunta.get(o.preguntaId) || [];
      arr.push({
        id: o.id,
        texto: o.texto,
        esCorrecta: o.esCorrecta,
        orden: o.orden,
      });
      opcionesPorPregunta.set(o.preguntaId, arr);
    }

    const preguntas: PreguntaConOpciones[] = filasPreguntas.map((p) => ({
      id: p.id,
      tareaId: p.tareaId,
      enunciado: p.enunciado,
      tipo: p.tipo as TipoPregunta,
      puntaje: Number(p.puntaje) || 1,
      orden: p.orden,
      opciones: opcionesPorPregunta.get(p.id) || [],
    }));

    return {
      ...tareaBase,
      preguntas,
    };
  }

  async crearTarea(datos: NuevaTarea): Promise<TareaFila> {
    const [creada] = await this.db
      .insert(tareas)
      .values({
        cursoSeccionId: datos.cursoSeccionId,
        periodoId: datos.periodoId ?? null,
        unidadId: datos.unidadId ?? null,
        sesionClaseId: datos.sesionClaseId ?? null,
        titulo: datos.titulo,
        instrucciones: datos.instrucciones ?? null,
        tipo: datos.tipo,
        fechaLimite: datos.fechaLimite,
        permiteEntregaTardia: datos.permiteEntregaTardia ?? false,
        intentosMaximos: datos.intentosMaximos ?? 1,
        limiteTiempoMinutos: datos.limiteTiempoMinutos ?? null,
        calculoNotaIntentos: datos.calculoNotaIntentos ?? "mas_alta",
        revelarRespuestas: datos.revelarRespuestas ?? "al_terminar_intentos",
        tiposArchivo: datos.tiposArchivo ?? null,
        estado: datos.estado ?? "borrador",
      })
      .returning(columnasTarea);

    return aTarea(creada);
  }

  async actualizarTarea(tareaId: string, datos: Partial<NuevaTarea>): Promise<TareaFila> {
    const updates: Record<string, unknown> = { actualizadoEn: sql`CURRENT_TIMESTAMP` };
    if (datos.titulo !== undefined) updates.titulo = datos.titulo;
    if (datos.instrucciones !== undefined) updates.instrucciones = datos.instrucciones;
    if (datos.fechaLimite !== undefined) updates.fechaLimite = datos.fechaLimite;
    if (datos.permiteEntregaTardia !== undefined)
      updates.permiteEntregaTardia = datos.permiteEntregaTardia;
    if (datos.intentosMaximos !== undefined) updates.intentosMaximos = datos.intentosMaximos;
    if (datos.limiteTiempoMinutos !== undefined)
      updates.limiteTiempoMinutos = datos.limiteTiempoMinutos;
    if (datos.calculoNotaIntentos !== undefined)
      updates.calculoNotaIntentos = datos.calculoNotaIntentos;
    if (datos.revelarRespuestas !== undefined) updates.revelarRespuestas = datos.revelarRespuestas;
    if (datos.tiposArchivo !== undefined) updates.tiposArchivo = datos.tiposArchivo;
    if (datos.periodoId !== undefined) updates.periodoId = datos.periodoId;
    if (datos.unidadId !== undefined) updates.unidadId = datos.unidadId;

    const [actualizada] = await this.db
      .update(tareas)
      .set(updates)
      .where(eq(tareas.id, tareaId))
      .returning(columnasTarea);

    return aTarea(actualizada);
  }

  async publicarTarea(tareaId: string, publicadaEn: string): Promise<TareaFila> {
    const [publicada] = await this.db
      .update(tareas)
      .set({
        estado: "publicada",
        publicadaEn,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(tareas.id, tareaId))
      .returning(columnasTarea);

    return aTarea(publicada);
  }

  async cerrarTarea(tareaId: string, _cerradaEn: string): Promise<TareaFila> {
    const [cerrada] = await this.db
      .update(tareas)
      .set({
        estado: "cerrada",
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(tareas.id, tareaId))
      .returning(columnasTarea);

    return aTarea(cerrada);
  }

  async eliminarTarea(tareaId: string): Promise<void> {
    await this.db.delete(tareas).where(eq(tareas.id, tareaId));
  }

  async guardarPreguntasTarea(
    tareaId: string,
    preguntas: Array<{
      enunciado: string;
      tipo: TipoPregunta;
      puntaje: number;
      orden: number;
      opciones?: Array<{ texto: string; esCorrecta: boolean; orden: number }>;
    }>,
  ): Promise<void> {
    await this.db.delete(preguntasTarea).where(eq(preguntasTarea.tareaId, tareaId));

    for (const p of preguntas) {
      const [insertada] = await this.db
        .insert(preguntasTarea)
        .values({
          tareaId,
          enunciado: p.enunciado,
          tipo: p.tipo,
          puntaje: String(p.puntaje),
          orden: p.orden,
        })
        .returning({ id: preguntasTarea.id });

      if (p.opciones && p.opciones.length > 0) {
        await this.db.insert(opcionesPregunta).values(
          p.opciones.map((o) => ({
            preguntaId: insertada.id,
            texto: o.texto,
            esCorrecta: o.esCorrecta,
            orden: o.orden,
          })),
        );
      }
    }
  }

  async findEntrega(entregaId: string): Promise<EntregaFila | null> {
    const [fila] = await this.db
      .select({
        ...columnasEntrega,
        estudianteId: estudiantes.id,
        estudianteNombre: nombreSql(personas),
      })
      .from(entregasTarea)
      .innerJoin(matriculas, eq(matriculas.id, entregasTarea.matriculaId))
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .innerJoin(personas, eq(personas.id, estudiantes.personaId))
      .where(eq(entregasTarea.id, entregaId))
      .limit(1);

    return fila ? aEntrega(fila) : null;
  }

  async findEntregasDeTarea(tareaId: string): Promise<EntregaFila[]> {
    const filas = await this.db
      .select({
        ...columnasEntrega,
        estudianteId: estudiantes.id,
        estudianteNombre: nombreSql(personas),
      })
      .from(entregasTarea)
      .innerJoin(matriculas, eq(matriculas.id, entregasTarea.matriculaId))
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .innerJoin(personas, eq(personas.id, estudiantes.personaId))
      .where(eq(entregasTarea.tareaId, tareaId))
      .orderBy(asc(personas.apellidoPaterno), asc(entregasTarea.intento));

    return filas.map(aEntrega);
  }

  async findEntregasDeEstudiante(tareaId: string, matriculaId: string): Promise<EntregaFila[]> {
    const filas = await this.db
      .select(columnasEntrega)
      .from(entregasTarea)
      .where(and(eq(entregasTarea.tareaId, tareaId), eq(entregasTarea.matriculaId, matriculaId)))
      .orderBy(asc(entregasTarea.intento));

    return filas.map(aEntrega);
  }

  async findEntregaActiva(tareaId: string, matriculaId: string): Promise<EntregaFila | null> {
    const [fila] = await this.db
      .select(columnasEntrega)
      .from(entregasTarea)
      .where(and(eq(entregasTarea.tareaId, tareaId), eq(entregasTarea.matriculaId, matriculaId)))
      .orderBy(desc(entregasTarea.intento))
      .limit(1);

    return fila ? aEntrega(fila) : null;
  }

  async guardarEntrega(datos: {
    tareaId: string;
    matriculaId: string;
    intento: number;
    iniciadoEn?: string;
    entregadaEn?: string | null;
    texto?: string | null;
    archivoUrl?: string | null;
    archivoNombre?: string | null;
    archivoTamanoBytes?: number | null;
    enlaceUrl?: string | null;
    respuestas?: Record<string, unknown> | null;
    esTardia?: boolean;
    estado?: EstadoEntrega;
    nota?: number | null;
    retroalimentacion?: string | null;
    calificadaPorId?: string | null;
    calificadaEn?: string | null;
  }): Promise<EntregaFila> {
    const existente = await this.db
      .select({ id: entregasTarea.id })
      .from(entregasTarea)
      .where(
        and(
          eq(entregasTarea.tareaId, datos.tareaId),
          eq(entregasTarea.matriculaId, datos.matriculaId),
          eq(entregasTarea.intento, datos.intento),
        ),
      )
      .limit(1);

    if (existente.length > 0) {
      const [actualizada] = await this.db
        .update(entregasTarea)
        .set({
          entregadaEn: datos.entregadaEn !== undefined ? datos.entregadaEn : sql`CURRENT_TIMESTAMP`,
          texto: datos.texto !== undefined ? datos.texto : undefined,
          archivoUrl: datos.archivoUrl !== undefined ? datos.archivoUrl : undefined,
          archivoNombre: datos.archivoNombre !== undefined ? datos.archivoNombre : undefined,
          archivoTamanoBytes:
            datos.archivoTamanoBytes !== undefined ? datos.archivoTamanoBytes : undefined,
          enlaceUrl: datos.enlaceUrl !== undefined ? datos.enlaceUrl : undefined,
          respuestas: datos.respuestas !== undefined ? datos.respuestas : undefined,
          esTardia: datos.esTardia !== undefined ? datos.esTardia : undefined,
          estado: datos.estado !== undefined ? datos.estado : undefined,
          nota:
            datos.nota !== undefined
              ? datos.nota !== null
                ? String(datos.nota)
                : null
              : undefined,
          retroalimentacion:
            datos.retroalimentacion !== undefined ? datos.retroalimentacion : undefined,
          calificadaPorId: datos.calificadaPorId !== undefined ? datos.calificadaPorId : undefined,
          calificadaEn: datos.calificadaEn !== undefined ? datos.calificadaEn : undefined,
        })
        .where(eq(entregasTarea.id, existente[0].id))
        .returning(columnasEntrega);

      return aEntrega(actualizada);
    }

    const [insertada] = await this.db
      .insert(entregasTarea)
      .values({
        tareaId: datos.tareaId,
        matriculaId: datos.matriculaId,
        intento: datos.intento,
        iniciadoEn: datos.iniciadoEn,
        entregadaEn: datos.entregadaEn ?? null,
        texto: datos.texto ?? null,
        archivoUrl: datos.archivoUrl ?? null,
        archivoNombre: datos.archivoNombre ?? null,
        archivoTamanoBytes: datos.archivoTamanoBytes ?? null,
        enlaceUrl: datos.enlaceUrl ?? null,
        respuestas: datos.respuestas ?? null,
        esTardia: datos.esTardia ?? false,
        estado: datos.estado ?? "entregada",
        nota: datos.nota !== undefined && datos.nota !== null ? String(datos.nota) : null,
        retroalimentacion: datos.retroalimentacion ?? null,
        calificadaPorId: datos.calificadaPorId ?? null,
        calificadaEn: datos.calificadaEn ?? null,
      })
      .returning(columnasEntrega);

    return aEntrega(insertada);
  }

  async calificarEntrega(
    entregaId: string,
    datos: {
      nota: number;
      retroalimentacion?: string | null;
      calificadaPorId: string;
      calificadaEn: string;
      respuestas?: Record<string, unknown> | null;
      estado?: EstadoEntrega;
    },
  ): Promise<EntregaFila> {
    const [calificada] = await this.db
      .update(entregasTarea)
      .set({
        nota: String(datos.nota),
        retroalimentacion: datos.retroalimentacion ?? null,
        calificadaPorId: datos.calificadaPorId,
        calificadaEn: datos.calificadaEn,
        respuestas: datos.respuestas !== undefined ? datos.respuestas : undefined,
        estado: datos.estado ?? "calificada",
      })
      .where(eq(entregasTarea.id, entregaId))
      .returning(columnasEntrega);

    return aEntrega(calificada);
  }

  async devolverEntrega(
    entregaId: string,
    retroalimentacion: string,
    calificadaPorId: string,
  ): Promise<EntregaFila> {
    const [devuelta] = await this.db
      .update(entregasTarea)
      .set({
        estado: "devuelta",
        retroalimentacion,
        calificadaPorId,
        calificadaEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(entregasTarea.id, entregaId))
      .returning(columnasEntrega);

    return aEntrega(devuelta);
  }

  async findMatriculaDeEstudiante(
    seccionId: string,
    estudiantePersonaIdOId: string,
  ): Promise<{ id: string; estudianteId: string; codigo: string; nombreCompleto: string } | null> {
    const [fila] = await this.db
      .select({
        id: matriculas.id,
        estudianteId: estudiantes.id,
        codigo: matriculas.codigo,
        nombreCompleto: nombreSql(personas),
      })
      .from(matriculas)
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .innerJoin(personas, eq(personas.id, estudiantes.personaId))
      .where(
        and(
          eq(matriculas.seccionId, seccionId),
          inArray(matriculas.estado, ["matriculado", "vigente"]),
          or(
            eq(estudiantes.personaId, estudiantePersonaIdOId),
            eq(estudiantes.id, estudiantePersonaIdOId),
          ),
        ),
      )
      .limit(1);

    return fila ?? null;
  }

  async listarEstudiantesDeSeccion(
    seccionId: string,
  ): Promise<
    Array<{ matriculaId: string; estudianteId: string; codigo: string; nombreCompleto: string }>
  > {
    const filas = await this.db
      .select({
        matriculaId: matriculas.id,
        estudianteId: estudiantes.id,
        codigo: matriculas.codigo,
        nombreCompleto: nombreSql(personas),
      })
      .from(matriculas)
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .innerJoin(personas, eq(personas.id, estudiantes.personaId))
      .where(
        and(
          eq(matriculas.seccionId, seccionId),
          inArray(matriculas.estado, ["matriculado", "vigente"]),
        ),
      )
      .orderBy(asc(personas.apellidoPaterno), asc(personas.nombres));

    return filas;
  }

  async obtenerPesosVariables(): Promise<Record<TipoTarea, number>> {
    const vars = await this.db
      .select({ codigo: variablesSistema.codigo, valor: variablesSistema.valor })
      .from(variablesSistema)
      .where(
        and(
          inArray(variablesSistema.codigo, [
            VARIABLES_NOTA_PESO.EXAMEN,
            VARIABLES_NOTA_PESO.CUESTIONARIO,
            VARIABLES_NOTA_PESO.TRABAJO,
            VARIABLES_NOTA_PESO.PROYECTO,
          ]),
          eq(variablesSistema.vigente, true),
        ),
      );

    const mapa: Record<string, number> = {};
    for (const v of vars) {
      mapa[v.codigo] = parseFloat(v.valor) || 25;
    }

    return {
      examen: mapa[VARIABLES_NOTA_PESO.EXAMEN] ?? 25,
      cuestionario: mapa[VARIABLES_NOTA_PESO.CUESTIONARIO] ?? 25,
      trabajo: mapa[VARIABLES_NOTA_PESO.TRABAJO] ?? 25,
      proyecto: mapa[VARIABLES_NOTA_PESO.PROYECTO] ?? 25,
    };
  }

  // ───────────────────────── RF-017: Interacción y Actividad ─────────────────────────

  async obtenerAnioPorCursoSeccion(
    cursoSeccionId: string,
  ): Promise<{ id: string; anio: number; estado: string } | null> {
    const [fila] = await this.db
      .select({
        id: aniosAcademicos.id,
        anio: aniosAcademicos.anio,
        estado: aniosAcademicos.estado,
      })
      .from(cursosSeccion)
      .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
      .innerJoin(aniosAcademicos, eq(aniosAcademicos.id, secciones.anioAcademicoId))
      .where(eq(cursosSeccion.id, cursoSeccionId))
      .limit(1);
    return fila ?? null;
  }

  async obtenerDocenteUsuarioId(cursoSeccionId: string): Promise<string | null> {
    const [fila] = await this.db
      .select({ usuarioId: usuarios.id })
      .from(cursosSeccion)
      .innerJoin(docentes, eq(docentes.id, cursosSeccion.docenteId))
      .innerJoin(usuarios, eq(usuarios.personaId, docentes.personaId))
      .where(eq(cursosSeccion.id, cursoSeccionId))
      .limit(1);
    return fila?.usuarioId ?? null;
  }

  async obtenerMatriculaActivaEstudiante(
    personaId: string,
    seccionId: string,
  ): Promise<{ id: string; estudianteId: string } | null> {
    const [fila] = await this.db
      .select({ id: matriculas.id, estudianteId: estudiantes.id })
      .from(matriculas)
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .where(
        and(
          eq(estudiantes.personaId, personaId),
          eq(matriculas.seccionId, seccionId),
          inArray(matriculas.estado, ["matriculado", "vigente"]),
        ),
      )
      .limit(1);
    return fila ?? null;
  }

  async listarPublicacionesMuro(
    cursoSeccionId: string,
    verOcultos: boolean,
  ): Promise<PublicacionMuroFila[]> {
    const condiciones = [eq(publicacionesAula.cursoSeccionId, cursoSeccionId)];
    if (!verOcultos) {
      condiciones.push(eq(publicacionesAula.vigente, true));
    }

    const comentariosCountSql = sql<number>`(
      SELECT COUNT(*)::int FROM comentarios_publicacion cp
      WHERE cp.publicacion_id = ${publicacionesAula.id}
      ${verOcultos ? sql`` : sql`AND cp.vigente = true`}
    )`;

    const autorRolSql = sql<string>`CASE WHEN EXISTS (
      SELECT 1 FROM roles r WHERE r.id = ${usuarios.rolId} AND LOWER(r.nombre) IN ('docente', 'director', 'subdirector', 'administrador')
    ) THEN 'docente' ELSE 'estudiante' END`;

    const filas = await this.db
      .select({
        id: publicacionesAula.id,
        cursoSeccionId: publicacionesAula.cursoSeccionId,
        autorId: publicacionesAula.autorId,
        autorNombre: nombreSql(personas),
        autorRol: autorRolSql,
        contenido: publicacionesAula.contenido,
        adjuntoUrl: publicacionesAula.adjuntoUrl,
        fijada: publicacionesAula.fijada,
        vigente: publicacionesAula.vigente,
        creadoEn: sql<string>`${publicacionesAula.creadoEn}::text`,
        actualizadoEn: sql<string>`${publicacionesAula.actualizadoEn}::text`,
        ocultadoPorId: publicacionesAula.ocultadoPorId,
        ocultadoEn: sql<string>`${publicacionesAula.ocultadoEn}::text`,
        motivoOcultamiento: publicacionesAula.motivoOcultamiento,
        comentariosCount: comentariosCountSql,
      })
      .from(publicacionesAula)
      .innerJoin(usuarios, eq(usuarios.id, publicacionesAula.autorId))
      .innerJoin(personas, eq(personas.id, usuarios.personaId))
      .where(and(...condiciones))
      .orderBy(desc(publicacionesAula.fijada), desc(publicacionesAula.creadoEn));

    return filas;
  }

  async obtenerPublicacion(id: string): Promise<PublicacionMuroFila | null> {
    const comentariosCountSql = sql<number>`(
      SELECT COUNT(*)::int FROM comentarios_publicacion cp
      WHERE cp.publicacion_id = ${publicacionesAula.id} AND cp.vigente = true
    )`;

    const autorRolSql = sql<string>`CASE WHEN EXISTS (
      SELECT 1 FROM roles r WHERE r.id = ${usuarios.rolId} AND LOWER(r.nombre) IN ('docente', 'director', 'subdirector', 'administrador')
    ) THEN 'docente' ELSE 'estudiante' END`;

    const [fila] = await this.db
      .select({
        id: publicacionesAula.id,
        cursoSeccionId: publicacionesAula.cursoSeccionId,
        autorId: publicacionesAula.autorId,
        autorNombre: nombreSql(personas),
        autorRol: autorRolSql,
        contenido: publicacionesAula.contenido,
        adjuntoUrl: publicacionesAula.adjuntoUrl,
        fijada: publicacionesAula.fijada,
        vigente: publicacionesAula.vigente,
        creadoEn: sql<string>`${publicacionesAula.creadoEn}::text`,
        actualizadoEn: sql<string>`${publicacionesAula.actualizadoEn}::text`,
        ocultadoPorId: publicacionesAula.ocultadoPorId,
        ocultadoEn: sql<string>`${publicacionesAula.ocultadoEn}::text`,
        motivoOcultamiento: publicacionesAula.motivoOcultamiento,
        comentariosCount: comentariosCountSql,
      })
      .from(publicacionesAula)
      .innerJoin(usuarios, eq(usuarios.id, publicacionesAula.autorId))
      .innerJoin(personas, eq(personas.id, usuarios.personaId))
      .where(eq(publicacionesAula.id, id))
      .limit(1);

    return fila ?? null;
  }

  async crearPublicacion(datos: {
    cursoSeccionId: string;
    autorId: string;
    contenido?: string | null;
    adjuntoUrl?: string | null;
    fijada?: boolean;
  }): Promise<PublicacionMuroFila> {
    const [insertada] = await this.db
      .insert(publicacionesAula)
      .values({
        cursoSeccionId: datos.cursoSeccionId,
        autorId: datos.autorId,
        contenido: datos.contenido ?? "",
        adjuntoUrl: datos.adjuntoUrl ?? null,
        fijada: datos.fijada ?? false,
        vigente: true,
      })
      .returning({ id: publicacionesAula.id });

    const pub = await this.obtenerPublicacion(insertada.id);
    if (!pub) throw new Error("Error al recuperar la publicación creada.");
    return pub;
  }

  async actualizarPublicacion(
    id: string,
    datos: {
      contenido?: string | null;
      adjuntoUrl?: string | null;
    },
  ): Promise<PublicacionMuroFila> {
    const valores: Record<string, unknown> = {
      actualizadoEn: sql`CURRENT_TIMESTAMP`,
    };
    if (datos.contenido !== undefined) valores.contenido = datos.contenido ?? "";
    if (datos.adjuntoUrl !== undefined) valores.adjuntoUrl = datos.adjuntoUrl;

    await this.db.update(publicacionesAula).set(valores).where(eq(publicacionesAula.id, id));

    const pub = await this.obtenerPublicacion(id);
    if (!pub) throw new Error("Publicación no encontrada tras actualización.");
    return pub;
  }

  async fijarPublicacion(id: string, fijada: boolean): Promise<PublicacionMuroFila> {
    await this.db
      .update(publicacionesAula)
      .set({ fijada, actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(publicacionesAula.id, id));

    const pub = await this.obtenerPublicacion(id);
    if (!pub) throw new Error("Publicación no encontrada tras fijar.");
    return pub;
  }

  async listarComentarios(
    publicacionId: string,
    verOcultos: boolean,
  ): Promise<ComentarioMuroFila[]> {
    const condiciones = [eq(comentariosPublicacion.publicacionId, publicacionId)];
    if (!verOcultos) {
      condiciones.push(eq(comentariosPublicacion.vigente, true));
    }

    const autorRolSql = sql<string>`CASE WHEN EXISTS (
      SELECT 1 FROM roles r WHERE r.id = ${usuarios.rolId} AND LOWER(r.nombre) IN ('docente', 'director', 'subdirector', 'administrador')
    ) THEN 'docente' ELSE 'estudiante' END`;

    const filas = await this.db
      .select({
        id: comentariosPublicacion.id,
        publicacionId: comentariosPublicacion.publicacionId,
        autorId: comentariosPublicacion.autorId,
        autorNombre: nombreSql(personas),
        autorRol: autorRolSql,
        contenido: comentariosPublicacion.contenido,
        vigente: comentariosPublicacion.vigente,
        creadoEn: sql<string>`${comentariosPublicacion.creadoEn}::text`,
        actualizadoEn: sql<string>`${comentariosPublicacion.actualizadoEn}::text`,
        ocultadoPorId: comentariosPublicacion.ocultadoPorId,
        ocultadoEn: sql<string>`${comentariosPublicacion.ocultadoEn}::text`,
        motivoOcultamiento: comentariosPublicacion.motivoOcultamiento,
      })
      .from(comentariosPublicacion)
      .innerJoin(usuarios, eq(usuarios.id, comentariosPublicacion.autorId))
      .innerJoin(personas, eq(personas.id, usuarios.personaId))
      .where(and(...condiciones))
      .orderBy(asc(comentariosPublicacion.creadoEn));

    return filas;
  }

  async obtenerComentario(id: string): Promise<ComentarioMuroFila | null> {
    const autorRolSql = sql<string>`CASE WHEN EXISTS (
      SELECT 1 FROM roles r WHERE r.id = ${usuarios.rolId} AND LOWER(r.nombre) IN ('docente', 'director', 'subdirector', 'administrador')
    ) THEN 'docente' ELSE 'estudiante' END`;

    const [fila] = await this.db
      .select({
        id: comentariosPublicacion.id,
        publicacionId: comentariosPublicacion.publicacionId,
        autorId: comentariosPublicacion.autorId,
        autorNombre: nombreSql(personas),
        autorRol: autorRolSql,
        contenido: comentariosPublicacion.contenido,
        vigente: comentariosPublicacion.vigente,
        creadoEn: sql<string>`${comentariosPublicacion.creadoEn}::text`,
        actualizadoEn: sql<string>`${comentariosPublicacion.actualizadoEn}::text`,
        ocultadoPorId: comentariosPublicacion.ocultadoPorId,
        ocultadoEn: sql<string>`${comentariosPublicacion.ocultadoEn}::text`,
        motivoOcultamiento: comentariosPublicacion.motivoOcultamiento,
      })
      .from(comentariosPublicacion)
      .innerJoin(usuarios, eq(usuarios.id, comentariosPublicacion.autorId))
      .innerJoin(personas, eq(personas.id, usuarios.personaId))
      .where(eq(comentariosPublicacion.id, id))
      .limit(1);

    return fila ?? null;
  }

  async crearComentario(datos: {
    publicacionId: string;
    autorId: string;
    contenido: string;
  }): Promise<ComentarioMuroFila> {
    const [insertado] = await this.db
      .insert(comentariosPublicacion)
      .values({
        publicacionId: datos.publicacionId,
        autorId: datos.autorId,
        contenido: datos.contenido,
        vigente: true,
      })
      .returning({ id: comentariosPublicacion.id });

    const com = await this.obtenerComentario(insertado.id);
    if (!com) throw new Error("Error al recuperar comentario creado.");
    return com;
  }

  async actualizarComentario(
    id: string,
    datos: { contenido: string },
  ): Promise<ComentarioMuroFila> {
    await this.db
      .update(comentariosPublicacion)
      .set({
        contenido: datos.contenido,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(comentariosPublicacion.id, id));

    const com = await this.obtenerComentario(id);
    if (!com) throw new Error("Comentario no encontrado tras actualización.");
    return com;
  }

  async listarMensajesChat(
    cursoSeccionId: string,
    verOcultos: boolean,
    limite: number = 100,
  ): Promise<MensajeChatFila[]> {
    const condiciones = [
      eq(mensajesChat.cursoSeccionId, cursoSeccionId),
      isNull(mensajesChat.eliminadoEn),
    ];
    if (!verOcultos) {
      condiciones.push(eq(mensajesChat.vigente, true));
    }

    const emisorRolSql = sql<string>`CASE WHEN EXISTS (
      SELECT 1 FROM roles r WHERE r.id = ${usuarios.rolId} AND LOWER(r.nombre) IN ('docente', 'director', 'subdirector', 'administrador')
    ) THEN 'docente' ELSE 'estudiante' END`;

    const filas = await this.db
      .select({
        id: mensajesChat.id,
        cursoSeccionId: mensajesChat.cursoSeccionId,
        emisorId: mensajesChat.emisorId,
        emisorNombre: nombreSql(personas),
        emisorRol: emisorRolSql,
        contenido: mensajesChat.contenido,
        adjuntoUrl: mensajesChat.adjuntoUrl,
        vigente: mensajesChat.vigente,
        enviadoEn: sql<string>`${mensajesChat.enviadoEn}::text`,
        actualizadoEn: sql<string>`${mensajesChat.actualizadoEn}::text`,
        ocultadoPorId: mensajesChat.ocultadoPorId,
        ocultadoEn: sql<string>`${mensajesChat.ocultadoEn}::text`,
        motivoOcultamiento: mensajesChat.motivoOcultamiento,
      })
      .from(mensajesChat)
      .innerJoin(usuarios, eq(usuarios.id, mensajesChat.emisorId))
      .innerJoin(personas, eq(personas.id, usuarios.personaId))
      .where(and(...condiciones))
      .orderBy(asc(mensajesChat.enviadoEn))
      .limit(limite);

    return filas;
  }

  async obtenerMensajeChat(id: string): Promise<MensajeChatFila | null> {
    const emisorRolSql = sql<string>`CASE WHEN EXISTS (
      SELECT 1 FROM roles r WHERE r.id = ${usuarios.rolId} AND LOWER(r.nombre) IN ('docente', 'director', 'subdirector', 'administrador')
    ) THEN 'docente' ELSE 'estudiante' END`;

    const [fila] = await this.db
      .select({
        id: mensajesChat.id,
        cursoSeccionId: mensajesChat.cursoSeccionId,
        emisorId: mensajesChat.emisorId,
        emisorNombre: nombreSql(personas),
        emisorRol: emisorRolSql,
        contenido: mensajesChat.contenido,
        adjuntoUrl: mensajesChat.adjuntoUrl,
        vigente: mensajesChat.vigente,
        enviadoEn: sql<string>`${mensajesChat.enviadoEn}::text`,
        actualizadoEn: sql<string>`${mensajesChat.actualizadoEn}::text`,
        ocultadoPorId: mensajesChat.ocultadoPorId,
        ocultadoEn: sql<string>`${mensajesChat.ocultadoEn}::text`,
        motivoOcultamiento: mensajesChat.motivoOcultamiento,
      })
      .from(mensajesChat)
      .innerJoin(usuarios, eq(usuarios.id, mensajesChat.emisorId))
      .innerJoin(personas, eq(personas.id, usuarios.personaId))
      .where(eq(mensajesChat.id, id))
      .limit(1);

    return fila ?? null;
  }

  async enviarMensajeChat(datos: {
    cursoSeccionId: string;
    emisorId: string;
    contenido: string;
    adjuntoUrl?: string | null;
  }): Promise<MensajeChatFila> {
    const [insertado] = await this.db
      .insert(mensajesChat)
      .values({
        cursoSeccionId: datos.cursoSeccionId,
        emisorId: datos.emisorId,
        receptorId: null, // Sin mensajes privados (CP-RF017-10)
        contenido: datos.contenido,
        adjuntoUrl: datos.adjuntoUrl ?? null,
        vigente: true,
      })
      .returning({ id: mensajesChat.id });

    const msg = await this.obtenerMensajeChat(insertado.id);
    if (!msg) throw new Error("Error al recuperar el mensaje de chat creado.");
    return msg;
  }

  async actualizarUltimaLecturaChat(
    cursoSeccionId: string,
    usuarioId: string,
    fecha: Date = new Date(),
  ): Promise<void> {
    const fechaSql = fecha.toISOString();
    await this.db
      .insert(chatLecturas)
      .values({
        cursoSeccionId,
        usuarioId,
        ultimoLeidoEn: fechaSql,
      })
      .onConflictDoUpdate({
        target: [chatLecturas.cursoSeccionId, chatLecturas.usuarioId],
        set: {
          ultimoLeidoEn: fechaSql,
        },
      });
  }

  async contarMensajesNoLeidosChat(cursoSeccionId: string, usuarioId: string): Promise<number> {
    const [lectura] = await this.db
      .select({ ultimoLeidoEn: chatLecturas.ultimoLeidoEn })
      .from(chatLecturas)
      .where(
        and(eq(chatLecturas.cursoSeccionId, cursoSeccionId), eq(chatLecturas.usuarioId, usuarioId)),
      )
      .limit(1);

    const condiciones = [
      eq(mensajesChat.cursoSeccionId, cursoSeccionId),
      eq(mensajesChat.vigente, true),
      isNull(mensajesChat.eliminadoEn),
      sql`${mensajesChat.emisorId} <> ${usuarioId}`,
    ];

    if (lectura?.ultimoLeidoEn) {
      condiciones.push(sql`${mensajesChat.enviadoEn} > ${lectura.ultimoLeidoEn}`);
    }

    const [resultado] = await this.db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(mensajesChat)
      .where(and(...condiciones));

    return resultado?.total ?? 0;
  }

  async ocultarContenido(
    tipo: TipoModeracion,
    id: string,
    ocultadoPorId: string,
    motivo: string,
  ): Promise<void> {
    const ahora = sql`CURRENT_TIMESTAMP`;
    if (tipo === "publicacion") {
      await this.db
        .update(publicacionesAula)
        .set({
          vigente: false,
          ocultadoPorId,
          ocultadoEn: ahora,
          motivoOcultamiento: motivo,
        })
        .where(eq(publicacionesAula.id, id));
    } else if (tipo === "comentario") {
      await this.db
        .update(comentariosPublicacion)
        .set({
          vigente: false,
          ocultadoPorId,
          ocultadoEn: ahora,
          motivoOcultamiento: motivo,
        })
        .where(eq(comentariosPublicacion.id, id));
    } else {
      await this.db
        .update(mensajesChat)
        .set({
          vigente: false,
          ocultadoPorId,
          ocultadoEn: ahora,
          motivoOcultamiento: motivo,
        })
        .where(eq(mensajesChat.id, id));
    }
  }

  async restaurarContenido(tipo: TipoModeracion, id: string): Promise<void> {
    if (tipo === "publicacion") {
      await this.db
        .update(publicacionesAula)
        .set({
          vigente: true,
          ocultadoPorId: null,
          ocultadoEn: null,
          motivoOcultamiento: null,
        })
        .where(eq(publicacionesAula.id, id));
    } else if (tipo === "comentario") {
      await this.db
        .update(comentariosPublicacion)
        .set({
          vigente: true,
          ocultadoPorId: null,
          ocultadoEn: null,
          motivoOcultamiento: null,
        })
        .where(eq(comentariosPublicacion.id, id));
    } else {
      await this.db
        .update(mensajesChat)
        .set({
          vigente: true,
          ocultadoPorId: null,
          ocultadoEn: null,
          motivoOcultamiento: null,
        })
        .where(eq(mensajesChat.id, id));
    }
  }

  async listarHistorialModeracion(cursoSeccionId: string): Promise<HistorialModeracionFila[]> {
    // 1. Publicaciones ocultadas
    const pubs = await this.db
      .select({
        id: publicacionesAula.id,
        tipo: sql<TipoModeracion>`'publicacion'`,
        cursoSeccionId: publicacionesAula.cursoSeccionId,
        contenido: publicacionesAula.contenido,
        adjuntoUrl: publicacionesAula.adjuntoUrl,
        autorNombre: nombreSql(personas),
        ocultadoPorNombre: sql<string>`TRIM(p_oc.apellido_paterno || ' ' || COALESCE(p_oc.apellido_materno, '') || ', ' || p_oc.nombres)`,
        ocultadoEn: sql<string>`${publicacionesAula.ocultadoEn}::text`,
        motivoOcultamiento: sql<string>`COALESCE(${publicacionesAula.motivoOcultamiento}, '')`,
      })
      .from(publicacionesAula)
      .innerJoin(usuarios, eq(usuarios.id, publicacionesAula.autorId))
      .innerJoin(personas, eq(personas.id, usuarios.personaId))
      .innerJoin(sql`usuarios u_oc`, sql`u_oc.id = ${publicacionesAula.ocultadoPorId}`)
      .innerJoin(sql`personas p_oc`, sql`p_oc.id = u_oc.persona_id`)
      .where(
        and(
          eq(publicacionesAula.cursoSeccionId, cursoSeccionId),
          eq(publicacionesAula.vigente, false),
        ),
      );

    // 2. Comentarios ocultados
    const coms = await this.db
      .select({
        id: comentariosPublicacion.id,
        tipo: sql<TipoModeracion>`'comentario'`,
        cursoSeccionId: publicacionesAula.cursoSeccionId,
        contenido: comentariosPublicacion.contenido,
        adjuntoUrl: sql<string | null>`NULL`,
        autorNombre: nombreSql(personas),
        ocultadoPorNombre: sql<string>`TRIM(p_oc.apellido_paterno || ' ' || COALESCE(p_oc.apellido_materno, '') || ', ' || p_oc.nombres)`,
        ocultadoEn: sql<string>`${comentariosPublicacion.ocultadoEn}::text`,
        motivoOcultamiento: sql<string>`COALESCE(${comentariosPublicacion.motivoOcultamiento}, '')`,
      })
      .from(comentariosPublicacion)
      .innerJoin(publicacionesAula, eq(publicacionesAula.id, comentariosPublicacion.publicacionId))
      .innerJoin(usuarios, eq(usuarios.id, comentariosPublicacion.autorId))
      .innerJoin(personas, eq(personas.id, usuarios.personaId))
      .innerJoin(sql`usuarios u_oc`, sql`u_oc.id = ${comentariosPublicacion.ocultadoPorId}`)
      .innerJoin(sql`personas p_oc`, sql`p_oc.id = u_oc.persona_id`)
      .where(
        and(
          eq(publicacionesAula.cursoSeccionId, cursoSeccionId),
          eq(comentariosPublicacion.vigente, false),
        ),
      );

    // 3. Mensajes de chat ocultados
    const chats = await this.db
      .select({
        id: mensajesChat.id,
        tipo: sql<TipoModeracion>`'chat'`,
        cursoSeccionId: mensajesChat.cursoSeccionId,
        contenido: mensajesChat.contenido,
        adjuntoUrl: mensajesChat.adjuntoUrl,
        autorNombre: nombreSql(personas),
        ocultadoPorNombre: sql<string>`TRIM(p_oc.apellido_paterno || ' ' || COALESCE(p_oc.apellido_materno, '') || ', ' || p_oc.nombres)`,
        ocultadoEn: sql<string>`${mensajesChat.ocultadoEn}::text`,
        motivoOcultamiento: sql<string>`COALESCE(${mensajesChat.motivoOcultamiento}, '')`,
      })
      .from(mensajesChat)
      .innerJoin(usuarios, eq(usuarios.id, mensajesChat.emisorId))
      .innerJoin(personas, eq(personas.id, usuarios.personaId))
      .innerJoin(sql`usuarios u_oc`, sql`u_oc.id = ${mensajesChat.ocultadoPorId}`)
      .innerJoin(sql`personas p_oc`, sql`p_oc.id = u_oc.persona_id`)
      .where(and(eq(mensajesChat.cursoSeccionId, cursoSeccionId), eq(mensajesChat.vigente, false)));

    const combinado: HistorialModeracionFila[] = [...pubs, ...coms, ...chats];
    combinado.sort((a, b) => (b.ocultadoEn > a.ocultadoEn ? 1 : -1));
    return combinado;
  }

  async registrarActividad(datos: {
    matriculaId: string;
    materialId?: string | null;
    tareaId?: string | null;
    accion: AccionActividadAula;
  }): Promise<void> {
    await this.db.insert(actividadAula).values({
      matriculaId: datos.matriculaId,
      materialId: datos.materialId ?? null,
      tareaId: datos.tareaId ?? null,
      accion: datos.accion,
    });
  }

  async obtenerActividadMaterial(
    materialId: string,
    cursoSeccionId: string,
  ): Promise<ActividadEstudianteMaterial[]> {
    const curso = await this.findCurso(cursoSeccionId);
    if (!curso) return [];

    const estudiantesSeccion = await this.listarEstudiantesDeSeccion(curso.seccionId);

    const registros = await this.db
      .select({
        matriculaId: actividadAula.matriculaId,
        accion: actividadAula.accion,
        registradoEn: sql<string>`${actividadAula.registradoEn}::text`,
      })
      .from(actividadAula)
      .where(eq(actividadAula.materialId, materialId));

    const mapaPorMatricula = new Map<
      string,
      {
        visualizo: boolean;
        visualizoEn: string | null;
        descargo: boolean;
        descargoEn: string | null;
      }
    >();

    for (const r of registros) {
      const item = mapaPorMatricula.get(r.matriculaId) ?? {
        visualizo: false,
        visualizoEn: null,
        descargo: false,
        descargoEn: null,
      };
      if (r.accion === "visualizo") {
        item.visualizo = true;
        if (!item.visualizoEn || r.registradoEn < item.visualizoEn) {
          item.visualizoEn = r.registradoEn;
        }
      } else if (r.accion === "descargo") {
        item.descargo = true;
        if (!item.descargoEn || r.registradoEn < item.descargoEn) {
          item.descargoEn = r.registradoEn;
        }
      }
      mapaPorMatricula.set(r.matriculaId, item);
    }

    return estudiantesSeccion.map((e) => {
      const act = mapaPorMatricula.get(e.matriculaId) ?? {
        visualizo: false,
        visualizoEn: null,
        descargo: false,
        descargoEn: null,
      };
      return {
        matriculaId: e.matriculaId,
        estudianteId: e.estudianteId,
        codigo: e.codigo,
        nombreCompleto: e.nombreCompleto,
        visualizo: act.visualizo,
        visualizoEn: act.visualizoEn,
        descargo: act.descargo,
        descargoEn: act.descargoEn,
      };
    });
  }

  async obtenerActividadTarea(
    tareaId: string,
    cursoSeccionId: string,
  ): Promise<ActividadEstudianteTarea[]> {
    const curso = await this.findCurso(cursoSeccionId);
    if (!curso) return [];

    const estudiantesSeccion = await this.listarEstudiantesDeSeccion(curso.seccionId);

    const registros = await this.db
      .select({
        matriculaId: actividadAula.matriculaId,
        accion: actividadAula.accion,
        registradoEn: sql<string>`${actividadAula.registradoEn}::text`,
      })
      .from(actividadAula)
      .where(eq(actividadAula.tareaId, tareaId));

    const mapaPorMatricula = new Map<
      string,
      { abrio: boolean; abrioEn: string | null; completo: boolean; completoEn: string | null }
    >();

    for (const r of registros) {
      const item = mapaPorMatricula.get(r.matriculaId) ?? {
        abrio: false,
        abrioEn: null,
        completo: false,
        completoEn: null,
      };
      if (r.accion === "abrio") {
        item.abrio = true;
        if (!item.abrioEn || r.registradoEn < item.abrioEn) {
          item.abrioEn = r.registradoEn;
        }
      } else if (r.accion === "completo") {
        item.completo = true;
        if (!item.completoEn || r.registradoEn < item.completoEn) {
          item.completoEn = r.registradoEn;
        }
      }
      mapaPorMatricula.set(r.matriculaId, item);
    }

    return estudiantesSeccion.map((e) => {
      const act = mapaPorMatricula.get(e.matriculaId) ?? {
        abrio: false,
        abrioEn: null,
        completo: false,
        completoEn: null,
      };
      return {
        matriculaId: e.matriculaId,
        estudianteId: e.estudianteId,
        codigo: e.codigo,
        nombreCompleto: e.nombreCompleto,
        abrio: act.abrio,
        abrioEn: act.abrioEn,
        completo: act.completo,
        completoEn: act.completoEn,
      };
    });
  }

  private async requerirMaterial(materialId: string): Promise<MaterialFila> {
    const material = await this.findMaterial(materialId);
    if (!material) throw new Error(`Material ${materialId} no encontrado tras su registro.`);
    return material;
  }

  async findTareasParaVentana(
    desde: string,
    hasta: string,
  ): Promise<
    Array<{
      id: string;
      titulo: string;
      tipo: TipoTarea;
      fechaLimite: string;
      permiteEntregaTardia: boolean;
      cursoSeccionId: string;
      cursoNombre: string;
      seccionNombre: string;
      seccionId: string;
      anioAcademicoId: string;
    }>
  > {
    const filas = await this.db
      .select({
        id: tareas.id,
        titulo: tareas.titulo,
        tipo: tareas.tipo,
        fechaLimite: tareas.fechaLimite,
        permiteEntregaTardia: tareas.permiteEntregaTardia,
        cursoSeccionId: cursosSeccion.id,
        cursoNombre: cursos.nombre,
        seccionNombre: sql<string>`CONCAT(${grados.nombre}, ' ', ${secciones.nombre})`,
        seccionId: cursosSeccion.seccionId,
        anioAcademicoId: secciones.anioAcademicoId,
      })
      .from(tareas)
      .innerJoin(cursosSeccion, eq(cursosSeccion.id, tareas.cursoSeccionId))
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .where(
        and(
          eq(tareas.estado, "publicada"),
          sql`${tareas.fechaLimite} >= ${desde}::timestamp`,
          sql`${tareas.fechaLimite} <= ${hasta}::timestamp`,
        ),
      );
    return filas.map((f) => ({
      ...f,
      tipo: f.tipo as TipoTarea,
    }));
  }

  async findEstudiantesSinEntrega(
    tareaId: string,
    seccionId: string,
    anioAcademicoId: string,
  ): Promise<Array<{ usuarioId: string; matriculaId: string }>> {
    const filas = await this.db
      .selectDistinct({
        usuarioId: usuarios.id,
        matriculaId: matriculas.id,
      })
      .from(matriculas)
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .innerJoin(personas, eq(personas.id, estudiantes.personaId))
      .innerJoin(usuarios, eq(usuarios.personaId, personas.id))
      .leftJoin(
        entregasTarea,
        and(
          eq(entregasTarea.tareaId, tareaId),
          eq(entregasTarea.matriculaId, matriculas.id),
          sql`${entregasTarea.estado} IN ('entregada', 'calificada')`,
        ),
      )
      .where(
        and(
          eq(matriculas.seccionId, seccionId),
          eq(matriculas.anioAcademicoId, anioAcademicoId),
          eq(matriculas.estado, "matriculado"),
          isNull(usuarios.eliminadoEn),
          isNull(entregasTarea.id),
        ),
      );
    return filas;
  }

  async yaSeNotifico(usuarioId: string, enlaceUrl: string): Promise<boolean> {
    const [fila] = await this.db
      .select({ id: notificaciones.id })
      .from(notificaciones)
      .where(and(eq(notificaciones.usuarioId, usuarioId), eq(notificaciones.enlaceUrl, enlaceUrl)))
      .limit(1);
    return Boolean(fila);
  }
}
