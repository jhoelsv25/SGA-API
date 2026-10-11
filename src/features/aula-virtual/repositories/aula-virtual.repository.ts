import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, inArray, isNotNull, isNull, max, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  cursos,
  cursosSeccion,
  docentes,
  estudiantes,
  grados,
  horarios,
  materialCambiosFecha,
  materialVersiones,
  materiales,
  matriculas,
  periodosAcademicos,
  personas,
  roles,
  secciones,
  sesionesClase,
  unidadesAprendizaje,
  usuarioRoles,
  usuarios,
  variablesSistema,
} from "../../../core/database/schema";
import type { EstadoSolicitudFecha, TipoMaterial } from "../constants";
import type {
  CambioFechaHistorial,
  ContenidoMaterial,
  CursoAula,
  CursoAulaResumen,
  FilaSeguimiento,
  HorarioBloque,
  IAulaVirtualRepository,
  MaterialFila,
  NuevaUnidad,
  NuevoMaterial,
  PeriodoAula,
  SesionEnlazada,
  SolicitudFila,
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
          eq(estudiantes.personaId, personaId),
          eq(matriculas.anioAcademicoId, anioAcademicoId),
          eq(matriculas.estado, "matriculado"),
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
          eq(matriculas.estado, "matriculado"),
        ),
      )
      .limit(1);
    return Boolean(fila);
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

  private async requerirMaterial(materialId: string): Promise<MaterialFila> {
    const material = await this.findMaterial(materialId);
    if (!material) throw new Error(`Material ${materialId} no encontrado tras su registro.`);
    return material;
  }
}
