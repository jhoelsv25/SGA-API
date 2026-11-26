import { BadRequestException } from "@nestjs/common";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  aniosAcademicos,
  cursosSeccion,
  docentes,
  estudiantes,
  libretaAlcances,
  libretas,
  matriculas,
  periodosAcademicos,
  personas,
  roles,
  secciones,
} from "@/core/database/schema";
import { MENSAJES_LIBRETAS } from "../../constants";
import type {
  AlcanceLibreta,
  AlcanceRolRow,
  CodigoOtraSeccionRow,
  LibretaSeccionRow,
  PeriodoLibretaRow,
} from "../../interfaces";
import type { LibretasRepositoryDeps, LibretasRepositoryCalls } from "./deps";
import { nombrePersona } from "./shared";

export async function anioDeTrabajo(
  deps: LibretasRepositoryDeps,
  headerId?: string,
): Promise<string> {
  if (headerId) {
    const rows = await deps.db
      .select({ id: aniosAcademicos.id, estado: aniosAcademicos.estado })
      .from(aniosAcademicos)
      .where(eq(aniosAcademicos.id, headerId))
      .limit(1);
    if (!rows[0] || rows[0].estado === "planificado") {
      throw new BadRequestException(MENSAJES_LIBRETAS.ANIO_NO_DISPONIBLE);
    }
    return rows[0].id;
  }

  const enCurso = await deps.db
    .select({ id: aniosAcademicos.id })
    .from(aniosAcademicos)
    .where(eq(aniosAcademicos.estado, "en_curso"))
    .limit(1);
  if (enCurso[0]) return enCurso[0].id;

  const reabierto = await deps.db
    .select({ id: aniosAcademicos.id })
    .from(aniosAcademicos)
    .where(eq(aniosAcademicos.estado, "reabierto"))
    .limit(1);
  if (reabierto[0]) return reabierto[0].id;

  throw new BadRequestException(MENSAJES_LIBRETAS.ANIO_NO_DISPONIBLE);
}

export async function obtenerPeriodo(
  deps: LibretasRepositoryDeps,
  periodoId: string,
): Promise<PeriodoLibretaRow | null> {
  const rows = await deps.db
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

export async function existeProgramacion(
  deps: LibretasRepositoryDeps,
  periodoId: string,
): Promise<boolean> {
  const rows = await deps.db
    .select({ id: libretas.id })
    .from(libretas)
    .where(eq(libretas.periodoId, periodoId))
    .limit(1);
  return rows.length > 0;
}

export async function programar(
  deps: LibretasRepositoryDeps,
  periodoId: string,
  anioId: string,
  fechaLimite: string,
): Promise<number> {
  const vigentes = await deps.db
    .select({ id: matriculas.id })
    .from(matriculas)
    .where(and(eq(matriculas.anioAcademicoId, anioId), eq(matriculas.estado, "matriculado")));

  if (vigentes.length === 0) return 0;

  const inserted = await deps.db
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

export async function cambiarFechaPendientes(
  deps: LibretasRepositoryDeps,
  periodoId: string,
  fechaLimite: string,
): Promise<number> {
  const updated = await deps.db
    .update(libretas)
    .set({ fechaLimite, actualizadoEn: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(libretas.periodoId, periodoId), eq(libretas.estado, "pendiente")))
    .returning({ id: libretas.id });
  return updated.length;
}

export async function crearPendientesDeMatricula(
  deps: LibretasRepositoryDeps,
  matriculaId: string,
): Promise<number> {
  const matricula = await deps.db
    .select({ anioId: matriculas.anioAcademicoId, estado: matriculas.estado })
    .from(matriculas)
    .where(eq(matriculas.id, matriculaId))
    .limit(1);
  if (!matricula[0] || matricula[0].estado !== "matriculado") return 0;

  const result = (await deps.db.execute(sql`
      SELECT DISTINCT ON (l.periodo_id) l.periodo_id, l.fecha_limite
      FROM libretas l
      INNER JOIN matriculas m ON m.id = l.matricula_id
      WHERE m.anio_academico_id = ${matricula[0].anioId}::uuid
      ORDER BY l.periodo_id, (l.estado = 'pendiente') DESC, l.actualizado_en DESC
    `)) as { rows: Array<{ periodo_id: string; fecha_limite: string }> };

  if (result.rows.length === 0) return 0;

  const inserted = await deps.db
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

export async function eliminarPendientesAntesDeLimite(
  deps: LibretasRepositoryDeps,
  matriculaId: string,
  fechaRetiro: string,
): Promise<number> {
  const deleted = await deps.db
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

export async function listarDeSeccion(
  deps: LibretasRepositoryDeps,
  calls: LibretasRepositoryCalls,
  seccionId: string,
  periodoId: string,
): Promise<LibretaSeccionRow[]> {
  const rows = await deps.db
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

  return calls.adjuntarUsuariosFamilia(rows);
}

export async function listarCodigosOtrasSecciones(
  deps: LibretasRepositoryDeps,
  anioId: string,
  seccionId: string,
): Promise<CodigoOtraSeccionRow[]> {
  const rows = await deps.db
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

export async function obtenerAlcance(
  deps: LibretasRepositoryDeps,
  rolId: string,
): Promise<AlcanceLibreta | null> {
  const rows = await deps.db
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

export async function guardarAlcance(
  deps: LibretasRepositoryDeps,
  calls: LibretasRepositoryCalls,
  rolId: string,
  alcance: AlcanceLibreta,
  actorId: string,
): Promise<AlcanceLibreta | null> {
  const anterior = await calls.obtenerAlcance(rolId);
  await deps.db
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

export async function listarAlcances(deps: LibretasRepositoryDeps): Promise<AlcanceRolRow[]> {
  const rows = await deps.db
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

export async function esTutorDeSeccion(
  deps: LibretasRepositoryDeps,
  personaId: string,
  seccionId: string,
): Promise<boolean> {
  const rows = await deps.db
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

export async function dictaEnSeccion(
  deps: LibretasRepositoryDeps,
  personaId: string,
  seccionId: string,
): Promise<boolean> {
  const rows = await deps.db
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
