import { InjectQueue } from "@nestjs/bullmq";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { Queue } from "bullmq";
import { Database, DRIZZLE } from "../../core/database";
import { bitacoraAuditoria } from "../../core/database/schema";
import { QUEUES } from "../../core/queues/queues.constants";

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

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    @Optional()
    @InjectQueue(QUEUES.AUDIT)
    private readonly auditQueue?: Queue<LogAuditParams>,
  ) {}

  async log(params: LogAuditParams): Promise<void> {
    if (this.auditQueue) {
      try {
        await this.auditQueue.add("registrar-evento", params, {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        });
        return;
      } catch (queueError) {
        this.logger.warn(
          `No se pudo encolar en BullMQ (${(queueError as Error).message}), insertando directamente en BD...`,
        );
      }
    }

    // Inserción directa (fallback si la cola no está disponible o en pruebas)
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
      this.logger.warn(
        `No se pudo registrar en bitácora de auditoría: ${(error as Error).message}`,
      );
    }
  }
}
