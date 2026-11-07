import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  aniosAcademicos,
  cursosSeccion,
  docentes,
  periodosAcademicos,
  roles,
  secciones,
  usuarioRoles,
  usuarios,
} from "../../../core/database/schema";
import { EstadoAnio, EstadoBimestre } from "../constants";
import {
  ActualizarAnioData,
  AnioPersistido,
  BimestrePersistido,
  CrearAnioData,
  IAniosAcademicosRepository,
} from "../interfaces";

type AnioRow = typeof aniosAcademicos.$inferSelect;
type PeriodoRow = typeof periodosAcademicos.$inferSelect;

@Injectable()
export class AniosAcademicosRepository implements IAniosAcademicosRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAll(): Promise<AnioPersistido[]> {
    const anios = await this.db.select().from(aniosAcademicos).orderBy(desc(aniosAcademicos.anio));
    return this.conBimestres(anios);
  }

  async findById(id: string): Promise<AnioPersistido | null> {
    const [anio] = await this.db
      .select()
      .from(aniosAcademicos)
      .where(eq(aniosAcademicos.id, id))
      .limit(1);
    if (!anio) return null;
    const [completo] = await this.conBimestres([anio]);
    return completo;
  }

  async findByAnio(anio: number): Promise<AnioPersistido | null> {
    const [row] = await this.db
      .select()
      .from(aniosAcademicos)
      .where(eq(aniosAcademicos.anio, anio))
      .limit(1);
    if (!row) return null;
    const [completo] = await this.conBimestres([row]);
    return completo;
  }

  async findEnCurso(): Promise<AnioPersistido | null> {
    return this.findPorEstado("en_curso");
  }

  async findReabierto(): Promise<AnioPersistido | null> {
    return this.findPorEstado("reabierto");
  }

  async create(data: CrearAnioData): Promise<AnioPersistido> {
    return this.db.transaction(async (tx) => {
      const [anio] = await tx
        .insert(aniosAcademicos)
        .values({
          anio: data.anio,
          nombre: data.nombre,
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
          estado: "planificado",
        })
        .returning();

      if (data.bimestres.length > 0) {
        await tx.insert(periodosAcademicos).values(
          data.bimestres.map((bimestre) => ({
            anioAcademicoId: anio.id,
            numero: bimestre.numero,
            nombre: bimestre.nombre,
            tipo: "bimestre",
            fechaInicio: bimestre.fechaInicio,
            fechaFin: bimestre.fechaFin,
            estado: "planificado",
          })),
        );
      }

      const periodos = await tx
        .select()
        .from(periodosAcademicos)
        .where(eq(periodosAcademicos.anioAcademicoId, anio.id))
        .orderBy(asc(periodosAcademicos.numero));

      return this.mapAnio(anio, periodos);
    });
  }

  async update(id: string, data: ActualizarAnioData): Promise<AnioPersistido> {
    const [anio] = await this.db
      .update(aniosAcademicos)
      .set({
        ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
        ...(data.fechaInicio !== undefined ? { fechaInicio: data.fechaInicio } : {}),
        ...(data.fechaFin !== undefined ? { fechaFin: data.fechaFin } : {}),
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(aniosAcademicos.id, id))
      .returning();

    const [completo] = await this.conBimestres([anio]);
    return completo;
  }

  async guardarBimestres(
    anioId: string,
    bimestres: { numero: number; nombre: string; fechaInicio: string; fechaFin: string }[],
  ): Promise<AnioPersistido> {
    await this.db.transaction(async (tx) => {
      const actuales = await tx
        .select()
        .from(periodosAcademicos)
        .where(eq(periodosAcademicos.anioAcademicoId, anioId));

      const porNumero = new Map(actuales.map((row) => [row.numero, row]));

      for (const bimestre of bimestres) {
        const existente = porNumero.get(bimestre.numero);
        if (existente) {
          await tx
            .update(periodosAcademicos)
            .set({
              nombre: bimestre.nombre,
              tipo: "bimestre",
              fechaInicio: bimestre.fechaInicio,
              fechaFin: bimestre.fechaFin,
              actualizadoEn: sql`CURRENT_TIMESTAMP`,
            })
            .where(eq(periodosAcademicos.id, existente.id));
        } else {
          await tx.insert(periodosAcademicos).values({
            anioAcademicoId: anioId,
            numero: bimestre.numero,
            nombre: bimestre.nombre,
            tipo: "bimestre",
            fechaInicio: bimestre.fechaInicio,
            fechaFin: bimestre.fechaFin,
            estado: "planificado",
          });
        }
      }
    });

    const anio = await this.findById(anioId);
    if (!anio) {
      throw new Error("El año escolar no existe después de guardar los bimestres.");
    }
    return anio;
  }

  async cambiarEstadoAnio(
    id: string,
    estado: EstadoAnio,
    reapertura?: { motivo: string | null; hasta: string | null },
  ): Promise<AnioPersistido> {
    const [anio] = await this.db
      .update(aniosAcademicos)
      .set({
        estado,
        ...(reapertura
          ? { motivoReapertura: reapertura.motivo, reabiertoHasta: reapertura.hasta }
          : {}),
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(aniosAcademicos.id, id))
      .returning();

    const [completo] = await this.conBimestres([anio]);
    return completo;
  }

  async findBimestre(anioId: string, bimestreId: string): Promise<BimestrePersistido | null> {
    const [row] = await this.db
      .select()
      .from(periodosAcademicos)
      .where(
        and(eq(periodosAcademicos.id, bimestreId), eq(periodosAcademicos.anioAcademicoId, anioId)),
      )
      .limit(1);
    return row ? this.mapBimestre(row) : null;
  }

  async cambiarEstadoBimestre(id: string, estado: EstadoBimestre): Promise<BimestrePersistido> {
    const [row] = await this.db
      .update(periodosAcademicos)
      .set({ estado, actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(periodosAcademicos.id, id))
      .returning();
    return this.mapBimestre(row);
  }

  async hayOtroBimestreEnCurso(anioId: string, exceptoId?: string): Promise<boolean> {
    const condiciones = [
      eq(periodosAcademicos.anioAcademicoId, anioId),
      eq(periodosAcademicos.estado, "en_curso"),
    ];
    if (exceptoId) {
      condiciones.push(ne(periodosAcademicos.id, exceptoId));
    }
    const [row] = await this.db
      .select({ id: periodosAcademicos.id })
      .from(periodosAcademicos)
      .where(and(...condiciones))
      .limit(1);
    return Boolean(row);
  }

  async bimestreCerradoEn(fecha: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: periodosAcademicos.id })
      .from(periodosAcademicos)
      .where(
        and(
          eq(periodosAcademicos.estado, "cerrado"),
          sql`${periodosAcademicos.fechaInicio} <= ${fecha}`,
          sql`${periodosAcademicos.fechaFin} >= ${fecha}`,
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  async cerrarReaperturasVencidas(hoy: string): Promise<AnioPersistido[]> {
    const vencidos = await this.db
      .select()
      .from(aniosAcademicos)
      .where(
        and(
          eq(aniosAcademicos.estado, "reabierto"),
          sql`(${aniosAcademicos.reabiertoHasta})::date < ${hoy}::date`,
        ),
      );

    if (vencidos.length === 0) return [];

    await this.db
      .update(aniosAcademicos)
      .set({
        estado: "cerrado",
        reabiertoHasta: null,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        inArray(
          aniosAcademicos.id,
          vencidos.map((row) => row.id),
        ),
      );

    return this.conBimestres(
      vencidos.map((row) => ({ ...row, estado: "cerrado", reabiertoHasta: null })),
    );
  }

  async findDocentesUsuariosConCarga(anioAcademicoId: string): Promise<string[]> {
    const filas = await this.db
      .selectDistinct({ usuarioId: usuarios.id })
      .from(cursosSeccion)
      .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
      .innerJoin(docentes, eq(docentes.id, cursosSeccion.docenteId))
      .innerJoin(usuarios, eq(usuarios.personaId, docentes.personaId))
      .where(
        and(
          eq(secciones.anioAcademicoId, anioAcademicoId),
          eq(secciones.estado, "activa"),
          eq(usuarios.estado, "activo"),
        ),
      );
    return filas.map((f) => f.usuarioId);
  }

  async findDirectivosUsuarios(): Promise<string[]> {
    const filas = await this.db
      .selectDistinct({ usuarioId: usuarios.id })
      .from(usuarios)
      .innerJoin(usuarioRoles, eq(usuarioRoles.usuarioId, usuarios.id))
      .innerJoin(roles, eq(roles.id, usuarioRoles.rolId))
      .where(
        and(
          inArray(roles.nombre, ["Director", "Subdirector", "Administrador"]),
          eq(usuarios.estado, "activo"),
          eq(usuarioRoles.vigente, true),
        ),
      );
    return filas.map((f) => f.usuarioId);
  }

  private async findPorEstado(estado: EstadoAnio): Promise<AnioPersistido | null> {
    const [row] = await this.db
      .select()
      .from(aniosAcademicos)
      .where(eq(aniosAcademicos.estado, estado))
      .limit(1);
    if (!row) return null;
    const [completo] = await this.conBimestres([row]);
    return completo;
  }

  private async conBimestres(anios: AnioRow[]): Promise<AnioPersistido[]> {
    if (anios.length === 0) return [];
    const periodos = await this.db
      .select()
      .from(periodosAcademicos)
      .where(
        inArray(
          periodosAcademicos.anioAcademicoId,
          anios.map((anio) => anio.id),
        ),
      )
      .orderBy(asc(periodosAcademicos.numero));

    const porAnio = new Map<string, PeriodoRow[]>();
    for (const periodo of periodos) {
      const lista = porAnio.get(periodo.anioAcademicoId) ?? [];
      lista.push(periodo);
      porAnio.set(periodo.anioAcademicoId, lista);
    }

    return anios.map((anio) => this.mapAnio(anio, porAnio.get(anio.id) ?? []));
  }

  private mapAnio(anio: AnioRow, periodos: PeriodoRow[]): AnioPersistido {
    return {
      id: anio.id,
      anio: anio.anio,
      nombre: anio.nombre,
      fechaInicio: anio.fechaInicio,
      fechaFin: anio.fechaFin,
      estado: anio.estado as EstadoAnio,
      reabiertoHasta: anio.reabiertoHasta,
      motivoReapertura: anio.motivoReapertura,
      bimestres: periodos.map((periodo) => this.mapBimestre(periodo)),
    };
  }

  private mapBimestre(periodo: PeriodoRow): BimestrePersistido {
    return {
      id: periodo.id,
      anioAcademicoId: periodo.anioAcademicoId,
      numero: periodo.numero,
      nombre: periodo.nombre,
      fechaInicio: periodo.fechaInicio,
      fechaFin: periodo.fechaFin,
      estado: periodo.estado as EstadoBimestre,
    };
  }
}
