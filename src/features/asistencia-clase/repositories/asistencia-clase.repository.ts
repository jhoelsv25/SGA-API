import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  apoderados,
  aniosAcademicos,
  asistenciasEstudiante,
  calendarioEventos,
  cursos,
  cursosSeccion,
  docentes,
  estudianteApoderados,
  estudiantes,
  grados,
  horarios,
  marcaciones,
  matriculas,
  personas,
  secciones,
  sesionesClase,
  usuarios,
} from "../../../core/database/schema";
import type { EstadoAsistencia } from "../constants";
import type { EstudianteListaAsistenciaDto, EstudianteVinculadoAsistenciaDto } from "../dto";
import type {
  AsistenciaCursoFila,
  EntradaDePersona,
  EstudianteBasico,
  IAsistenciaClaseRepository,
  MatriculaDeSeccion,
  MatriculaParaConsulta,
  NuevoRegistroAsistencia,
  RegistroAsistencia,
  SeccionConTutor,
  SesionParaAsistencia,
} from "../interfaces";
import type { ResultadoMarcacion } from "../../marcaciones/constants";

const nombreCompletoSql = sql<string>`TRIM(${personas.apellidoPaterno} || ' ' || COALESCE(${personas.apellidoMaterno}, '') || ', ' || ${personas.nombres})`;

function siguienteDia(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10);
}

@Injectable()
export class AsistenciaClaseRepository implements IAsistenciaClaseRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findSesion(sesionId: string): Promise<SesionParaAsistencia | null> {
    const [fila] = await this.db
      .select({
        id: sesionesClase.id,
        fecha: sesionesClase.fecha,
        docenteId: sesionesClase.docenteId,
        firmadaInicioEn: sesionesClase.firmadaInicioEn,
        seccionId: horarios.seccionId,
        seccionNombre: sql<string>`${grados.numero} || '.° ' || ${secciones.nombre}`,
        tutorId: secciones.tutorId,
        cursoSeccionId: cursosSeccion.id,
        cursoNombre: cursos.nombre,
      })
      .from(sesionesClase)
      .innerJoin(horarios, eq(horarios.id, sesionesClase.horarioId))
      .innerJoin(cursosSeccion, eq(cursosSeccion.id, horarios.cursoSeccionId))
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .innerJoin(secciones, eq(secciones.id, horarios.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .where(eq(sesionesClase.id, sesionId))
      .limit(1);
    return fila ?? null;
  }

  async findDocenteIdPorPersona(personaId: string): Promise<string | null> {
    const [fila] = await this.db
      .select({ id: docentes.id })
      .from(docentes)
      .where(eq(docentes.personaId, personaId))
      .limit(1);
    return fila?.id ?? null;
  }

  async listarEstudiantesDeSesion(
    sesion: SesionParaAsistencia,
  ): Promise<EstudianteListaAsistenciaDto[]> {
    const filas = await this.db
      .select({
        matriculaId: matriculas.id,
        estudianteId: estudiantes.id,
        nombreCompleto: nombreCompletoSql,
        fotoUrl: personas.fotoUrl,
        asistenciaId: asistenciasEstudiante.id,
        estado: asistenciasEstudiante.estado,
        justificacion: asistenciasEstudiante.justificacion,
        noMarcoIngreso: sql<boolean>`NOT EXISTS (
          SELECT 1 FROM ${marcaciones} mar
          WHERE mar.persona_id = ${personas.id} AND mar.tipo = 'entrada'
            AND mar.fecha_hora >= ${`${sesion.fecha} 00:00:00`}::timestamp
            AND mar.fecha_hora < ${`${siguienteDia(sesion.fecha)} 00:00:00`}::timestamp)`,
      })
      .from(matriculas)
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .innerJoin(personas, eq(personas.id, estudiantes.personaId))
      .leftJoin(
        asistenciasEstudiante,
        and(
          eq(asistenciasEstudiante.matriculaId, matriculas.id),
          eq(asistenciasEstudiante.cursoSeccionId, sesion.cursoSeccionId),
          eq(asistenciasEstudiante.fecha, sesion.fecha),
        ),
      )
      .where(and(eq(matriculas.seccionId, sesion.seccionId), eq(matriculas.estado, "matriculado")))
      .orderBy(asc(personas.apellidoPaterno), asc(personas.apellidoMaterno), asc(personas.nombres));
    return filas.map((f) => ({
      ...f,
      estado: (f.estado ?? "presente") as EstadoAsistencia,
    }));
  }

  async guardarAsistencia(
    sesion: SesionParaAsistencia,
    registros: NuevoRegistroAsistencia[],
    actorId: string,
  ): Promise<void> {
    if (registros.length === 0) return;
    await this.db.transaction(async (tx) => {
      await tx
        .insert(asistenciasEstudiante)
        .values(
          registros.map((r) => ({
            matriculaId: r.matriculaId,
            cursoSeccionId: sesion.cursoSeccionId,
            fecha: sesion.fecha,
            estado: r.estado,
            registradoPorId: actorId,
          })),
        )
        .onConflictDoUpdate({
          target: [
            asistenciasEstudiante.matriculaId,
            asistenciasEstudiante.cursoSeccionId,
            asistenciasEstudiante.fecha,
          ],
          set: {
            estado: sql`excluded.estado`,
            registradoPorId: actorId,
            actualizadoEn: sql`CURRENT_TIMESTAMP`,
          },
        });
    });
  }

  async findRegistro(id: string): Promise<RegistroAsistencia | null> {
    const [fila] = await this.db
      .select({
        id: asistenciasEstudiante.id,
        estado: asistenciasEstudiante.estado,
        matriculaId: asistenciasEstudiante.matriculaId,
        cursoSeccionId: asistenciasEstudiante.cursoSeccionId,
        fecha: asistenciasEstudiante.fecha,
        seccionId: cursosSeccion.seccionId,
        tutorId: secciones.tutorId,
      })
      .from(asistenciasEstudiante)
      .innerJoin(cursosSeccion, eq(cursosSeccion.id, asistenciasEstudiante.cursoSeccionId))
      .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
      .where(eq(asistenciasEstudiante.id, id))
      .limit(1);
    return fila ? { ...fila, estado: fila.estado as EstadoAsistencia } : null;
  }

  async justificarFalta(
    id: string,
    motivo: string,
    documentoUrl: string | null,
    actorId: string,
  ): Promise<void> {
    await this.db
      .update(asistenciasEstudiante)
      .set({
        estado: "falta_justificada",
        justificacion: motivo,
        documentoUrl,
        registradoPorId: actorId,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(asistenciasEstudiante.id, id));
  }

  async findEstudiante(estudianteId: string): Promise<EstudianteBasico | null> {
    const [fila] = await this.db
      .select({
        id: estudiantes.id,
        personaId: estudiantes.personaId,
        nombreCompleto: nombreCompletoSql,
      })
      .from(estudiantes)
      .innerJoin(personas, eq(personas.id, estudiantes.personaId))
      .where(eq(estudiantes.id, estudianteId))
      .limit(1);
    return fila ?? null;
  }

  async esApoderadoDe(personaId: string, estudianteId: string): Promise<boolean> {
    const [fila] = await this.db
      .select({ id: apoderados.id })
      .from(apoderados)
      .innerJoin(estudianteApoderados, eq(estudianteApoderados.apoderadoId, apoderados.id))
      .where(
        and(
          eq(apoderados.personaId, personaId),
          eq(estudianteApoderados.estudianteId, estudianteId),
        ),
      )
      .limit(1);
    return Boolean(fila);
  }

  async estudiantesVinculados(personaId: string): Promise<EstudianteVinculadoAsistenciaDto[]> {
    const seccionActual = sql<string | null>`(
      SELECT g.numero || '.° ' || s.nombre
      FROM ${matriculas} m
      JOIN ${secciones} s ON s.id = m.seccion_id
      JOIN ${grados} g ON g.id = s.grado_id
      JOIN ${aniosAcademicos} a ON a.id = m.anio_academico_id
      WHERE m.estudiante_id = ${estudiantes.id} AND m.estado = 'matriculado'
      ORDER BY a.fecha_fin DESC LIMIT 1)`;

    const propios = await this.db
      .select({
        estudianteId: estudiantes.id,
        nombreCompleto: nombreCompletoSql,
        seccion: seccionActual,
      })
      .from(estudiantes)
      .innerJoin(personas, eq(personas.id, estudiantes.personaId))
      .where(eq(estudiantes.personaId, personaId));

    const hijos = await this.db
      .select({
        estudianteId: estudiantes.id,
        nombreCompleto: nombreCompletoSql,
        seccion: seccionActual,
      })
      .from(apoderados)
      .innerJoin(estudianteApoderados, eq(estudianteApoderados.apoderadoId, apoderados.id))
      .innerJoin(estudiantes, eq(estudiantes.id, estudianteApoderados.estudianteId))
      .innerJoin(personas, eq(personas.id, estudiantes.personaId))
      .where(eq(apoderados.personaId, personaId));

    return [...propios, ...hijos];
  }

  async matriculaParaConsulta(
    estudianteId: string,
    desde: string,
    hasta: string,
  ): Promise<MatriculaParaConsulta | null> {
    const [fila] = await this.db
      .select({
        id: matriculas.id,
        seccionId: matriculas.seccionId,
        seccionNombre: sql<string>`${grados.numero} || '.° ' || ${secciones.nombre}`,
        tutorId: secciones.tutorId,
        anioAcademicoId: matriculas.anioAcademicoId,
        fechaMatricula: matriculas.fechaMatricula,
        fechaRetiro: matriculas.fechaRetiro,
        estado: matriculas.estado,
      })
      .from(matriculas)
      .innerJoin(secciones, eq(secciones.id, matriculas.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .innerJoin(aniosAcademicos, eq(aniosAcademicos.id, matriculas.anioAcademicoId))
      .where(
        and(
          eq(matriculas.estudianteId, estudianteId),
          sql`${aniosAcademicos.fechaInicio} <= ${hasta}`,
          sql`${aniosAcademicos.fechaFin} >= ${desde}`,
        ),
      )
      .orderBy(sql`${aniosAcademicos.fechaFin} DESC`)
      .limit(1);
    return fila ?? null;
  }

  async entradasDePersonas(
    personaIds: string[],
    desde: string,
    hasta: string,
  ): Promise<EntradaDePersona[]> {
    if (personaIds.length === 0) return [];
    const filas = await this.db
      .select({
        personaId: marcaciones.personaId,
        fecha: sql<string>`to_char(${marcaciones.fechaHora}, 'YYYY-MM-DD')`,
        hora: sql<string>`to_char(${marcaciones.fechaHora}, 'HH24:MI')`,
        resultado: marcaciones.resultado,
        minutosTardanza: marcaciones.minutosTardanza,
        justificada: marcaciones.justificada,
      })
      .from(marcaciones)
      .where(
        and(
          inArray(marcaciones.personaId, personaIds),
          eq(marcaciones.tipo, "entrada"),
          sql`${marcaciones.fechaHora} >= ${`${desde} 00:00:00`}::timestamp`,
          sql`${marcaciones.fechaHora} < ${`${siguienteDia(hasta)} 00:00:00`}::timestamp`,
        ),
      )
      .orderBy(asc(marcaciones.fechaHora));
    return filas.map((f) => ({ ...f, resultado: f.resultado as ResultadoMarcacion }));
  }

  async suspensiones(
    anioAcademicoId: string,
    desde: string,
    hasta: string,
  ): Promise<{ fechaInicio: string; fechaFin: string }[]> {
    return this.db
      .select({ fechaInicio: calendarioEventos.fechaInicio, fechaFin: calendarioEventos.fechaFin })
      .from(calendarioEventos)
      .where(
        and(
          eq(calendarioEventos.anioAcademicoId, anioAcademicoId),
          eq(calendarioEventos.suspendeClases, true),
          sql`${calendarioEventos.fechaInicio} <= ${hasta}`,
          sql`${calendarioEventos.fechaFin} >= ${desde}`,
        ),
      );
  }

  async asistenciaPorCurso(
    matriculaIds: string[],
    desde: string,
    hasta: string,
  ): Promise<AsistenciaCursoFila[]> {
    if (matriculaIds.length === 0) return [];
    const filas = await this.db
      .select({
        id: asistenciasEstudiante.id,
        matriculaId: asistenciasEstudiante.matriculaId,
        cursoSeccionId: asistenciasEstudiante.cursoSeccionId,
        cursoNombre: cursos.nombre,
        fecha: asistenciasEstudiante.fecha,
        estado: asistenciasEstudiante.estado,
        justificacion: asistenciasEstudiante.justificacion,
      })
      .from(asistenciasEstudiante)
      .innerJoin(cursosSeccion, eq(cursosSeccion.id, asistenciasEstudiante.cursoSeccionId))
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .where(
        and(
          inArray(asistenciasEstudiante.matriculaId, matriculaIds),
          sql`${asistenciasEstudiante.fecha} >= ${desde}`,
          sql`${asistenciasEstudiante.fecha} <= ${hasta}`,
        ),
      )
      .orderBy(asc(cursos.nombre), asc(asistenciasEstudiante.fecha));
    return filas.map((f) => ({ ...f, estado: f.estado as EstadoAsistencia }));
  }

  /** Secciones del año; con tutorId solo las que ese docente tutoriza. */
  async seccionesConsultables(
    anioAcademicoId: string,
    tutorId: string | null,
  ): Promise<{ id: string; nombre: string }[]> {
    return this.db
      .select({
        id: secciones.id,
        nombre: sql<string>`${grados.numero} || '.° ' || ${secciones.nombre}`,
      })
      .from(secciones)
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .where(
        and(
          eq(secciones.anioAcademicoId, anioAcademicoId),
          tutorId ? eq(secciones.tutorId, tutorId) : undefined,
        ),
      )
      .orderBy(asc(grados.numero), asc(secciones.nombre));
  }

  async findSeccion(seccionId: string): Promise<SeccionConTutor | null> {
    const [fila] = await this.db
      .select({
        id: secciones.id,
        nombre: sql<string>`${grados.numero} || '.° ' || ${secciones.nombre}`,
        tutorId: secciones.tutorId,
        anioAcademicoId: secciones.anioAcademicoId,
      })
      .from(secciones)
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .where(eq(secciones.id, seccionId))
      .limit(1);
    return fila ?? null;
  }

  async matriculasDeSeccion(seccionId: string): Promise<MatriculaDeSeccion[]> {
    return this.db
      .select({
        matriculaId: matriculas.id,
        estudianteId: estudiantes.id,
        personaId: personas.id,
        nombreCompleto: nombreCompletoSql,
        fechaMatricula: matriculas.fechaMatricula,
        fechaRetiro: matriculas.fechaRetiro,
      })
      .from(matriculas)
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .innerJoin(personas, eq(personas.id, estudiantes.personaId))
      .where(
        and(
          eq(matriculas.seccionId, seccionId),
          inArray(matriculas.estado, ["matriculado", "retirado", "trasladado"]),
        ),
      )
      .orderBy(asc(personas.apellidoPaterno), asc(personas.apellidoMaterno), asc(personas.nombres));
  }

  async findApoderadosUsuariosDeMatriculas(
    matriculaIds: string[],
  ): Promise<Array<{ matriculaId: string; usuarioId: string; estudianteNombre: string }>> {
    if (matriculaIds.length === 0) return [];

    return this.db
      .select({
        matriculaId: matriculas.id,
        usuarioId: usuarios.id,
        estudianteNombre: nombreCompletoSql,
      })
      .from(matriculas)
      .innerJoin(estudiantes, eq(estudiantes.id, matriculas.estudianteId))
      .innerJoin(personas, eq(personas.id, estudiantes.personaId))
      .innerJoin(estudianteApoderados, eq(estudianteApoderados.estudianteId, estudiantes.id))
      .innerJoin(apoderados, eq(apoderados.id, estudianteApoderados.apoderadoId))
      .innerJoin(usuarios, eq(usuarios.personaId, apoderados.personaId))
      .where(and(inArray(matriculas.id, matriculaIds), eq(usuarios.estado, "activo")));
  }
}
