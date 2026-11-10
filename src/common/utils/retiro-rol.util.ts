import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../../core/database";
import { roles, usuarioRoles, usuarios } from "../../core/database/schema";

export type TransaccionBd = Parameters<Parameters<Database["transaction"]>[0]>[0];

const rolesVigentes = (tx: TransaccionBd, usuarioId: string) =>
  tx
    .select({
      rolId: usuarioRoles.rolId,
      nombre: roles.nombre,
      esPrincipal: usuarioRoles.esPrincipal,
    })
    .from(usuarioRoles)
    .innerJoin(roles, eq(usuarioRoles.rolId, roles.id))
    .where(and(eq(usuarioRoles.usuarioId, usuarioId), eq(usuarioRoles.vigente, true)));

/**
 * Retira un rol dejando historial y, si era el principal, promueve otro.
 * Devuelve false, sin cambiar nada, cuando la cuenta se quedaría sin roles.
 */
export async function retirarRolConservandoCuenta(
  tx: TransaccionBd,
  usuarioId: string,
  rolNombre: string,
  actorId: string,
): Promise<boolean> {
  const vigentes = await rolesVigentes(tx, usuarioId);
  const retirado = vigentes.find((rol) => rol.nombre === rolNombre);
  const restantes = vigentes.filter((rol) => rol.nombre !== rolNombre);
  if (restantes.length === 0) return false;
  if (!retirado) return true;

  await tx
    .update(usuarioRoles)
    .set({
      vigente: false,
      esPrincipal: false,
      retiradoPorId: actorId,
      retiradoEn: sql`CURRENT_TIMESTAMP`,
    })
    .where(
      and(
        eq(usuarioRoles.usuarioId, usuarioId),
        eq(usuarioRoles.rolId, retirado.rolId),
        eq(usuarioRoles.vigente, true),
      ),
    );

  if (retirado.esPrincipal) {
    const [nuevoPrincipal] = restantes;
    await tx
      .update(usuarioRoles)
      .set({ esPrincipal: true })
      .where(
        and(
          eq(usuarioRoles.usuarioId, usuarioId),
          eq(usuarioRoles.rolId, nuevoPrincipal.rolId),
          eq(usuarioRoles.vigente, true),
        ),
      );
    await tx
      .update(usuarios)
      .set({ rolId: nuevoPrincipal.rolId, actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(usuarios.id, usuarioId));
  }
  return true;
}
