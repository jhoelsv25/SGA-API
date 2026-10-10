import { Inject, Injectable } from "@nestjs/common";
<<<<<<< HEAD
import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  cursos,
  cursosSeccion,
=======
import { and, count, eq, ne, type SQL, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  aniosAcademicos,
>>>>>>> ab15606 (feat(api): implementar RF-009 matriculas, retiro, traslado y base de secciones)
  docentes,
  grados,
  matriculas,
  personas,
<<<<<<< HEAD
  planEstudios,
  secciones,
} from "../../../core/database/schema";
import type { SeccionQueryDto, SeccionResponseDto } from "../dto";
import type { CreateSeccionData, ISeccionesRepository, UpdateSeccionData } from "../interfaces";
import { formatearNombreCompleto } from "../utils";

@Injectable()
export class SeccionesRepository implements ISeccionesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private getSeccionesSelect() {
    return {
      id: secciones.id,
      anioAcademicoId: secciones.anioAcademicoId,
      gradoId: secciones.gradoId,
      gradoNumero: grados.numero,
      gradoNombre: grados.nombre,
      nombre: secciones.nombre,
      aula: secciones.aula,
      vacantes: secciones.vacantes,
      estado: secciones.estado,
      tutorId: docentes.id,
      tutorCodigo: docentes.codigo,
      tutorPersonaNombres: personas.nombres,
      tutorPersonaApellidoPaterno: personas.apellidoPaterno,
      tutorPersonaApellidoMaterno: personas.apellidoMaterno,
      matriculados: sql<number>`COALESCE((
        SELECT COUNT(*)::int
        FROM ${matriculas}
        WHERE ${matriculas.seccionId} = ${secciones.id}
          AND ${matriculas.estado} = 'matriculado'
      ), 0)`.mapWith(Number),
      totalCursos: sql<number>`COALESCE((
        SELECT COUNT(*)::int
        FROM ${cursosSeccion}
        WHERE ${cursosSeccion.seccionId} = ${secciones.id}
      ), 0)`.mapWith(Number),
      cursosSinDocente: sql<number>`COALESCE((
        SELECT COUNT(*)::int
        FROM ${cursosSeccion}
        WHERE ${cursosSeccion.seccionId} = ${secciones.id}
          AND ${cursosSeccion.docenteId} IS NULL
      ), 0)`.mapWith(Number),
    };
  }

  private mapearFilaAResponseDto(row: {
    id: string;
    anioAcademicoId: string;
    gradoId: string;
    gradoNumero: number;
    gradoNombre: string;
    nombre: string;
    aula: string | null;
    vacantes: number;
    estado: string;
    tutorId: string | null;
    tutorCodigo: string | null;
    tutorPersonaNombres: string | null;
    tutorPersonaApellidoPaterno: string | null;
    tutorPersonaApellidoMaterno: string | null;
    matriculados: number;
    totalCursos: number;
    cursosSinDocente: number;
  }): SeccionResponseDto {
    const tutor =
      row.tutorId && row.tutorCodigo
        ? {
            id: row.tutorId,
            codigo: row.tutorCodigo,
            nombreCompleto: formatearNombreCompleto(
              row.tutorPersonaNombres,
              row.tutorPersonaApellidoPaterno,
              row.tutorPersonaApellidoMaterno,
            ),
          }
        : null;

    return {
      id: row.id,
      anioAcademicoId: row.anioAcademicoId,
      gradoId: row.gradoId,
      gradoNumero: row.gradoNumero,
      gradoNombre: row.gradoNombre,
      nombre: row.nombre,
      aula: row.aula,
      vacantes: row.vacantes,
      estado: row.estado,
      tutor,
      matriculados: row.matriculados,
      totalCursos: row.totalCursos,
      cursosSinDocente: row.cursosSinDocente,
    };
  }

  async findById(id: string): Promise<SeccionResponseDto | null> {
    const rows = await this.db
      .select(this.getSeccionesSelect())
      .from(secciones)
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .leftJoin(docentes, eq(secciones.tutorId, docentes.id))
      .leftJoin(personas, eq(docentes.personaId, personas.id))
      .where(eq(secciones.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return this.mapearFilaAResponseDto(rows[0]);
  }

  async findAll(anioId: string, filtros?: SeccionQueryDto): Promise<SeccionResponseDto[]> {
    const condiciones = [eq(secciones.anioAcademicoId, anioId)];

    if (filtros?.gradoId) {
      condiciones.push(eq(secciones.gradoId, filtros.gradoId));
    }

    if (filtros?.estado) {
      condiciones.push(eq(secciones.estado, filtros.estado));
    }

    const rows = await this.db
      .select(this.getSeccionesSelect())
      .from(secciones)
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .leftJoin(docentes, eq(secciones.tutorId, docentes.id))
      .leftJoin(personas, eq(docentes.personaId, personas.id))
      .where(and(...condiciones))
      .orderBy(asc(grados.numero), asc(secciones.nombre));

    return rows.map((r) => this.mapearFilaAResponseDto(r));
  }

  async findPorNombre(
    anioId: string,
    gradoId: string,
    nombre: string,
    exceptoId?: string,
  ): Promise<SeccionResponseDto | null> {
    const condiciones = [
      eq(secciones.anioAcademicoId, anioId),
      eq(secciones.gradoId, gradoId),
      eq(secciones.nombre, nombre),
    ];

    if (exceptoId) {
      condiciones.push(ne(secciones.id, exceptoId));
    }

    const rows = await this.db
      .select(this.getSeccionesSelect())
      .from(secciones)
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .leftJoin(docentes, eq(secciones.tutorId, docentes.id))
      .leftJoin(personas, eq(docentes.personaId, personas.id))
      .where(and(...condiciones))
      .limit(1);

    if (rows.length === 0) return null;
    return this.mapearFilaAResponseDto(rows[0]);
  }

  async tutorOcupado(
    anioId: string,
    docenteId: string,
    exceptoSeccionId?: string,
  ): Promise<boolean> {
    const condiciones = [
      eq(secciones.anioAcademicoId, anioId),
      eq(secciones.tutorId, docenteId),
      eq(secciones.estado, "activa"),
    ];

    if (exceptoSeccionId) {
      condiciones.push(ne(secciones.id, exceptoSeccionId));
    }

    const rows = await this.db
      .select({ id: secciones.id })
      .from(secciones)
      .where(and(...condiciones))
      .limit(1);

    return rows.length > 0;
  }

  async contarMatriculadosVigentes(seccionId: string): Promise<number> {
    const rows = await this.db
      .select({
        total: sql<number>`COUNT(*)::int`,
      })
      .from(matriculas)
      .where(and(eq(matriculas.seccionId, seccionId), eq(matriculas.estado, "matriculado")));

    return rows[0]?.total ?? 0;
  }

  async createConCarga(data: CreateSeccionData): Promise<SeccionResponseDto> {
    return this.db.transaction(async (tx) => {
      const [nuevaSeccion] = await tx
        .insert(secciones)
        .values({
          anioAcademicoId: data.anioAcademicoId,
          gradoId: data.gradoId,
          nombre: data.nombre,
          aula: data.aula ?? null,
          vacantes: data.vacantes,
          tutorId: data.tutorId ?? null,
          estado: "activa",
        })
        .returning();

      const cursosPlan = await tx
        .select({
          cursoId: planEstudios.cursoId,
        })
        .from(planEstudios)
        .innerJoin(cursos, eq(planEstudios.cursoId, cursos.id))
        .where(
          and(
            eq(planEstudios.gradoId, data.gradoId),
            eq(planEstudios.activo, true),
            isNull(cursos.eliminadoEn),
          ),
        );

      if (cursosPlan.length > 0) {
        const cargaAcademica = cursosPlan.map((item) => ({
          seccionId: nuevaSeccion.id,
          cursoId: item.cursoId,
          docenteId: null,
        }));
        await tx.insert(cursosSeccion).values(cargaAcademica);
      }

      const rows = await tx
        .select(this.getSeccionesSelect())
        .from(secciones)
        .innerJoin(grados, eq(secciones.gradoId, grados.id))
        .leftJoin(docentes, eq(secciones.tutorId, docentes.id))
        .leftJoin(personas, eq(docentes.personaId, personas.id))
        .where(eq(secciones.id, nuevaSeccion.id))
        .limit(1);

      if (rows.length === 0) {
        throw new Error("No se pudo recuperar la sección creada en la transacción.");
      }

      return this.mapearFilaAResponseDto(rows[0]);
    });
  }

  async update(id: string, data: UpdateSeccionData): Promise<SeccionResponseDto> {
    const valoresActualizacion: Record<string, unknown> = {
      actualizadoEn: sql`CURRENT_TIMESTAMP`,
    };

    if (data.nombre !== undefined) {
      valoresActualizacion.nombre = data.nombre.trim();
    }
    if (data.aula !== undefined) {
      valoresActualizacion.aula = data.aula ? data.aula.trim() : null;
    }
    if (data.vacantes !== undefined) {
      valoresActualizacion.vacantes = data.vacantes;
    }
    if (data.tutorId !== undefined) {
      valoresActualizacion.tutorId = data.tutorId;
    }

    await this.db.update(secciones).set(valoresActualizacion).where(eq(secciones.id, id));

    const actualizada = await this.findById(id);
    if (!actualizada) {
      throw new Error("No se pudo recuperar la sección actualizada.");
    }
    return actualizada;
  }

  async cerrar(id: string): Promise<SeccionResponseDto> {
    await this.db
      .update(secciones)
      .set({
        estado: "cerrada",
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(secciones.id, id));

    const cerrada = await this.findById(id);
    if (!cerrada) {
      throw new Error("No se pudo recuperar la sección cerrada.");
    }
    return cerrada;
=======
  secciones,
} from "../../../core/database/schema";
import { CreateSeccionDto, SeccionQueryDto, SeccionResponseDto, UpdateSeccionDto } from "../dto";

@Injectable()
export class SeccionesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAll(query: SeccionQueryDto): Promise<SeccionResponseDto[]> {
    const conditions: SQL<unknown>[] = [];

    if (query.anioAcademicoId) {
      conditions.push(eq(secciones.anioAcademicoId, query.anioAcademicoId));
    }
    if (query.gradoId) {
      conditions.push(eq(secciones.gradoId, query.gradoId));
    }
    if (query.soloActivas) {
      conditions.push(eq(secciones.estado, "activa"));
    }

    const rows = await this.db
      .select({
        id: secciones.id,
        anioAcademicoId: secciones.anioAcademicoId,
        anioNumero: aniosAcademicos.anio,
        gradoId: secciones.gradoId,
        gradoNumero: grados.numero,
        gradoNombre: grados.nombre,
        nombre: secciones.nombre,
        aula: secciones.aula,
        vacantes: secciones.vacantes,
        estado: secciones.estado,
        creadoEn: secciones.creadoEn,
        actualizadoEn: secciones.actualizadoEn,
        tutorId: docentes.id,
        tutorNombres: personas.nombres,
        tutorApellidoPaterno: personas.apellidoPaterno,
        tutorApellidoMaterno: personas.apellidoMaterno,
        tutorDocumento: personas.numeroDocumento,
        matriculadosCount: count(sql`CASE WHEN ${matriculas.estado} = 'matriculado' THEN 1 END`),
      })
      .from(secciones)
      .innerJoin(aniosAcademicos, eq(secciones.anioAcademicoId, aniosAcademicos.id))
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .leftJoin(docentes, eq(secciones.tutorId, docentes.id))
      .leftJoin(personas, eq(docentes.personaId, personas.id))
      .leftJoin(matriculas, eq(secciones.id, matriculas.seccionId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(
        secciones.id,
        aniosAcademicos.anio,
        grados.numero,
        grados.nombre,
        docentes.id,
        personas.nombres,
        personas.apellidoPaterno,
        personas.apellidoMaterno,
        personas.numeroDocumento,
      )
      .orderBy(grados.numero, secciones.nombre);

    return rows.map((r) => {
      const matriculados = Number(r.matriculadosCount ?? 0);
      return {
        id: r.id,
        anioAcademicoId: r.anioAcademicoId,
        anioNumero: r.anioNumero,
        gradoId: r.gradoId,
        gradoNumero: r.gradoNumero,
        gradoNombre: r.gradoNombre,
        nombre: r.nombre,
        aula: r.aula,
        vacantes: r.vacantes,
        matriculadosCount: matriculados,
        vacantesDisponibles: Math.max(0, r.vacantes - matriculados),
        estado: r.estado,
        tutor: r.tutorId
          ? {
              id: r.tutorId,
              nombres: r.tutorNombres ?? "",
              apellidos: `${r.tutorApellidoPaterno ?? ""} ${r.tutorApellidoMaterno ?? ""}`.trim(),
              numeroDocumento: r.tutorDocumento ?? undefined,
            }
          : null,
        creadoEn: r.creadoEn,
        actualizadoEn: r.actualizadoEn,
      };
    });
  }

  async findById(id: string): Promise<SeccionResponseDto | null> {
    const list = await this.findAll({});
    return list.find((s) => s.id === id) ?? null;
  }

  async findExistingByName(
    anioAcademicoId: string,
    gradoId: string,
    nombre: string,
    excludeId?: string,
  ): Promise<{ id: string } | null> {
    const conditions = [
      eq(secciones.anioAcademicoId, anioAcademicoId),
      eq(secciones.gradoId, gradoId),
      sql`LOWER(${secciones.nombre}) = LOWER(${nombre.trim()})`,
    ];
    if (excludeId) {
      conditions.push(ne(secciones.id, excludeId));
    }

    const [found] = await this.db
      .select({ id: secciones.id })
      .from(secciones)
      .where(and(...conditions))
      .limit(1);

    return found ?? null;
  }

  async isTutorOcupado(
    anioAcademicoId: string,
    tutorId: string,
    excludeSeccionId?: string,
  ): Promise<boolean> {
    const conditions = [
      eq(secciones.anioAcademicoId, anioAcademicoId),
      eq(secciones.tutorId, tutorId),
    ];
    if (excludeSeccionId) {
      conditions.push(ne(secciones.id, excludeSeccionId));
    }

    const [found] = await this.db
      .select({ id: secciones.id })
      .from(secciones)
      .where(and(...conditions))
      .limit(1);

    return Boolean(found);
  }

  async countMatriculadosActivos(seccionId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: count() })
      .from(matriculas)
      .where(and(eq(matriculas.seccionId, seccionId), eq(matriculas.estado, "matriculado")));

    return Number(row?.total ?? 0);
  }

  async create(dto: CreateSeccionDto): Promise<string> {
    const [inserted] = await this.db
      .insert(secciones)
      .values({
        anioAcademicoId: dto.anioAcademicoId,
        gradoId: dto.gradoId,
        nombre: dto.nombre.trim(),
        aula: dto.aula?.trim() || null,
        vacantes: dto.vacantes,
        tutorId: dto.tutorId || null,
        estado: "activa",
      })
      .returning({ id: secciones.id });

    return inserted.id;
  }

  async update(id: string, dto: UpdateSeccionDto): Promise<void> {
    const updateData: Partial<typeof secciones.$inferInsert> = {
      actualizadoEn: new Date().toISOString(),
    };

    if (dto.nombre !== undefined) updateData.nombre = dto.nombre.trim();
    if (dto.aula !== undefined) updateData.aula = dto.aula ? dto.aula.trim() : null;
    if (dto.vacantes !== undefined) updateData.vacantes = dto.vacantes;
    if (dto.tutorId !== undefined) updateData.tutorId = dto.tutorId || null;
    if (dto.estado !== undefined) updateData.estado = dto.estado;

    await this.db.update(secciones).set(updateData).where(eq(secciones.id, id));
>>>>>>> ab15606 (feat(api): implementar RF-009 matriculas, retiro, traslado y base de secciones)
  }
}
