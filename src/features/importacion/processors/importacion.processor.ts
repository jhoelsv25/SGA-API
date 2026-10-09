import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUES } from "../../../core/queues/queues.constants";
import type { EjecutarImportacionDto, EjecutarImportacionResponseDto } from "../dto";
import { ImportacionService } from "../importacion.service";

export interface ImportacionJobPayload {
  dto: EjecutarImportacionDto;
  actorId: string;
  ip?: string;
}

@Processor(QUEUES.IMPORTACION)
export class ImportacionProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportacionProcessor.name);

  constructor(private readonly importacionService: ImportacionService) {
    super();
  }

  async process(job: Job<ImportacionJobPayload>): Promise<EjecutarImportacionResponseDto> {
    this.logger.log(`Procesando trabajo de importación (${job.id}) en segundo plano (BullMQ)...`);
    const { dto, actorId, ip } = job.data;
    try {
      const resultado = await this.importacionService.ejecutarProcesoLote(dto, actorId, ip, job);
      this.logger.log(
        `Trabajo de importación (${job.id}) completado con éxito: ${resultado.importadosCount} importados, ${resultado.omitidosCount} omitidos`,
      );
      return resultado;
    } catch (error) {
      this.logger.error(
        `Error al ejecutar trabajo de importación (${job.id}): ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
