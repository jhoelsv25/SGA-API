import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PROVEEDOR_IA } from "./constants";
import {
  ProveedorIa,
  RespuestaEstructuradaIa,
  RespuestaTextoIa,
  SolicitudEstructuradaIa,
  SolicitudTextoIa,
} from "./interfaces";

/**
 * Fachada central del módulo de Inteligencia Artificial.
 * Expone generación de texto y salidas estructuradas vía AI Gateway,
 * con soporte de modelo de respaldo automático (`IA_MODELO_RESPALDO`).
 */
@Injectable()
export class IaService {
  private readonly logger = new Logger(IaService.name);
  private readonly modeloRespaldo: string;

  constructor(
    @Inject(PROVEEDOR_IA) private readonly proveedor: ProveedorIa,
    private readonly configService: ConfigService,
  ) {
    this.modeloRespaldo = this.configService.get<string>("IA_MODELO_RESPALDO", "").trim();
  }

  /** Indica si la IA está habilitada por configuración y el proveedor tiene credenciales listas. */
  estaHabilitada(): boolean {
    const bandera = this.configService.get<string | boolean>("IA_HABILITADA", false);
    const habilitada = bandera === true || bandera === "true";
    return habilitada && this.proveedor.estaConfigurado();
  }

  async generarTexto(solicitud: SolicitudTextoIa): Promise<RespuestaTextoIa> {
    this.asegurarDisponible();
    this.validarPrompt(solicitud.prompt);
    return this.ejecutarConRespaldo(solicitud.modelo, (modelo) =>
      this.proveedor.generarTexto({
        ...solicitud,
        ...(modelo ? { modelo } : {}),
      }),
    );
  }

  async generarEstructurado<T>(
    solicitud: SolicitudEstructuradaIa,
  ): Promise<RespuestaEstructuradaIa<T>> {
    this.asegurarDisponible();
    this.validarPrompt(solicitud.prompt);
    return this.ejecutarConRespaldo(solicitud.modelo, (modelo) =>
      this.proveedor.generarEstructurado<T>({
        ...solicitud,
        ...(modelo ? { modelo } : {}),
      }),
    );
  }

  private async ejecutarConRespaldo<T>(
    modeloSolicitado: string | undefined,
    operacion: (modelo?: string) => Promise<T>,
  ): Promise<T> {
    try {
      return await operacion(modeloSolicitado);
    } catch (error) {
      const esFalloExterno =
        error instanceof BadGatewayException || error instanceof GatewayTimeoutException;

      if (
        esFalloExterno &&
        this.modeloRespaldo.length > 0 &&
        this.modeloRespaldo !== modeloSolicitado
      ) {
        this.logger.warn(
          `Fallo en modelo principal, reintentando con IA_MODELO_RESPALDO="${this.modeloRespaldo}": ${error.message}`,
        );
        return operacion(this.modeloRespaldo);
      }

      throw error;
    }
  }

  private asegurarDisponible(): void {
    if (!this.estaHabilitada()) {
      this.logger.warn(
        `Intento de uso de IA con módulo deshabilitado o sin configurar (proveedor: ${this.proveedor.nombre}).`,
      );
      throw new ServiceUnavailableException(
        "El servicio de Inteligencia Artificial no está habilitado o configurado en el servidor.",
      );
    }
  }

  private validarPrompt(prompt: string): void {
    if (!prompt || prompt.trim().length === 0) {
      throw new BadRequestException("El prompt para la IA no puede estar vacío.");
    }
  }
}
