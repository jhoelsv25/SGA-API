import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { type Job } from "bullmq";
import { type LogAuditParams } from "../../../common/services/audit.service";
import { Database, DRIZZLE } from "../../database";
import { bitacoraAuditoria } from "../../database/schema";
import { QUEUES } from "../queues.constants";

@Processor(QUEUES.AUDIT)
export class AuditProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditProcessor.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {
    super();
  }

  async process(job: Job<LogAuditParams>): Promise<void> {
    const params = job.data;
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
      this.logger.error(
        `Error al persistir auditoría en cola (${job.id}): ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
