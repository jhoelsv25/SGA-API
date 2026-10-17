import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { Database, DRIZZLE } from "@/core/database";
import { indicadoresPretest, personas, usuarios } from "@/core/database/schema";
import type { Indicador } from "../constants";
import type { IPretestRepository, PretestFila } from "../interfaces";

@Injectable()
export class PretestRepository implements IPretestRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async crearPretest(datos: {
    indicador: Indicador;
    periodoDescrito: string;
    fechaInicio: string;
    fechaFin: string;
    numerador: number;
    denominador: number;
    porcentaje: number;
    fuente: string;
    registradoPorId: string;
  }): Promise<PretestFila> {
    const [fila] = await this.db
      .insert(indicadoresPretest)
      .values({
        indicador: datos.indicador,
        periodoDescrito: datos.periodoDescrito,
        fechaInicio: datos.fechaInicio,
        fechaFin: datos.fechaFin,
        numerador: datos.numerador,
        denominador: datos.denominador,
        porcentaje: datos.porcentaje.toFixed(2),
        fuente: datos.fuente,
        vigente: true,
        registradoPorId: datos.registradoPorId,
      })
      .returning();

    const [usuario] = await this.db
      .select({
        nombres: personas.nombres,
        apellidoPaterno: personas.apellidoPaterno,
      })
      .from(usuarios)
      .leftJoin(personas, eq(usuarios.personaId, personas.id))
      .where(eq(usuarios.id, datos.registradoPorId));

    const registradoPorNombre = usuario
      ? `${usuario.nombres} ${usuario.apellidoPaterno ?? ""}`.trim()
      : undefined;

    return {
      id: fila.id,
      indicador: fila.indicador as Indicador,
      periodoDescrito: fila.periodoDescrito,
      fechaInicio: fila.fechaInicio,
      fechaFin: fila.fechaFin,
      numerador: fila.numerador,
      denominador: fila.denominador,
      porcentaje: Number(fila.porcentaje),
      fuente: fila.fuente,
      vigente: fila.vigente,
      registradoPorId: fila.registradoPorId ?? datos.registradoPorId,
      registradoPorNombre,
      creadoEn: fila.creadoEn,
    };
  }

  async invalidarPretestVigenteAnterior(indicador: Indicador): Promise<void> {
    await this.db
      .update(indicadoresPretest)
      .set({ vigente: false })
      .where(
        and(eq(indicadoresPretest.indicador, indicador), eq(indicadoresPretest.vigente, true)),
      );
  }

  async obtenerPretestVigente(indicador: Indicador): Promise<PretestFila | null> {
    const [fila] = await this.db
      .select({
        id: indicadoresPretest.id,
        indicador: indicadoresPretest.indicador,
        periodoDescrito: indicadoresPretest.periodoDescrito,
        fechaInicio: indicadoresPretest.fechaInicio,
        fechaFin: indicadoresPretest.fechaFin,
        numerador: indicadoresPretest.numerador,
        denominador: indicadoresPretest.denominador,
        porcentaje: indicadoresPretest.porcentaje,
        fuente: indicadoresPretest.fuente,
        vigente: indicadoresPretest.vigente,
        registradoPorId: indicadoresPretest.registradoPorId,
        creadoEn: indicadoresPretest.creadoEn,
        nombres: personas.nombres,
        apellidoPaterno: personas.apellidoPaterno,
      })
      .from(indicadoresPretest)
      .leftJoin(usuarios, eq(indicadoresPretest.registradoPorId, usuarios.id))
      .leftJoin(personas, eq(usuarios.personaId, personas.id))
      .where(
        and(eq(indicadoresPretest.indicador, indicador), eq(indicadoresPretest.vigente, true)),
      );

    if (!fila) {
      return null;
    }

    const registradoPorNombre = fila.nombres
      ? `${fila.nombres} ${fila.apellidoPaterno ?? ""}`.trim()
      : undefined;

    return {
      id: fila.id,
      indicador: fila.indicador as Indicador,
      periodoDescrito: fila.periodoDescrito,
      fechaInicio: fila.fechaInicio,
      fechaFin: fila.fechaFin,
      numerador: fila.numerador,
      denominador: fila.denominador,
      porcentaje: Number(fila.porcentaje),
      fuente: fila.fuente,
      vigente: fila.vigente,
      registradoPorId: fila.registradoPorId ?? "",
      registradoPorNombre,
      creadoEn: fila.creadoEn,
    };
  }

  async listarTodosPretests(): Promise<PretestFila[]> {
    const filas = await this.db
      .select({
        id: indicadoresPretest.id,
        indicador: indicadoresPretest.indicador,
        periodoDescrito: indicadoresPretest.periodoDescrito,
        fechaInicio: indicadoresPretest.fechaInicio,
        fechaFin: indicadoresPretest.fechaFin,
        numerador: indicadoresPretest.numerador,
        denominador: indicadoresPretest.denominador,
        porcentaje: indicadoresPretest.porcentaje,
        fuente: indicadoresPretest.fuente,
        vigente: indicadoresPretest.vigente,
        registradoPorId: indicadoresPretest.registradoPorId,
        creadoEn: indicadoresPretest.creadoEn,
        nombres: personas.nombres,
        apellidoPaterno: personas.apellidoPaterno,
      })
      .from(indicadoresPretest)
      .leftJoin(usuarios, eq(indicadoresPretest.registradoPorId, usuarios.id))
      .leftJoin(personas, eq(usuarios.personaId, personas.id))
      .orderBy(desc(indicadoresPretest.creadoEn));

    return filas.map((fila) => ({
      id: fila.id,
      indicador: fila.indicador as Indicador,
      periodoDescrito: fila.periodoDescrito,
      fechaInicio: fila.fechaInicio,
      fechaFin: fila.fechaFin,
      numerador: fila.numerador,
      denominador: fila.denominador,
      porcentaje: Number(fila.porcentaje),
      fuente: fila.fuente,
      vigente: fila.vigente,
      registradoPorId: fila.registradoPorId ?? "",
      registradoPorNombre: fila.nombres
        ? `${fila.nombres} ${fila.apellidoPaterno ?? ""}`.trim()
        : undefined,
      creadoEn: fila.creadoEn,
    }));
  }
}
