import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  cargos,
  credenciales,
  docentes,
  personaCargos,
  personas,
  roles,
  usuarioRoles,
  usuarios,
} from "../../../core/database/schema";
import { decodeCursor, encodeCursor } from "../../../common/utils";
import type {
  CreateDocenteResponseDto,
  DocenteQueryDto,
  DocenteResponseDto,
  PaginatedDocentesResponseDto,
  UpdateDocenteDto,
} from "../dto";
import type {
  DbDocentesProcedureExecutionResult,
  DocenteCursorPayload,
  IDocentesRepository,
  RegistrarDocenteTransactionData,
} from "../interfaces";

const CARGOS_ESTUDIANTE_APODERADO = ["Estudiante", "Apoderado(a)"];

@Injectable()
export class DocentesRepository implements IDocentesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findById(
    id: string,
    ejecutor: Pick<Database, "execute"> = this.db,
  ): Promise<DocenteResponseDto | null> {
    const payload = { id, limit: 1 };
    const result = (await ejecutor.execute(sql`
      SELECT fn_consultar_docentes(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbDocentesProcedureExecutionResult;

    const data = result.rows?.[0]?.resultado?.data ?? [];
    return data[0] ?? null;
  }

  async findByCodigo(codigo: string): Promise<DocenteResponseDto | null> {
    const payload = { codigo: codigo.trim(), limit: 1 };
    const result = (await this.db.execute(sql`
      SELECT fn_consultar_docentes(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbDocentesProcedureExecutionResult;

    const data = result.rows?.[0]?.resultado?.data ?? [];
    return data[0] ?? null;
  }

  async findByPersonaId(personaId: string): Promise<DocenteResponseDto | null> {
    const payload = { personaId, limit: 1 };
    const result = (await this.db.execute(sql`
      SELECT fn_consultar_docentes(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbDocentesProcedureExecutionResult;

    const data = result.rows?.[0]?.resultado?.data ?? [];
    return data[0] ?? null;
  }

  async findAll(query?: DocenteQueryDto): Promise<PaginatedDocentesResponseDto> {
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

    const result = (await this.db.execute(sql`
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

  async create(data: RegistrarDocenteTransactionData): Promise<CreateDocenteResponseDto> {
    return this.db.transaction(async (tx) => {
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

      // 2. Ficha de Docente
      const [nuevoDocente] = await tx
        .insert(docentes)
        .values({
          personaId,
          codigo: data.dto.codigo.trim(),
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
          .where(and(eq(usuarioRoles.usuarioId, usuarioId), eq(usuarioRoles.rolId, data.rolId)))
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
      const docenteResponse = (await this.findById(nuevoDocente.id, tx))!;

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

  async update(id: string, dto: UpdateDocenteDto): Promise<DocenteResponseDto | null> {
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

    await this.db.update(docentes).set(values).where(eq(docentes.id, id));

    return this.findById(id);
  }

  async cesar(
    id: string,
    fechaCese: string,
  ): Promise<{
    docente: DocenteResponseDto;
    mantuvoCuentaActiva: boolean;
  } | null> {
    return this.db.transaction(async (tx) => {
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

      // 2. Evaluar si la persona tiene otras fichas o cargos activos
      const [otrasFichas] = await tx
        .select({
          esEstudiante: sql<boolean>`EXISTS(SELECT 1 FROM estudiantes e WHERE e.persona_id = ${docenteRow.personaId} AND e.eliminado_en IS NULL)`,
          esApoderado: sql<boolean>`EXISTS(SELECT 1 FROM apoderados a WHERE a.persona_id = ${docenteRow.personaId} AND a.eliminado_en IS NULL)`,
        })
        .from(personas)
        .where(eq(personas.id, docenteRow.personaId));

      const tieneOtrasFichas = otrasFichas.esEstudiante || otrasFichas.esApoderado;

      // Buscar rol Docente
      const [rolDocente] = await tx
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.nombre, "Docente"))
        .limit(1);

      const [usuarioRow] = await tx
        .select({ id: usuarios.id, rolId: usuarios.rolId })
        .from(usuarios)
        .where(and(eq(usuarios.personaId, docenteRow.personaId), isNull(usuarios.eliminadoEn)))
        .limit(1);

      if (tieneOtrasFichas) {
        // Solo revocar el rol Docente
        if (usuarioRow && rolDocente) {
          await tx
            .delete(usuarioRoles)
            .where(
              and(eq(usuarioRoles.usuarioId, usuarioRow.id), eq(usuarioRoles.rolId, rolDocente.id)),
            );

          // Si el rol principal era Docente, reasignar a otro rol disponible del usuario
          if (usuarioRow.rolId === rolDocente.id) {
            const [otroRol] = await tx
              .select({ rolId: usuarioRoles.rolId })
              .from(usuarioRoles)
              .where(eq(usuarioRoles.usuarioId, usuarioRow.id))
              .limit(1);

            if (otroRol) {
              await tx
                .update(usuarios)
                .set({ rolId: otroRol.rolId })
                .where(eq(usuarios.id, usuarioRow.id));
            }
          }
        }
      } else {
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

      const docenteActualizado = (await this.findById(id))!;

      return {
        docente: docenteActualizado,
        mantuvoCuentaActiva: tieneOtrasFichas,
      };
    });
  }
  /** Cursos asignados al docente en un año académico en curso o reabierto. */
  async contarCargaVigente(docenteId: string): Promise<number> {
    const result = (await this.db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM cursos_seccion cs
      INNER JOIN secciones s ON s.id = cs.seccion_id
      INNER JOIN anios_academicos a ON a.id = s.anio_academico_id
      WHERE cs.docente_id = ${docenteId}
        AND a.estado IN ('en_curso', 'reabierto')
    `)) as unknown as { rows: { total: number }[] };
    return Number(result.rows?.[0]?.total ?? 0);
  }

  /** Reactiva un docente cesado: vuelve a 'activo', limpia la fecha de cese y reabre su cuenta. */
  async reactivar(id: string): Promise<DocenteResponseDto | null> {
    return this.db.transaction(async (tx) => {
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

      return this.findById(id);
    });
  }
}
