import { and, eq, ilike, isNull, sql } from "drizzle-orm";
import {
  cargoRolesSugeridos,
  cargos,
  personaCargos,
  personas,
  roles,
  usuarioRoles,
  usuarios,
} from "../../../../core/database/schema";
import { UserResponseDto } from "../../dto/user-response.dto";
import { PersonaBasica, RegistrarCuentaData } from "../../interfaces/users.repository.interface";
import type { UsersRepositoryDeps, UsersRepositoryCalls } from "./deps";

/** RF-002 V3: cargos que no son de personal; ceden ante un cargo de personal. */
const CARGOS_NO_PERSONAL = ["Estudiante", "Apoderado(a)"];

export function mapUserResult(row: {
  usuario: typeof usuarios.$inferSelect;
  persona: typeof personas.$inferSelect;
  rol: typeof roles.$inferSelect;
}): UserResponseDto {
  return {
    id: row.usuario.id,
    nombreUsuario: row.usuario.nombreUsuario,
    estado: row.usuario.estado as "activo" | "bloqueado" | "inactivo",
    debeCambiarContrasena: row.usuario.debeCambiarContrasena,
    intentosFallidos: row.usuario.intentosFallidos,
    ultimoAcceso: row.usuario.ultimoAcceso,
    creadoEn: row.usuario.creadoEn,
    actualizadoEn: row.usuario.actualizadoEn,
    persona: {
      id: row.persona.id,
      tipoDocumento: row.persona.tipoDocumento,
      numeroDocumento: row.persona.numeroDocumento,
      nombres: row.persona.nombres,
      apellidoPaterno: row.persona.apellidoPaterno,
      apellidoMaterno: row.persona.apellidoMaterno,
      correo: row.persona.correo,
      fotoUrl: row.persona.fotoUrl,
    },
    rol: {
      id: row.rol.id,
      nombre: row.rol.nombre,
      esSistema: row.rol.esSistema,
    },
  };
}

export async function findUserById(
  deps: UsersRepositoryDeps,
  calls: UsersRepositoryCalls,
  id: string,
): Promise<UserResponseDto | null> {
  const [result] = await deps.db
    .select({
      usuario: usuarios,
      persona: personas,
      rol: roles,
    })
    .from(usuarios)
    .innerJoin(personas, eq(usuarios.personaId, personas.id))
    .innerJoin(roles, eq(usuarios.rolId, roles.id))
    .where(and(eq(usuarios.id, id), isNull(usuarios.eliminadoEn)))
    .limit(1);

  return result ? calls.mapUserResult(result) : null;
}

export async function findUserByPersonaId(
  deps: UsersRepositoryDeps,
  calls: UsersRepositoryCalls,
  personaId: string,
): Promise<UserResponseDto | null> {
  const [result] = await deps.db
    .select({
      usuario: usuarios,
      persona: personas,
      rol: roles,
    })
    .from(usuarios)
    .innerJoin(personas, eq(usuarios.personaId, personas.id))
    .innerJoin(roles, eq(usuarios.rolId, roles.id))
    .where(and(eq(usuarios.personaId, personaId), isNull(usuarios.eliminadoEn)))
    .limit(1);

  return result ? calls.mapUserResult(result) : null;
}

export async function findUserByUsername(
  deps: UsersRepositoryDeps,
  calls: UsersRepositoryCalls,
  username: string,
): Promise<UserResponseDto | null> {
  const [result] = await deps.db
    .select({
      usuario: usuarios,
      persona: personas,
      rol: roles,
    })
    .from(usuarios)
    .innerJoin(personas, eq(usuarios.personaId, personas.id))
    .innerJoin(roles, eq(usuarios.rolId, roles.id))
    .where(and(ilike(usuarios.nombreUsuario, username.trim()), isNull(usuarios.eliminadoEn)))
    .limit(1);

  return result ? calls.mapUserResult(result) : null;
}

export async function findPersonaById(
  deps: UsersRepositoryDeps,
  id: string,
): Promise<PersonaBasica | null> {
  const [row] = await deps.db
    .select({ id: personas.id, numeroDocumento: personas.numeroDocumento })
    .from(personas)
    .where(and(eq(personas.id, id), isNull(personas.eliminadoEn)))
    .limit(1);

  return row ?? null;
}

export async function findPersonaByDocumento(
  deps: UsersRepositoryDeps,
  tipoDocumento: string,
  numeroDocumento: string,
): Promise<PersonaBasica | null> {
  const [row] = await deps.db
    .select({ id: personas.id, numeroDocumento: personas.numeroDocumento })
    .from(personas)
    .where(
      and(
        eq(personas.tipoDocumento, tipoDocumento),
        eq(personas.numeroDocumento, numeroDocumento.trim()),
        isNull(personas.eliminadoEn),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function existeCorreo(deps: UsersRepositoryDeps, correo: string): Promise<boolean> {
  const [row] = await deps.db
    .select({ id: personas.id })
    .from(personas)
    .where(and(ilike(personas.correo, correo.trim()), isNull(personas.eliminadoEn)))
    .limit(1);

  return Boolean(row);
}

export async function isCargoVigente(deps: UsersRepositoryDeps, cargoId: string): Promise<boolean> {
  const [row] = await deps.db
    .select({ id: cargos.id })
    .from(cargos)
    .where(and(eq(cargos.id, cargoId), eq(cargos.vigente, true)))
    .limit(1);

  return Boolean(row);
}

export async function findRolesSugeridosActivos(
  deps: UsersRepositoryDeps,
  cargoId: string,
): Promise<string[]> {
  const rows = await deps.db
    .select({ rolId: cargoRolesSugeridos.rolId })
    .from(cargoRolesSugeridos)
    .innerJoin(roles, eq(cargoRolesSugeridos.rolId, roles.id))
    .where(and(eq(cargoRolesSugeridos.cargoId, cargoId), eq(roles.activo, true)))
    .orderBy(roles.nombre);

  return rows.map((r) => r.rolId);
}

export async function registrarCuenta(
  deps: UsersRepositoryDeps,
  data: RegistrarCuentaData,
): Promise<string> {
  return deps.db.transaction(async (tx) => {
    // 1. Persona: la del padrón o una nueva
    let personaId = data.personaId;
    if (!personaId) {
      const p = data.nuevaPersona!;
      const [creada] = await tx
        .insert(personas)
        .values({
          tipoDocumento: p.tipoDocumento,
          numeroDocumento: p.numeroDocumento.trim(),
          nombres: p.nombres.trim(),
          apellidoPaterno: p.apellidoPaterno.trim(),
          apellidoMaterno: p.apellidoMaterno?.trim() || null,
          sexo: p.sexo,
          correo: p.correo?.trim() || null,
          celular: p.celular?.trim() || null,
        })
        .returning({ id: personas.id });
      personaId = creada.id;
    }

    // 2. Cargo: uno solo vigente. Se conserva el que tenga, salvo que sea
    //    Estudiante o Apoderado(a) y el nuevo sea un cargo de personal.
    const [actual] = await tx
      .select({ id: personaCargos.id, cargoId: personaCargos.cargoId, nombre: cargos.nombre })
      .from(personaCargos)
      .innerJoin(cargos, eq(personaCargos.cargoId, cargos.id))
      .where(and(eq(personaCargos.personaId, personaId), eq(personaCargos.vigente, true)))
      .limit(1);

    const [nuevo] = await tx
      .select({ nombre: cargos.nombre })
      .from(cargos)
      .where(eq(cargos.id, data.cargoId))
      .limit(1);

    const reemplazar =
      actual &&
      actual.cargoId !== data.cargoId &&
      CARGOS_NO_PERSONAL.includes(actual.nombre) &&
      !CARGOS_NO_PERSONAL.includes(nuevo.nombre);

    if (reemplazar) {
      await tx
        .update(personaCargos)
        .set({
          vigente: false,
          esPrincipal: false,
          fechaFin: sql`GREATEST(${personaCargos.fechaInicio}, CURRENT_DATE)`,
        })
        .where(eq(personaCargos.id, actual.id));
    }

    if (!actual || reemplazar) {
      await tx.insert(personaCargos).values({
        personaId,
        cargoId: data.cargoId,
        fechaInicio: sql`CURRENT_DATE`,
        esPrincipal: true,
        registradoPorId: data.actorId,
      });
    }

    // 3. Cuenta: se reutiliza la vigente o se crea con el primer rol como principal
    let usuarioId = data.usuarioExistenteId;
    if (!usuarioId) {
      const [creado] = await tx
        .insert(usuarios)
        .values({
          personaId,
          rolId: data.rolIds[0],
          nombreUsuario: data.nombreUsuario!.trim(),
          contrasenaHash: data.contrasenaHash!,
          debeCambiarContrasena: true,
          estado: "activo",
          intentosFallidos: 0,
        })
        .returning({ id: usuarios.id });
      usuarioId = creado.id;
    }

    // 4. Roles: solo se agregan los que la cuenta aún no tiene vigentes
    const rolesVigentes = await tx
      .select({ rolId: usuarioRoles.rolId })
      .from(usuarioRoles)
      .where(and(eq(usuarioRoles.usuarioId, usuarioId), eq(usuarioRoles.vigente, true)));
    const yaTiene = new Set(rolesVigentes.map((r) => r.rolId));

    const nuevos = data.rolIds.filter((rolId) => !yaTiene.has(rolId));
    if (nuevos.length > 0) {
      await tx.insert(usuarioRoles).values(
        nuevos.map((rolId) => ({
          usuarioId: usuarioId,
          rolId,
          esPrincipal: !data.usuarioExistenteId && rolId === data.rolIds[0],
          asignadoPorId: data.actorId,
        })),
      );
    }

    return usuarioId;
  });
}

export async function syncPrincipalRole(
  deps: UsersRepositoryDeps,
  userId: string,
  rolId: string,
  actorId: string | null,
): Promise<void> {
  await deps.db.transaction(async (tx) => {
    // 1. Retirar el rol principal anterior si es otro (historial: vigente false)
    await tx
      .update(usuarioRoles)
      .set({
        esPrincipal: false,
        vigente: false,
        retiradoPorId: actorId ?? userId,
        retiradoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(usuarioRoles.usuarioId, userId),
          eq(usuarioRoles.vigente, true),
          eq(usuarioRoles.esPrincipal, true),
          sql`${usuarioRoles.rolId} <> ${rolId}`,
        ),
      );

    // 2. Marcar como principal el rol si ya estaba asignado, o asignarlo
    const [vigente] = await tx
      .select({ id: usuarioRoles.id })
      .from(usuarioRoles)
      .where(
        and(
          eq(usuarioRoles.usuarioId, userId),
          eq(usuarioRoles.rolId, rolId),
          eq(usuarioRoles.vigente, true),
        ),
      )
      .limit(1);

    if (vigente) {
      await tx
        .update(usuarioRoles)
        .set({ esPrincipal: true })
        .where(eq(usuarioRoles.id, vigente.id));
    } else {
      await tx.insert(usuarioRoles).values({
        usuarioId: userId,
        rolId,
        esPrincipal: true,
        asignadoPorId: actorId,
      });
    }
  });
}
