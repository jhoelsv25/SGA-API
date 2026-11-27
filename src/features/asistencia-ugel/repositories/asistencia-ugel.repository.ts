import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { esEstudianteSql } from "../../../common/utils/es-estudiante.sql";
import { Database, DRIZZLE } from "../../../core/database";
import { asistenciaNovedades, personas } from "../../../core/database/schema";
import type { CrearNovedadDto, NovedadDto } from "../dto";

export interface ServidorDelReporte {
  personaId: string;
  dni: string;
  nombreCompleto: string;
  tipoTurno: "docentes" | "administrativos";
  cargo: string | null;
  condicion: string | null;
  jornada: number | null;
  fechaIngreso: string | null;
  fechaCese: string | null;
}

const nombre = sql<string>`TRIM(${personas.apellidoPaterno} || ' ' || COALESCE(${personas.apellidoMaterno}, '') || ', ' || ${personas.nombres})`;

@Injectable()
export class AsistenciaUgelRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * La norma alcanza a profesores y auxiliares de educación. Profesores: ficha docente (sin practicantes) con
   * vínculo en el periodo. Auxiliares: cargo vigente «Auxiliar de educación».
   */
  async servidores(
    desde: string,
    hasta: string,
    personaId?: string,
  ): Promise<ServidorDelReporte[]> {
    const solo = personaId ? sql`AND p.id = ${personaId}::uuid` : sql``;
    const { rows } = (await this.db.execute(sql`
      SELECT p.id AS "personaId", p.numero_documento AS dni,
             TRIM(p.apellido_paterno || ' ' || COALESCE(p.apellido_materno, '') || ', ' || p.nombres) AS "nombreCompleto",
             CASE WHEN d.id IS NOT NULL THEN 'docentes' ELSE 'administrativos' END AS "tipoTurno",
             c.nombre AS cargo, d.tipo_contrato AS condicion, d.jornada_horas AS jornada,
             d.fecha_ingreso::text AS "fechaIngreso", d.fecha_cese::text AS "fechaCese"
      FROM personas p
      LEFT JOIN docentes d ON d.persona_id = p.id AND d.eliminado_en IS NULL
        AND d.tipo_contrato <> 'practicante' AND d.fecha_ingreso <= ${hasta}::date
        AND (d.fecha_cese >= ${desde}::date OR (d.fecha_cese IS NULL AND d.estado = 'activo'))
      LEFT JOIN persona_cargos pc ON pc.persona_id = p.id AND pc.vigente
      LEFT JOIN cargos c ON c.id = pc.cargo_id
      WHERE (d.id IS NOT NULL OR (p.eliminado_en IS NULL AND c.nombre ILIKE 'auxiliar de educaci%'))
        AND NOT ${esEstudianteSql(sql.raw("p.id"))} ${solo}
      ORDER BY p.apellido_paterno, p.apellido_materno, p.nombres
    `)) as unknown as { rows: ServidorDelReporte[] };
    return rows;
  }

  async practicantes(desde: string, hasta: string): Promise<number> {
    const { rows } = (await this.db.execute(sql`
      SELECT COUNT(*)::int AS total FROM docentes d
      WHERE d.eliminado_en IS NULL AND d.tipo_contrato = 'practicante' AND d.estado = 'activo'
        AND d.fecha_ingreso <= ${hasta}::date AND (d.fecha_cese IS NULL OR d.fecha_cese >= ${desde}::date)
    `)) as unknown as { rows: { total: number }[] };
    return Number(rows[0]?.total ?? 0);
  }

  /** Justificaciones que tocan el rango. */
  async novedades(
    desde: string,
    hasta: string,
    opciones: { personaId?: string; incluirAnuladas?: boolean } = {},
  ): Promise<NovedadDto[]> {
    const filas = await this.db
      .select({ n: asistenciaNovedades, nombreCompleto: nombre })
      .from(asistenciaNovedades)
      .innerJoin(personas, eq(personas.id, asistenciaNovedades.personaId))
      .where(
        and(
          lte(asistenciaNovedades.fechaDesde, hasta),
          gte(asistenciaNovedades.fechaHasta, desde),
          opciones.personaId ? eq(asistenciaNovedades.personaId, opciones.personaId) : undefined,
          opciones.incluirAnuladas ? undefined : eq(asistenciaNovedades.anulada, false),
        ),
      )
      .orderBy(asc(asistenciaNovedades.fechaDesde), asc(personas.apellidoPaterno));
    return filas.map((f) => this.mapear(f.n, f.nombreCompleto));
  }

  async porId(id: string): Promise<NovedadDto | null> {
    const [f] = await this.db
      .select({ n: asistenciaNovedades, nombreCompleto: nombre })
      .from(asistenciaNovedades)
      .innerJoin(personas, eq(personas.id, asistenciaNovedades.personaId))
      .where(eq(asistenciaNovedades.id, id));
    return f ? this.mapear(f.n, f.nombreCompleto) : null;
  }

  async crear(dto: CrearNovedadDto, usuarioId: string): Promise<string> {
    const [fila] = await this.db
      .insert(asistenciaNovedades)
      .values({
        personaId: dto.personaId,
        tipo: dto.tipo,
        fechaDesde: dto.fechaDesde,
        fechaHasta: dto.fechaHasta,
        minutos: dto.minutos ?? null,
        marcaOmitida: dto.tipo === "omision_justificada" ? (dto.marcaOmitida ?? null) : null,
        documento: dto.documento.trim(),
        observacion: dto.observacion?.trim() || null,
        presentadoEn: dto.presentadoEn?.replace("T", " ") ?? null,
        registradoPorId: usuarioId,
      })
      .returning({ id: asistenciaNovedades.id });
    return fila.id;
  }

  async anular(id: string, motivo: string, usuarioId: string): Promise<void> {
    await this.db
      .update(asistenciaNovedades)
      .set({
        anulada: true,
        anuladaPorId: usuarioId,
        anuladaEn: sql`CURRENT_TIMESTAMP`,
        motivoAnulacion: motivo,
      })
      .where(eq(asistenciaNovedades.id, id));
  }

  private mapear(n: typeof asistenciaNovedades.$inferSelect, nombreCompleto: string): NovedadDto {
    return {
      id: n.id,
      personaId: n.personaId,
      nombreCompleto,
      tipo: n.tipo as NovedadDto["tipo"],
      fechaDesde: n.fechaDesde,
      fechaHasta: n.fechaHasta,
      minutos: n.minutos,
      marcaOmitida: n.marcaOmitida as NovedadDto["marcaOmitida"],
      documento: n.documento,
      observacion: n.observacion,
      anulada: n.anulada,
      motivoAnulacion: n.motivoAnulacion,
    };
  }
}
