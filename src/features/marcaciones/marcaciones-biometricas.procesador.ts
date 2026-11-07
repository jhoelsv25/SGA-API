import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MarcacionesBiometricasService } from "./marcaciones-biometricas.service";

const INTERVALO_POR_DEFECTO_SEGUNDOS = 30;

/**
 * Revisa cada cierto tiempo las marcaciones crudas pendientes del reloj. Se desactiva con
 * `BIOMETRICO_PROCESADOR_ACTIVO=false` y su intervalo se ajusta con `BIOMETRICO_INTERVALO_SEGUNDOS`.
 */
@Injectable()
export class MarcacionesBiometricasProcesador implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(MarcacionesBiometricasProcesador.name);
  private temporizador?: NodeJS.Timeout;
  private enCurso = false;

  constructor(
    private readonly servicio: MarcacionesBiometricasService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.get<string>("BIOMETRICO_PROCESADOR_ACTIVO") === "false") return;
    if (this.config.get<string>("NODE_ENV") === "test") return;
    const segundos = Number(this.config.get("BIOMETRICO_INTERVALO_SEGUNDOS"));
    const intervaloMs =
      (Number.isFinite(segundos) && segundos >= 5 ? segundos : INTERVALO_POR_DEFECTO_SEGUNDOS) *
      1000;
    this.temporizador = setInterval(() => void this.ejecutar(), intervaloMs);
    this.temporizador.unref();
  }

  onModuleDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  /** Nunca se solapan dos corridas: si la anterior sigue, esta se omite. */
  async ejecutar(): Promise<void> {
    if (this.enCurso) return;
    this.enCurso = true;
    try {
      await this.servicio.procesarPendientes();
    } catch (error) {
      this.logger.error(
        `No se pudieron procesar las marcaciones del reloj: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.enCurso = false;
    }
  }
}
