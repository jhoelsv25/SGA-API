import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "@/core/database";
import {
  aniosAcademicos,
  apoderados,
  cursosSeccion,
  docentes,
  estudianteApoderados,
  estudiantes,
  grados,
  libretaAlcances,
  libretaArchivos,
  libretas,
  matriculas,
  periodosAcademicos,
  personas,
  roles,
  secciones,
  usuarios,
} from "@/core/database/schema";
import { MENSAJES_LIBRETAS } from "../constants";
import type {
  AlcanceLibreta,
  AlcanceRolRow,
  CodigoOtraSeccionRow,
  DetalleLibretaRow,
  EstadoLibreta,
  HistorialArchivoRow,
  LibretaAperturaRow,
  LibretaSeccionRow,
  MiLibretaRow,
  PeriodoLibretaRow,
  PublicacionPersistida,
  SeccionResumenRow,
  SeguimientoSeccionRow,
} from "../interfaces";

function nombrePersona(nombres: string, paterno: string, materno: string | null): string {
  return [nombres, paterno, materno].filter(Boolean).join(" ");
}

@Injectable()
export class LibretasRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async anioDeTrabajo(headerId?: string): Promise<string> {
    if (headerId) {
      const rows = await this.db
        .select({ id: aniosAcademicos.id, estado: aniosAcademicos.estado })
        .from(aniosAcademicos)
        .where(eq(aniosAcademicos.id, headerId))
        .limit(1);
      if (!rows[0] || rows[0].estado === "planificado") {
        throw new BadRequestException(MENSAJES_LIBRETAS.ANIO_NO_DISPONIBLE);
      }
      return rows[0].id;
    }

    const enCurso = await this.db
      .select({ id: aniosAcademicos.id })
      .from(aniosAcademicos)
      .where(eq(aniosAcademicos.estado, "en_curso"))
      .limit(1);
    if (enCurso[0]) return enCurso[0].id;

    const reabierto = await this.db
      .select({ id: aniosAcademicos.id })
      .from(aniosAcademicos)
      .where(eq(aniosAcademicos.estado, "reabierto"))
      .limit(1);
    if (reabierto[0]) return reabierto[0].id;

    throw new BadRequestException(MENSAJES_LIBRETAS.ANIO_NO_DISPONIBLE);
  }

  async obtenerPeriodo(periodoId: string): Promise<PeriodoLibretaRow | null> {
    const rows = await this.db
      .select({
        id: periodosAcademicos.id,
        nombre: periodosAcademicos.nombre,
        anioAcademicoId: periodosAcademicos.anioAcademicoId,
      })
      .from(periodosAcademicos)
      .where(eq(periodosAcademicos.id, periodoId))
      .limit(1);
    return rows[0] ?? null;
  }

  async existeProgramacion(periodoId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: libretas.id })
      .from(libretas)
      .where(eq(libretas.periodoId, periodoId))
      .limit(1);
    return rows.length > 0;
  }

  async programar(periodoId: string, anioId: string, fechaLimite: string): Promise<number> {
    const vigentes = await this.db
      .select({ id: matriculas.id })
      .from(matriculas)
      .where(and(eq(matriculas.anioAcademicoId, anioId), eq(matriculas.estado, "matriculado")));

    if (vigentes.length === 0) return 0;

    const inserted = await this.db
      .insert(libretas)
      .values(
        vigentes.map((matricula) => ({
          matriculaId: matricula.id,
          periodoId,
          fechaLimite,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: libretas.id });

    return inserted.length;
  }

  async cambiarFechaPendientes(periodoId: string, fechaLimite: string): Promise<number> {
    const updated = await this.db
      .update(libretas)
      .set({ fechaLimite, actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(libretas.periodoId, periodoId), eq(libretas.estado, "pendiente")))
      .returning({ id: libretas.id });
    return updated.length;
  }

  async crearPendientesDeMatricula(matriculaId: string): Promise<number> {
    const matricula = await this.db
      .select({ anioId: matriculas.anioAcademicoId, estado: matriculas.estado })
      .from(matriculas)
      .where(eq(matriculas.id, matriculaId))
      .limit(1);
    if (!matricula[0] || matricula[0].estado !== "matriculado") return 0;

    const result = (await this.db.execute(sql`
      SELECT DISTINCT ON (l.periodo_id) l.periodo_id, l.fecha_limite
      FROM libretas l
      INNER JOIN matriculas m ON m.id = l.matricula_id
      WHERE m.anio_academico_id = ${matricula[0].anioId}::uuid
      ORDER BY l.periodo_id, (l.estado = 'pendiente') DESC, l.actualizado_en DESC
    `)) as { rows: Array<{ periodo_id: string; fecha_limite: string }> };

    if (result.rows.length === 0) return 0;

    const inserted = await this.db
      .insert(libretas)
      .values(
        result.rows.map((row) => ({
          matriculaId,
          periodoId: row.periodo_id,
          fechaLimite: row.fecha_limite,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: libretas.id });

    return inserted.length;
  }

  async eliminarPendientesAntesDeLimite(matriculaId: string, fechaRetiro: string): Promise<number> {
    const deleted = await this.db
      .delete(libretas)
      .where(
        and(
          eq(libretas.matriculaId, matriculaId),
          eq(libretas.estado, "pendiente"),
          sql`${libretas.fechaLimite} > ${fechaRetiro}::date`,
        ),
      )
      .returning({ id: libretas.id });
    return deleted.length;
  }

  async listarDeSeccion(seccionId: string, periodoId: string): Promise<LibretaSeccionRow[]> {
    const rows = await this.db
      .select({
        matriculaId: matriculas.id,
        codigo: estudiantes.codigo,
        nombres: personas.nombres,
        paterno: personas.apellidoPaterno,
        materno: personas.apellidoMaterno,
        seccionId: matriculas.seccionId,
        libretaId: libretas.id,
        estado: libretas.estado,
        fechaLimite: libretas.fechaLimite,
        estudianteId: estudiantes.id,
        estudiantePersonaId: estudiantes.personaId,
      })
      .from(matriculas)
      .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
      .innerJoin(personas, eq(estudiantes.personaId, personas.id))
      .leftJoin(
        libretas,
        and(eq(libretas.matriculaId, matriculas.id), eq(libretas.periodoId, periodoId)),
      )
      .where(and(eq(matriculas.seccionId, seccionId), eq(matriculas.estado, "matriculado")));

    return this.adjuntarUsuariosFamilia(rows);
  }

  async listarCodigosOtrasSecciones(
    anioId: string,
    seccionId: string,
  ): Promise<CodigoOtraSeccionRow[]> {
    const rows = await this.db
      .select({
        matriculaId: matriculas.id,
        codigo: estudiantes.codigo,
        nombres: personas.nombres,
        paterno: personas.apellidoPaterno,
        materno: personas.apellidoMaterno,
      })
      .from(matriculas)
      .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
      .innerJoin(personas, eq(estudiantes.personaId, personas.id))
      .where(
        and(
          eq(matriculas.anioAcademicoId, anioId),
          eq(matriculas.estado, "matriculado"),
          sql`${matriculas.seccionId} <> ${seccionId}::uuid`,
        ),
      );

    return rows.map((row) => ({
      matriculaId: row.matriculaId,
      codigo: row.codigo,
      nombreCompleto: nombrePersona(row.nombres, row.paterno, row.materno),
    }));
  }

  async obtenerAlcance(rolId: string): Promise<AlcanceLibreta | null> {
    const rows = await this.db
      .select({ alcance: libretaAlcances.alcance })
      .from(libretaAlcances)
      .where(eq(libretaAlcances.rolId, rolId))
      .limit(1);
    const alcance = rows[0]?.alcance;
    if (alcance === "tutoria" || alcance === "mis_secciones" || alcance === "colegio") {
      return alcance;
    }
    return null;
  }

  async guardarAlcance(
    rolId: string,
    alcance: AlcanceLibreta,
    actorId: string,
  ): Promise<AlcanceLibreta | null> {
    const anterior = await this.obtenerAlcance(rolId);
    await this.db
      .insert(libretaAlcances)
      .values({
        rolId,
        alcance,
        actualizadoPorId: actorId,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .onConflictDoUpdate({
        target: libretaAlcances.rolId,
        set: {
          alcance,
          actualizadoPorId: actorId,
          actualizadoEn: sql`CURRENT_TIMESTAMP`,
        },
      });
    return anterior;
  }

  async listarAlcances(): Promise<AlcanceRolRow[]> {
    const rows = await this.db
      .select({
        rolId: roles.id,
        rolNombre: roles.nombre,
        alcance: libretaAlcances.alcance,
      })
      .from(roles)
      .leftJoin(libretaAlcances, eq(libretaAlcances.rolId, roles.id))
      .where(eq(roles.activo, true));

    return rows.flatMap((row) => {
      let alcance = row.alcance as AlcanceLibreta | null;
      if (alcance !== "tutoria" && alcance !== "mis_secciones" && alcance !== "colegio") {
        const nombreNorm = row.rolNombre.toLowerCase();
        if (nombreNorm === "docente") {
          alcance = "tutoria";
        } else if (["secretaria", "director", "subdirector"].includes(nombreNorm)) {
          alcance = "colegio";
        } else {
          return [];
        }
      }
      return [{ rolId: row.rolId, rolNombre: row.rolNombre, alcance }];
    });
  }

  async esTutorDeSeccion(personaId: string, seccionId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: secciones.id })
      .from(secciones)
      .innerJoin(docentes, eq(secciones.tutorId, docentes.id))
      .where(
        and(
          eq(secciones.id, seccionId),
          eq(docentes.personaId, personaId),
          isNull(docentes.eliminadoEn),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async dictaEnSeccion(personaId: string, seccionId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: cursosSeccion.id })
      .from(cursosSeccion)
      .innerJoin(docentes, eq(cursosSeccion.docenteId, docentes.id))
      .where(
        and(
          eq(cursosSeccion.seccionId, seccionId),
          eq(docentes.personaId, personaId),
          isNull(docentes.eliminadoEn),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async publicar(items: PublicacionPersistida[], actorId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const item of items) {
        if (item.esReemplazo) {
          await tx
            .update(libretaArchivos)
            .set({ vigente: false })
            .where(eq(libretaArchivos.libretaId, item.libretaId));
          await tx
            .update(libretas)
            .set({
              archivoUrl: item.archivoUrl,
              codigoLeido: item.codigoLeido,
              subidoPorId: actorId,
              subidoEn: sql`CURRENT_TIMESTAMP`,
              actualizadoEn: sql`CURRENT_TIMESTAMP`,
            })
            .where(eq(libretas.id, item.libretaId));
        } else {
          await tx
            .update(libretas)
            .set({
              estado: item.estado,
              archivoUrl: item.archivoUrl,
              codigoLeido: item.codigoLeido,
              subidoPorId: actorId,
              subidoEn: sql`CURRENT_TIMESTAMP`,
              actualizadoEn: sql`CURRENT_TIMESTAMP`,
            })
            .where(eq(libretas.id, item.libretaId));
        }

        await tx.insert(libretaArchivos).values({
          libretaId: item.libretaId,
          nombreOriginal: item.nombreOriginal,
          archivoUrl: item.archivoUrl,
          tamanoBytes: item.tamanoBytes,
          asignacion: item.asignacion,
          vigente: true,
          motivo: item.motivo,
          subidoPorId: actorId,
        });
      }
    });
  }

  async seguimiento(periodoId: string, seccionIds?: string[]): Promise<SeguimientoSeccionRow[]> {
    if (seccionIds && seccionIds.length === 0) return [];
    const filtroSeccion =
      seccionIds && seccionIds.length > 0 ? inArray(secciones.id, seccionIds) : undefined;

    const rows = await this.db
      .select({
        seccionId: secciones.id,
        seccionNombre: secciones.nombre,
        gradoNombre: grados.nombre,
        estado: libretas.estado,
        vistoEn: libretas.vistoEn,
      })
      .from(libretas)
      .innerJoin(matriculas, eq(libretas.matriculaId, matriculas.id))
      .innerJoin(secciones, eq(matriculas.seccionId, secciones.id))
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .where(and(eq(libretas.periodoId, periodoId), filtroSeccion));

    const mapa = new Map<string, SeguimientoSeccionRow>();
    for (const row of rows) {
      const actual = mapa.get(row.seccionId) ?? {
        seccionId: row.seccionId,
        seccionNombre: row.seccionNombre,
        gradoNombre: row.gradoNombre,
        aTiempo: 0,
        fueraDePlazo: 0,
        pendientes: 0,
        vistas: 0,
      };
      if (row.estado === "a_tiempo") actual.aTiempo += 1;
      else if (row.estado === "fuera_de_plazo") actual.fueraDePlazo += 1;
      else actual.pendientes += 1;
      if (row.vistoEn) actual.vistas += 1;
      mapa.set(row.seccionId, actual);
    }
    return [...mapa.values()];
  }

  async detalleSeccion(seccionId: string, periodoId: string): Promise<DetalleLibretaRow[]> {
    const rows = await this.db
      .select({
        libretaId: libretas.id,
        matriculaId: matriculas.id,
        codigo: estudiantes.codigo,
        nombres: personas.nombres,
        paterno: personas.apellidoPaterno,
        materno: personas.apellidoMaterno,
        estado: libretas.estado,
        vistoEn: libretas.vistoEn,
        fechaLimite: libretas.fechaLimite,
      })
      .from(libretas)
      .innerJoin(matriculas, eq(libretas.matriculaId, matriculas.id))
      .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
      .innerJoin(personas, eq(estudiantes.personaId, personas.id))
      .where(and(eq(libretas.periodoId, periodoId), eq(matriculas.seccionId, seccionId)));

    return rows.map((row) => ({
      libretaId: row.libretaId,
      matriculaId: row.matriculaId,
      codigo: row.codigo,
      nombreCompleto: nombrePersona(row.nombres, row.paterno, row.materno),
      estado: row.estado as EstadoLibreta,
      vistoEn: row.vistoEn,
      fechaLimite: row.fechaLimite,
    }));
  }

  async misLibretas(personaId: string, rol: string): Promise<MiLibretaRow[]> {
    const esApoderado = rol.toLowerCase() === "apoderado";
    const base = this.db
      .select({
        id: libretas.id,
        periodoId: libretas.periodoId,
        bimestre: periodosAcademicos.nombre,
        estado: libretas.estado,
        fechaLimite: libretas.fechaLimite,
        archivoUrl: libretas.archivoUrl,
        vistoEn: libretas.vistoEn,
        nombres: personas.nombres,
        paterno: personas.apellidoPaterno,
        materno: personas.apellidoMaterno,
      })
      .from(libretas)
      .innerJoin(matriculas, eq(libretas.matriculaId, matriculas.id))
      .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
      .innerJoin(personas, eq(estudiantes.personaId, personas.id))
      .innerJoin(periodosAcademicos, eq(libretas.periodoId, periodosAcademicos.id));

    const rows = esApoderado
      ? await base
          .innerJoin(estudianteApoderados, eq(estudianteApoderados.estudianteId, estudiantes.id))
          .innerJoin(apoderados, eq(estudianteApoderados.apoderadoId, apoderados.id))
          .where(and(eq(apoderados.personaId, personaId), isNull(apoderados.eliminadoEn)))
      : await base.where(eq(estudiantes.personaId, personaId));

    return rows.map((row) => ({
      id: row.id,
      periodoId: row.periodoId,
      bimestre: row.bimestre,
      estado: row.estado as EstadoLibreta,
      fechaLimite: row.fechaLimite,
      archivoUrl: row.archivoUrl,
      vistoEn: row.vistoEn,
      estudianteNombre: nombrePersona(row.nombres, row.paterno, row.materno),
    }));
  }

  async obtenerParaApertura(libretaId: string): Promise<LibretaAperturaRow | null> {
    const rows = await this.db
      .select({
        id: libretas.id,
        estado: libretas.estado,
        bimestre: periodosAcademicos.nombre,
        archivoUrl: libretas.archivoUrl,
        vistoEn: libretas.vistoEn,
        seccionId: matriculas.seccionId,
        estudianteId: estudiantes.id,
        estudiantePersonaId: estudiantes.personaId,
      })
      .from(libretas)
      .innerJoin(matriculas, eq(libretas.matriculaId, matriculas.id))
      .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
      .innerJoin(periodosAcademicos, eq(libretas.periodoId, periodosAcademicos.id))
      .where(eq(libretas.id, libretaId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const apoderadosRows = await this.db
      .select({ personaId: apoderados.personaId })
      .from(estudianteApoderados)
      .innerJoin(apoderados, eq(estudianteApoderados.apoderadoId, apoderados.id))
      .where(eq(estudianteApoderados.estudianteId, row.estudianteId));

    const vigente = row.archivoUrl
      ? await this.db
          .select({ nombre: libretaArchivos.nombreOriginal })
          .from(libretaArchivos)
          .where(and(eq(libretaArchivos.libretaId, libretaId), eq(libretaArchivos.vigente, true)))
          .limit(1)
      : [];

    return {
      id: row.id,
      estado: row.estado as EstadoLibreta,
      bimestre: row.bimestre,
      archivoUrl: row.archivoUrl,
      nombreArchivo: vigente[0]?.nombre ?? null,
      vistoEn: row.vistoEn,
      seccionId: row.seccionId,
      estudiantePersonaId: row.estudiantePersonaId,
      apoderadoPersonaIds: apoderadosRows.map((item) => item.personaId),
    };
  }

  async registrarPrimeraVista(libretaId: string, usuarioId: string): Promise<void> {
    await this.db
      .update(libretas)
      .set({
        vistoEn: sql`CURRENT_TIMESTAMP`,
        vistoPorId: usuarioId,
        actualizadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(libretas.id, libretaId), isNull(libretas.vistoEn)));
  }

  async historial(libretaId: string): Promise<HistorialArchivoRow[]> {
    const rows = await this.db
      .select({
        id: libretaArchivos.id,
        nombreOriginal: libretaArchivos.nombreOriginal,
        asignacion: libretaArchivos.asignacion,
        vigente: libretaArchivos.vigente,
        motivo: libretaArchivos.motivo,
        subidoEn: libretaArchivos.subidoEn,
        nombres: personas.nombres,
        paterno: personas.apellidoPaterno,
        materno: personas.apellidoMaterno,
      })
      .from(libretaArchivos)
      .innerJoin(usuarios, eq(libretaArchivos.subidoPorId, usuarios.id))
      .innerJoin(personas, eq(usuarios.personaId, personas.id))
      .where(eq(libretaArchivos.libretaId, libretaId))
      .orderBy(sql`${libretaArchivos.subidoEn} DESC`);

    return rows.map((row) => ({
      id: row.id,
      nombreOriginal: row.nombreOriginal,
      asignacion: row.asignacion === "manual" ? "manual" : "automatica",
      vigente: row.vigente,
      motivo: row.motivo,
      subidoPorNombre: nombrePersona(row.nombres, row.paterno, row.materno),
      subidoEn: row.subidoEn,
    }));
  }

  async listarPeriodos(
    anioId: string,
  ): Promise<Array<PeriodoLibretaRow & { fechaLimite: string | null }>> {
    const periodos = await this.db
      .select({
        id: periodosAcademicos.id,
        nombre: periodosAcademicos.nombre,
        anioAcademicoId: periodosAcademicos.anioAcademicoId,
      })
      .from(periodosAcademicos)
      .where(eq(periodosAcademicos.anioAcademicoId, anioId))
      .orderBy(periodosAcademicos.numero);

    const fechas = await this.db
      .select({
        periodoId: libretas.periodoId,
        fechaLimite: libretas.fechaLimite,
        estado: libretas.estado,
      })
      .from(libretas)
      .innerJoin(matriculas, eq(libretas.matriculaId, matriculas.id))
      .where(eq(matriculas.anioAcademicoId, anioId));

    return periodos.map((periodo) => {
      const delPeriodo = fechas.filter((item) => item.periodoId === periodo.id);
      const pendiente = delPeriodo.find((item) => item.estado === "pendiente");
      return {
        ...periodo,
        fechaLimite: pendiente?.fechaLimite ?? delPeriodo[0]?.fechaLimite ?? null,
      };
    });
  }

  async listarSecciones(anioId: string): Promise<SeccionResumenRow[]> {
    const rows = await this.db
      .select({
        id: secciones.id,
        nombre: secciones.nombre,
        gradoNombre: grados.nombre,
      })
      .from(secciones)
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .where(and(eq(secciones.anioAcademicoId, anioId), eq(secciones.estado, "activa")));
    return rows;
  }

  async seccionesDePersona(personaId: string, alcance: AlcanceLibreta): Promise<string[]> {
    if (alcance === "colegio") return [];

    const tutor = await this.db
      .select({ id: secciones.id })
      .from(secciones)
      .innerJoin(docentes, eq(secciones.tutorId, docentes.id))
      .where(and(eq(docentes.personaId, personaId), isNull(docentes.eliminadoEn)));

    if (alcance === "tutoria") return tutor.map((row) => row.id);

    const dicta = await this.db
      .select({ id: cursosSeccion.seccionId })
      .from(cursosSeccion)
      .innerJoin(docentes, eq(cursosSeccion.docenteId, docentes.id))
      .where(and(eq(docentes.personaId, personaId), isNull(docentes.eliminadoEn)));

    return [...new Set([...tutor.map((row) => row.id), ...dicta.map((row) => row.id)])];
  }

  private async adjuntarUsuariosFamilia(
    rows: Array<{
      matriculaId: string;
      codigo: string;
      nombres: string;
      paterno: string;
      materno: string | null;
      seccionId: string;
      libretaId: string | null;
      estado: string | null;
      fechaLimite: string | null;
      estudianteId: string;
      estudiantePersonaId: string;
    }>,
  ): Promise<LibretaSeccionRow[]> {
    if (rows.length === 0) return [];

    const personaIds = rows.map((row) => row.estudiantePersonaId);
    const estudianteIds = rows.map((row) => row.estudianteId);

    const cuentas = await this.db
      .select({ id: usuarios.id, personaId: usuarios.personaId })
      .from(usuarios)
      .where(and(inArray(usuarios.personaId, personaIds), isNull(usuarios.eliminadoEn)));

    const principales = await this.db
      .select({
        estudianteId: estudianteApoderados.estudianteId,
        personaId: apoderados.personaId,
      })
      .from(estudianteApoderados)
      .innerJoin(apoderados, eq(estudianteApoderados.apoderadoId, apoderados.id))
      .where(
        and(
          inArray(estudianteApoderados.estudianteId, estudianteIds),
          eq(estudianteApoderados.esPrincipal, true),
        ),
      );

    const personaApoderado = principales.map((item) => item.personaId);
    const cuentasApoderado =
      personaApoderado.length === 0
        ? []
        : await this.db
            .select({ id: usuarios.id, personaId: usuarios.personaId })
            .from(usuarios)
            .where(
              and(inArray(usuarios.personaId, personaApoderado), isNull(usuarios.eliminadoEn)),
            );

    const usuarioPorPersona = new Map(cuentas.map((cuenta) => [cuenta.personaId, cuenta.id]));
    const apoderadoPorEstudiante = new Map(
      principales.map((item) => [item.estudianteId, item.personaId]),
    );
    const usuarioApoderadoPorPersona = new Map(
      cuentasApoderado.map((cuenta) => [cuenta.personaId, cuenta.id]),
    );

    return rows.map((row) => {
      const estado = row.estado;
      const personaApoderadoId = apoderadoPorEstudiante.get(row.estudianteId);
      return {
        matriculaId: row.matriculaId,
        codigo: row.codigo,
        nombreCompleto: nombrePersona(row.nombres, row.paterno, row.materno),
        seccionId: row.seccionId,
        libretaId: row.libretaId,
        estado:
          estado === "pendiente" || estado === "a_tiempo" || estado === "fuera_de_plazo"
            ? estado
            : null,
        fechaLimite: row.fechaLimite,
        usuarioEstudianteId: usuarioPorPersona.get(row.estudiantePersonaId) ?? null,
        usuarioApoderadoId: personaApoderadoId
          ? (usuarioApoderadoPorPersona.get(personaApoderadoId) ?? null)
          : null,
      };
    });
  }
}
