import { and, eq, isNull, sql } from "drizzle-orm";
import {
  credenciales,
  docentes,
  personaCargos,
  personas,
  roles,
  usuarioRoles,
  usuarios,
} from "../../../../core/database/schema";
import { retirarRolConservandoCuenta } from "../../../../common/utils/retiro-rol.util";
import type { DocenteQueryDto, DocenteResponseDto } from "../../dto";
import type { DocentesRepositoryDeps, DocentesRepositoryCalls } from "./deps";

const ROL_DOCENTE = "Docente";

export async function cesar(
  deps: DocentesRepositoryDeps,
  calls: DocentesRepositoryCalls,
  id: string,
  fechaCese: string,
  actorId: string,
): Promise<{
  docente: DocenteResponseDto;
  mantuvoCuentaActiva: boolean;
} | null> {
  return deps.db.transaction(async (tx) => {
    const [docenteRow] = await tx
      .select({ id: docentes.id, personaId: docentes.personaId })
      .from(docentes)
      .where(and(eq(docentes.id, id), isNull(docentes.eliminadoEn)))
      .limit(1);

    if (!docenteRow) return null;

    // 1. Cambiar estado a 'cesado' y registrar fechaCese
    await tx
      .update(docentes)
      .set({
        estado: "cesado",
        fechaCese,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(docentes.id, id));

    // 2. Evaluar si la persona sigue vinculada por otra ficha vigente o por otro cargo
    const [otrasVinculaciones] = await tx
      .select({
        esEstudiante: sql<boolean>`EXISTS(SELECT 1 FROM estudiantes e WHERE e.persona_id = ${docenteRow.personaId} AND e.eliminado_en IS NULL AND e.estado = 'activo')`,
        esApoderado: sql<boolean>`EXISTS(SELECT 1 FROM apoderados a WHERE a.persona_id = ${docenteRow.personaId} AND a.eliminado_en IS NULL)`,
        tieneOtroCargo: sql<boolean>`EXISTS(
            SELECT 1 FROM persona_cargos pc
            WHERE pc.persona_id = ${docenteRow.personaId} AND pc.vigente
              AND NOT EXISTS(
                SELECT 1 FROM cargo_roles_sugeridos crs
                JOIN roles r ON r.id = crs.rol_id
                WHERE crs.cargo_id = pc.cargo_id AND r.nombre = ${ROL_DOCENTE}
              )
          )`,
      })
      .from(personas)
      .where(eq(personas.id, docenteRow.personaId));

    const sigueVinculada =
      otrasVinculaciones.esEstudiante ||
      otrasVinculaciones.esApoderado ||
      otrasVinculaciones.tieneOtroCargo;

    const [usuarioRow] = await tx
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(and(eq(usuarios.personaId, docenteRow.personaId), isNull(usuarios.eliminadoEn)))
      .limit(1);

    // Solo se conserva la cuenta si le queda otro rol con el que ingresar
    const mantuvoCuentaActiva =
      sigueVinculada &&
      (!usuarioRow || (await retirarRolConservandoCuenta(tx, usuarioRow.id, ROL_DOCENTE, actorId)));

    if (!mantuvoCuentaActiva) {
      // No tiene otras fichas: desactivar cuenta, anular credencial y finalizar cargo
      if (usuarioRow) {
        await tx
          .update(usuarios)
          .set({ estado: "inactivo", actualizadoEn: sql`CURRENT_TIMESTAMP` })
          .where(eq(usuarios.id, usuarioRow.id));
      }

      // Anular credencial de marcación
      await tx
        .update(credenciales)
        .set({
          activa: false,
          anuladaEn: sql`CURRENT_TIMESTAMP`,
          motivoAnulacion: "Cese de funciones docentes",
        })
        .where(
          and(eq(credenciales.personaId, docenteRow.personaId), eq(credenciales.activa, true)),
        );

      // Finalizar cargo vigente
      await tx
        .update(personaCargos)
        .set({
          vigente: false,
          fechaFin: fechaCese,
        })
        .where(
          and(eq(personaCargos.personaId, docenteRow.personaId), eq(personaCargos.vigente, true)),
        );
    }

    const docenteActualizado = (await calls.findById(id))!;

    return {
      docente: docenteActualizado,
      mantuvoCuentaActiva,
    };
  });
}

export async function contarCargaVigente(
  deps: DocentesRepositoryDeps,
  docenteId: string,
): Promise<number> {
  const result = (await deps.db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM cursos_seccion cs
      INNER JOIN secciones s ON s.id = cs.seccion_id
      INNER JOIN anios_academicos a ON a.id = s.anio_academico_id
      WHERE cs.docente_id = ${docenteId}
        AND a.estado IN ('en_curso', 'reabierto')
    `)) as unknown as { rows: { total: number }[] };
  return Number(result.rows?.[0]?.total ?? 0);
}

export async function reactivar(
  deps: DocentesRepositoryDeps,
  calls: DocentesRepositoryCalls,
  id: string,
  actorId: string,
): Promise<DocenteResponseDto | null> {
  return deps.db.transaction(async (tx) => {
    const [fila] = await tx
      .update(docentes)
      .set({ estado: "activo", fechaCese: null, actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(docentes.id, id), isNull(docentes.eliminadoEn)))
      .returning({ personaId: docentes.personaId });

    if (!fila) return null;

    await tx
      .update(usuarios)
      .set({ estado: "activo", actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(
        and(
          eq(usuarios.personaId, fila.personaId),
          eq(usuarios.estado, "inactivo"),
          isNull(usuarios.eliminadoEn),
        ),
      );

    // RF-002 V4: la ficha vigente lleva su rol; el cese pudo habérselo retirado
    const [cuenta] = await tx
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(and(eq(usuarios.personaId, fila.personaId), isNull(usuarios.eliminadoEn)))
      .limit(1);
    const [rolDocente] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.nombre, ROL_DOCENTE))
      .limit(1);

    if (cuenta && rolDocente) {
      const [yaLoTiene] = await tx
        .select({ id: usuarioRoles.id })
        .from(usuarioRoles)
        .where(
          and(
            eq(usuarioRoles.usuarioId, cuenta.id),
            eq(usuarioRoles.rolId, rolDocente.id),
            eq(usuarioRoles.vigente, true),
          ),
        )
        .limit(1);

      if (!yaLoTiene) {
        await tx
          .insert(usuarioRoles)
          .values({ usuarioId: cuenta.id, rolId: rolDocente.id, asignadoPorId: actorId });
      }
    }

    return calls.findById(id);
  });
}

export async function obtenerResumen(
  deps: DocentesRepositoryDeps,
  query?: DocenteQueryDto,
): Promise<{
  total: number;
  activos: number;
  licencia: number;
  cesados: number;
  nombrados: number;
  contratados: number;
  practicantes: number;
}> {
  const condiciones = [isNull(docentes.eliminadoEn)];

  if (query?.tipoContrato) {
    condiciones.push(eq(docentes.tipoContrato, query.tipoContrato));
  }
  if (query?.estado) {
    condiciones.push(eq(docentes.estado, query.estado));
  }
  if (query?.search && query.search.trim().length > 0) {
    const patron = `%${query.search.trim()}%`;
    condiciones.push(
      sql`(
          ${personas.nombres} ILIKE ${patron}
          OR ${personas.apellidoPaterno} ILIKE ${patron}
          OR ${personas.apellidoMaterno} ILIKE ${patron}
          OR ${personas.numeroDocumento} ILIKE ${patron}
          OR ${docentes.codigo} ILIKE ${patron}
        )`,
    );
  }

  const [row] = await deps.db
    .select({
      total: sql<number>`COUNT(*)::int`,
      activos: sql<number>`COUNT(*) FILTER (WHERE ${docentes.estado} = 'activo')::int`,
      licencia: sql<number>`COUNT(*) FILTER (WHERE ${docentes.estado} = 'licencia')::int`,
      cesados: sql<number>`COUNT(*) FILTER (WHERE ${docentes.estado} = 'cesado')::int`,
      nombrados: sql<number>`COUNT(*) FILTER (WHERE ${docentes.tipoContrato} = 'nombrado')::int`,
      contratados: sql<number>`COUNT(*) FILTER (WHERE ${docentes.tipoContrato} = 'contratado')::int`,
      practicantes: sql<number>`COUNT(*) FILTER (WHERE ${docentes.tipoContrato} = 'practicante')::int`,
    })
    .from(docentes)
    .innerJoin(personas, eq(docentes.personaId, personas.id))
    .where(and(...condiciones));

  return {
    total: Number(row?.total ?? 0),
    activos: Number(row?.activos ?? 0),
    licencia: Number(row?.licencia ?? 0),
    cesados: Number(row?.cesados ?? 0),
    nombrados: Number(row?.nombrados ?? 0),
    contratados: Number(row?.contratados ?? 0),
    practicantes: Number(row?.practicantes ?? 0),
  };
}
