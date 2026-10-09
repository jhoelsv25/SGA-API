import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { credenciales, docentes, estudiantes, personas } from "../../../core/database/schema";
import type { CarneDatosDto } from "../dto";

export interface ReemitirParams {
  personaId: string;
  motivo: string;
  nuevoCodigo: string;
  nuevoPinHash: string;
}

export interface CredencialRow {
  id: string;
  personaId: string;
  codigo: string;
  pinHash: string | null;
  activa: boolean;
  emitidaEn: string;
  venceEn: string | null;
  anuladaEn: string | null;
  motivoAnulacion: string | null;
}

@Injectable()
export class CredencialesRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: Database,
  ) {}

  async findActivaByPersonaId(personaId: string): Promise<CredencialRow | null> {
    const rows = await this.db
      .select({
        id: credenciales.id,
        personaId: credenciales.personaId,
        codigo: credenciales.codigo,
        pinHash: credenciales.pinHash,
        activa: credenciales.activa,
        emitidaEn: credenciales.emitidaEn,
        venceEn: credenciales.venceEn,
        anuladaEn: credenciales.anuladaEn,
        motivoAnulacion: credenciales.motivoAnulacion,
      })
      .from(credenciales)
      .where(and(eq(credenciales.personaId, personaId), eq(credenciales.activa, true)))
      .limit(1);

    return rows[0] || null;
  }

  async findPersonaForCarne(personaId: string): Promise<CarneDatosDto | null> {
    const personaRows = await this.db
      .select({
        id: personas.id,
        tipoDocumento: personas.tipoDocumento,
        numeroDocumento: personas.numeroDocumento,
        nombres: personas.nombres,
        apellidoPaterno: personas.apellidoPaterno,
        apellidoMaterno: personas.apellidoMaterno,
        fotoUrl: personas.fotoUrl,
      })
      .from(personas)
      .where(eq(personas.id, personaId))
      .limit(1);

    if (personaRows.length === 0) return null;
    const p = personaRows[0];

    // Verificar credencial activa
    const cred = await this.findActivaByPersonaId(personaId);
    if (!cred) return null;

    // Verificar si es estudiante
    const estRows = await this.db
      .select({ codigoSiagie: estudiantes.codigo })
      .from(estudiantes)
      .where(and(eq(estudiantes.personaId, personaId), eq(estudiantes.estado, "activo")))
      .limit(1);

    // Verificar si es docente
    const docRows = await this.db
      .select({ codigoDocente: docentes.codigo })
      .from(docentes)
      .where(and(eq(docentes.personaId, personaId), eq(docentes.estado, "activo")))
      .limit(1);

    const tipoRol = estRows.length > 0 ? "Estudiante" : docRows.length > 0 ? "Docente" : "Personal";
    const codigoInstitucional =
      estRows.length > 0
        ? estRows[0].codigoSiagie
        : docRows.length > 0
          ? docRows[0].codigoDocente
          : null;

    const nombreCompleto = [p.nombres, p.apellidoPaterno, p.apellidoMaterno]
      .filter(Boolean)
      .join(" ");

    return {
      personaId: p.id,
      nombreCompleto,
      tipoDocumento: p.tipoDocumento,
      numeroDocumento: p.numeroDocumento,
      fotoUrl: p.fotoUrl,
      tipoRol,
      codigoCredencial: cred.codigo,
      codigoInstitucional,
      emitidaEn: cred.emitidaEn,
    };
  }

  async reemitir(
    params: ReemitirParams,
  ): Promise<{ nuevaCredencial: CredencialRow; anteriorId?: string }> {
    return this.db.transaction(async (tx) => {
      // 1. Obtener la credencial activa actual
      const prevRows = await tx
        .select({ id: credenciales.id })
        .from(credenciales)
        .where(and(eq(credenciales.personaId, params.personaId), eq(credenciales.activa, true)));

      const anteriorId = prevRows[0]?.id;

      // 2. Anular la(s) credencial(es) activa(s) previa(s)
      if (prevRows.length > 0) {
        await tx
          .update(credenciales)
          .set({
            activa: false,
            anuladaEn: new Date().toISOString(),
            motivoAnulacion: params.motivo,
          })
          .where(and(eq(credenciales.personaId, params.personaId), eq(credenciales.activa, true)));
      }

      // 3. Insertar la nueva credencial
      const inserted = await tx
        .insert(credenciales)
        .values({
          personaId: params.personaId,
          codigo: params.nuevoCodigo,
          pinHash: params.nuevoPinHash,
          activa: true,
          emitidaEn: new Date().toISOString(),
        })
        .returning({
          id: credenciales.id,
          personaId: credenciales.personaId,
          codigo: credenciales.codigo,
          pinHash: credenciales.pinHash,
          activa: credenciales.activa,
          emitidaEn: credenciales.emitidaEn,
          venceEn: credenciales.venceEn,
          anuladaEn: credenciales.anuladaEn,
          motivoAnulacion: credenciales.motivoAnulacion,
        });

      return {
        nuevaCredencial: inserted[0],
        anteriorId,
      };
    });
  }

  async actualizarPin(id: string, nuevoPinHash: string): Promise<void> {
    await this.db
      .update(credenciales)
      .set({ pinHash: nuevoPinHash })
      .where(eq(credenciales.id, id));
  }
}
