import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, ilike, or, type SQL, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  aniosAcademicos,
  asistenciasEstudiante,
  credenciales,
  entregasTarea,
  estudianteApoderados,
  estudiantes,
  grados,
  institucion,
  matriculas,
  personas,
  secciones,
  usuarios,
} from "../../../core/database/schema";
import {
  DatosConstanciaMatricula,
  EstudianteParaMatricula,
  SeccionConVacantes,
} from "../interfaces";
import { MatriculaQueryDto, MatriculaResponseDto } from "../dto";

@Injectable()
export class MatriculasRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findMatriculaById(id: string): Promise<MatriculaResponseDto | null> {
    const [row] = await this.db
      .select({
        id: matriculas.id,
        codigo: matriculas.codigo,
        fechaMatricula: matriculas.fechaMatricula,
        tipo: matriculas.tipo,
        estado: matriculas.estado,
        esRepitente: matriculas.esRepitente,
        colegioProcedencia: matriculas.colegioProcedencia,
        fechaRetiro: matriculas.fechaRetiro,
        motivoRetiro: matriculas.motivoRetiro,
        observaciones: matriculas.observaciones,
        creadoEn: matriculas.creadoEn,
        anioAcademicoId: matriculas.anioAcademicoId,
        anioNumero: aniosAcademicos.anio,
        gradoId: secciones.gradoId,
        gradoNumero: grados.numero,
        gradoNombre: grados.nombre,
        seccionId: matriculas.seccionId,
        seccionNombre: secciones.nombre,
        estudianteId: estudiantes.id,
        codigoEstudiante: estudiantes.codigo,
        estudianteEstado: estudiantes.estado,
        personaNombres: personas.nombres,
        personaApellidoPaterno: personas.apellidoPaterno,
        personaApellidoMaterno: personas.apellidoMaterno,
        personaTipoDocumento: personas.tipoDocumento,
        personaNumeroDocumento: personas.numeroDocumento,
      })
      .from(matriculas)
      .innerJoin(aniosAcademicos, eq(matriculas.anioAcademicoId, aniosAcademicos.id))
      .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
      .innerJoin(personas, eq(estudiantes.personaId, personas.id))
      .where(eq(matriculas.id, id))
      .limit(1);

    if (!row) return null;

    return this.mapToResponseDto(row);
  }

  async findMatriculaByEstudianteYAnio(
    estudianteId: string,
    anioAcademicoId: string,
  ): Promise<{ id: string; codigo: string; estado: string } | null> {
    const [row] = await this.db
      .select({
        id: matriculas.id,
        codigo: matriculas.codigo,
        estado: matriculas.estado,
      })
      .from(matriculas)
      .where(
        and(
          eq(matriculas.estudianteId, estudianteId),
          eq(matriculas.anioAcademicoId, anioAcademicoId),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  async findEstudianteById(estudianteId: string): Promise<EstudianteParaMatricula | null> {
    const [row] = await this.db
      .select({
        id: estudiantes.id,
        personaId: estudiantes.personaId,
        codigo: estudiantes.codigo,
        estado: estudiantes.estado,
        nombres: personas.nombres,
        apellidoPaterno: personas.apellidoPaterno,
        apellidoMaterno: personas.apellidoMaterno,
        numeroDocumento: personas.numeroDocumento,
        tipoDocumento: personas.tipoDocumento,
      })
      .from(estudiantes)
      .innerJoin(personas, eq(estudiantes.personaId, personas.id))
      .where(eq(estudiantes.id, estudianteId))
      .limit(1);

    return row ?? null;
  }

  async findSeccionById(seccionId: string): Promise<SeccionConVacantes | null> {
    const [row] = await this.db
      .select({
        id: secciones.id,
        anioAcademicoId: secciones.anioAcademicoId,
        anioNumero: aniosAcademicos.anio,
        gradoId: secciones.gradoId,
        gradoNumero: grados.numero,
        gradoNombre: grados.nombre,
        nombre: secciones.nombre,
        vacantes: secciones.vacantes,
        estado: secciones.estado,
        matriculadosCount: count(sql`CASE WHEN ${matriculas.estado} = 'matriculado' THEN 1 END`),
      })
      .from(secciones)
      .innerJoin(aniosAcademicos, eq(secciones.anioAcademicoId, aniosAcademicos.id))
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .leftJoin(matriculas, eq(secciones.id, matriculas.seccionId))
      .where(eq(secciones.id, seccionId))
      .groupBy(secciones.id, aniosAcademicos.anio, grados.numero, grados.nombre)
      .limit(1);

    if (!row) return null;

    const matriculados = Number(row.matriculadosCount ?? 0);
    return {
      id: row.id,
      anioAcademicoId: row.anioAcademicoId,
      anioNumero: row.anioNumero,
      gradoId: row.gradoId,
      gradoNumero: row.gradoNumero,
      gradoNombre: row.gradoNombre,
      nombre: row.nombre,
      vacantes: row.vacantes,
      estado: row.estado,
      matriculadosCount: matriculados,
      vacantesDisponibles: Math.max(0, row.vacantes - matriculados),
    };
  }

  async findAnioById(anioId: string): Promise<{ id: string; anio: number; estado: string } | null> {
    const [row] = await this.db
      .select({
        id: aniosAcademicos.id,
        anio: aniosAcademicos.anio,
        estado: aniosAcademicos.estado,
      })
      .from(aniosAcademicos)
      .where(eq(aniosAcademicos.id, anioId))
      .limit(1);

    return row ?? null;
  }

  async hasApoderadoPrincipal(estudianteId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: estudianteApoderados.apoderadoId })
      .from(estudianteApoderados)
      .where(
        and(
          eq(estudianteApoderados.estudianteId, estudianteId),
          eq(estudianteApoderados.esPrincipal, true),
        ),
      )
      .limit(1);

    return Boolean(row);
  }

  async getNextCorrelativo(anio: number): Promise<number> {
    const prefix = `${anio}-%`;
    const [row] = await this.db
      .select({
        maxCodigo: sql<string>`MAX(${matriculas.codigo})`,
      })
      .from(matriculas)
      .where(sql`${matriculas.codigo} LIKE ${prefix}`);

    if (!row?.maxCodigo) return 1;

    const parts = row.maxCodigo.split("-");
    const num = Number(parts[1]);
    return Number.isFinite(num) ? num + 1 : 1;
  }

  async countMatriculadosActivosEnSeccion(seccionId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: count() })
      .from(matriculas)
      .where(and(eq(matriculas.seccionId, seccionId), eq(matriculas.estado, "matriculado")));

    return Number(row?.total ?? 0);
  }

  async hasActividadRegistrada(matriculaId: string): Promise<boolean> {
    const [asistenciasRow] = await this.db
      .select({ total: count() })
      .from(asistenciasEstudiante)
      .where(eq(asistenciasEstudiante.matriculaId, matriculaId));

    if (Number(asistenciasRow?.total ?? 0) > 0) return true;

    const [entregasRow] = await this.db
      .select({ total: count() })
      .from(entregasTarea)
      .where(eq(entregasTarea.matriculaId, matriculaId));

    return Number(entregasRow?.total ?? 0) > 0;
  }

  async create(data: {
    estudianteId: string;
    seccionId: string;
    anioAcademicoId: string;
    codigo: string;
    fechaMatricula: string;
    tipo: string;
    esRepitente?: boolean;
    colegioProcedencia?: string | null;
    observaciones?: string | null;
    registradoPorId?: string | null;
  }): Promise<string> {
    const [inserted] = await this.db
      .insert(matriculas)
      .values({
        estudianteId: data.estudianteId,
        seccionId: data.seccionId,
        anioAcademicoId: data.anioAcademicoId,
        codigo: data.codigo,
        fechaMatricula: data.fechaMatricula,
        tipo: data.tipo,
        estado: "matriculado",
        esRepitente: data.esRepitente ?? false,
        colegioProcedencia: data.colegioProcedencia ?? null,
        observaciones: data.observaciones ?? null,
        registradoPorId: data.registradoPorId ?? null,
      })
      .returning({ id: matriculas.id });

    return inserted.id;
  }

  async update(id: string, data: Partial<typeof matriculas.$inferInsert>): Promise<void> {
    await this.db
      .update(matriculas)
      .set({
        ...data,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(matriculas.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(matriculas).where(eq(matriculas.id, id));
  }

  async desactivarEstudianteYCredenciales(
    estudianteId: string,
    nuevoEstado: "retirado" | "trasladado",
  ): Promise<void> {
    // 1. Cambiar estado en estudiantes
    await this.db
      .update(estudiantes)
      .set({ estado: nuevoEstado, actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(estudiantes.id, estudianteId));

    // 2. Obtener personaId
    const [est] = await this.db
      .select({ personaId: estudiantes.personaId })
      .from(estudiantes)
      .where(eq(estudiantes.id, estudianteId))
      .limit(1);

    if (est?.personaId) {
      // 3. Desactivar credenciales activas
      await this.db
        .update(credenciales)
        .set({
          activa: false,
          anuladaEn: sql`CURRENT_TIMESTAMP`,
          motivoAnulacion: `Estudiante ${nuevoEstado} del colegio`,
        })
        .where(and(eq(credenciales.personaId, est.personaId), eq(credenciales.activa, true)));

      // 4. Inactivar cuenta de usuario si existe
      await this.db
        .update(usuarios)
        .set({
          estado: "inactivo",
          actualizadoEn: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(usuarios.personaId, est.personaId));
    }
  }

  async findMatriculas(
    query: MatriculaQueryDto,
  ): Promise<{ items: MatriculaResponseDto[]; total: number }> {
    const conditions: SQL<unknown>[] = [];

    if (query.anioAcademicoId) {
      conditions.push(eq(matriculas.anioAcademicoId, query.anioAcademicoId));
    }
    if (query.gradoId) {
      conditions.push(eq(secciones.gradoId, query.gradoId));
    }
    if (query.seccionId) {
      conditions.push(eq(matriculas.seccionId, query.seccionId));
    }
    if (query.tipo) {
      conditions.push(eq(matriculas.tipo, query.tipo));
    }
    if (query.estado) {
      conditions.push(eq(matriculas.estado, query.estado));
    }
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      const searchCondition = or(
        ilike(matriculas.codigo, term),
        ilike(estudiantes.codigo, term),
        ilike(personas.numeroDocumento, term),
        ilike(personas.nombres, term),
        ilike(personas.apellidoPaterno, term),
        ilike(personas.apellidoMaterno, term),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Conteo total
    const [totalRow] = await this.db
      .select({ total: count() })
      .from(matriculas)
      .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
      .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
      .innerJoin(personas, eq(estudiantes.personaId, personas.id))
      .where(whereClause);

    const total = Number(totalRow?.total ?? 0);

    // Registros
    const rows = await this.db
      .select({
        id: matriculas.id,
        codigo: matriculas.codigo,
        fechaMatricula: matriculas.fechaMatricula,
        tipo: matriculas.tipo,
        estado: matriculas.estado,
        esRepitente: matriculas.esRepitente,
        colegioProcedencia: matriculas.colegioProcedencia,
        fechaRetiro: matriculas.fechaRetiro,
        motivoRetiro: matriculas.motivoRetiro,
        observaciones: matriculas.observaciones,
        creadoEn: matriculas.creadoEn,
        anioAcademicoId: matriculas.anioAcademicoId,
        anioNumero: aniosAcademicos.anio,
        gradoId: secciones.gradoId,
        gradoNumero: grados.numero,
        gradoNombre: grados.nombre,
        seccionId: matriculas.seccionId,
        seccionNombre: secciones.nombre,
        estudianteId: estudiantes.id,
        codigoEstudiante: estudiantes.codigo,
        estudianteEstado: estudiantes.estado,
        personaNombres: personas.nombres,
        personaApellidoPaterno: personas.apellidoPaterno,
        personaApellidoMaterno: personas.apellidoMaterno,
        personaTipoDocumento: personas.tipoDocumento,
        personaNumeroDocumento: personas.numeroDocumento,
      })
      .from(matriculas)
      .innerJoin(aniosAcademicos, eq(matriculas.anioAcademicoId, aniosAcademicos.id))
      .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
      .innerJoin(personas, eq(estudiantes.personaId, personas.id))
      .where(whereClause)
      .orderBy(desc(matriculas.creadoEn))
      .limit(query.limit)
      .offset(query.offset);

    return {
      items: rows.map((r) => this.mapToResponseDto(r)),
      total,
    };
  }

  async obtenerEstudiantesCulminadosSeccion(
    seccionOrigenId: string,
  ): Promise<EstudianteParaMatricula[]> {
    const rows = await this.db
      .select({
        id: estudiantes.id,
        personaId: estudiantes.personaId,
        codigo: estudiantes.codigo,
        estado: estudiantes.estado,
        nombres: personas.nombres,
        apellidoPaterno: personas.apellidoPaterno,
        apellidoMaterno: personas.apellidoMaterno,
        numeroDocumento: personas.numeroDocumento,
        tipoDocumento: personas.tipoDocumento,
      })
      .from(matriculas)
      .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
      .innerJoin(personas, eq(estudiantes.personaId, personas.id))
      .where(and(eq(matriculas.seccionId, seccionOrigenId), eq(matriculas.estado, "culminado")))
      .orderBy(personas.apellidoPaterno, personas.apellidoMaterno, personas.nombres);

    return rows;
  }

  async getDatosConstancia(matriculaId: string): Promise<DatosConstanciaMatricula | null> {
    const [row] = await this.db
      .select({
        codigoMatricula: matriculas.codigo,
        fechaMatricula: matriculas.fechaMatricula,
        tipoMatricula: matriculas.tipo,
        anioEscolar: aniosAcademicos.anio,
        gradoNumero: grados.numero,
        gradoNombre: grados.nombre,
        seccionNombre: secciones.nombre,
        estudianteCodigo: estudiantes.codigo,
        estudianteNombres: personas.nombres,
        estudianteApellidoPaterno: personas.apellidoPaterno,
        estudianteApellidoMaterno: personas.apellidoMaterno,
        estudianteTipoDocumento: personas.tipoDocumento,
        estudianteNumeroDocumento: personas.numeroDocumento,
        estudianteFechaNacimiento: personas.fechaNacimiento,
      })
      .from(matriculas)
      .innerJoin(aniosAcademicos, eq(matriculas.anioAcademicoId, aniosAcademicos.id))
      .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
      .innerJoin(personas, eq(estudiantes.personaId, personas.id))
      .where(eq(matriculas.id, matriculaId))
      .limit(1);

    if (!row) return null;

    // Obtener datos institucionales
    const [inst] = await this.db
      .select({
        nombre: institucion.nombre,
        codigoModular: institucion.codigoModular,
        direccion: institucion.direccion,
        telefono: institucion.telefono,
      })
      .from(institucion)
      .limit(1);

    return {
      codigoMatricula: row.codigoMatricula,
      fechaMatricula: row.fechaMatricula,
      tipoMatricula: row.tipoMatricula,
      anioEscolar: row.anioEscolar,
      gradoNumero: row.gradoNumero,
      gradoNombre: row.gradoNombre,
      seccionNombre: row.seccionNombre,
      estudiante: {
        codigo: row.estudianteCodigo,
        nombres: row.estudianteNombres,
        apellidos: `${row.estudianteApellidoPaterno} ${row.estudianteApellidoMaterno ?? ""}`.trim(),
        tipoDocumento: row.estudianteTipoDocumento,
        numeroDocumento: row.estudianteNumeroDocumento,
        fechaNacimiento: row.estudianteFechaNacimiento,
      },
      institucion: {
        nombre: inst?.nombre || "Colegio Nacional San Juan",
        codigoModular: inst?.codigoModular || null,
        direccion: inst?.direccion || null,
        telefono: inst?.telefono || null,
      },
    };
  }

  private mapToResponseDto(r: {
    id: string;
    codigo: string;
    fechaMatricula: string;
    tipo: string;
    estado: string;
    esRepitente: boolean;
    colegioProcedencia?: string | null;
    fechaRetiro?: string | null;
    motivoRetiro?: string | null;
    observaciones?: string | null;
    creadoEn: string;
    anioAcademicoId: string;
    anioNumero: number;
    gradoId: string;
    gradoNumero: number;
    gradoNombre: string;
    seccionId: string;
    seccionNombre: string;
    estudianteId: string;
    codigoEstudiante: string;
    estudianteEstado: string;
    personaNombres: string;
    personaApellidoPaterno: string;
    personaApellidoMaterno?: string | null;
    personaTipoDocumento: string;
    personaNumeroDocumento: string;
  }): MatriculaResponseDto {
    return {
      id: r.id,
      codigo: r.codigo,
      fechaMatricula: r.fechaMatricula,
      tipo: r.tipo,
      estado: r.estado,
      esRepitente: r.esRepitente,
      colegioProcedencia: r.colegioProcedencia ?? null,
      fechaRetiro: r.fechaRetiro ?? null,
      motivoRetiro: r.motivoRetiro ?? null,
      observaciones: r.observaciones ?? null,
      anioAcademicoId: r.anioAcademicoId,
      anioNumero: r.anioNumero,
      gradoId: r.gradoId,
      gradoNumero: r.gradoNumero,
      gradoNombre: r.gradoNombre,
      seccionId: r.seccionId,
      seccionNombre: r.seccionNombre,
      estudiante: {
        id: r.estudianteId,
        codigo: r.codigoEstudiante,
        nombres: r.personaNombres,
        apellidos: `${r.personaApellidoPaterno} ${r.personaApellidoMaterno ?? ""}`.trim(),
        tipoDocumento: r.personaTipoDocumento,
        numeroDocumento: r.personaNumeroDocumento,
        estado: r.estudianteEstado,
      },
      creadoEn: r.creadoEn,
    };
  }
}
