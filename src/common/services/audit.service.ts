import { Inject, Injectable, Logger } from "@nestjs/common";
import { Database, DRIZZLE } from "../../core/database";
import { bitacoraAuditoria } from "../../core/database/schema";

export type AuditAction = "crear" | "actualizar" | "eliminar" | "iniciar_sesion" | "cerrar_sesion";

export interface LogAuditParams {
  usuarioId?: string | null;
  accion: AuditAction;
  tabla: string;
  registroId?: string | null;
  valorAnterior?: Record<string, unknown> | null;
  valorNuevo?: Record<string, unknown> | null;
  direccionIp?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async log(params: LogAuditParams): Promise<void> {
    try {
      await this.db.insert(bitacoraAuditoria).values({
        usuarioId: params.usuarioId ?? null,
        accion: params.accion,
        tabla: params.tabla,
        registroId: params.registroId ?? null,
        valorAnterior: params.valorAnterior ?? null,
        valorNuevo: params.valorNuevo ?? null,
        direccionIp: params.direccionIp ?? null,
      });
    } catch (error) {
      // Registrar warning pero no interrumpir la transacción principal si la bitácora falla
      this.logger.warn(
        `No se pudo registrar en bitácora de auditoría: ${(error as Error).message}`,
      );
    }
  }
}
