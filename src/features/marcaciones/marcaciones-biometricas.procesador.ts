import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "pg";
import { MarcacionesBiometricasService } from "./marcaciones-biometricas.service";

/** Canal en el que avisa el programa del reloj (SGA-NET-BIOMETRICO) al terminar cada sincronización correcta. */
export const CANAL_PROCESAR_BIOMETRICO = "biometrico_procesar";

const ESPERA_RECONEXION_MS = 5_000;
const ESPERA_RECONEXION_MAXIMA_MS = 60_000;

/**
 * Convierte las marcaciones crudas del reloj en asistencia SOLO cuando el programa del reloj sincroniza (tarea programada de
 * Windows o botón «Sincronizar»): ese programa ejecuta `NOTIFY biometrico_procesar` y aquí se escucha con `LISTEN`.
 * No hay revisión periódica. Se desactiva con `BIOMETRICO_PROCESADOR_ACTIVO=false`.
 */
@Injectable()
export class MarcacionesBiometricasProcesador implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(MarcacionesBiometricasProcesador.name);
  private cliente?: Client;
  private cerrando = false;
  private esperaReconexionMs = ESPERA_RECONEXION_MS;
  private temporizadorReconexion?: NodeJS.Timeout;
  private enCurso = false;
  private repetir = false;

  constructor(
    private readonly servicio: MarcacionesBiometricasService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.get<string>("BIOMETRICO_PROCESADOR_ACTIVO") === "false") return;
    if (this.config.get<string>("NODE_ENV") === "test") return;
    void this.escuchar();
  }

  async onModuleDestroy(): Promise<void> {
    this.cerrando = true;
    if (this.temporizadorReconexion) clearTimeout(this.temporizadorReconexion);
    await this.cliente?.end().catch(() => undefined);
  }

  /** Conexión propia (no del pool): LISTEN necesita una sesión que quede abierta. Si se cae, se reconecta. */
  private async escuchar(): Promise<void> {
    const connectionString = this.config.getOrThrow<string>("DATABASE_URL");
    const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
    const cliente = new Client({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
    });
    this.cliente = cliente;
    cliente.on("notification", (aviso) => {
      if (aviso.channel === CANAL_PROCESAR_BIOMETRICO) void this.ejecutar();
    });
    cliente.on("error", (error) => this.reconectar(cliente, error));
    cliente.on("end", () => this.reconectar(cliente));
    try {
      await cliente.connect();
      await cliente.query(`LISTEN ${CANAL_PROCESAR_BIOMETRICO}`);
      this.esperaReconexionMs = ESPERA_RECONEXION_MS;
      this.logger.log(
        `Esperando sincronizaciones del reloj (LISTEN ${CANAL_PROCESAR_BIOMETRICO}).`,
      );
    } catch (error) {
      this.reconectar(cliente, error);
    }
  }

  private reconectar(cliente: Client, error?: unknown): void {
    if (this.cerrando || this.cliente !== cliente) return;
    this.cliente = undefined;
    cliente.removeAllListeners();
    void cliente.end().catch(() => undefined);
    const detalle = error instanceof Error ? `: ${error.message}` : "";
    this.logger.warn(
      `Se perdió la escucha de sincronizaciones del reloj${detalle}. Reintento en ${this.esperaReconexionMs / 1000} s.`,
    );
    this.temporizadorReconexion = setTimeout(() => void this.escuchar(), this.esperaReconexionMs);
    this.temporizadorReconexion.unref();
    this.esperaReconexionMs = Math.min(this.esperaReconexionMs * 2, ESPERA_RECONEXION_MAXIMA_MS);
  }

  /**
   * Nunca se solapan dos corridas. Si llega otro aviso mientras se procesa, se hace una corrida más al terminar,
   * para no dejar sin convertir las marcas de esa última sincronización.
   */
  async ejecutar(): Promise<void> {
    if (this.enCurso) {
      this.repetir = true;
      return;
    }
    this.enCurso = true;
    try {
      do {
        this.repetir = false;
        await this.servicio.procesarPendientes();
      } while (this.repetir);
    } catch (error) {
      this.logger.error(
        `No se pudieron procesar las marcaciones del reloj: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.enCurso = false;
    }
  }
}
