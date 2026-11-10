import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  alertasSesionEnviadas,
  compromisosConsolidado,
  consolidadosDocente,
  docentes,
  personas,
  roles,
  usuarioRoles,
  usuarios,
} from "../../../core/database/schema";
import type { EstadoCompromiso, ResultadoCompromiso } from "../constants";
import type { CompromisoItem } from "../interfaces";

const campos = {
  id: compromisosConsolidado.id,
  compromisoId: compromisosConsolidado.compromisoId,
  consolidadoId: compromisosConsolidado.consolidadoId,
  consolidadoVersion: consolidadosDocente.version,
  docenteId: compromisosConsolidado.docenteId,
  docenteNombre: sql<string>`concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno})`,
  docenteApellido: personas.apellidoPaterno,
  periodoId: consolidadosDocente.periodoId,
  version: compromisosConsolidado.version,
  vigente: compromisosConsolidado.vigente,
  descripcion: compromisosConsolidado.descripcion,
  fechaRevision: sql<string>`${compromisosConsolidado.fechaRevision}::text`,
  estado: sql<EstadoCompromiso>`${compromisosConsolidado.estado}`,
  observacionCierre: compromisosConsolidado.observacionCierre,
  cerradoEn: sql<string | null>`${compromisosConsolidado.cerradoEn}::text`,
  enteradoEn: sql<string | null>`${compromisosConsolidado.enteradoEn}::text`,
  anulado: compromisosConsolidado.anulado,
  motivoAnulacion: compromisosConsolidado.motivoAnulacion,
  anuladoEn: sql<string | null>`${compromisosConsolidado.anuladoEn}::text`,
  creadoPorId: compromisosConsolidado.creadoPorId,
  creadoEn: sql<string>`${compromisosConsolidado.creadoEn}::text`,
};

export type FilaCompromiso = Omit<CompromisoItem, "vencido"> & {
  docenteApellido: string;
  periodoId: string;
};

@Injectable()
export class CompromisosConsolidadoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private consulta() {
    return this.db
      .select(campos)
      .from(compromisosConsolidado)
      .innerJoin(
        consolidadosDocente,
        eq(consolidadosDocente.id, compromisosConsolidado.consolidadoId),
      )
      .innerJoin(docentes, eq(docentes.id, compromisosConsolidado.docenteId))
      .innerJoin(personas, eq(personas.id, docentes.personaId));
  }

  async crear(datos: {
    consolidadoId: string;
    docenteId: string;
    descripcion: string;
    fechaRevision: string;
    creadoPorId: string;
  }): Promise<FilaCompromiso> {
    const id = randomUUID();
    await this.db.insert(compromisosConsolidado).values({
      id,
      compromisoId: id,
      consolidadoId: datos.consolidadoId,
      docenteId: datos.docenteId,
      descripcion: datos.descripcion,
      fechaRevision: datos.fechaRevision,
      creadoPorId: datos.creadoPorId,
    });
    return (await this.obtenerPorFila(id)) as FilaCompromiso;
  }

  async obtenerPorFila(id: string): Promise<FilaCompromiso | null> {
    const [fila] = await this.consulta().where(eq(compromisosConsolidado.id, id)).limit(1);
    return fila ?? null;
  }

  /** Versión vigente de un compromiso. */
  async obtenerVigente(compromisoId: string): Promise<FilaCompromiso | null> {
    const [fila] = await this.consulta()
      .where(
        and(
          eq(compromisosConsolidado.compromisoId, compromisoId),
          eq(compromisosConsolidado.vigente, true),
        ),
      )
      .limit(1);
    return fila ?? null;
  }

  async historial(compromisoId: string): Promise<FilaCompromiso[]> {
    return await this.consulta()
      .where(eq(compromisosConsolidado.compromisoId, compromisoId))
      .orderBy(desc(compromisosConsolidado.version));
  }

  /** Compromisos vigentes del docente en el bimestre del consolidado (incluye anulados y cerrados). */
  async listarVigentesDelConsolidado(
    docenteId: string,
    periodoId: string,
  ): Promise<FilaCompromiso[]> {
    return await this.consulta()
      .where(
        and(
          eq(compromisosConsolidado.docenteId, docenteId),
          eq(consolidadosDocente.periodoId, periodoId),
          eq(compromisosConsolidado.vigente, true),
        ),
      )
      .orderBy(asc(compromisosConsolidado.fechaRevision), asc(compromisosConsolidado.creadoEn));
  }

  async cerrar(
    id: string,
    resultado: ResultadoCompromiso,
    observacion: string,
    usuarioId: string,
  ): Promise<void> {
    await this.db
      .update(compromisosConsolidado)
      .set({
        estado: resultado,
        observacionCierre: observacion,
        cerradoPorId: usuarioId,
        cerradoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(compromisosConsolidado.id, id));
  }

  async anular(id: string, motivo: string, usuarioId: string): Promise<void> {
    await this.db
      .update(compromisosConsolidado)
      .set({
        anulado: true,
        motivoAnulacion: motivo,
        anuladoPorId: usuarioId,
        anuladoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(compromisosConsolidado.id, id));
  }

  /** Guarda la primera fecha y hora del acuse; un segundo «enterado» no la cambia. */
  async marcarEnterado(id: string): Promise<void> {
    await this.db
      .update(compromisosConsolidado)
      .set({ enteradoEn: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(compromisosConsolidado.id, id), isNull(compromisosConsolidado.enteradoEn)));
  }

  /** Crea la versión nueva y deja la anterior con vigencia 0. El acuse del docente empieza de nuevo. */
  async reprogramar(
    vigente: FilaCompromiso,
    cambios: { fechaRevision: string; descripcion: string },
    usuarioId: string,
  ): Promise<string> {
    return await this.db.transaction(async (tx) => {
      await tx
        .update(compromisosConsolidado)
        .set({ vigente: false })
        .where(eq(compromisosConsolidado.id, vigente.id));
      const [nueva] = await tx
        .insert(compromisosConsolidado)
        .values({
          compromisoId: vigente.compromisoId,
          consolidadoId: vigente.consolidadoId,
          docenteId: vigente.docenteId,
          version: vigente.version + 1,
          descripcion: cambios.descripcion,
          fechaRevision: cambios.fechaRevision,
          creadoPorId: usuarioId,
        })
        .returning({ id: compromisosConsolidado.id });
      return nueva.id;
    });
  }

  /** Compromisos pendientes cuya fecha de revisión es la indicada. */
  async pendientesDeRevisarEl(fecha: string): Promise<FilaCompromiso[]> {
    return await this.consulta().where(
      and(
        eq(compromisosConsolidado.vigente, true),
        eq(compromisosConsolidado.anulado, false),
        eq(compromisosConsolidado.estado, "pendiente"),
        sql`${compromisosConsolidado.fechaRevision} = ${fecha}`,
      ),
    );
  }

  async usuarioDeDocente(docenteId: string): Promise<string | null> {
    const [fila] = await this.db
      .select({ id: usuarios.id })
      .from(docentes)
      .innerJoin(usuarios, eq(usuarios.personaId, docentes.personaId))
      .where(and(eq(docentes.id, docenteId), eq(usuarios.estado, "activo")))
      .limit(1);
    return fila?.id ?? null;
  }

  async usuarioActivo(usuarioId: string): Promise<boolean> {
    const [fila] = await this.db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(
        and(
          eq(usuarios.id, usuarioId),
          eq(usuarios.estado, "activo"),
          isNull(usuarios.eliminadoEn),
        ),
      )
      .limit(1);
    return Boolean(fila);
  }

  async usuariosConRol(nombresRol: readonly string[]): Promise<string[]> {
    const filas = await this.db
      .selectDistinct({ id: usuarios.id })
      .from(usuarios)
      .innerJoin(usuarioRoles, eq(usuarioRoles.usuarioId, usuarios.id))
      .innerJoin(roles, eq(roles.id, usuarioRoles.rolId))
      .where(
        and(
          inArray(roles.nombre, [...nombresRol]),
          eq(usuarioRoles.vigente, true),
          isNull(usuarios.eliminadoEn),
          eq(usuarios.estado, "activo"),
        ),
      );
    return filas.map((f) => f.id);
  }

  /** true si la alerta no estaba registrada (se debe enviar); false si ya se había enviado. */
  async registrarAlertaEnviada(clave: string): Promise<boolean> {
    const filas = await this.db
      .insert(alertasSesionEnviadas)
      .values({ clave })
      .onConflictDoNothing()
      .returning({ clave: alertasSesionEnviadas.clave });
    return filas.length === 1;
  }
}
