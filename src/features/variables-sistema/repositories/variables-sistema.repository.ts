import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, like } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { personas, usuarios, variablesSistema } from "../../../core/database/schema";
import { VariableTipo } from "../constants";
import { VariableSistemaResponseDto } from "../dto";
import { IVariablesSistemaRepository } from "../interfaces";

@Injectable()
export class VariablesSistemaRepository implements IVariablesSistemaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private mapRow(row: {
    variable: typeof variablesSistema.$inferSelect;
    usuario?: typeof usuarios.$inferSelect | null;
    persona?: typeof personas.$inferSelect | null;
  }): VariableSistemaResponseDto {
    const v = row.variable;
    let actualizadoPorNombre: string | null = null;
    if (row.persona) {
      actualizadoPorNombre = `${row.persona.nombres} ${row.persona.apellidoPaterno}`.trim();
    } else if (row.usuario) {
      actualizadoPorNombre = row.usuario.nombreUsuario;
    }

    return {
      id: v.id,
      codigo: v.codigo,
      descripcion: v.descripcion,
      modulo: v.modulo,
      tipo: v.tipo as VariableTipo,
      valor: v.valor,
      unidad: v.unidad,
      valorMinimo: v.valorMinimo !== null ? Number(v.valorMinimo) : null,
      valorMaximo: v.valorMaximo !== null ? Number(v.valorMaximo) : null,
      editable: v.editable,
      cargaEnAplicacion: v.cargaEnAplicacion,
      vigente: v.vigente,
      motivoCambio: v.motivoCambio,
      actualizadoPorId: v.actualizadoPorId,
      actualizadoPorNombre,
      creadoEn: v.creadoEn,
    };
  }

  async findVigentes(modulo?: string): Promise<VariableSistemaResponseDto[]> {
    const conditions = [eq(variablesSistema.vigente, true)];
    if (modulo) {
      conditions.push(eq(variablesSistema.modulo, modulo));
    }

    const rows = await this.db
      .select({
        variable: variablesSistema,
        usuario: usuarios,
        persona: personas,
      })
      .from(variablesSistema)
      .leftJoin(usuarios, eq(variablesSistema.actualizadoPorId, usuarios.id))
      .leftJoin(personas, eq(usuarios.personaId, personas.id))
      .where(and(...conditions))
      .orderBy(variablesSistema.modulo, variablesSistema.codigo);

    return rows.map((r) => this.mapRow(r));
  }

  async findByCodigoVigente(codigo: string): Promise<VariableSistemaResponseDto | null> {
    const [row] = await this.db
      .select({
        variable: variablesSistema,
        usuario: usuarios,
        persona: personas,
      })
      .from(variablesSistema)
      .leftJoin(usuarios, eq(variablesSistema.actualizadoPorId, usuarios.id))
      .leftJoin(personas, eq(usuarios.personaId, personas.id))
      .where(and(eq(variablesSistema.codigo, codigo), eq(variablesSistema.vigente, true)))
      .limit(1);

    if (!row) return null;
    return this.mapRow(row);
  }

  async findHistorialByCodigo(codigo: string): Promise<VariableSistemaResponseDto[]> {
    const rows = await this.db
      .select({
        variable: variablesSistema,
        usuario: usuarios,
        persona: personas,
      })
      .from(variablesSistema)
      .leftJoin(usuarios, eq(variablesSistema.actualizadoPorId, usuarios.id))
      .leftJoin(personas, eq(usuarios.personaId, personas.id))
      .where(eq(variablesSistema.codigo, codigo))
      .orderBy(desc(variablesSistema.creadoEn), desc(variablesSistema.id));

    return rows.map((r) => this.mapRow(r));
  }

  async findPesosNotaVigentes(): Promise<VariableSistemaResponseDto[]> {
    const rows = await this.db
      .select({
        variable: variablesSistema,
        usuario: usuarios,
        persona: personas,
      })
      .from(variablesSistema)
      .leftJoin(usuarios, eq(variablesSistema.actualizadoPorId, usuarios.id))
      .leftJoin(personas, eq(usuarios.personaId, personas.id))
      .where(and(like(variablesSistema.codigo, "nota.peso_%"), eq(variablesSistema.vigente, true)));

    return rows.map((r) => this.mapRow(r));
  }

  async crearNuevaVersion(params: {
    variableActualId: number;
    codigo: string;
    descripcion: string;
    modulo: string;
    tipo: string;
    valor: string;
    unidad: string | null;
    valorMinimo: number | null;
    valorMaximo: number | null;
    editable: boolean;
    cargaEnAplicacion: boolean;
    motivoCambio: string;
    actualizadoPorId: string;
  }): Promise<VariableSistemaResponseDto> {
    return await this.db.transaction(async (tx) => {
      await tx
        .update(variablesSistema)
        .set({ vigente: false })
        .where(eq(variablesSistema.id, params.variableActualId));

      const [inserted] = await tx
        .insert(variablesSistema)
        .values({
          codigo: params.codigo,
          descripcion: params.descripcion,
          modulo: params.modulo,
          tipo: params.tipo,
          valor: params.valor,
          unidad: params.unidad,
          valorMinimo: params.valorMinimo !== null ? String(params.valorMinimo) : null,
          valorMaximo: params.valorMaximo !== null ? String(params.valorMaximo) : null,
          editable: params.editable,
          cargaEnAplicacion: params.cargaEnAplicacion,
          vigente: true,
          motivoCambio: params.motivoCambio,
          actualizadoPorId: params.actualizadoPorId,
        })
        .returning();

      return {
        id: inserted.id,
        codigo: inserted.codigo,
        descripcion: inserted.descripcion,
        modulo: inserted.modulo,
        tipo: inserted.tipo as VariableTipo,
        valor: inserted.valor,
        unidad: inserted.unidad,
        valorMinimo: inserted.valorMinimo !== null ? Number(inserted.valorMinimo) : null,
        valorMaximo: inserted.valorMaximo !== null ? Number(inserted.valorMaximo) : null,
        editable: inserted.editable,
        cargaEnAplicacion: inserted.cargaEnAplicacion,
        vigente: inserted.vigente,
        motivoCambio: inserted.motivoCambio,
        actualizadoPorId: inserted.actualizadoPorId,
        creadoEn: inserted.creadoEn,
      };
    });
  }
}
