import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  apoderados,
  credenciales,
  docentes,
  estudiantes,
  personas,
  roles,
  usuarioRoles,
  usuarios,
} from "../../../core/database/schema";

export interface PersonaAcceso {
  personaId: string;
  documento: string;
  nombreCompleto: string;
  codigoBiometrico: string | null;
}

const MAXIMO_RESULTADOS = 20;

const columnasPersona = {
  personaId: personas.id,
  documento: personas.numeroDocumento,
  nombreCompleto: sql<string>`concat_ws(' ', ${personas.apellidoPaterno}, ${personas.apellidoMaterno}) || ', ' || ${personas.nombres}`,
  codigoBiometrico: personas.codigoBiometrico,
};

/** Minúsculas y sin tildes en la base, sin depender de la extensión `unaccent`. */
const sinTildes = (texto: ReturnType<typeof sql>) =>
  sql`translate(lower(${texto}), 'áéíóúü', 'aeiouu')`;

@Injectable()
export class AccesosRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Cada palabra debe aparecer en el documento o en el nombre, en cualquier orden. */
  buscar(palabras: string[]): Promise<PersonaAcceso[]> {
    const texto = sinTildes(
      sql`concat_ws(' ', ${personas.numeroDocumento}, ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno})`,
    );
    return this.db
      .select(columnasPersona)
      .from(personas)
      .where(
        and(isNull(personas.eliminadoEn), ...palabras.map((p) => sql`strpos(${texto}, ${p}) > 0`)),
      )
      .orderBy(asc(personas.apellidoPaterno), asc(personas.apellidoMaterno), asc(personas.nombres))
      .limit(MAXIMO_RESULTADOS);
  }

  async persona(personaId: string): Promise<PersonaAcceso | null> {
    const [fila] = await this.db
      .select(columnasPersona)
      .from(personas)
      .where(and(eq(personas.id, personaId), isNull(personas.eliminadoEn)))
      .limit(1);
    return fila ?? null;
  }

  /** Fichas de docente, estudiante y apoderado de las personas indicadas. */
  async fichas(ids: string[]): Promise<{ personaId: string; grupo: string }[]> {
    if (ids.length === 0) return [];
    const listas = await Promise.all(
      (
        [
          ["Docente", docentes],
          ["Estudiante", estudiantes],
          ["Apoderado", apoderados],
        ] as const
      ).map(async ([grupo, tabla]) => {
        const filas = await this.db
          .select({ personaId: tabla.personaId })
          .from(tabla)
          .where(and(inArray(tabla.personaId, ids), isNull(tabla.eliminadoEn)));
        return filas.map((f) => ({ personaId: f.personaId, grupo }));
      }),
    );
    return listas.flat();
  }

  /** Cuentas web con todos sus roles vigentes (el principal y los adicionales). */
  async cuentas(
    ids: string[],
  ): Promise<
    { id: string; personaId: string; nombreUsuario: string; estado: string; roles: string[] }[]
  > {
    if (ids.length === 0) return [];
    const cuentas = await this.db
      .select({
        id: usuarios.id,
        personaId: usuarios.personaId,
        nombreUsuario: usuarios.nombreUsuario,
        estado: usuarios.estado,
        rolPrincipal: roles.nombre,
      })
      .from(usuarios)
      .innerJoin(roles, eq(roles.id, usuarios.rolId))
      .where(and(inArray(usuarios.personaId, ids), isNull(usuarios.eliminadoEn)));
    if (cuentas.length === 0) return [];
    const adicionales = await this.db
      .select({ usuarioId: usuarioRoles.usuarioId, nombre: roles.nombre })
      .from(usuarioRoles)
      .innerJoin(roles, eq(roles.id, usuarioRoles.rolId))
      .where(
        and(
          inArray(
            usuarioRoles.usuarioId,
            cuentas.map((c) => c.id),
          ),
          eq(usuarioRoles.vigente, true),
        ),
      );
    return cuentas.map(({ rolPrincipal, ...c }) => ({
      ...c,
      roles: [
        ...new Set([
          rolPrincipal,
          ...adicionales.filter((a) => a.usuarioId === c.id).map((a) => a.nombre),
        ]),
      ],
    }));
  }

  async credencialActiva(
    personaId: string,
  ): Promise<{ codigo: string; tienePin: boolean; emitidaEn: string } | null> {
    const [fila] = await this.db
      .select({
        codigo: credenciales.codigo,
        pinHash: credenciales.pinHash,
        emitidaEn: credenciales.emitidaEn,
      })
      .from(credenciales)
      .where(and(eq(credenciales.personaId, personaId), eq(credenciales.activa, true)))
      .limit(1);
    return fila
      ? { codigo: fila.codigo, tienePin: Boolean(fila.pinHash), emitidaEn: fila.emitidaEn }
      : null;
  }
}
