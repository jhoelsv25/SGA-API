import { Inject, Injectable } from "@nestjs/common";
import { desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Database, DRIZZLE } from "../../../core/database";
import { equiposAcceso, usuarios } from "../../../core/database/schema";
import { EstadoEquipoAcceso } from "../constants";
import { EquipoAccesoResponseDto } from "../dto";
import { IEquiposAccesoRepository, ResolucionEquipoAcceso } from "../interfaces";

const resolutor = alias(usuarios, "resolutor");

@Injectable()
export class EquiposAccesoRepository implements IEquiposAccesoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private seleccion() {
    return this.db
      .select({
        id: equiposAcceso.id,
        usuarioId: equiposAcceso.usuarioId,
        nombreUsuario: usuarios.nombreUsuario,
        nombre: equiposAcceso.nombre,
        plataforma: equiposAcceso.plataforma,
        estado: equiposAcceso.estado,
        solicitadoEn: equiposAcceso.solicitadoEn,
        resueltoEn: equiposAcceso.resueltoEn,
        resueltoPor: resolutor.nombreUsuario,
        motivo: equiposAcceso.motivo,
        ultimoAcceso: equiposAcceso.ultimoAcceso,
        vigenteHasta: equiposAcceso.vigenteHasta,
        ip: equiposAcceso.ip,
      })
      .from(equiposAcceso)
      .innerJoin(usuarios, eq(usuarios.id, equiposAcceso.usuarioId))
      .leftJoin(resolutor, eq(resolutor.id, equiposAcceso.resueltoPor));
  }

  private aDto(
    fila: Awaited<ReturnType<EquiposAccesoRepository["seleccion"]>>[number],
  ): EquipoAccesoResponseDto {
    return { ...fila, estado: fila.estado as EstadoEquipoAcceso };
  }

  async findAll(estado?: EstadoEquipoAcceso): Promise<EquipoAccesoResponseDto[]> {
    const consulta = this.seleccion();
    const filtrada =
      estado === undefined ? consulta : consulta.where(eq(equiposAcceso.estado, estado));
    const filas = await filtrada.orderBy(desc(equiposAcceso.solicitadoEn));
    return filas.map((f) => this.aDto(f));
  }

  async findById(id: string): Promise<EquipoAccesoResponseDto | null> {
    const [fila] = await this.seleccion().where(eq(equiposAcceso.id, id)).limit(1);
    return fila ? this.aDto(fila) : null;
  }

  async resolver(id: string, resolucion: ResolucionEquipoAcceso): Promise<EquipoAccesoResponseDto> {
    await this.db
      .update(equiposAcceso)
      .set({
        estado: resolucion.estado,
        resueltoPor: resolucion.resueltoPor,
        resueltoEn: sql`now()`,
        motivo: resolucion.motivo,
        vigenteHasta: resolucion.vigenteHasta,
        actualizadoEn: sql`now()`,
      })
      .where(eq(equiposAcceso.id, id));
    const actualizado = await this.findById(id);
    if (!actualizado) throw new Error("El equipo de acceso desapareció durante la resolución.");
    return actualizado;
  }
}
