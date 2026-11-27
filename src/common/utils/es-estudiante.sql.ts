import { sql, type SQL } from "drizzle-orm";
import { ESTADOS_FICHA_VIGENTE } from "../../features/personas/utils/ficha-academica.util";

/** Cargos que no convierten a nadie en personal del colegio. */
export const CARGOS_ESTUDIANTE_APODERADO: readonly string[] = ["Estudiante", "Apoderado(a)"];

const lista = (valores: readonly string[]): SQL =>
  sql.join(
    valores.map((v) => sql`${v}`),
    sql`, `,
  );

/**
 * ¿La persona se trata como estudiante? Sí con una ficha de estudiante vigente. Una ficha dada de baja deja de
 * contar si la persona es hoy docente o tiene un cargo de personal (un exalumno que vuelve a trabajar); si no
 * es ninguna de las dos cosas, sigue siendo estudiante.
 *
 * `personaId` es la columna de la consulta externa, calificada (por ejemplo `sql.raw("p.id")`).
 */
export function esEstudianteSql(personaId: SQL): SQL<boolean> {
  return sql<boolean>`(EXISTS (SELECT 1 FROM estudiantes ev WHERE ev.persona_id = ${personaId}
      AND ev.eliminado_en IS NULL AND ev.estado IN (${lista(ESTADOS_FICHA_VIGENTE.estudiante)}))
    OR (EXISTS (SELECT 1 FROM estudiantes eh WHERE eh.persona_id = ${personaId})
      AND NOT EXISTS (SELECT 1 FROM docentes dp WHERE dp.persona_id = ${personaId})
      AND NOT EXISTS (SELECT 1 FROM persona_cargos pcp JOIN cargos cp ON cp.id = pcp.cargo_id
        WHERE pcp.persona_id = ${personaId} AND pcp.vigente
          AND cp.nombre NOT IN (${lista(CARGOS_ESTUDIANTE_APODERADO)}))))`;
}
