import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  apoderados,
  cursosSeccion,
  docentes,
  estudianteApoderados,
  grados,
  secciones,
  usuarios,
} from "@/core/database/schema";
import type { AlcanceLibreta, LibretaSeccionRow, SeccionResumenRow } from "../../interfaces";
import type { LibretasRepositoryDeps } from "./deps";
import { nombrePersona } from "./shared";

export async function listarSecciones(
  deps: LibretasRepositoryDeps,
  anioId: string,
): Promise<SeccionResumenRow[]> {
  const rows = await deps.db
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

export async function seccionesDePersona(
  deps: LibretasRepositoryDeps,
  personaId: string,
  alcance: AlcanceLibreta,
): Promise<string[]> {
  if (alcance === "colegio") return [];

  const tutor = await deps.db
    .select({ id: secciones.id })
    .from(secciones)
    .innerJoin(docentes, eq(secciones.tutorId, docentes.id))
    .where(and(eq(docentes.personaId, personaId), isNull(docentes.eliminadoEn)));

  if (alcance === "tutoria") return tutor.map((row) => row.id);

  const dicta = await deps.db
    .select({ id: cursosSeccion.seccionId })
    .from(cursosSeccion)
    .innerJoin(docentes, eq(cursosSeccion.docenteId, docentes.id))
    .where(and(eq(docentes.personaId, personaId), isNull(docentes.eliminadoEn)));

  return [...new Set([...tutor.map((row) => row.id), ...dicta.map((row) => row.id)])];
}

export async function adjuntarUsuariosFamilia(
  deps: LibretasRepositoryDeps,
  rows: Array<{
    matriculaId: string;
    codigo: string;
    numeroDocumento?: string | null;
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

  const cuentas = await deps.db
    .select({ id: usuarios.id, personaId: usuarios.personaId })
    .from(usuarios)
    .where(and(inArray(usuarios.personaId, personaIds), isNull(usuarios.eliminadoEn)));

  const principales = await deps.db
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
      : await deps.db
          .select({ id: usuarios.id, personaId: usuarios.personaId })
          .from(usuarios)
          .where(and(inArray(usuarios.personaId, personaApoderado), isNull(usuarios.eliminadoEn)));

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
      numeroDocumento: row.numeroDocumento ?? null,
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
