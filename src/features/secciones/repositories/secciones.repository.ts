import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  cursos,
  cursosSeccion,
  docentes,
  grados,
  matriculas,
  personas,
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
    const payload = {
      anioAcademicoId: anioId,
      gradoId: filtros?.gradoId ?? null,
      estado: filtros?.estado ?? null,
    };

    const result = (await this.db.execute(sql`
      SELECT fn_consultar_secciones(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as { rows?: Array<{ resultado?: { data?: SeccionResponseDto[] } }> };

    return result.rows?.[0]?.resultado?.data ?? [];
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
  }
}
