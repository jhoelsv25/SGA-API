import { Inject, Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { actividadAula } from "../../../core/database/schema";
import type { AccionActividadAula } from "../constants";
import type { ActividadEstudianteMaterial, ActividadEstudianteTarea } from "../interfaces";
import { AulaAccesoRepository } from "./aula-acceso.repository";
import { AulaEntregasRepository } from "./aula-entregas.repository";

/**
 * Repositorio especializado en el registro y trazabilidad de actividad
 * de estudiantes sobre materiales y tareas (RF-017).
 */
@Injectable()
export class AulaActividadRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly accesoRepo: AulaAccesoRepository,
    private readonly entregasRepo: AulaEntregasRepository,
  ) {}

  async registrarActividad(datos: {
    matriculaId: string;
    materialId?: string | null;
    tareaId?: string | null;
    accion: AccionActividadAula;
  }): Promise<void> {
    await this.db.insert(actividadAula).values({
      matriculaId: datos.matriculaId,
      materialId: datos.materialId ?? null,
      tareaId: datos.tareaId ?? null,
      accion: datos.accion,
    });
  }

  private async obtenerRegistrosPorCurso(cursoSeccionId: string, condicion: ReturnType<typeof eq>) {
    const curso = await this.accesoRepo.findCurso(cursoSeccionId);
    if (!curso) return null;

    const [estudiantesSeccion, registros] = await Promise.all([
      this.entregasRepo.listarEstudiantesDeSeccion(curso.seccionId),
      this.db
        .select({
          matriculaId: actividadAula.matriculaId,
          accion: actividadAula.accion,
          registradoEn: sql<string>`${actividadAula.registradoEn}::text`,
        })
        .from(actividadAula)
        .where(condicion),
    ]);

    return { estudiantesSeccion, registros };
  }

  async obtenerActividadMaterial(
    materialId: string,
    cursoSeccionId: string,
  ): Promise<ActividadEstudianteMaterial[]> {
    const datos = await this.obtenerRegistrosPorCurso(
      cursoSeccionId,
      eq(actividadAula.materialId, materialId),
    );
    if (!datos) return [];

    const mapaPorMatricula = new Map<
      string,
      {
        visualizo: boolean;
        visualizoEn: string | null;
        descargo: boolean;
        descargoEn: string | null;
      }
    >();

    for (const r of datos.registros) {
      const item = mapaPorMatricula.get(r.matriculaId) ?? {
        visualizo: false,
        visualizoEn: null,
        descargo: false,
        descargoEn: null,
      };
      if (r.accion === "visualizo") {
        item.visualizo = true;
        if (!item.visualizoEn || r.registradoEn < item.visualizoEn) {
          item.visualizoEn = r.registradoEn;
        }
      } else if (r.accion === "descargo") {
        item.descargo = true;
        if (!item.descargoEn || r.registradoEn < item.descargoEn) {
          item.descargoEn = r.registradoEn;
        }
      }
      mapaPorMatricula.set(r.matriculaId, item);
    }

    return datos.estudiantesSeccion.map((e) => {
      const act = mapaPorMatricula.get(e.matriculaId) ?? {
        visualizo: false,
        visualizoEn: null,
        descargo: false,
        descargoEn: null,
      };
      return {
        matriculaId: e.matriculaId,
        estudianteId: e.estudianteId,
        codigo: e.codigo,
        nombreCompleto: e.nombreCompleto,
        visualizo: act.visualizo,
        visualizoEn: act.visualizoEn,
        descargo: act.descargo,
        descargoEn: act.descargoEn,
      };
    });
  }

  async obtenerActividadTarea(
    tareaId: string,
    cursoSeccionId: string,
  ): Promise<ActividadEstudianteTarea[]> {
    const datos = await this.obtenerRegistrosPorCurso(
      cursoSeccionId,
      eq(actividadAula.tareaId, tareaId),
    );
    if (!datos) return [];

    const mapaPorMatricula = new Map<
      string,
      { abrio: boolean; abrioEn: string | null; completo: boolean; completoEn: string | null }
    >();

    for (const r of datos.registros) {
      const item = mapaPorMatricula.get(r.matriculaId) ?? {
        abrio: false,
        abrioEn: null,
        completo: false,
        completoEn: null,
      };
      if (r.accion === "abrio") {
        item.abrio = true;
        if (!item.abrioEn || r.registradoEn < item.abrioEn) {
          item.abrioEn = r.registradoEn;
        }
      } else if (r.accion === "completo") {
        item.completo = true;
        if (!item.completoEn || r.registradoEn < item.completoEn) {
          item.completoEn = r.registradoEn;
        }
      }
      mapaPorMatricula.set(r.matriculaId, item);
    }

    return datos.estudiantesSeccion.map((e) => {
      const act = mapaPorMatricula.get(e.matriculaId) ?? {
        abrio: false,
        abrioEn: null,
        completo: false,
        completoEn: null,
      };
      return {
        matriculaId: e.matriculaId,
        estudianteId: e.estudianteId,
        codigo: e.codigo,
        nombreCompleto: e.nombreCompleto,
        abrio: act.abrio,
        abrioEn: act.abrioEn,
        completo: act.completo,
        completoEn: act.completoEn,
      };
    });
  }
}
