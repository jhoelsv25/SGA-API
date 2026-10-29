import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { Database, DRIZZLE } from "@/core/database";
import { comunicados } from "@/core/database/schema";
import { decodeCursor, encodeCursor } from "@/common/utils";
import {
  AvanceLecturaResponse,
  ComunicadoCursorPayload,
  ComunicadoItem,
  DbComunicadosProcedureResult,
  DestinatarioLecturaItem,
  DirigidoA,
  EstadoComunicado,
} from "../interfaces";
import { ComunicadoQueryDto, PaginatedComunicadosResponseDto } from "../dto";

export interface DestinatarioInfo {
  usuarioId: string;
  nombreCompleto: string;
  tipo: "docente" | "estudiante" | "apoderado";
}

@Injectable()
export class ComunicadosRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findByQuery(
    usuarioId: string,
    query?: ComunicadoQueryDto,
  ): Promise<PaginatedComunicadosResponseDto> {
    const limit = query?.limit && query.limit > 0 ? query.limit : 20;
    const decodedCursor = decodeCursor<ComunicadoCursorPayload>(query?.cursor);

    const payload = {
      usuarioId,
      soloMios: Boolean(query?.soloMios),
      estado: query?.estado || null,
      dirigidoA: query?.dirigidoA || null,
      prioridad: query?.prioridad || null,
      gradoId: query?.gradoId || null,
      seccionId: query?.seccionId || null,
      search: query?.search?.trim() || null,
      cursorCreadoEn: decodedCursor?.creadoEn || null,
      cursorId: decodedCursor?.id || null,
      limit,
    };

    const result = (await this.db.execute(sql`
      SELECT fn_consultar_comunicados(${JSON.stringify(payload)}::jsonb) AS resultado
    `)) as unknown as DbComunicadosProcedureResult;

    const jsonResult = result.rows?.[0]?.resultado ?? {};
    const data: ComunicadoItem[] = jsonResult.data ?? [];
    const hasMore: boolean = Boolean(jsonResult.hasMore);

    const nextCursor =
      hasMore && jsonResult.nextCursorId && jsonResult.nextCursorCreadoEn
        ? encodeCursor<ComunicadoCursorPayload>({
            creadoEn: jsonResult.nextCursorCreadoEn,
            id: jsonResult.nextCursorId,
          })
        : null;

    return {
      data,
      hasMore,
      nextCursor,
      limit,
    };
  }

  async findById(id: string): Promise<ComunicadoItem | null> {
    const result = (await this.db.execute(sql`
      SELECT 
        c.id,
        c.autor_id AS "autorId",
        TRIM(CONCAT(p.nombres, ' ', p.apellido_paterno, ' ', COALESCE(p.apellido_materno, ''))) AS "autorNombre",
        c.titulo,
        c.contenido,
        c.dirigido_a AS "dirigidoA",
        c.grado_id AS "gradoId",
        g.numero AS "gradoNumero",
        c.seccion_id AS "seccionId",
        s.nombre AS "seccionNombre",
        c.prioridad,
        c.estado,
        c.adjunto_url AS "adjuntoUrl",
        c.publicado_en::TEXT AS "publicadoEn",
        c.vence_en::TEXT AS "venceEn",
        c.creado_en::TEXT AS "creadoEn",
        COALESCE(stats.total_destinatarios, 0)::INT AS "totalDestinatarios",
        COALESCE(stats.total_leidos, 0)::INT AS "totalLeidos",
        CASE 
          WHEN COALESCE(stats.total_destinatarios, 0) > 0 
          THEN ROUND((COALESCE(stats.total_leidos, 0)::NUMERIC / stats.total_destinatarios) * 100, 1)
          ELSE 0.0
        END AS "porcentajeLectura",
        FALSE AS "leidoPorMi"
      FROM comunicados c
      JOIN usuarios u ON u.id = c.autor_id
      JOIN personas p ON p.id = u.persona_id
      LEFT JOIN grados g ON g.id = c.grado_id
      LEFT JOIN secciones s ON s.id = c.seccion_id
      LEFT JOIN LATERAL (
        SELECT 
          COUNT(*)::INT AS total_destinatarios,
          COUNT(*) FILTER (WHERE n.leida)::INT AS total_leidos
        FROM notificaciones n
        WHERE n.comunicado_id = c.id
      ) stats ON TRUE
      WHERE c.id = ${id}
      LIMIT 1;
    `)) as unknown as { rows: ComunicadoItem[] };

    return result.rows?.[0] ?? null;
  }

  async esTutorDeSeccion(usuarioId: string, seccionId: string): Promise<boolean> {
    const result = (await this.db.execute(sql`
      SELECT s.id 
      FROM secciones s
      JOIN docentes d ON d.id = s.tutor_id
      JOIN usuarios u ON u.persona_id = d.persona_id
      WHERE s.id = ${seccionId} AND u.id = ${usuarioId}
      LIMIT 1;
    `)) as unknown as { rows: Array<{ id: string }> };

    return (result.rows?.length ?? 0) > 0;
  }

  async insert(data: {
    autorId: string;
    titulo: string;
    contenido: string;
    dirigidoA: DirigidoA;
    gradoId?: string | null;
    seccionId?: string | null;
    prioridad: "normal" | "importante" | "urgente";
    estado: EstadoComunicado;
    adjuntoUrl?: string | null;
    publicadoEn?: string | null;
    venceEn?: string | null;
  }): Promise<{ id: string }> {
    const [inserted] = await this.db
      .insert(comunicados)
      .values({
        autorId: data.autorId,
        titulo: data.titulo,
        contenido: data.contenido,
        dirigidoA: data.dirigidoA,
        gradoId: data.gradoId || null,
        seccionId: data.seccionId || null,
        prioridad: data.prioridad,
        estado: data.estado,
        adjuntoUrl: data.adjuntoUrl || null,
        publicadoEn: data.publicadoEn || null,
        venceEn: data.venceEn || null,
      })
      .returning({ id: comunicados.id });

    return inserted;
  }

  async updateEstado(
    id: string,
    estado: EstadoComunicado,
    publicadoEn?: string | null,
  ): Promise<void> {
    await this.db.execute(sql`
      UPDATE comunicados
      SET estado = ${estado},
          publicado_en = COALESCE(${publicadoEn}, publicado_en),
          actualizado_en = CURRENT_TIMESTAMP
      WHERE id = ${id};
    `);
  }

  async findDestinatarios(
    dirigidoA: DirigidoA,
    gradoId?: string | null,
    seccionId?: string | null,
  ): Promise<DestinatarioInfo[]> {
    const incluirEstudiantes = dirigidoA === "todos" || dirigidoA === "estudiantes";
    const incluirApoderados = dirigidoA === "todos" || dirigidoA === "apoderados";
    const incluirDocentes = dirigidoA === "todos" || dirigidoA === "docentes";

    const queries: string[] = [];

    if (incluirEstudiantes) {
      queries.push(`
        SELECT DISTINCT 
          u.id AS "usuarioId",
          TRIM(CONCAT(p.nombres, ' ', p.apellido_paterno, ' ', COALESCE(p.apellido_materno, ''))) AS "nombreCompleto",
          'estudiante'::TEXT AS tipo
        FROM matriculas m
        JOIN estudiantes e ON e.id = m.estudiante_id
        JOIN personas p ON p.id = e.persona_id
        JOIN usuarios u ON u.persona_id = p.id
        JOIN secciones s ON s.id = m.seccion_id
        WHERE m.estado IN ('matriculado', 'vigente')
          AND u.estado = 'activo'
          AND u.eliminado_en IS NULL
          ${seccionId ? `AND m.seccion_id = '${seccionId}'::UUID` : ""}
          ${gradoId ? `AND s.grado_id = '${gradoId}'::UUID` : ""}
      `);
    }

    if (incluirApoderados) {
      queries.push(`
        SELECT DISTINCT 
          u.id AS "usuarioId",
          TRIM(CONCAT(p.nombres, ' ', p.apellido_paterno, ' ', COALESCE(p.apellido_materno, ''))) AS "nombreCompleto",
          'apoderado'::TEXT AS tipo
        FROM matriculas m
        JOIN secciones s ON s.id = m.seccion_id
        JOIN estudiante_apoderados ea ON ea.estudiante_id = m.estudiante_id
        JOIN apoderados a ON a.id = ea.apoderado_id
        JOIN personas p ON p.id = a.persona_id
        JOIN usuarios u ON u.persona_id = p.id
        WHERE m.estado IN ('matriculado', 'vigente')
          AND u.estado = 'activo'
          AND u.eliminado_en IS NULL
          ${seccionId ? `AND m.seccion_id = '${seccionId}'::UUID` : ""}
          ${gradoId ? `AND s.grado_id = '${gradoId}'::UUID` : ""}
      `);
    }

    if (incluirDocentes) {
      queries.push(`
        SELECT DISTINCT 
          u.id AS "usuarioId",
          TRIM(CONCAT(p.nombres, ' ', p.apellido_paterno, ' ', COALESCE(p.apellido_materno, ''))) AS "nombreCompleto",
          'docente'::TEXT AS tipo
        FROM docentes d
        JOIN personas p ON p.id = d.persona_id
        JOIN usuarios u ON u.persona_id = p.id
        WHERE u.estado = 'activo'
          AND u.eliminado_en IS NULL
          ${
            seccionId
              ? `AND (
                  d.id IN (SELECT tutor_id FROM secciones WHERE id = '${seccionId}'::UUID AND tutor_id IS NOT NULL)
                  OR d.id IN (SELECT docente_id FROM cursos_seccion WHERE seccion_id = '${seccionId}'::UUID AND docente_id IS NOT NULL)
                )`
              : gradoId
                ? `AND d.id IN (
                  SELECT cs.docente_id 
                  FROM cursos_seccion cs 
                  JOIN secciones sec ON sec.id = cs.seccion_id 
                  WHERE sec.grado_id = '${gradoId}'::UUID
                    AND cs.docente_id IS NOT NULL
                )`
                : ""
          }
      `);
    }

    if (queries.length === 0) return [];

    const fullSql = queries.join(" UNION ");
    const result = (await this.db.execute(sql.raw(fullSql))) as unknown as {
      rows: DestinatarioInfo[];
    };

    // Deduplicación por usuarioId
    const map = new Map<string, DestinatarioInfo>();
    for (const row of result.rows ?? []) {
      if (!map.has(row.usuarioId)) {
        map.set(row.usuarioId, row);
      }
    }

    return Array.from(map.values());
  }

  registrarNotificacionesComunicado(
    _comunicadoId: string,
    _titulo: string,
    _mensaje: string,
    _tipo: "informacion" | "alerta" | "recordatorio",
    destinatarioUserIds: string[],
  ): Promise<number> {
    // La inserción y el encolado por canal los realiza NotificacionesService.enviar
    // para evitar duplicar filas in_app en la tabla notificaciones.
    return Promise.resolve(destinatarioUserIds.length);
  }

  async marcarLectura(comunicadoId: string, usuarioId: string): Promise<boolean> {
    const result = (await this.db.execute(sql`
      UPDATE notificaciones
      SET leida = TRUE,
          leida_en = CURRENT_TIMESTAMP
      WHERE comunicado_id = ${comunicadoId}
        AND usuario_id = ${usuarioId}
        AND NOT leida;
    `)) as unknown as { rowCount?: number };

    return (result.rowCount ?? 0) > 0;
  }

  async obtenerAvanceLectura(comunicadoId: string): Promise<AvanceLecturaResponse | null> {
    const comResult = await this.findById(comunicadoId);
    if (!comResult) return null;

    const result = (await this.db.execute(sql`
      SELECT 
        n.usuario_id AS "usuarioId",
        TRIM(CONCAT(p.nombres, ' ', p.apellido_paterno, ' ', COALESCE(p.apellido_materno, ''))) AS "nombreCompleto",
        CASE 
          WHEN EXISTS (SELECT 1 FROM docentes d WHERE d.persona_id = p.id) THEN 'docente'
          WHEN EXISTS (SELECT 1 FROM apoderados a WHERE a.persona_id = p.id) THEN 'apoderado'
          ELSE 'estudiante'
        END AS "tipoDestinatario",
        n.leida AS leido,
        n.leida_en::TEXT AS "leidoEn"
      FROM notificaciones n
      JOIN usuarios u ON u.id = n.usuario_id
      JOIN personas p ON p.id = u.persona_id
      WHERE n.comunicado_id = ${comunicadoId}
      ORDER BY n.leida DESC, p.apellido_paterno ASC, p.nombres ASC;
    `)) as unknown as { rows: DestinatarioLecturaItem[] };

    const destinatarios = result.rows ?? [];
    const totalLeidos = destinatarios.filter((d) => d.leido).length;
    const totalDestinatarios = destinatarios.length;
    const porcentajeLectura =
      totalDestinatarios > 0 ? Math.round((totalLeidos / totalDestinatarios) * 1000) / 10 : 0;

    return {
      comunicadoId,
      titulo: comResult.titulo,
      totalDestinatarios,
      totalLeidos,
      porcentajeLectura,
      destinatarios,
    };
  }
}
