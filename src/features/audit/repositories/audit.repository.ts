import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, gte, ilike, isNull, lte, or, type SQL } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { bitacoraAuditoria, usuarios } from "../../../core/database/schema";
import {
  AuditRecord,
  FindAuditFilters,
  IAuditRepository,
} from "../interfaces/audit.repository.interface";

const MODULE_TABLES_MAP: Record<string, string[]> = {
  seguridad: ["usuarios", "roles", "rol_permisos", "bitacora", "sesiones_usuario"],
  academico: [
    "cursos",
    "areas_curriculares",
    "secciones",
    "aulas",
    "horarios_seccion",
    "horas_pedagogicas",
  ],
  matricula: [
    "personas",
    "estudiantes",
    "apoderados",
    "docentes",
    "matriculas",
    "traslados",
    "responsables",
  ],
  asistencia: ["asistencias", "marcaciones_kiosko", "justificaciones"],
  "seguimiento-docente": ["sesiones_clase", "temas_sesion", "evaluaciones", "calificaciones"],
  libretas: ["libretas", "libretas_bimestrales", "meritos_academicos"],
  "aula-virtual": ["unidades_didacticas", "tareas_virtuales", "entregas_tarea", "materiales"],
  comunicacion: ["comunicados", "destinatarios_comunicado", "incidencias_convivencia"],
  configuracion: [
    "institucion",
    "turnos",
    "anios_lectivos",
    "bimestres",
    "dispositivos_kiosko",
    "configuracion_sistema",
  ],
};

@Injectable()
export class AuditRepository implements IAuditRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAll(filters: FindAuditFilters): Promise<{ data: AuditRecord[]; total: number }> {
    const conditions: SQL[] = [
      gte(bitacoraAuditoria.registradoEn, filters.startDate),
      lte(bitacoraAuditoria.registradoEn, filters.endDate),
    ];

    if (filters.usuario && filters.usuario.trim() !== "") {
      const trimmedUser = filters.usuario.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trimmedUser,
      );

      if (trimmedUser.toLowerCase() === "sistema") {
        conditions.push(isNull(bitacoraAuditoria.usuarioId));
      } else if (isUuid) {
        conditions.push(eq(bitacoraAuditoria.usuarioId, trimmedUser));
      } else {
        conditions.push(ilike(usuarios.nombreUsuario, `%${trimmedUser}%`));
      }
    }

    if (filters.accion && filters.accion.trim() !== "") {
      conditions.push(eq(bitacoraAuditoria.accion, filters.accion.trim()));
    }

    if (filters.entidad && filters.entidad.trim() !== "") {
      const trimmed = filters.entidad.trim().toLowerCase();
      const mappedTables = MODULE_TABLES_MAP[trimmed];
      if (mappedTables && mappedTables.length > 0) {
        conditions.push(
          or(
            ilike(bitacoraAuditoria.tabla, `%${trimmed}%`),
            ...mappedTables.map((t) => ilike(bitacoraAuditoria.tabla, `%${t}%`)),
          )!,
        );
      } else {
        conditions.push(ilike(bitacoraAuditoria.tabla, `%${trimmed}%`));
      }
    }

    const whereClause = and(...conditions);

    const [totalResult] = await this.db
      .select({ totalCount: count() })
      .from(bitacoraAuditoria)
      .leftJoin(usuarios, eq(bitacoraAuditoria.usuarioId, usuarios.id))
      .where(whereClause);

    const total = Number(totalResult?.totalCount ?? 0);

    const rows = await this.db
      .select({
        id: bitacoraAuditoria.id,
        usuarioId: bitacoraAuditoria.usuarioId,
        usuarioNombre: usuarios.nombreUsuario,
        accion: bitacoraAuditoria.accion,
        tabla: bitacoraAuditoria.tabla,
        registroId: bitacoraAuditoria.registroId,
        valorAnterior: bitacoraAuditoria.valorAnterior,
        valorNuevo: bitacoraAuditoria.valorNuevo,
        direccionIp: bitacoraAuditoria.direccionIp,
        registradoEn: bitacoraAuditoria.registradoEn,
      })
      .from(bitacoraAuditoria)
      .leftJoin(usuarios, eq(bitacoraAuditoria.usuarioId, usuarios.id))
      .where(whereClause)
      .orderBy(desc(bitacoraAuditoria.registradoEn), desc(bitacoraAuditoria.id))
      .limit(filters.limit)
      .offset(filters.offset);

    const data: AuditRecord[] = rows.map((r) => ({
      ...r,
      valorAnterior: r.valorAnterior as Record<string, unknown> | null,
      valorNuevo: r.valorNuevo as Record<string, unknown> | null,
    }));

    return {
      data,
      total,
    };
  }

  async findById(id: number): Promise<AuditRecord | null> {
    const [row] = await this.db
      .select({
        id: bitacoraAuditoria.id,
        usuarioId: bitacoraAuditoria.usuarioId,
        usuarioNombre: usuarios.nombreUsuario,
        accion: bitacoraAuditoria.accion,
        tabla: bitacoraAuditoria.tabla,
        registroId: bitacoraAuditoria.registroId,
        valorAnterior: bitacoraAuditoria.valorAnterior,
        valorNuevo: bitacoraAuditoria.valorNuevo,
        direccionIp: bitacoraAuditoria.direccionIp,
        registradoEn: bitacoraAuditoria.registradoEn,
      })
      .from(bitacoraAuditoria)
      .leftJoin(usuarios, eq(bitacoraAuditoria.usuarioId, usuarios.id))
      .where(eq(bitacoraAuditoria.id, id))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      ...row,
      valorAnterior: row.valorAnterior as Record<string, unknown> | null,
      valorNuevo: row.valorNuevo as Record<string, unknown> | null,
    };
  }
}
