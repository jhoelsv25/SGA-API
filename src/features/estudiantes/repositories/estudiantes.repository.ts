import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  cargos,
  credenciales,
  estudiantes,
  personaCargos,
  personas,
  usuarioRoles,
  usuarios,
} from "../../../core/database/schema";
import { decodeCursor, encodeCursor } from "../../../common/utils";
import type {
  CreateEstudianteResponseDto,
  EstudianteQueryDto,
  EstudianteResponseDto,
  PaginatedEstudiantesResponseDto,
  UpdateEstudianteDto,
} from "../dto";
import type {
  DbEstudiantesProcedureExecutionResult,
  EstudianteCursorPayload,
  IEstudiantesRepository,
  RegistrarEstudianteTransactionData,
} from "../interfaces";

@Injectable()
export class EstudiantesRepository implements IEstudiantesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findById(id: string): Promise<EstudianteResponseDto | null> {
    const payload = { id, limit: 1 };
    const result = (await this.db.execute(sql`
      SELECT fn_consultar_estudiantes(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbEstudiantesProcedureExecutionResult;

    const data = result.rows?.[0]?.resultado?.data ?? [];
    return data[0] ?? null;
  }

  async findByCodigo(codigo: string): Promise<EstudianteResponseDto | null> {
    const payload = { codigo: codigo.trim(), limit: 1 };
    const result = (await this.db.execute(sql`
      SELECT fn_consultar_estudiantes(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbEstudiantesProcedureExecutionResult;

    const data = result.rows?.[0]?.resultado?.data ?? [];
    return data[0] ?? null;
  }

  async findByPersonaId(personaId: string): Promise<EstudianteResponseDto | null> {
    const payload = { personaId, limit: 1 };
    const result = (await this.db.execute(sql`
      SELECT fn_consultar_estudiantes(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbEstudiantesProcedureExecutionResult;

    const data = result.rows?.[0]?.resultado?.data ?? [];
    return data[0] ?? null;
  }

  async findAll(query?: EstudianteQueryDto): Promise<PaginatedEstudiantesResponseDto> {
    const limit = query?.limit && query.limit > 0 ? query.limit : 10;
    const decodedCursor = decodeCursor<EstudianteCursorPayload>(query?.cursor);

    const payload = {
      search: query?.search?.trim() || null,
      estado: query?.estado || null,
      cursorPaterno: decodedCursor?.apellidoPaterno ?? null,
      cursorMaterno: decodedCursor?.apellidoMaterno ?? null,
      cursorNombres: decodedCursor?.nombres ?? null,
      cursorId: decodedCursor?.id ?? null,
      limit,
    };

    const result = (await this.db.execute(sql`
      SELECT fn_consultar_estudiantes(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbEstudiantesProcedureExecutionResult;

    const jsonResult = result.rows?.[0]?.resultado ?? {};
    const data = jsonResult.data ?? [];
    const hasMore = Boolean(jsonResult.hasMore);

    const nextCursor =
      hasMore && jsonResult.nextCursorId && jsonResult.nextCursorPaterno != null
        ? encodeCursor<EstudianteCursorPayload>({
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

  async create(data: RegistrarEstudianteTransactionData): Promise<CreateEstudianteResponseDto> {
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

      // 2. Ficha de Estudiante
      const [nuevoEstudiante] = await tx
        .insert(estudiantes)
        .values({
          personaId,
          codigo: data.dto.codigo.trim(),
          fechaIngreso: data.dto.fechaIngreso,
          lenguaMaterna: data.dto.lenguaMaterna?.trim() || null,
          religion: data.dto.religion?.trim() || null,
          tieneDiscapacidad: data.dto.tieneDiscapacidad ?? false,
          detalleDiscapacidad: data.dto.tieneDiscapacidad
            ? data.dto.detalleDiscapacidad?.trim() || null
            : null,
          grupoSanguineo: data.dto.grupoSanguineo?.trim() || null,
          alergias: data.dto.alergias?.trim() || null,
          condicionesMedicas: data.dto.condicionesMedicas?.trim() || null,
          seguroSalud: data.dto.seguroSalud?.trim() || null,
          estado: "activo",
        })
        .returning({ id: estudiantes.id });

      // 3. Cargo: Estudiante (solo si no tiene cargo vigente)
      const [cargoActual] = await tx
        .select({ id: personaCargos.id, cargoId: personaCargos.cargoId, nombre: cargos.nombre })
        .from(personaCargos)
        .innerJoin(cargos, eq(personaCargos.cargoId, cargos.id))
        .where(and(eq(personaCargos.personaId, personaId), eq(personaCargos.vigente, true)))
        .limit(1);

      if (!cargoActual) {
        await tx.insert(personaCargos).values({
          personaId,
          cargoId: data.cargoId,
          fechaInicio: sql`CURRENT_DATE`,
          esPrincipal: true,
          registradoPorId: data.actorId,
        });
      }

      // 4. Cuenta y Rol:
      // Usuario = Código SIAGIE, Rol = Estudiante
      const [usuarioExistente] = await tx
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(and(eq(usuarios.personaId, personaId), isNull(usuarios.eliminadoEn)))
        .limit(1);

      let usuarioId: string;
      if (usuarioExistente) {
        usuarioId = usuarioExistente.id;
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
        const [usuarioCreado] = await tx
          .insert(usuarios)
          .values({
            personaId,
            rolId: data.rolId,
            nombreUsuario: data.dto.codigo.trim(),
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

      // Consultar el estudiante creado mediante fn_consultar_estudiantes
      const payload = { id: nuevoEstudiante.id, limit: 1 };
      const res = (await tx.execute(sql`
        SELECT fn_consultar_estudiantes(${JSON.stringify(payload)}::jsonb) AS resultado
      `)) as unknown as DbEstudiantesProcedureExecutionResult;

      const estudianteDto = res.rows?.[0]?.resultado?.data?.[0];
      if (!estudianteDto) {
        throw new Error("No se pudo recuperar el estudiante recién creado.");
      }

      return {
        estudiante: estudianteDto,
        tempPassword: data.tempPassword ?? null,
        credencial: {
          codigo: data.codigoCredencial,
          pin: data.pinPlano,
        },
      };
    });
  }

  async update(id: string, dto: UpdateEstudianteDto): Promise<EstudianteResponseDto | null> {
    const payload: Record<string, unknown> = { id };

    if (dto.fechaIngreso !== undefined) payload.fechaIngreso = dto.fechaIngreso;
    if (dto.lenguaMaterna !== undefined) payload.lenguaMaterna = dto.lenguaMaterna.trim() || null;
    if (dto.religion !== undefined) payload.religion = dto.religion.trim() || null;
    if (dto.tieneDiscapacidad !== undefined) payload.tieneDiscapacidad = dto.tieneDiscapacidad;
    if (dto.detalleDiscapacidad !== undefined) {
      payload.detalleDiscapacidad = dto.detalleDiscapacidad.trim() || null;
    }
    if (dto.grupoSanguineo !== undefined)
      payload.grupoSanguineo = dto.grupoSanguineo.trim() || null;
    if (dto.alergias !== undefined) payload.alergias = dto.alergias.trim() || null;
    if (dto.condicionesMedicas !== undefined) {
      payload.condicionesMedicas = dto.condicionesMedicas.trim() || null;
    }
    if (dto.seguroSalud !== undefined) payload.seguroSalud = dto.seguroSalud.trim() || null;
    if (dto.estado !== undefined) payload.estado = dto.estado;

    const result = (await this.db.execute(sql`
      SELECT fn_actualizar_estudiante(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as { rows?: Array<{ resultado?: EstudianteResponseDto }> };

    return result.rows?.[0]?.resultado ?? null;
  }

  async delete(id: string, _actorId: string): Promise<boolean> {
    const result = await this.db
      .update(estudiantes)
      .set({
        eliminadoEn: sql`CURRENT_TIMESTAMP`,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(estudiantes.id, id), isNull(estudiantes.eliminadoEn)))
      .returning({ id: estudiantes.id });

    return result.length > 0;
  }
}
