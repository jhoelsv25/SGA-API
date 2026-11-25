import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, OnModuleInit, Optional } from "@nestjs/common";
import type { Queue } from "bullmq";
import { QUEUES } from "../../../core/queues/queues.constants";
import { ahoraEnColegio } from "../../marcaciones/utils";
import { CRON_RECORDAR_COMPROMISOS_OBS, QUEUE_JOB_RECORDAR_COMPROMISOS_OBS } from "../constants";
import type {
  AgregarCompromisoDto,
  CalificarDesempenoDto,
  CerrarCompromisoObsDto,
  CerrarNotasDto,
  CerrarRetroalimentacionDto,
  CorregirCalificacionDto,
  CorregirCompromisoDto,
  EditarNotaDto,
  IniciarObservacionDto,
  RegistrarNotaDto,
  RegistrarReunionDto,
} from "../dto";
import type { ActorObservacion } from "../interfaces";
import { ObservacionesComunService } from "./observaciones-comun.service";
import { ObservacionesNotasService } from "./observaciones-notas.service";
import { ObservacionesRetroalimentacionService } from "./observaciones-retroalimentacion.service";

/** Fachada de ejecución: toma de notas, calificación, retroalimentación y compromisos (RF-023, HU2 a HU5). */
@Injectable()
export class ObservacionesEjecucionService implements OnModuleInit {
  private readonly logger = new Logger(ObservacionesEjecucionService.name);
  private readonly notas: ObservacionesNotasService;
  private readonly retro: ObservacionesRetroalimentacionService;

  constructor(
    comun: ObservacionesComunService,
    @Optional()
    @InjectQueue(QUEUES.OBSERVACIONES_AULA)
    private readonly cola?: Queue,
    @Optional() notasSvc?: ObservacionesNotasService,
    @Optional() retroSvc?: ObservacionesRetroalimentacionService,
  ) {
    this.notas = notasSvc ?? new ObservacionesNotasService(comun);
    this.retro = retroSvc ?? new ObservacionesRetroalimentacionService(comun);
  }

  async onModuleInit(): Promise<void> {
    if (!this.cola) return;
    try {
      await this.cola.upsertJobScheduler(
        QUEUE_JOB_RECORDAR_COMPROMISOS_OBS,
        { pattern: CRON_RECORDAR_COMPROMISOS_OBS, tz: "America/Lima" },
        { name: QUEUE_JOB_RECORDAR_COMPROMISOS_OBS, data: {} },
      );
    } catch (error) {
      this.logger.warn(`No se pudo programar el recordatorio: ${(error as Error).message}`);
    }
  }

  detalle(id: string, actor: ActorObservacion) {
    return this.notas.detalle(id, actor);
  }

  iniciar(id: string, dto: IniciarObservacionDto, actor: ActorObservacion) {
    return this.notas.iniciar(id, dto, actor);
  }

  registrarNota(id: string, dto: RegistrarNotaDto, actor: ActorObservacion) {
    return this.notas.registrarNota(id, dto, actor);
  }

  editarNota(id: string, notaId: string, dto: EditarNotaDto, actor: ActorObservacion) {
    return this.notas.editarNota(id, notaId, dto, actor);
  }

  cerrarNotas(id: string, dto: CerrarNotasDto, actor: ActorObservacion) {
    return this.notas.cerrarNotas(id, dto, actor);
  }

  fichaCalificacion(id: string, actor: ActorObservacion) {
    return this.notas.fichaCalificacion(id, actor);
  }

  calificar(id: string, desempeno: number, dto: CalificarDesempenoDto, actor: ActorObservacion) {
    return this.notas.calificar(id, desempeno, dto, actor);
  }

  cerrarCalificacion(id: string, actor: ActorObservacion) {
    return this.notas.cerrarCalificacion(id, actor);
  }

  corregirCalificacion(
    id: string,
    desempeno: number,
    dto: CorregirCalificacionDto,
    actor: ActorObservacion,
  ) {
    return this.notas.corregirCalificacion(id, desempeno, dto, actor);
  }

  registrarReunion(id: string, dto: RegistrarReunionDto, actor: ActorObservacion) {
    return this.retro.registrarReunion(id, dto, actor);
  }

  agregarCompromiso(id: string, dto: AgregarCompromisoDto, actor: ActorObservacion) {
    return this.retro.agregarCompromiso(id, dto, actor);
  }

  corregirCompromiso(
    id: string,
    compromisoId: string,
    dto: CorregirCompromisoDto,
    actor: ActorObservacion,
  ) {
    return this.retro.corregirCompromiso(id, compromisoId, dto, actor);
  }

  cerrarRetroalimentacion(id: string, dto: CerrarRetroalimentacionDto, actor: ActorObservacion) {
    return this.retro.cerrarRetroalimentacion(id, dto, actor);
  }

  subirArchivoFirmado(
    id: string,
    archivo: Express.Multer.File | undefined,
    actor: ActorObservacion,
  ) {
    return this.retro.subirArchivoFirmado(id, archivo, actor);
  }

  cerrarCompromiso(compromisoId: string, dto: CerrarCompromisoObsDto, actor: ActorObservacion) {
    return this.retro.cerrarCompromiso(compromisoId, dto, actor);
  }

  seguimientosPorRevisar() {
    return this.retro.seguimientosPorRevisar();
  }

  recordarRevisiones(hoy = ahoraEnColegio().fecha): Promise<number> {
    return this.retro.recordarRevisiones(hoy);
  }
}
