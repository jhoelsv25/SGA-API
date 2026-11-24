import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUES } from "../../../core/queues/queues.constants";
import type {
  EjecutarImportacionDto,
  EjecutarImportacionResponseDto,
  ResultadoFotosDto,
} from "../dto";
import { ImportacionService } from "../importacion.service";
import { FotosImportService, type FotosJobPayload } from "../services/fotos-import.service";

export interface ImportacionJobPayload {
  dto: EjecutarImportacionDto;
  actorId: string;
  ip?: string;
  anioAcademicoId?: string;
}

@Processor(QUEUES.IMPORTACION)
export class ImportacionProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportacionProcessor.name);

  constructor(
    private readonly importacionService: ImportacionService,
    private readonly fotosImportService: FotosImportService,
  ) {
    super();
  }

  async process(
    job: Job<ImportacionJobPayload | FotosJobPayload>,
  ): Promise<EjecutarImportacionResponseDto | ResultadoFotosDto> {
    if (job.name === "importar-fotos") {
      this.logger.log(`Procesando trabajo de fotos (${job.id}) en segundo plano (BullMQ)...`);
      return this.fotosImportService.procesarFotosJob(
        job.data as FotosJobPayload,
        job as Job<FotosJobPayload>,
      );
    }

    this.logger.log(`Procesando trabajo de importación (${job.id}) en segundo plano (BullMQ)...`);
    const { dto, actorId, ip, anioAcademicoId } = job.data as ImportacionJobPayload;
    try {
      const resultado = await this.importacionService.ejecutarProcesoLote(
        dto,
        actorId,
        ip,
        job as Job<ImportacionJobPayload>,
        anioAcademicoId,
      );
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
