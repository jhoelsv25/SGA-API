import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUES } from "../../../core/queues/queues.constants";
import { QUEUE_JOB_RECORDAR_COMPROMISOS_OBS } from "../constants";
import { ObservacionesEjecucionService } from "../observaciones-ejecucion.service";

@Processor(QUEUES.OBSERVACIONES_AULA)
export class ObservacionesAulaProcessor extends WorkerHost {
  private readonly logger = new Logger(ObservacionesAulaProcessor.name);

  constructor(private readonly ejecucion: ObservacionesEjecucionService) {
    super();
  }

  async process(job: Job): Promise<void> {
    try {
      if (job.name === QUEUE_JOB_RECORDAR_COMPROMISOS_OBS) {
        const enviados = await this.ejecucion.recordarRevisiones();
        this.logger.log(`Recordatorios de revisión de observaciones enviados: ${enviados}`);
      }
    } catch (error) {
      this.logger.error(`Falló el proceso ${job.name}: ${(error as Error).message}`);
      throw error;
    }
  }
}
