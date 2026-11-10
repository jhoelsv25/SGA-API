import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUES } from "../../../core/queues/queues.constants";
import { JOB_CERRAR_SESIONES, JOB_EVALUAR_ALERTAS, JOB_GENERAR_SESIONES } from "../constants";
import { SesionesClaseService } from "../sesiones-clase.service";

@Processor(QUEUES.SESIONES_CLASE)
export class SesionesClaseProcessor extends WorkerHost {
  private readonly logger = new Logger(SesionesClaseProcessor.name);

  constructor(private readonly service: SesionesClaseService) {
    super();
  }

  async process(job: Job): Promise<void> {
    try {
      if (job.name === JOB_GENERAR_SESIONES) {
        const creadas = await this.service.generarDelDia();
        this.logger.log(`Sesiones generadas: ${creadas}`);
      } else if (job.name === JOB_EVALUAR_ALERTAS) {
        await this.service.evaluarAlertas();
      } else if (job.name === JOB_CERRAR_SESIONES) {
        await this.service.cerrarDelDia();
        this.logger.log("Sesiones del día cerradas.");
      }
    } catch (error) {
      this.logger.error(`Falló el proceso ${job.name}: ${(error as Error).message}`);
      throw error;
    }
  }
}
