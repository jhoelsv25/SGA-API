import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUES } from "../../../core/queues/queues.constants";
import { JOB_RECORDATORIO_TAREAS } from "../constants";
import { AulaVirtualService } from "../aula-virtual.service";

@Processor(QUEUES.AULA_VIRTUAL)
export class RecordatorioTareasProcessor extends WorkerHost {
  private readonly logger = new Logger(RecordatorioTareasProcessor.name);

  constructor(private readonly service: AulaVirtualService) {
    super();
  }

  async process(job: Job): Promise<void> {
    try {
      if (job.name === JOB_RECORDATORIO_TAREAS) {
        const resultado = await this.service.procesarRecordatoriosYVencimientos();
        if (resultado.recordatoriosEnviados > 0 || resultado.vencimientosEnviados > 0) {
          this.logger.log(
            `Recordatorios enviados: ${resultado.recordatoriosEnviados}, Vencimientos notificados: ${resultado.vencimientosEnviados}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Falló el proceso ${job.name}: ${(error as Error).message}`);
      throw error;
    }
  }
}
