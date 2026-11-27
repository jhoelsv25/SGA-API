import { Inject, Injectable } from "@nestjs/common";
import { and, inArray, sql } from "drizzle-orm";
import { esEstudianteSql } from "../../../common/utils/es-estudiante.sql";
import { Database, DRIZZLE } from "../../../core/database";
import { docentes, sesionesClase } from "../../../core/database/schema";
import type { SesionResponseDto } from "../../sesiones-clase/dto";
import {
  consultaBaseSesiones,
  mapearSesionDto,
  ordenDelDia,
} from "../../sesiones-clase/repositories/sesiones-shared.helper";
import type { BloqueDeClase } from "../utils";
import { claveClases, clasesDeDocentes } from "./clases-docente.query";

export interface PersonalDelColegio {
  personaId: string;
  nombreCompleto: string;
  fotoUrl: string | null;
  tipoPersona: "docentes" | "administrativos";
}

@Injectable()
export class ControlDiarioRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Docentes activos y administrativos con cargo vigente (nunca estudiantes). Con `incluir` se suman quienes
   * marcaron ese día aunque ya no estén activos. Con `soloPersonaId` busca una sola ficha de personal.
   */
  async personal(
    incluir: readonly string[] = [],
    soloPersonaId?: string,
  ): Promise<PersonalDelColegio[]> {
    const extra = incluir.length
      ? sql`OR p.id IN (${sql.join(
          incluir.map((id) => sql`${id}::uuid`),
          sql`, `,
        )})`
      : sql``;
    const filtro = soloPersonaId
      ? sql`p.id = ${soloPersonaId}::uuid AND (
          EXISTS (SELECT 1 FROM docentes d WHERE d.persona_id = p.id)
          OR EXISTS (SELECT 1 FROM persona_cargos pc WHERE pc.persona_id = p.id))`
      : sql`(
          EXISTS (SELECT 1 FROM docentes d WHERE d.persona_id = p.id AND d.estado = 'activo' AND d.eliminado_en IS NULL)
          OR (p.eliminado_en IS NULL AND EXISTS (SELECT 1 FROM persona_cargos pc WHERE pc.persona_id = p.id AND pc.vigente))
          ${extra})`;
    const { rows } = (await this.db.execute(sql`
      SELECT p.id AS "personaId",
             TRIM(p.apellido_paterno || ' ' || COALESCE(p.apellido_materno, '') || ', ' || p.nombres) AS "nombreCompleto",
             p.foto_url AS "fotoUrl",
             CASE WHEN EXISTS (SELECT 1 FROM docentes d WHERE d.persona_id = p.id)
                  THEN 'docentes' ELSE 'administrativos' END AS "tipoPersona"
      FROM personas p
      WHERE NOT ${esEstudianteSql(sql.raw("p.id"))} AND ${filtro}
      ORDER BY p.apellido_paterno, p.apellido_materno, p.nombres
    `)) as unknown as { rows: PersonalDelColegio[] };
    return rows;
  }

  clases(
    personaIds: readonly string[],
    fechas: readonly string[],
  ): Promise<Map<string, BloqueDeClase[]>> {
    return clasesDeDocentes(this.db, personaIds, fechas);
  }

  /** Sesiones de clase de esas personas en esas fechas, agrupadas por persona y fecha. */
  async sesiones(
    personaIds: readonly string[],
    fechas: readonly string[],
  ): Promise<Map<string, SesionResponseDto[]>> {
    const resultado = new Map<string, SesionResponseDto[]>();
    if (personaIds.length === 0 || fechas.length === 0) return resultado;
    const fichas = await this.db
      .select({ id: docentes.id, personaId: docentes.personaId })
      .from(docentes)
      .where(inArray(docentes.personaId, [...personaIds]));
    if (fichas.length === 0) return resultado;
    const personaDe = new Map(fichas.map((f) => [f.id, f.personaId]));
    const filas = await consultaBaseSesiones(this.db)
      .where(
        and(
          inArray(sesionesClase.docenteId, [...personaDe.keys()]),
          inArray(sesionesClase.fecha, [...fechas]),
        ),
      )
      .orderBy(...ordenDelDia());
    for (const fila of filas) {
      const sesion = mapearSesionDto(fila);
      const clave = claveClases(personaDe.get(sesion.docenteId)!, sesion.fecha);
      resultado.set(clave, [...(resultado.get(clave) ?? []), sesion]);
    }
    return resultado;
  }
}
