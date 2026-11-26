import { and, eq, isNull, sql } from "drizzle-orm";
import { Database } from "../../../../core/database";
import {
  cargos,
  credenciales,
  docentes,
  personaCargos,
  personas,
  usuarioRoles,
  usuarios,
} from "../../../../core/database/schema";
import { decodeCursor, encodeCursor } from "../../../../common/utils";
import type {
  CreateDocenteResponseDto,
  DocenteQueryDto,
  DocenteResponseDto,
  PaginatedDocentesResponseDto,
  UpdateDocenteDto,
} from "../../dto";
import type {
  DbDocentesProcedureExecutionResult,
  DocenteCursorPayload,
  RegistrarDocenteTransactionData,
} from "../../interfaces";
import type { DocentesRepositoryDeps, DocentesRepositoryCalls } from "./deps";

const CARGOS_ESTUDIANTE_APODERADO = ["Estudiante", "Apoderado(a)"];

export async function findById(
  id: string,
  ejecutor: Pick<Database, "execute">,
): Promise<DocenteResponseDto | null> {
  const payload = { id, limit: 1 };
  const result = (await ejecutor.execute(sql`
      SELECT fn_consultar_docentes(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbDocentesProcedureExecutionResult;

  const data = result.rows?.[0]?.resultado?.data ?? [];
  return data[0] ?? null;
}

export async function findByCodigo(
  deps: DocentesRepositoryDeps,
  codigo: string,
): Promise<DocenteResponseDto | null> {
  const payload = { codigo: codigo.trim(), limit: 1 };
  const result = (await deps.db.execute(sql`
      SELECT fn_consultar_docentes(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbDocentesProcedureExecutionResult;

  const data = result.rows?.[0]?.resultado?.data ?? [];
  return data[0] ?? null;
}

export async function generarSiguienteCodigo(
  deps: DocentesRepositoryDeps,
  fecha: Date,
): Promise<string> {
  const fechaLima = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
  const prefijo = fechaLima.replace(/-/g, "");
  const patron = `^${prefijo}[0-9]{6}$`;
  const rows = await deps.db
    .select({ codigo: docentes.codigo })
    .from(docentes)
    .where(sql`${docentes.codigo} ~ ${patron}`);

  let maxCorrelativo = 0;
  for (const r of rows) {
    const sufijo = Number(r.codigo.slice(8));
    if (Number.isFinite(sufijo) && sufijo > maxCorrelativo) {
      maxCorrelativo = sufijo;
    }
  }

  return `${prefijo}${String(maxCorrelativo + 1).padStart(6, "0")}`;
}

export async function findByPersonaId(
  deps: DocentesRepositoryDeps,
  personaId: string,
): Promise<DocenteResponseDto | null> {
  const payload = { personaId, limit: 1 };
  const result = (await deps.db.execute(sql`
      SELECT fn_consultar_docentes(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbDocentesProcedureExecutionResult;

  const data = result.rows?.[0]?.resultado?.data ?? [];
  return data[0] ?? null;
}

export async function findAll(
  deps: DocentesRepositoryDeps,
  query?: DocenteQueryDto,
): Promise<PaginatedDocentesResponseDto> {
  const limit = query?.limit && query.limit > 0 ? query.limit : 10;
  const decodedCursor = decodeCursor<DocenteCursorPayload>(query?.cursor);

  const payload = {
    search: query?.search?.trim() || null,
    tipoContrato: query?.tipoContrato || null,
    estado: query?.estado || null,
    cursorPaterno: decodedCursor?.apellidoPaterno ?? null,
    cursorMaterno: decodedCursor?.apellidoMaterno ?? null,
    cursorNombres: decodedCursor?.nombres ?? null,
    cursorId: decodedCursor?.id ?? null,
    limit,
  };

  const result = (await deps.db.execute(sql`
      SELECT fn_consultar_docentes(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbDocentesProcedureExecutionResult;

  const jsonResult = result.rows?.[0]?.resultado ?? {};
  const data = jsonResult.data ?? [];
  const hasMore = Boolean(jsonResult.hasMore);

  const nextCursor =
    hasMore && jsonResult.nextCursorId && jsonResult.nextCursorPaterno != null
      ? encodeCursor<DocenteCursorPayload>({
          apellidoPaterno: jsonResult.nextCursorPaterno,
          apellidoMaterno: jsonResult.nextCursorMaterno ?? "",
          nombres: jsonResult.nextCursorNombres ?? "",
          id: jsonResult.nextCursorId,
        })
      : null;

  return {
    data,
    nextCursor,
    hasMore,
    limit,
  };
}

export async function create(
  deps: DocentesRepositoryDeps,
  calls: DocentesRepositoryCalls,
  data: RegistrarDocenteTransactionData,
): Promise<CreateDocenteResponseDto> {
  return deps.db.transaction(async (tx) => {
    // 1. Persona: reutilizar del padrón o insertar
    let personaId = data.dto.personaId;
    if (!personaId) {
      const p = data.dto.nuevaPersona!;
      const [creada] = await tx
        .insert(personas)
        .values({
          tipoDocumento: p.tipoDocumento,
          numeroDocumento: p.numeroDocumento.trim(),
          nombres: p.nombres.trim(),
          apellidoPaterno: p.apellidoPaterno.trim(),
          apellidoMaterno: p.apellidoMaterno?.trim() || null,
          sexo: p.sexo,
          fechaNacimiento: p.fechaNacimiento || null,
          direccion: p.direccion?.trim() || null,
          distrito: p.distrito?.trim() || null,
          telefono: p.telefono?.trim() || null,
          celular: p.celular?.trim() || null,
          correo: p.correo?.trim() || null,
          fotoUrl: p.fotoUrl?.trim() || null,
        })
        .returning({ id: personas.id });
      personaId = creada.id;
    }

    const codigoFinal = data.dto.codigo?.trim() || (await calls.generarSiguienteCodigo());

    // 2. Ficha de Docente
    const [nuevoDocente] = await tx
      .insert(docentes)
      .values({
        personaId,
        codigo: codigoFinal,
        especialidad: data.dto.especialidad?.trim() || null,
        tituloProfesional: data.dto.tituloProfesional?.trim() || null,
        tipoContrato: data.dto.tipoContrato,
        jornadaHoras: data.dto.jornadaHoras,
        fechaIngreso: data.dto.fechaIngreso,
        estado: "activo",
        firmaUrl: data.dto.firmaUrl?.trim() || null,
      })
      .returning({ id: docentes.id });

    // 3. Cargo: Docente de aula (o el indicado).
    // Si el cargo vigente es Estudiante o Apoderado(a), se reemplaza por el cargo docente.
    const [cargoActual] = await tx
      .select({ id: personaCargos.id, cargoId: personaCargos.cargoId, nombre: cargos.nombre })
      .from(personaCargos)
      .innerJoin(cargos, eq(personaCargos.cargoId, cargos.id))
      .where(and(eq(personaCargos.personaId, personaId), eq(personaCargos.vigente, true)))
      .limit(1);

    if (cargoActual && CARGOS_ESTUDIANTE_APODERADO.includes(cargoActual.nombre)) {
      await tx
        .update(personaCargos)
        .set({
          vigente: false,
          esPrincipal: false,
          fechaFin: sql`CURRENT_DATE`,
        })
        .where(eq(personaCargos.id, cargoActual.id));
    }

    if (!cargoActual || CARGOS_ESTUDIANTE_APODERADO.includes(cargoActual.nombre)) {
      await tx.insert(personaCargos).values({
        personaId,
        cargoId: data.cargoId,
        fechaInicio: sql`CURRENT_DATE`,
        esPrincipal: true,
        registradoPorId: data.actorId,
      });
    }

    // 4. Cuenta y Rol:
    const [usuarioExistente] = await tx
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(and(eq(usuarios.personaId, personaId), isNull(usuarios.eliminadoEn)))
      .limit(1);

    let usuarioId: string;
    if (usuarioExistente) {
      usuarioId = usuarioExistente.id;
      // Asignar el rol Docente si aún no lo tiene
      const [tieneRol] = await tx
        .select({ id: usuarioRoles.id })
        .from(usuarioRoles)
        .where(
          and(
            eq(usuarioRoles.usuarioId, usuarioId),
            eq(usuarioRoles.rolId, data.rolId),
            eq(usuarioRoles.vigente, true),
          ),
        )
        .limit(1);

      if (!tieneRol) {
        await tx.insert(usuarioRoles).values({
          usuarioId,
          rolId: data.rolId,
          asignadoPorId: data.actorId,
        });
      }
    } else {
      // Obtener numeroDocumento para nombreUsuario
      const [personaRow] = await tx
        .select({ numeroDocumento: personas.numeroDocumento })
        .from(personas)
        .where(eq(personas.id, personaId))
        .limit(1);

      const [usuarioCreado] = await tx
        .insert(usuarios)
        .values({
          personaId,
          rolId: data.rolId,
          nombreUsuario: personaRow.numeroDocumento.trim(),
          contrasenaHash: data.contrasenaHash!,
          debeCambiarContrasena: true,
          estado: "activo",
        })
        .returning({ id: usuarios.id });

      usuarioId = usuarioCreado.id;

      await tx.insert(usuarioRoles).values({
        usuarioId,
        rolId: data.rolId,
        asignadoPorId: data.actorId,
      });
    }

    // 5. Credencial de Marcación
    const [credencialExistente] = await tx
      .select({ id: credenciales.id })
      .from(credenciales)
      .where(and(eq(credenciales.personaId, personaId), eq(credenciales.activa, true)))
      .limit(1);

    if (!credencialExistente) {
      await tx.insert(credenciales).values({
        personaId,
        codigo: data.codigoCredencial,
        pinHash: data.pinHash,
        activa: true,
      });
    }

    // Buscar el docente recién creado dentro de la misma transacción (aún no confirmada)
    const docenteResponse = (await calls.findById(nuevoDocente.id, tx))!;

    return {
      docente: docenteResponse,
      tempPassword: data.tempPassword || null,
      credencial: {
        codigo: data.codigoCredencial,
        pin: data.pinPlano,
      },
    };
  });
}

export async function update(
  deps: DocentesRepositoryDeps,
  calls: DocentesRepositoryCalls,
  id: string,
  dto: UpdateDocenteDto,
): Promise<DocenteResponseDto | null> {
  const values: Record<string, unknown> = {};

  if (dto.especialidad !== undefined) values.especialidad = dto.especialidad?.trim() || null;
  if (dto.tituloProfesional !== undefined)
    values.tituloProfesional = dto.tituloProfesional?.trim() || null;
  if (dto.tipoContrato !== undefined) values.tipoContrato = dto.tipoContrato;
  if (dto.jornadaHoras !== undefined) values.jornadaHoras = dto.jornadaHoras;
  if (dto.fechaIngreso !== undefined) values.fechaIngreso = dto.fechaIngreso;
  if (dto.fechaCese !== undefined) values.fechaCese = dto.fechaCese || null;
  if (dto.estado !== undefined) values.estado = dto.estado;
  if (dto.firmaUrl !== undefined) values.firmaUrl = dto.firmaUrl?.trim() || null;

  values.actualizadoEn = sql`CURRENT_TIMESTAMP`;

  await deps.db.update(docentes).set(values).where(eq(docentes.id, id));

  return calls.findById(id);
}
