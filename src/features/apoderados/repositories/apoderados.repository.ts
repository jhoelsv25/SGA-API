import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  apoderados,
  estudianteApoderados,
  estudiantes,
  matriculas,
  personaCargos,
  personas,
  secciones,
  usuarioRoles,
  usuarios,
} from "../../../core/database/schema";
import { decodeCursor, encodeCursor } from "../../../common/utils";
import type {
  ApoderadoQueryDto,
  ApoderadoResponseDto,
  CreateApoderadoResponseDto,
  EstudianteDelApoderadoResponseDto,
  PaginatedApoderadosResponseDto,
  UpdateApoderadoDto,
  VincularEstudianteApoderadoDto,
  VinculoFamiliarResponseDto,
} from "../dto";
import type {
  ApoderadoCursorPayload,
  DbApoderadosProcedureExecutionResult,
  IApoderadosRepository,
  RegistrarApoderadoTransactionData,
} from "../interfaces";

@Injectable()
export class ApoderadosRepository implements IApoderadosRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findById(id: string): Promise<ApoderadoResponseDto | null> {
    const payload = { id, limit: 1 };
    const result = (await this.db.execute(sql`
      SELECT fn_consultar_apoderados(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbApoderadosProcedureExecutionResult;

    const data = result.rows?.[0]?.resultado?.data ?? [];
    return data[0] ?? null;
  }

  async findByPersonaId(personaId: string): Promise<ApoderadoResponseDto | null> {
    const payload = { personaId, limit: 1 };
    const result = (await this.db.execute(sql`
      SELECT fn_consultar_apoderados(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbApoderadosProcedureExecutionResult;

    const data = result.rows?.[0]?.resultado?.data ?? [];
    return data[0] ?? null;
  }

  async findByEstudianteId(estudianteId: string): Promise<ApoderadoResponseDto[]> {
    const payload = { estudianteId, limit: 50 };
    const result = (await this.db.execute(sql`
      SELECT fn_consultar_apoderados(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbApoderadosProcedureExecutionResult;

    return result.rows?.[0]?.resultado?.data ?? [];
  }

  async findEstudiantesByApoderadoPersonaId(
    apoderadoPersonaId: string,
  ): Promise<EstudianteDelApoderadoResponseDto[]> {
    const filas = await this.db
      .select({
        estudianteId: estudiantes.id,
        personaId: personas.id,
        apellidoPaterno: personas.apellidoPaterno,
        apellidoMaterno: personas.apellidoMaterno,
        nombres: personas.nombres,
        parentesco: estudianteApoderados.parentesco,
        seccionId: secciones.id,
        seccionNombre: secciones.nombre,
      })
      .from(estudianteApoderados)
      .innerJoin(apoderados, eq(estudianteApoderados.apoderadoId, apoderados.id))
      .innerJoin(estudiantes, eq(estudianteApoderados.estudianteId, estudiantes.id))
      .innerJoin(personas, eq(estudiantes.personaId, personas.id))
      .leftJoin(
        matriculas,
        and(eq(matriculas.estudianteId, estudiantes.id), eq(matriculas.estado, "matriculado")),
      )
      .leftJoin(secciones, eq(secciones.id, matriculas.seccionId))
      .where(and(eq(apoderados.personaId, apoderadoPersonaId), isNull(personas.eliminadoEn)))
      .orderBy(desc(estudianteApoderados.esPrincipal), personas.apellidoPaterno);

    return filas.map((fila) => ({
      estudianteId: fila.estudianteId,
      personaId: fila.personaId,
      nombreCompleto: `${fila.apellidoPaterno} ${fila.apellidoMaterno} ${fila.nombres}`.trim(),
      parentesco: fila.parentesco,
      seccionId: fila.seccionId ?? null,
      seccionNombre: fila.seccionNombre ?? null,
    }));
  }

  async findAll(query?: ApoderadoQueryDto): Promise<PaginatedApoderadosResponseDto> {
    const limit = query?.limit && query.limit > 0 ? query.limit : 10;
    const decodedCursor = decodeCursor<ApoderadoCursorPayload>(query?.cursor);

    const payload = {
      search: query?.search?.trim() || null,
      estudianteId: query?.estudianteId || null,
      gradoInstruccion: query?.gradoInstruccion || null,
      cursorPaterno: decodedCursor?.apellidoPaterno ?? null,
      cursorMaterno: decodedCursor?.apellidoMaterno ?? null,
      cursorNombres: decodedCursor?.nombres ?? null,
      cursorId: decodedCursor?.id ?? null,
      limit,
    };

    const result = (await this.db.execute(sql`
      SELECT fn_consultar_apoderados(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbApoderadosProcedureExecutionResult;

    const jsonResult = result.rows?.[0]?.resultado ?? {};
    const data = jsonResult.data ?? [];
    const hasMore = Boolean(jsonResult.hasMore);

    const nextCursor =
      hasMore && jsonResult.nextCursorId && jsonResult.nextCursorPaterno != null
        ? encodeCursor<ApoderadoCursorPayload>({
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

  async create(data: RegistrarApoderadoTransactionData): Promise<CreateApoderadoResponseDto> {
    return this.db.transaction(async (tx) => {
      // 1. Persona: reutilizar del padrón o insertar
      let personaId = data.dto.personaId;
      let numeroDocumento: string;

      if (!personaId) {
        const p = data.dto.nuevaPersona!;
        numeroDocumento = p.numeroDocumento.trim();
        const [creada] = await tx
          .insert(personas)
          .values({
            tipoDocumento: p.tipoDocumento,
            numeroDocumento,
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
      } else {
        const [existente] = await tx
          .select({ numeroDocumento: personas.numeroDocumento })
          .from(personas)
          .where(eq(personas.id, personaId))
          .limit(1);
        numeroDocumento = existente?.numeroDocumento ?? "";
      }

      // 2. Ficha de Apoderado
      const [nuevoApoderado] = await tx
        .insert(apoderados)
        .values({
          personaId,
          ocupacion: data.dto.ocupacion?.trim() || null,
          centroLaboral: data.dto.centroLaboral?.trim() || null,
          telefonoLaboral: data.dto.telefonoLaboral?.trim() || null,
          gradoInstruccion: data.dto.gradoInstruccion || null,
        })
        .returning({ id: apoderados.id });

      // 3. Cargo: Apoderado(a) (solo si no tiene cargo vigente)
      const [cargoActual] = await tx
        .select({ id: personaCargos.id })
        .from(personaCargos)
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
      // Usuario = DNI/Documento, Rol = Apoderado
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
            nombreUsuario: numeroDocumento,
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

      // 5. Vínculo familiar inmediato si se proporcionó estudianteId
      let vinculoDto: VinculoFamiliarResponseDto | null = null;
      if (data.dto.estudianteId && data.dto.parentesco) {
        const vinculoPayload = {
          estudianteId: data.dto.estudianteId,
          apoderadoId: nuevoApoderado.id,
          parentesco: data.dto.parentesco,
          esPrincipal: data.dto.esPrincipal ?? false,
          viveConEstudiante: data.dto.viveConEstudiante ?? false,
          autorizadoRecoger: data.dto.autorizadoRecoger ?? false,
          contactoEmergencia: data.dto.contactoEmergencia ?? false,
        };

        const vinculoRes = (await tx.execute(sql`
          SELECT fn_vincular_estudiante_apoderado(${JSON.stringify(vinculoPayload)}::jsonb) AS resultado
        `)) as unknown as { rows?: Array<{ resultado: VinculoFamiliarResponseDto }> };

        vinculoDto = vinculoRes.rows?.[0]?.resultado ?? null;
      }

      // 6. Consultar la ficha completa creada
      const payload = { id: nuevoApoderado.id, limit: 1 };
      const res = (await tx.execute(sql`
        SELECT fn_consultar_apoderados(${JSON.stringify(payload)}::jsonb) AS resultado
      `)) as unknown as DbApoderadosProcedureExecutionResult;

      const apoderadoDto = res.rows?.[0]?.resultado?.data?.[0];
      if (!apoderadoDto) {
        throw new Error("No se pudo recuperar el apoderado recién creado.");
      }

      return {
        apoderado: apoderadoDto,
        tempPassword: data.tempPassword ?? null,
        vinculo: vinculoDto,
      };
    });
  }

  async update(id: string, dto: UpdateApoderadoDto): Promise<ApoderadoResponseDto | null> {
    const payload: Record<string, unknown> = { id };

    if (dto.ocupacion !== undefined) payload.ocupacion = dto.ocupacion.trim() || null;
    if (dto.centroLaboral !== undefined) payload.centroLaboral = dto.centroLaboral.trim() || null;
    if (dto.telefonoLaboral !== undefined)
      payload.telefonoLaboral = dto.telefonoLaboral.trim() || null;
    if (dto.gradoInstruccion !== undefined) payload.gradoInstruccion = dto.gradoInstruccion;

    const result = (await this.db.execute(sql`
      SELECT fn_actualizar_apoderado(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as { rows?: Array<{ resultado?: ApoderadoResponseDto }> };

    return result.rows?.[0]?.resultado ?? null;
  }

  async delete(id: string, _actorId: string): Promise<boolean> {
    const result = await this.db
      .update(apoderados)
      .set({
        eliminadoEn: sql`CURRENT_TIMESTAMP`,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(apoderados.id, id), isNull(apoderados.eliminadoEn)))
      .returning({ id: apoderados.id });

    return result.length > 0;
  }

  async vincularEstudiante(
    dto: VincularEstudianteApoderadoDto,
  ): Promise<VinculoFamiliarResponseDto> {
    const payload = {
      estudianteId: dto.estudianteId,
      apoderadoId: dto.apoderadoId,
      parentesco: dto.parentesco,
      esPrincipal: dto.esPrincipal ?? false,
      viveConEstudiante: dto.viveConEstudiante ?? false,
      autorizadoRecoger: dto.autorizadoRecoger ?? false,
      contactoEmergencia: dto.contactoEmergencia ?? false,
    };

    const result = (await this.db.execute(sql`
      SELECT fn_vincular_estudiante_apoderado(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as { rows?: Array<{ resultado: VinculoFamiliarResponseDto }> };

    const vinculo = result.rows?.[0]?.resultado;
    if (!vinculo) {
      throw new Error("No se pudo registrar el vínculo familiar.");
    }
    return vinculo;
  }

  async desvincularEstudiante(estudianteId: string, apoderadoId: string): Promise<boolean> {
    const payload = { estudianteId, apoderadoId };
    const result = (await this.db.execute(sql`
      SELECT fn_desvincular_estudiante_apoderado(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as { rows?: Array<{ resultado: { success: boolean } }> };

    return Boolean(result.rows?.[0]?.resultado?.success);
  }

  async getVinculo(
    estudianteId: string,
    apoderadoId: string,
  ): Promise<VinculoFamiliarResponseDto | null> {
    const [row] = await this.db
      .select()
      .from(estudianteApoderados)
      .where(
        and(
          eq(estudianteApoderados.estudianteId, estudianteId),
          eq(estudianteApoderados.apoderadoId, apoderadoId),
        ),
      )
      .limit(1);

    if (!row) return null;

    return {
      estudianteId: row.estudianteId,
      apoderadoId: row.apoderadoId,
      parentesco: row.parentesco,
      esPrincipal: row.esPrincipal,
      viveConEstudiante: row.viveConEstudiante,
      autorizadoRecoger: row.autorizadoRecoger,
      contactoEmergencia: row.contactoEmergencia,
      creadoEn: row.creadoEn,
    };
  }
}
