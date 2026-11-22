import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUES } from "../../../core/queues/queues.constants";
import { type ReporteJobPayload, type ReporteJobResultado, ReportesColaService } from "../services";

@Processor(QUEUES.REPORTS)
export class ReportesProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportesProcessor.name);

  constructor(private readonly reportesCola: ReportesColaService) {
    super();
  }

  async process(job: Job<ReporteJobPayload, ReporteJobResultado>): Promise<ReporteJobResultado> {
    this.logger.log(
      `Generando reporte asíncrono [${job.data.dto.tipo}] (job ${job.id}) para ${job.data.usuario.username}`,
    );
    try {
      const resultado = await this.reportesCola.procesarTrabajo(job);
      this.logger.log(
        `Reporte completado (job ${job.id}): ${resultado.nombreArchivo} (${resultado.tamanoBytes} bytes)`,
      );
      return resultado;
    } catch (error) {
      this.logger.error(
        `Error generando reporte (job ${job.id}): ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
