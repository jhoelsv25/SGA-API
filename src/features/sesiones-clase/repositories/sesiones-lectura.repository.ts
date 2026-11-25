import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  cursos,
  cursosSeccion,
  docentes,
  grados,
  horarios,
  personas,
  roles,
  secciones,
  sesionesClase,
  usuarioRoles,
  usuarios,
  variablesSistema,
} from "../../../core/database/schema";
import type { SesionResponseDto } from "../dto";
import type { TemaRecienteCurso } from "../interfaces";
import type { BloqueDelDia } from "../utils";
import { consultaBaseSesiones, mapearSesionDto, ordenDelDia } from "./sesiones-shared.helper";

/**
 * Repositorio de consultas de sesiones, bloques horarios, temas recientes,
 * docentes y variables de sistema.
 */
@Injectable()
export class SesionesLecturaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async bloquesDelDia(anioAcademicoId: string, diaSemana: number): Promise<BloqueDelDia[]> {
    return this.db
      .select({
        horarioId: horarios.id,
        seccionId: horarios.seccionId,
        cursoSeccionId: horarios.cursoSeccionId,
        docenteId: cursosSeccion.docenteId,
        tipoBloque: horarios.tipoBloque,
        horaInicio: horarios.horaInicio,
        horaFin: horarios.horaFin,
      })
      .from(horarios)
      .innerJoin(secciones, eq(secciones.id, horarios.seccionId))
      .leftJoin(cursosSeccion, eq(cursosSeccion.id, horarios.cursoSeccionId))
      .where(
        and(
          eq(secciones.anioAcademicoId, anioAcademicoId),
          eq(secciones.estado, "activa"),
          eq(horarios.diaSemana, diaSemana),
        ),
      );
  }

  async findUsuariosDeDocentes(docenteIds: string[]): Promise<string[]> {
    if (docenteIds.length === 0) return [];
    const rows = await this.db
      .select({ usuarioId: usuarios.id })
      .from(docentes)
      .innerJoin(personas, eq(personas.id, docentes.personaId))
      .innerJoin(usuarios, eq(usuarios.personaId, personas.id))
      .where(and(inArray(docentes.id, docenteIds), eq(usuarios.estado, "activo")));
    return rows.map((r) => r.usuarioId);
  }

  async findById(id: string): Promise<SesionResponseDto | null> {
    const [fila] = await consultaBaseSesiones(this.db).where(eq(sesionesClase.id, id)).limit(1);
    return fila ? mapearSesionDto(fila) : null;
  }

  async sesionesDelDia(fecha: string): Promise<SesionResponseDto[]> {
    const filas = await consultaBaseSesiones(this.db)
      .where(eq(sesionesClase.fecha, fecha))
      .orderBy(...ordenDelDia());
    return filas.map(mapearSesionDto);
  }

  async sesionesDeDocente(
    docenteId: string,
    desde: string,
    hasta: string,
  ): Promise<SesionResponseDto[]> {
    const filas = await consultaBaseSesiones(this.db)
      .where(
        and(
          eq(sesionesClase.docenteId, docenteId),
          sql`${sesionesClase.fecha} >= ${desde}`,
          sql`${sesionesClase.fecha} <= ${hasta}`,
        ),
      )
      .orderBy(...ordenDelDia());
    return filas.map(mapearSesionDto);
  }

  async ultimosTemasDocente(
    docenteId: string,
    antesDeFecha: string,
    limite = 30,
  ): Promise<TemaRecienteCurso[]> {
    const filas = await this.db
      .select({
        cursoNombre: cursos.nombre,
        seccionNombre: sql<string>`${grados.numero} || '.° ' || ${secciones.nombre}`,
        tema: sesionesClase.tema,
      })
      .from(sesionesClase)
      .innerJoin(horarios, eq(horarios.id, sesionesClase.horarioId))
      .innerJoin(secciones, eq(secciones.id, horarios.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .innerJoin(cursosSeccion, eq(cursosSeccion.id, horarios.cursoSeccionId))
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .where(
        and(
          eq(sesionesClase.docenteId, docenteId),
          sql`${sesionesClase.fecha} < ${antesDeFecha}`,
          isNotNull(sesionesClase.tema),
          sql`BTRIM(${sesionesClase.tema}) <> ''`,
        ),
      )
      .orderBy(desc(sesionesClase.fecha), desc(sesionesClase.horaInicioPlan))
      .limit(limite);

    const agrupados = new Map<string, TemaRecienteCurso>();
    for (const fila of filas) {
      const tema = fila.tema?.trim();
      if (!tema) continue;
      const clave = `${fila.cursoNombre}::${fila.seccionNombre}`;
      let grupo = agrupados.get(clave);
      if (!grupo) {
        grupo = { cursoNombre: fila.cursoNombre, seccionNombre: fila.seccionNombre, temas: [] };
        agrupados.set(clave, grupo);
      }
      if (grupo.temas.length < 5 && !grupo.temas.includes(tema)) grupo.temas.push(tema);
    }
    return [...agrupados.values()];
  }

  async cursoSeccionDeSesion(sesionId: string): Promise<string | null> {
    const [fila] = await this.db
      .select({ cursoSeccionId: horarios.cursoSeccionId })
      .from(sesionesClase)
      .innerJoin(horarios, eq(horarios.id, sesionesClase.horarioId))
      .where(eq(sesionesClase.id, sesionId))
      .limit(1);
    return fila?.cursoSeccionId ?? null;
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
    return filas.map((f) => f.id);
  }

  async docenteDePersona(personaId: string): Promise<{ id: string; activo: boolean } | null> {
    const [fila] = await this.db
      .select({
        id: docentes.id,
        activo: sql<boolean>`${docentes.estado} = 'activo' AND ${docentes.eliminadoEn} IS NULL`,
      })
      .from(docentes)
      .where(eq(docentes.personaId, personaId))
      .limit(1);
    return fila ?? null;
  }

  async docenteActivo(docenteId: string): Promise<boolean> {
    const [fila] = await this.db
      .select({ id: docentes.id })
      .from(docentes)
      .where(
        and(
          eq(docentes.id, docenteId),
          eq(docentes.estado, "activo"),
          sql`${docentes.eliminadoEn} IS NULL`,
        ),
      )
      .limit(1);
    return Boolean(fila);
  }

  async valoresVariables(codigos: readonly string[]): Promise<Map<string, string>> {
    const filas = await this.db
      .select({ codigo: variablesSistema.codigo, valor: variablesSistema.valor })
      .from(variablesSistema)
      .where(
        and(inArray(variablesSistema.codigo, [...codigos]), eq(variablesSistema.vigente, true)),
      );
    return new Map(filas.map((f) => [f.codigo, f.valor]));
  }
}
