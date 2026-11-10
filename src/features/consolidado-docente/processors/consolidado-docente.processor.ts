import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUES } from "../../../core/queues/queues.constants";
import { CompromisosConsolidadoService } from "../compromisos-consolidado.service";
import { JOB_RECORDAR_COMPROMISOS } from "../constants";

@Processor(QUEUES.CONSOLIDADO_DOCENTE)
export class ConsolidadoDocenteProcessor extends WorkerHost {
  private readonly logger = new Logger(ConsolidadoDocenteProcessor.name);

  constructor(private readonly compromisos: CompromisosConsolidadoService) {
    super();
  }

  async process(job: Job): Promise<void> {
    try {
      if (job.name === JOB_RECORDAR_COMPROMISOS) {
        const enviados = await this.compromisos.recordarCompromisosDeHoy();
        this.logger.log(`Recordatorios de compromisos enviados: ${enviados}`);
      }
    } catch (error) {
      this.logger.error(`Falló el proceso ${job.name}: ${(error as Error).message}`);
      throw error;
    }
  }
}
