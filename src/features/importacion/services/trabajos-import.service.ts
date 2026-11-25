import {
  BadRequestException,
  Injectable,
  NotFoundException,
  type MessageEvent,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { Observable, timer } from "rxjs";
import { switchMap, takeWhile } from "rxjs/operators";
import { QUEUES } from "../../../core/queues/queues.constants";
import type { EjecutarImportacionResponseDto, EstadoImportacionJobDto } from "../dto";
import { construirExcelCredenciales, type ContextoReporteCredenciales } from "../utils";

/**
 * Servicio especializado en consulta de estado de trabajos BullMQ,
 * transmisión SSE de progreso y exportación del Excel de credenciales generadas.
 */
@Injectable()
export class TrabajosImportService {
  constructor(
    @InjectQueue(QUEUES.IMPORTACION)
    private readonly importacionQueue: Queue,
  ) {}

  async consultarEstadoJob(jobId: string): Promise<EstadoImportacionJobDto> {
    const job = await this.importacionQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Trabajo de importación con ID ${jobId} no encontrado.`);
    }

    const rawState = await job.getState();
    const progreso = typeof job.progress === "number" ? job.progress : 0;

    let estado: "en_cola" | "procesando" | "completado" | "fallido" = "en_cola";
    if (rawState === "active") estado = "procesando";
    else if (rawState === "completed") estado = "completado";
    else if (rawState === "failed") estado = "fallido";

    const returnvalue = job.returnvalue as EjecutarImportacionResponseDto | undefined;
    const mensaje =
      estado === "completado"
        ? returnvalue?.mensaje || "Importación masiva completada con éxito."
        : estado === "procesando"
          ? `Procesando registros (${progreso}%)...`
          : estado === "fallido"
            ? job.failedReason || "Error en el procesamiento del lote."
            : "En cola de espera BullMQ...";

    return {
      jobId: String(job.id),
      estado,
      progreso,
      mensaje,
      resultado: rawState === "completed" ? returnvalue : undefined,
      error:
        rawState === "failed"
          ? job.failedReason || "Error al procesar el archivo de importación."
          : undefined,
    };
  }

  streamProgresoJob(jobId: string): Observable<MessageEvent> {
    return timer(0, 800).pipe(
      switchMap(async () => {
        try {
          const estado = await this.consultarEstadoJob(jobId);
          return { data: estado };
        } catch (err: unknown) {
          const mensaje = err instanceof Error ? err.message : "Error al consultar estado.";
          return {
            data: { jobId, estado: "fallido", progreso: 0, error: mensaje },
          };
        }
      }),
      takeWhile((evento) => {
        const data = evento.data as EstadoImportacionJobDto | undefined;
        return data?.estado !== "completado" && data?.estado !== "fallido";
      }, true),
    );
  }

  async generarReporteCredencialesExcel(
    jobId: string,
    contexto: ContextoReporteCredenciales,
  ): Promise<Buffer> {
    const job = await this.importacionQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Trabajo de importación con ID ${jobId} no encontrado.`);
    }

    const estado = await job.getState();
    if (estado !== "completed") {
      throw new BadRequestException(
        `El trabajo de importación no ha finalizado (estado actual: ${estado}).`,
      );
    }

    const returnvalue = job.returnvalue as EjecutarImportacionResponseDto | undefined;
    const credenciales = returnvalue?.credenciales || [];

    return construirExcelCredenciales(credenciales, contexto);
  }
}
