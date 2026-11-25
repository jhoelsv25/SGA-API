import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  cursos,
  cursosSeccion,
  docentes,
  grados,
  horarios,
  personas,
  secciones,
  sesionesClase,
} from "../../../core/database/schema";
import type { BloqueHorarioResponseDto } from "../dto";
import type { CreateBloqueData, CruceDocenteResultado, UpdateBloqueData } from "../interfaces";
import { normalizarHora } from "../utils";
import { mapearFilaABloqueResponse, SELECT_BLOQUE_HORARIO } from "./bloque-query.helper";

/**
 * Repositorio especializado en lectura directa, creación, edición, reemplazo
 * en lote, eliminación y validación de cruces de bloques de horario.
 */
@Injectable()
export class HorariosBloquesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private consultaBaseBloques() {
    return this.db
      .select(SELECT_BLOQUE_HORARIO)
      .from(horarios)
      .leftJoin(cursosSeccion, eq(horarios.cursoSeccionId, cursosSeccion.id))
      .leftJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
      .leftJoin(docentes, eq(cursosSeccion.docenteId, docentes.id))
      .leftJoin(personas, eq(docentes.personaId, personas.id));
  }

  async findBySeccion(seccionId: string): Promise<BloqueHorarioResponseDto[]> {
    const filas = await this.consultaBaseBloques()
      .where(eq(horarios.seccionId, seccionId))
      .orderBy(asc(horarios.diaSemana), asc(horarios.horaInicio));

    return filas.map((fila) => mapearFilaABloqueResponse(fila));
  }

  async findById(id: string): Promise<BloqueHorarioResponseDto | null> {
    const filas = await this.consultaBaseBloques().where(eq(horarios.id, id)).limit(1);
    if (filas.length === 0) {
      return null;
    }
    return mapearFilaABloqueResponse(filas[0]);
  }

  async findSolapados(
    seccionId: string,
    dia: number,
    inicio: string,
    fin: string,
    exceptoId?: string,
  ): Promise<BloqueHorarioResponseDto[]> {
    const condiciones = [
      eq(horarios.seccionId, seccionId),
      eq(horarios.diaSemana, dia),
      sql`${horarios.horaInicio} < ${fin}::time`,
      sql`${horarios.horaFin} > ${inicio}::time`,
    ];

    if (exceptoId) {
      condiciones.push(ne(horarios.id, exceptoId));
    }

    const filas = await this.consultaBaseBloques().where(and(...condiciones));
    return filas.map((fila) => mapearFilaABloqueResponse(fila));
  }

  async findCruceDocente(
    anioId: string,
    docenteIdOCursoSeccionId: string,
    dia: number,
    inicio: string,
    fin: string,
    exceptoSeccionId?: string,
  ): Promise<CruceDocenteResultado | null> {
    let docenteId = docenteIdOCursoSeccionId;

    const cs = await this.db
      .select({ docenteId: cursosSeccion.docenteId })
      .from(cursosSeccion)
      .where(eq(cursosSeccion.id, docenteIdOCursoSeccionId))
      .limit(1);

    if (cs.length > 0 && cs[0].docenteId) {
      docenteId = cs[0].docenteId;
    }

    if (!docenteId) {
      return null;
    }

    const condiciones = [
      eq(secciones.anioAcademicoId, anioId),
      eq(cursosSeccion.docenteId, docenteId),
      eq(horarios.diaSemana, dia),
      sql`${horarios.horaInicio} < ${fin}::time`,
      sql`${horarios.horaFin} > ${inicio}::time`,
    ];

    if (exceptoSeccionId) {
      condiciones.push(ne(secciones.id, exceptoSeccionId));
    }

    const filas = await this.db
      .select({
        docenteNombres: personas.nombres,
        docenteApellidoPaterno: personas.apellidoPaterno,
        docenteApellidoMaterno: personas.apellidoMaterno,
        gradoNumero: grados.numero,
        seccionNombre: secciones.nombre,
        diaSemana: horarios.diaSemana,
        horaInicio: horarios.horaInicio,
        horaFin: horarios.horaFin,
      })
      .from(horarios)
      .innerJoin(cursosSeccion, eq(horarios.cursoSeccionId, cursosSeccion.id))
      .innerJoin(secciones, eq(horarios.seccionId, secciones.id))
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .innerJoin(docentes, eq(cursosSeccion.docenteId, docentes.id))
      .innerJoin(personas, eq(docentes.personaId, personas.id))
      .where(and(...condiciones))
      .limit(1);

    if (filas.length === 0) {
      return null;
    }

    const f = filas[0];
    const docenteNombre = [f.docenteNombres, f.docenteApellidoPaterno, f.docenteApellidoMaterno]
      .filter(Boolean)
      .join(" ");

    return {
      docenteNombre,
      gradoNumero: f.gradoNumero,
      seccionNombre: f.seccionNombre,
      diaSemana: f.diaSemana,
      horaInicio: normalizarHora(f.horaInicio),
      horaFin: normalizarHora(f.horaFin),
    };
  }

  async create(data: CreateBloqueData): Promise<BloqueHorarioResponseDto> {
    const [nuevo] = await this.db
      .insert(horarios)
      .values({
        seccionId: data.seccionId,
        cursoSeccionId: data.tipoBloque === "receso" ? null : (data.cursoSeccionId ?? null),
        diaSemana: data.diaSemana,
        horaInicio: data.horaInicio,
        horaFin: data.horaFin,
        tipoBloque: data.tipoBloque,
        aula: data.aula ?? null,
      })
      .returning({ id: horarios.id });

    const bloque = await this.findById(nuevo.id);
    if (!bloque) {
      throw new InternalServerErrorException(
        "No se pudo recuperar el bloque de horario recién registrado.",
      );
    }
    return bloque;
  }

  async crearLote(
    seccionId: string,
    bloques: CreateBloqueData[],
    reemplazarExistentes: boolean,
  ): Promise<BloqueHorarioResponseDto[]> {
    await this.db.transaction(async (tx) => {
      if (reemplazarExistentes) {
        const existentes = await tx
          .select({ id: horarios.id })
          .from(horarios)
          .where(eq(horarios.seccionId, seccionId));
        if (existentes.length > 0) {
          const ids = existentes.map((e) => e.id);
          const [conSesion] = await tx
            .select({ id: sesionesClase.id })
            .from(sesionesClase)
            .where(inArray(sesionesClase.horarioId, ids))
            .limit(1);
          if (conSesion) {
            throw new ConflictException(
              "No se puede reemplazar el horario porque ya existen sesiones de clase registradas.",
            );
          }
          await tx.delete(horarios).where(eq(horarios.seccionId, seccionId));
        }
      }

      await tx.insert(horarios).values(
        bloques.map((data) => ({
          seccionId: data.seccionId,
          cursoSeccionId: data.tipoBloque === "receso" ? null : (data.cursoSeccionId ?? null),
          diaSemana: data.diaSemana,
          horaInicio: data.horaInicio,
          horaFin: data.horaFin,
          tipoBloque: data.tipoBloque,
          aula: data.aula ?? null,
        })),
      );
    });

    return this.findBySeccion(seccionId);
  }

  async update(id: string, data: UpdateBloqueData): Promise<BloqueHorarioResponseDto> {
    const valoresActualizar: Record<string, unknown> = {
      actualizadoEn: sql`CURRENT_TIMESTAMP`,
    };

    if (data.diaSemana !== undefined) valoresActualizar.diaSemana = data.diaSemana;
    if (data.horaInicio !== undefined) valoresActualizar.horaInicio = data.horaInicio;
    if (data.horaFin !== undefined) valoresActualizar.horaFin = data.horaFin;
    if (data.tipoBloque !== undefined) valoresActualizar.tipoBloque = data.tipoBloque;
    if (data.cursoSeccionId !== undefined) {
      valoresActualizar.cursoSeccionId = data.tipoBloque === "receso" ? null : data.cursoSeccionId;
    }
    if (data.aula !== undefined) valoresActualizar.aula = data.aula;

    await this.db.update(horarios).set(valoresActualizar).where(eq(horarios.id, id));

    const bloque = await this.findById(id);
    if (!bloque) {
      throw new InternalServerErrorException(
        "No se pudo recuperar el bloque de horario actualizado.",
      );
    }
    return bloque;
  }

  async delete(id: string): Promise<boolean> {
    await this.db.delete(horarios).where(eq(horarios.id, id));
    return true;
  }

  async tieneSesiones(id: string): Promise<boolean> {
    const resultado = await this.db
      .select({ id: sesionesClase.id })
      .from(sesionesClase)
      .where(eq(sesionesClase.horarioId, id))
      .limit(1);

    return resultado.length > 0;
  }
}
