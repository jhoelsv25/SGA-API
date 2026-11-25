import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gte, isNotNull, lte, ne, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  alertasSesionEnviadas,
  aniosAcademicos,
  calendarioEventos,
  docentes,
  sesionesClase,
} from "../../../core/database/schema";
import type { EstadoJustificacion } from "../constants";
import type { SesionResponseDto } from "../dto";
import type { DatosSolicitudJustificacion, MinutosPerdidosDocente } from "../interfaces";
import {
  consultaBaseSesiones,
  mapearSesionDto,
  nombreSql,
  personaDocente,
} from "./sesiones-shared.helper";

/**
 * Repositorio especializado en justificaciones, días sin clases,
 * topes de permiso personal, alertas enviadas y minutos perdidos.
 */
@Injectable()
export class SesionesJustificacionesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async solicitarJustificacion(id: string, datos: DatosSolicitudJustificacion): Promise<void> {
    await this.db
      .update(sesionesClase)
      .set({
        justificacionEstado: "solicitada",
        justificacion: datos.motivo,
        justificacionMotivoCodigo: datos.motivoCodigo,
        justificacionDocumentoUrl: datos.documentoUrl,
        justificacionSolicitadaEn: sql`CURRENT_TIMESTAMP`,
        justificacionComentario: null,
        justificacionRevisadaEn: null,
        justificacionRevisadaPorId: null,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(sesionesClase.id, id));
  }

  async resolverJustificacion(
    id: string,
    estado: Extract<EstadoJustificacion, "aprobada" | "rechazada">,
    usuarioId: string,
    comentario: string | null,
  ): Promise<void> {
    await this.db
      .update(sesionesClase)
      .set({
        justificacionEstado: estado,
        justificacionComentario: comentario,
        justificacionRevisadaPorId: usuarioId,
        justificacionRevisadaEn: sql`CURRENT_TIMESTAMP`,
        ...(estado === "aprobada" ? { estado: "justificada" } : {}),
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(sesionesClase.id, id), eq(sesionesClase.justificacionEstado, "solicitada")));
  }

  async justificacionesPorEstado(estado: EstadoJustificacion): Promise<SesionResponseDto[]> {
    const filas = await consultaBaseSesiones(this.db)
      .where(
        and(eq(sesionesClase.justificacionEstado, estado), isNotNull(sesionesClase.justificacion)),
      )
      .orderBy(desc(sesionesClase.justificacionSolicitadaEn));
    return filas.map(mapearSesionDto);
  }

  async minutosPerdidosPorDocente(desde: string, hasta: string): Promise<MinutosPerdidosDocente[]> {
    const filas = await this.db
      .select({
        docenteId: sesionesClase.docenteId,
        docenteNombre: nombreSql(personaDocente),
        minutos: sql<number>`COALESCE(SUM(${sesionesClase.minutosPerdidos}), 0)::int`,
      })
      .from(sesionesClase)
      .innerJoin(docentes, eq(docentes.id, sesionesClase.docenteId))
      .innerJoin(personaDocente, eq(personaDocente.id, docentes.personaId))
      .where(
        and(
          gte(sesionesClase.fecha, desde),
          lte(sesionesClase.fecha, hasta),
          ne(sesionesClase.estado, "justificada"),
        ),
      )
      .groupBy(
        sesionesClase.docenteId,
        personaDocente.apellidoPaterno,
        personaDocente.apellidoMaterno,
        personaDocente.nombres,
      );
    return filas.map((f) => ({ ...f, minutos: Number(f.minutos) }));
  }

  async registrarAlertaEnviada(clave: string): Promise<boolean> {
    const filas = await this.db
      .insert(alertasSesionEnviadas)
      .values({ clave })
      .onConflictDoNothing()
      .returning({ clave: alertasSesionEnviadas.clave });
    return filas.length === 1;
  }

  async diasSinClases(desde: string, hasta: string): Promise<string[]> {
    const filas = await this.db
      .select({ dia: sql<string>`to_char(d.dia, 'YYYY-MM-DD')` })
      .from(calendarioEventos)
      .innerJoin(
        sql`LATERAL generate_series(
              GREATEST(${calendarioEventos.fechaInicio}, ${desde}::date),
              LEAST(${calendarioEventos.fechaFin}, ${hasta}::date),
              interval '1 day'
            ) AS d(dia)`,
        sql`true`,
      )
      .where(
        and(
          eq(calendarioEventos.suspendeClases, true),
          lte(calendarioEventos.fechaInicio, hasta),
          gte(calendarioEventos.fechaFin, desde),
        ),
      );
    return [...new Set(filas.map((f) => f.dia))];
  }

  async diasPermisoPersonal(docenteId: string, fecha: string): Promise<string[]> {
    const filas = await this.db
      .selectDistinct({ fecha: sesionesClase.fecha })
      .from(sesionesClase)
      .innerJoin(
        aniosAcademicos,
        and(
          lte(aniosAcademicos.fechaInicio, fecha),
          gte(aniosAcademicos.fechaFin, fecha),
          lte(aniosAcademicos.fechaInicio, sesionesClase.fecha),
          gte(aniosAcademicos.fechaFin, sesionesClase.fecha),
        ),
      )
      .where(
        and(
          eq(sesionesClase.docenteId, docenteId),
          eq(sesionesClase.estado, "justificada"),
          eq(sesionesClase.justificacionMotivoCodigo, "permiso_personal"),
        ),
      );
    return filas.map((f) => f.fecha);
  }
}
