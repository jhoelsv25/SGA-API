import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUES } from "../../../core/queues/queues.constants";
import { AniosAcademicosService } from "../anios.service";

@Processor(QUEUES.ANIO_ESCOLAR)
export class ReaperturaProcessor extends WorkerHost {
  private readonly logger = new Logger(ReaperturaProcessor.name);

  constructor(private readonly aniosService: AniosAcademicosService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== "cerrar-reaperturas") return;
    try {
      const cerrados = await this.aniosService.cerrarReaperturasVencidas();
      this.logger.log(`Reaperturas vencidas cerradas: ${cerrados}`);
    } catch (error) {
      this.logger.error(
        `No se pudieron cerrar las reaperturas vencidas: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
