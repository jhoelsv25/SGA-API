import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gte, inArray, lte, sql, SQL } from "drizzle-orm";
import { Database, DRIZZLE } from "@/core/database";
import {
  apoderados,
  cursosSeccion,
  docentes,
  estudianteApoderados,
  estudiantes,
  grados,
  incidenciasConducta,
  matriculas,
  observacionesEstudiante,
  periodosAcademicos,
  personas,
  secciones,
  usuarios,
} from "@/core/database/schema";
import { decodeCursor, encodeCursor } from "@/common/utils";
import {
  DesgloseBimestreConducta,
  IncidenciaItem,
  InfoMatriculaEstudiante,
  ObservacionItem,
  ResumenConductaEstudiante,
} from "../interfaces";
import {
  ActualizarIncidenciaDto,
  CrearIncidenciaDto,
  CrearObservacionDto,
  QueryIncidenciasDto,
  QueryObservacionesDto,
} from "../dto";
import { TipoObservacion } from "../constants";

@Injectable()
export class ConductaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Obtiene la información académica, sección, tutor y apoderado principal de la matrícula.
   */
  async obtenerInfoMatricula(matriculaId: string): Promise<InfoMatriculaEstudiante | null> {
    const rows = await this.db
      .select({
        matriculaId: matriculas.id,
        anioAcademicoId: matriculas.anioAcademicoId,
        estudianteId: estudiantes.id,
        codigoEstudiante: estudiantes.codigo,
        estudiantePersonaId: estudiantes.personaId,
        nombre: personas.nombres,
        apellidoPaterno: personas.apellidoPaterno,
        apellidoMaterno: personas.apellidoMaterno,
        seccionId: matriculas.seccionId,
        gradoId: secciones.gradoId,
        tutorDocenteId: secciones.tutorId,
      })
      .from(matriculas)
      .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
      .innerJoin(personas, eq(estudiantes.personaId, personas.id))
      .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
      .where(eq(matriculas.id, matriculaId))
      .limit(1);

    if (!rows.length) return null;
    const row = rows[0];

    // Obtener usuarioId del estudiante
    const estUser = await this.db
      .select({ usuarioId: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.personaId, row.estudiantePersonaId))
      .limit(1);

    // Obtener usuarioId del tutor
    let tutorUsuarioId: string | undefined;
    if (row.tutorDocenteId) {
      const tutorRows = await this.db
        .select({ usuarioId: usuarios.id })
        .from(docentes)
        .innerJoin(usuarios, eq(docentes.personaId, usuarios.personaId))
        .where(eq(docentes.id, row.tutorDocenteId))
        .limit(1);
      if (tutorRows.length) tutorUsuarioId = tutorRows[0].usuarioId;
    }

    // Obtener apoderado principal del estudiante
    let apoderadoPrincipalUsuarioId: string | undefined;
    let apoderadoPrincipalNombre: string | undefined;

    const apodRows = await this.db
      .select({
        usuarioId: usuarios.id,
        nombres: personas.nombres,
        apellidoPaterno: personas.apellidoPaterno,
        apellidoMaterno: personas.apellidoMaterno,
      })
      .from(estudianteApoderados)
      .innerJoin(apoderados, eq(estudianteApoderados.apoderadoId, apoderados.id))
      .innerJoin(personas, eq(apoderados.personaId, personas.id))
      .innerJoin(usuarios, eq(personas.id, usuarios.personaId))
      .where(
        and(
          eq(estudianteApoderados.estudianteId, row.estudianteId),
          eq(estudianteApoderados.esPrincipal, true),
        ),
      )
      .limit(1);

    if (apodRows.length) {
      apoderadoPrincipalUsuarioId = apodRows[0].usuarioId;
      apoderadoPrincipalNombre =
        `${apodRows[0].nombres} ${apodRows[0].apellidoPaterno} ${apodRows[0].apellidoMaterno || ""}`.trim();
    }

    const nombreCompleto =
      `${row.nombre} ${row.apellidoPaterno} ${row.apellidoMaterno || ""}`.trim();

    return {
      matriculaId: row.matriculaId,
      estudianteId: row.estudianteId,
      estudianteUsuarioId: estUser.length ? estUser[0].usuarioId : undefined,
      nombreCompleto,
      codigoEstudiante: row.codigoEstudiante,
      seccionId: row.seccionId,
      gradoId: row.gradoId,
      tutorUsuarioId,
      apoderadoPrincipalUsuarioId,
      apoderadoPrincipalNombre,
    };
  }

  /**
   * Verifica si un usuario docente dicta en la sección o es su tutor.
   */
  async esDocenteDeSeccion(usuarioId: string, seccionId: string): Promise<boolean> {
    const docRows = await this.db
      .select({ docenteId: docentes.id })
      .from(usuarios)
      .innerJoin(docentes, eq(usuarios.personaId, docentes.personaId))
      .where(eq(usuarios.id, usuarioId))
      .limit(1);

    if (!docRows.length) return false;
    const docenteId = docRows[0].docenteId;

    // Verificar si es tutor
    const secRows = await this.db
      .select({ id: secciones.id })
      .from(secciones)
      .where(and(eq(secciones.id, seccionId), eq(secciones.tutorId, docenteId)))
      .limit(1);

    if (secRows.length) return true;

    // Verificar si dicta algún curso en la sección
    const cursoRows = await this.db
      .select({ id: cursosSeccion.id })
      .from(cursosSeccion)
      .where(and(eq(cursosSeccion.seccionId, seccionId), eq(cursosSeccion.docenteId, docenteId)))
      .limit(1);

    return cursoRows.length > 0;
  }

  /**
   * Verifica si un usuario es tutor de una sección.
   */
  async esTutorDeSeccion(usuarioId: string, seccionId: string): Promise<boolean> {
    const docRows = await this.db
      .select({ docenteId: docentes.id })
      .from(usuarios)
      .innerJoin(docentes, eq(usuarios.personaId, docentes.personaId))
      .where(eq(usuarios.id, usuarioId))
      .limit(1);

    if (!docRows.length) return false;

    const secRows = await this.db
      .select({ id: secciones.id })
      .from(secciones)
      .where(and(eq(secciones.id, seccionId), eq(secciones.tutorId, docRows[0].docenteId)))
      .limit(1);

    return secRows.length > 0;
  }

  /**
   * Verifica si el usuario es apoderado registrado del estudiante de la matrícula.
   */
  async esApoderadoDeEstudiante(usuarioId: string, matriculaId: string): Promise<boolean> {
    const rows = await this.db
      .select({ estudianteId: matriculas.estudianteId })
      .from(matriculas)
      .where(eq(matriculas.id, matriculaId))
      .limit(1);

    if (!rows.length) return false;
    const estudianteId = rows[0].estudianteId;

    const apodRows = await this.db
      .select({ id: estudianteApoderados.apoderadoId })
      .from(estudianteApoderados)
      .innerJoin(apoderados, eq(estudianteApoderados.apoderadoId, apoderados.id))
      .innerJoin(usuarios, eq(apoderados.personaId, usuarios.personaId))
      .where(and(eq(estudianteApoderados.estudianteId, estudianteId), eq(usuarios.id, usuarioId)))
      .limit(1);

    return apodRows.length > 0;
  }

  /**
   * Verifica si el usuario es el estudiante mismo de la matrícula.
   */
  async esEstudianteDeMatricula(usuarioId: string, matriculaId: string): Promise<boolean> {
    const rows = await this.db
      .select({ personaId: estudiantes.personaId })
      .from(matriculas)
      .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
      .where(eq(matriculas.id, matriculaId))
      .limit(1);

    if (!rows.length) return false;

    const userRows = await this.db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(and(eq(usuarios.id, usuarioId), eq(usuarios.personaId, rows[0].personaId)))
      .limit(1);

    return userRows.length > 0;
  }

  /**
   * Obtiene las matrículas asociadas a un usuario estudiante o apoderado.
   */
  async obtenerMatriculasDeUsuario(
    usuarioId: string,
    rol: "estudiante" | "apoderado",
  ): Promise<string[]> {
    if (rol === "estudiante") {
      const rows = await this.db
        .select({ matriculaId: matriculas.id })
        .from(matriculas)
        .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
        .innerJoin(usuarios, eq(estudiantes.personaId, usuarios.personaId))
        .where(
          and(
            eq(usuarios.id, usuarioId),
            inArray(matriculas.estado, ["matriculado", "vigente"]),
          ),
        )
        .orderBy(desc(matriculas.creadoEn));
      return rows.map((r) => r.matriculaId);
    }

    const rows = await this.db
      .select({ matriculaId: matriculas.id })
      .from(matriculas)
      .innerJoin(
        estudianteApoderados,
        eq(matriculas.estudianteId, estudianteApoderados.estudianteId),
      )
      .innerJoin(apoderados, eq(estudianteApoderados.apoderadoId, apoderados.id))
      .innerJoin(usuarios, eq(apoderados.personaId, usuarios.personaId))
      .where(
        and(
          eq(usuarios.id, usuarioId),
          inArray(matriculas.estado, ["matriculado", "vigente"]),
        ),
      )
      .orderBy(desc(matriculas.creadoEn));
    return rows.map((r) => r.matriculaId);
  }

  /**
   * Deduce el bimestre/periodo académico según la fecha.
   */
  async deducirPeriodoId(matriculaId: string, fecha: string): Promise<string> {
    const matRows = await this.db
      .select({ anioAcademicoId: matriculas.anioAcademicoId })
      .from(matriculas)
      .where(eq(matriculas.id, matriculaId))
      .limit(1);

    if (!matRows.length) {
      throw new Error("Matrícula no encontrada");
    }

    const anioId = matRows[0].anioAcademicoId;

    // Buscar periodo que contenga la fecha
    const periodos = await this.db
      .select({ id: periodosAcademicos.id })
      .from(periodosAcademicos)
      .where(
        and(
          eq(periodosAcademicos.anioAcademicoId, anioId),
          lte(periodosAcademicos.fechaInicio, fecha),
          gte(periodosAcademicos.fechaFin, fecha),
        ),
      )
      .limit(1);

    if (periodos.length) return periodos[0].id;

    // Fallback: periodo en curso
    const enCurso = await this.db
      .select({ id: periodosAcademicos.id })
      .from(periodosAcademicos)
      .where(
        and(
          eq(periodosAcademicos.anioAcademicoId, anioId),
          eq(periodosAcademicos.estado, "en_curso"),
        ),
      )
      .limit(1);

    if (enCurso.length) return enCurso[0].id;

    // Fallback: primer periodo del año
    const primerPeriodo = await this.db
      .select({ id: periodosAcademicos.id })
      .from(periodosAcademicos)
      .where(eq(periodosAcademicos.anioAcademicoId, anioId))
      .orderBy(periodosAcademicos.numero)
      .limit(1);

    if (!primerPeriodo.length) {
      throw new Error("No existen periodos académicos configurados para el año lectivo.");
    }

    return primerPeriodo[0].id;
  }

  /**
   * Inserta una nueva incidencia de conducta.
   */
  async crearIncidencia(
    dto: CrearIncidenciaDto,
    periodoId: string,
    registradoPorId: string,
    apoderadoNotificado: boolean,
  ): Promise<string> {
    const result = await this.db
      .insert(incidenciasConducta)
      .values({
        matriculaId: dto.matriculaId,
        periodoId,
        registradoPorId,
        fecha: dto.fecha,
        tipo: dto.tipo,
        categoria: dto.categoria,
        gravedad: dto.tipo === "falta" ? (dto.gravedad ?? null) : null,
        descripcion: dto.descripcion,
        lugar: dto.lugar ?? null,
        medidasTomadas: dto.medidasTomadas ?? null,
        apoderadoNotificado,
        fechaNotificacion: apoderadoNotificado ? dto.fecha : null,
      })
      .returning({ id: incidenciasConducta.id });

    return result[0].id;
  }

  /**
   * Obtiene una incidencia por su ID.
   */
  async obtenerIncidenciaPorId(id: string): Promise<IncidenciaItem | null> {
    const rows = await this.db
      .select({
        id: incidenciasConducta.id,
        matriculaId: incidenciasConducta.matriculaId,
        periodoId: incidenciasConducta.periodoId,
        periodoNombre: periodosAcademicos.nombre,
        registradoPorId: incidenciasConducta.registradoPorId,
        fecha: incidenciasConducta.fecha,
        tipo: incidenciasConducta.tipo,
        categoria: incidenciasConducta.categoria,
        gravedad: incidenciasConducta.gravedad,
        descripcion: incidenciasConducta.descripcion,
        lugar: incidenciasConducta.lugar,
        medidasTomadas: incidenciasConducta.medidasTomadas,
        apoderadoNotificado: incidenciasConducta.apoderadoNotificado,
        fechaNotificacion: incidenciasConducta.fechaNotificacion,
        creadoEn: incidenciasConducta.creadoEn,
        actualizadoEn: incidenciasConducta.actualizadoEn,
        seccionId: matriculas.seccionId,
        seccionNombre: secciones.nombre,
        codigoEstudiante: estudiantes.codigo,
        estNombres: personas.nombres,
        estPaterno: personas.apellidoPaterno,
        estMaterno: personas.apellidoMaterno,
        registradoPorNombre: sql<string>`(
          SELECT TRIM(CONCAT(p2.nombres, ' ', p2.apellido_paterno, ' ', COALESCE(p2.apellido_materno, '')))
          FROM usuarios u2
          JOIN personas p2 ON p2.id = u2.persona_id
          WHERE u2.id = ${incidenciasConducta.registradoPorId}
          LIMIT 1
        )`,
      })
      .from(incidenciasConducta)
      .innerJoin(periodosAcademicos, eq(incidenciasConducta.periodoId, periodosAcademicos.id))
      .innerJoin(matriculas, eq(incidenciasConducta.matriculaId, matriculas.id))
      .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
      .innerJoin(personas, eq(estudiantes.personaId, personas.id))
      .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
      .where(eq(incidenciasConducta.id, id))
      .limit(1);

    if (!rows.length) return null;
    const r = rows[0];

    const estudianteNombre = `${r.estNombres} ${r.estPaterno} ${r.estMaterno || ""}`.trim();

    return {
      id: r.id,
      matriculaId: r.matriculaId,
      estudianteNombre,
      codigoEstudiante: r.codigoEstudiante,
      seccionId: r.seccionId,
      seccionNombre: r.seccionNombre,
      periodoId: r.periodoId,
      periodoNombre: r.periodoNombre,
      registradoPorId: r.registradoPorId,
      registradoPorNombre: r.registradoPorNombre || undefined,
      fecha: r.fecha,
      tipo: r.tipo as "merito" | "falta",
      categoria: r.categoria,
      gravedad: r.gravedad as "leve" | "grave" | "muy_grave" | null,
      descripcion: r.descripcion,
      lugar: r.lugar,
      medidasTomadas: r.medidasTomadas,
      apoderadoNotificado: r.apoderadoNotificado,
      fechaNotificacion: r.fechaNotificacion,
      creadoEn: r.creadoEn,
      actualizadoEn: r.actualizadoEn,
    };
  }

  /**
   * Actualiza los campos permitidos de una incidencia.
   */
  async actualizarIncidencia(id: string, dto: ActualizarIncidenciaDto): Promise<void> {
    await this.db
      .update(incidenciasConducta)
      .set({
        ...(dto.categoria ? { categoria: dto.categoria } : {}),
        ...(dto.gravedad !== undefined ? { gravedad: dto.gravedad } : {}),
        ...(dto.descripcion ? { descripcion: dto.descripcion } : {}),
        ...(dto.lugar !== undefined ? { lugar: dto.lugar } : {}),
        ...(dto.medidasTomadas !== undefined ? { medidasTomadas: dto.medidasTomadas } : {}),
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(incidenciasConducta.id, id));
  }

  /**
   * Elimina una incidencia física (tras registrar auditoría con el motivo).
   */
  async eliminarIncidencia(id: string): Promise<void> {
    await this.db.delete(incidenciasConducta).where(eq(incidenciasConducta.id, id));
  }

  /**
   * Consulta incidencias con filtros y paginación por cursores.
   */
  async listarIncidencias(
    dto: QueryIncidenciasDto,
  ): Promise<{ data: IncidenciaItem[]; nextCursor: string | null; hasMore: boolean }> {
    const limit = dto.limit || 20;

    let cursorDate: string | null = null;
    let cursorId: string | null = null;

    if (dto.cursor) {
      const decoded = decodeCursor<{ fecha: string; id: string }>(dto.cursor);
      if (decoded) {
        cursorDate = decoded.fecha;
        cursorId = decoded.id;
      }
    }

    const conditions: SQL[] = [];

    if (dto.matriculaId) {
      conditions.push(eq(incidenciasConducta.matriculaId, dto.matriculaId));
    }
    if (dto.seccionId) {
      conditions.push(eq(matriculas.seccionId, dto.seccionId));
    }
    if (dto.periodoId) {
      conditions.push(eq(incidenciasConducta.periodoId, dto.periodoId));
    }
    if (dto.tipo) {
      conditions.push(eq(incidenciasConducta.tipo, dto.tipo));
    }
    if (dto.gravedad) {
      conditions.push(eq(incidenciasConducta.gravedad, dto.gravedad));
    }
    if (dto.fechaDesde) {
      conditions.push(gte(incidenciasConducta.fecha, dto.fechaDesde));
    }
    if (dto.fechaHasta) {
      conditions.push(lte(incidenciasConducta.fecha, dto.fechaHasta));
    }

    if (cursorDate && cursorId) {
      conditions.push(
        sql`(${incidenciasConducta.fecha}, ${incidenciasConducta.id}) < (${cursorDate}, ${cursorId}::uuid)`,
      );
    }

    const rows = await this.db
      .select({
        id: incidenciasConducta.id,
        matriculaId: incidenciasConducta.matriculaId,
        periodoId: incidenciasConducta.periodoId,
        periodoNombre: periodosAcademicos.nombre,
        registradoPorId: incidenciasConducta.registradoPorId,
        fecha: incidenciasConducta.fecha,
        tipo: incidenciasConducta.tipo,
        categoria: incidenciasConducta.categoria,
        gravedad: incidenciasConducta.gravedad,
        descripcion: incidenciasConducta.descripcion,
        lugar: incidenciasConducta.lugar,
        medidasTomadas: incidenciasConducta.medidasTomadas,
        apoderadoNotificado: incidenciasConducta.apoderadoNotificado,
        fechaNotificacion: incidenciasConducta.fechaNotificacion,
        creadoEn: incidenciasConducta.creadoEn,
        actualizadoEn: incidenciasConducta.actualizadoEn,
        seccionId: matriculas.seccionId,
        seccionNombre: secciones.nombre,
        codigoEstudiante: estudiantes.codigo,
        estNombres: personas.nombres,
        estPaterno: personas.apellidoPaterno,
        estMaterno: personas.apellidoMaterno,
        registradoPorNombre: sql<string>`(
          SELECT TRIM(CONCAT(p2.nombres, ' ', p2.apellido_paterno, ' ', COALESCE(p2.apellido_materno, '')))
          FROM usuarios u2
          JOIN personas p2 ON p2.id = u2.persona_id
          WHERE u2.id = ${incidenciasConducta.registradoPorId}
          LIMIT 1
        )`,
      })
      .from(incidenciasConducta)
      .innerJoin(periodosAcademicos, eq(incidenciasConducta.periodoId, periodosAcademicos.id))
      .innerJoin(matriculas, eq(incidenciasConducta.matriculaId, matriculas.id))
      .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
      .innerJoin(personas, eq(estudiantes.personaId, personas.id))
      .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
      .where(and(...conditions))
      .orderBy(desc(incidenciasConducta.fecha), desc(incidenciasConducta.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = encodeCursor({ fecha: last.fecha, id: last.id });
    }

    const data: IncidenciaItem[] = items.map((r) => ({
      id: r.id,
      matriculaId: r.matriculaId,
      estudianteNombre: `${r.estNombres} ${r.estPaterno} ${r.estMaterno || ""}`.trim(),
      codigoEstudiante: r.codigoEstudiante,
      seccionId: r.seccionId,
      seccionNombre: r.seccionNombre,
      periodoId: r.periodoId,
      periodoNombre: r.periodoNombre,
      registradoPorId: r.registradoPorId,
      registradoPorNombre: r.registradoPorNombre || undefined,
      fecha: r.fecha,
      tipo: r.tipo as "merito" | "falta",
      categoria: r.categoria,
      gravedad: r.gravedad as "leve" | "grave" | "muy_grave" | null,
      descripcion: r.descripcion,
      lugar: r.lugar,
      medidasTomadas: r.medidasTomadas,
      apoderadoNotificado: r.apoderadoNotificado,
      fechaNotificacion: r.fechaNotificacion,
      creadoEn: r.creadoEn,
      actualizadoEn: r.actualizadoEn,
    }));

    return { data, nextCursor, hasMore };
  }

  /**
   * Crea una observación tutorial o psicopedagógica.
   */
  async crearObservacion(dto: CrearObservacionDto, registradoPorId: string): Promise<string> {
    const result = await this.db
      .insert(observacionesEstudiante)
      .values({
        matriculaId: dto.matriculaId,
        registradoPorId,
        fecha: dto.fecha,
        tipo: dto.tipo,
        observacion: dto.observacion,
        seguimiento: dto.seguimiento ?? null,
        derivadoA: dto.derivadoA ?? null,
        esConfidencial: Boolean(dto.esConfidencial),
      })
      .returning({ id: observacionesEstudiante.id });

    return result[0].id;
  }

  /**
   * Obtiene una observación por su ID.
   */
  async obtenerObservacionPorId(id: string): Promise<ObservacionItem | null> {
    const rows = await this.db
      .select({
        id: observacionesEstudiante.id,
        matriculaId: observacionesEstudiante.matriculaId,
        registradoPorId: observacionesEstudiante.registradoPorId,
        fecha: observacionesEstudiante.fecha,
        tipo: observacionesEstudiante.tipo,
        observacion: observacionesEstudiante.observacion,
        seguimiento: observacionesEstudiante.seguimiento,
        derivadoA: observacionesEstudiante.derivadoA,
        esConfidencial: observacionesEstudiante.esConfidencial,
        creadoEn: observacionesEstudiante.creadoEn,
        actualizadoEn: observacionesEstudiante.actualizadoEn,
        seccionId: matriculas.seccionId,
        seccionNombre: secciones.nombre,
        codigoEstudiante: estudiantes.codigo,
        estNombres: personas.nombres,
        estPaterno: personas.apellidoPaterno,
        estMaterno: personas.apellidoMaterno,
        registradoPorNombre: sql<string>`(
          SELECT TRIM(CONCAT(p2.nombres, ' ', p2.apellido_paterno, ' ', COALESCE(p2.apellido_materno, '')))
          FROM usuarios u2
          JOIN personas p2 ON p2.id = u2.persona_id
          WHERE u2.id = ${observacionesEstudiante.registradoPorId}
          LIMIT 1
        )`,
      })
      .from(observacionesEstudiante)
      .innerJoin(matriculas, eq(observacionesEstudiante.matriculaId, matriculas.id))
      .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
      .innerJoin(personas, eq(estudiantes.personaId, personas.id))
      .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
      .where(eq(observacionesEstudiante.id, id))
      .limit(1);

    if (!rows.length) return null;
    const r = rows[0];

    return {
      id: r.id,
      matriculaId: r.matriculaId,
      estudianteNombre: `${r.estNombres} ${r.estPaterno} ${r.estMaterno || ""}`.trim(),
      codigoEstudiante: r.codigoEstudiante,
      seccionId: r.seccionId,
      seccionNombre: r.seccionNombre,
      registradoPorId: r.registradoPorId,
      registradoPorNombre: r.registradoPorNombre || undefined,
      fecha: r.fecha,
      tipo: r.tipo as TipoObservacion,
      observacion: r.observacion,
      seguimiento: r.seguimiento,
      derivadoA: r.derivadoA,
      esConfidencial: r.esConfidencial,
      creadoEn: r.creadoEn,
      actualizadoEn: r.actualizadoEn,
    };
  }

  /**
   * Lista observaciones con filtros y paginación por cursores.
   */
  async listarObservaciones(
    dto: QueryObservacionesDto,
  ): Promise<{ data: ObservacionItem[]; nextCursor: string | null; hasMore: boolean }> {
    const limit = dto.limit || 20;

    let cursorDate: string | null = null;
    let cursorId: string | null = null;

    if (dto.cursor) {
      const decoded = decodeCursor<{ fecha: string; id: string }>(dto.cursor);
      if (decoded) {
        cursorDate = decoded.fecha;
        cursorId = decoded.id;
      }
    }

    const conditions: SQL[] = [];

    if (dto.matriculaId) {
      conditions.push(eq(observacionesEstudiante.matriculaId, dto.matriculaId));
    }
    if (dto.seccionId) {
      conditions.push(eq(matriculas.seccionId, dto.seccionId));
    }

    if (cursorDate && cursorId) {
      conditions.push(
        sql`(${observacionesEstudiante.fecha}, ${observacionesEstudiante.id}) < (${cursorDate}, ${cursorId}::uuid)`,
      );
    }

    const rows = await this.db
      .select({
        id: observacionesEstudiante.id,
        matriculaId: observacionesEstudiante.matriculaId,
        registradoPorId: observacionesEstudiante.registradoPorId,
        fecha: observacionesEstudiante.fecha,
        tipo: observacionesEstudiante.tipo,
        observacion: observacionesEstudiante.observacion,
        seguimiento: observacionesEstudiante.seguimiento,
        derivadoA: observacionesEstudiante.derivadoA,
        esConfidencial: observacionesEstudiante.esConfidencial,
        creadoEn: observacionesEstudiante.creadoEn,
        actualizadoEn: observacionesEstudiante.actualizadoEn,
        seccionId: matriculas.seccionId,
        seccionNombre: secciones.nombre,
        codigoEstudiante: estudiantes.codigo,
        estNombres: personas.nombres,
        estPaterno: personas.apellidoPaterno,
        estMaterno: personas.apellidoMaterno,
        registradoPorNombre: sql<string>`(
          SELECT TRIM(CONCAT(p2.nombres, ' ', p2.apellido_paterno, ' ', COALESCE(p2.apellido_materno, '')))
          FROM usuarios u2
          JOIN personas p2 ON p2.id = u2.persona_id
          WHERE u2.id = ${observacionesEstudiante.registradoPorId}
          LIMIT 1
        )`,
      })
      .from(observacionesEstudiante)
      .innerJoin(matriculas, eq(observacionesEstudiante.matriculaId, matriculas.id))
      .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
      .innerJoin(personas, eq(estudiantes.personaId, personas.id))
      .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
      .where(and(...conditions))
      .orderBy(desc(observacionesEstudiante.fecha), desc(observacionesEstudiante.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = encodeCursor({ fecha: last.fecha, id: last.id });
    }

    const data: ObservacionItem[] = items.map((r) => ({
      id: r.id,
      matriculaId: r.matriculaId,
      estudianteNombre: `${r.estNombres} ${r.estPaterno} ${r.estMaterno || ""}`.trim(),
      codigoEstudiante: r.codigoEstudiante,
      seccionId: r.seccionId,
      seccionNombre: r.seccionNombre,
      registradoPorId: r.registradoPorId,
      registradoPorNombre: r.registradoPorNombre || undefined,
      fecha: r.fecha,
      tipo: r.tipo as TipoObservacion,
      observacion: r.observacion,
      seguimiento: r.seguimiento,
      derivadoA: r.derivadoA,
      esConfidencial: r.esConfidencial,
      creadoEn: r.creadoEn,
      actualizadoEn: r.actualizadoEn,
    }));

    return { data, nextCursor, hasMore };
  }

  /**
   * Resumen para la ficha del estudiante: métricas por bimestre y gravedad.
   */
  async obtenerResumenConducta(matriculaId: string): Promise<ResumenConductaEstudiante> {
    const matInfo = await this.obtenerInfoMatricula(matriculaId);
    if (!matInfo) {
      throw new Error("Matrícula no encontrada");
    }

    const secRows = await this.db
      .select({
        seccionNombre: secciones.nombre,
        gradoNombre: grados.nombre,
        anioAcademicoId: matriculas.anioAcademicoId,
      })
      .from(matriculas)
      .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .where(eq(matriculas.id, matriculaId))
      .limit(1);

    const seccionNombre = secRows[0]?.seccionNombre || "";
    const gradoNombre = secRows[0]?.gradoNombre || "";
    const anioId = secRows[0]?.anioAcademicoId;

    // Periodos del año
    const periodos = await this.db
      .select({
        id: periodosAcademicos.id,
        nombre: periodosAcademicos.nombre,
        numero: periodosAcademicos.numero,
      })
      .from(periodosAcademicos)
      .where(eq(periodosAcademicos.anioAcademicoId, anioId))
      .orderBy(periodosAcademicos.numero);

    // Incidencias del estudiante
    const incidencias = await this.db
      .select({
        periodoId: incidenciasConducta.periodoId,
        tipo: incidenciasConducta.tipo,
        gravedad: incidenciasConducta.gravedad,
      })
      .from(incidenciasConducta)
      .where(eq(incidenciasConducta.matriculaId, matriculaId));

    let totalMeritos = 0;
    let totalFaltas = 0;

    const desglosePorBimestre: DesgloseBimestreConducta[] = periodos.map((p) => {
      const incsBimestre = incidencias.filter((i) => i.periodoId === p.id);
      const meritos = incsBimestre.filter((i) => i.tipo === "merito").length;
      const faltasLeves = incsBimestre.filter(
        (i) => i.tipo === "falta" && i.gravedad === "leve",
      ).length;
      const faltasGraves = incsBimestre.filter(
        (i) => i.tipo === "falta" && i.gravedad === "grave",
      ).length;
      const faltasMuyGraves = incsBimestre.filter(
        (i) => i.tipo === "falta" && i.gravedad === "muy_grave",
      ).length;
      const totalFaltasBimestre = faltasLeves + faltasGraves + faltasMuyGraves;

      totalMeritos += meritos;
      totalFaltas += totalFaltasBimestre;

      return {
        periodoId: p.id,
        periodoNombre: p.nombre,
        numeroPeriodo: p.numero,
        meritos,
        faltasLeves,
        faltasGraves,
        faltasMuyGraves,
        totalFaltas: totalFaltasBimestre,
      };
    });

    return {
      matriculaId,
      estudianteNombre: matInfo.nombreCompleto,
      codigoEstudiante: matInfo.codigoEstudiante,
      gradoNombre,
      seccionNombre,
      totalMeritos,
      totalFaltas,
      desglosePorBimestre,
    };
  }
}
