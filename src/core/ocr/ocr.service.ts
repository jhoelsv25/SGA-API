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
import {
  ESTRATEGIAS_OCR,
  MIME_TYPES_OCR_PERMITIDOS,
  OCR_DEFAULTS,
  TipoEstrategiaOcr,
} from "./constants";
import {
  ArchivoOcr,
  EstrategiaOcr,
  RespuestaOcr,
  RespuestaOcrEstructurada,
  SolicitudOcr,
  SolicitudOcrEstructurada,
} from "./interfaces";
import { decodificarBufferOcr, validarMagicBytesOcr } from "./utils";

/**
 * Servicio contexto del patrón Strategy para OCR.
 * Selecciona la estrategia configurada (`mistral` gratuita por defecto o `glm` de paga)
 * y soporta respaldo automático si la estrategia principal falla.
 */
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly estrategiasPorNombre: Map<TipoEstrategiaOcr, EstrategiaOcr>;
  private readonly estrategiaPorDefecto: TipoEstrategiaOcr;
  private readonly estrategiaRespaldo?: TipoEstrategiaOcr;
  private readonly maxBytes: number;

  constructor(
    @Inject(ESTRATEGIAS_OCR) estrategias: EstrategiaOcr[],
    private readonly configService: ConfigService,
  ) {
    this.estrategiasPorNombre = new Map(
      estrategias.map((estrategia) => [estrategia.nombre, estrategia]),
    );
    this.estrategiaPorDefecto = this.configService
      .get<string>("OCR_ESTRATEGIA", OCR_DEFAULTS.ESTRATEGIA_PRINCIPAL)
      .trim()
      .toLowerCase() as TipoEstrategiaOcr;

    const respaldo = this.configService
      .get<string>("OCR_ESTRATEGIA_RESPALDO", "")
      .trim()
      .toLowerCase();
    this.estrategiaRespaldo = respaldo ? (respaldo as TipoEstrategiaOcr) : undefined;

    this.maxBytes = this.configService.get<number>("OCR_MAX_BYTES", OCR_DEFAULTS.MAX_BYTES);
  }

  /** Indica si el servicio OCR está habilitado y al menos la estrategia principal o de respaldo está lista. */
  estaHabilitado(): boolean {
    const bandera = this.configService.get<string | boolean>("OCR_HABILITADO", false);
    const habilitado = bandera === true || bandera === "true";
    if (!habilitado) {
      return false;
    }

    const principal = this.estrategiasPorNombre.get(this.estrategiaPorDefecto);
    const respaldo = this.estrategiaRespaldo
      ? this.estrategiasPorNombre.get(this.estrategiaRespaldo)
      : undefined;

    return Boolean(principal?.estaConfigurada() || respaldo?.estaConfigurada());
  }

  async extraerTexto(solicitud: SolicitudOcr): Promise<RespuestaOcr> {
    this.validarArchivo(solicitud.archivo);
    return this.ejecutarConEstrategia(solicitud, (estrategia) =>
      estrategia.extraerTexto(solicitud),
    );
  }

  async extraerDatos<T>(solicitud: SolicitudOcrEstructurada): Promise<RespuestaOcrEstructurada<T>> {
    this.validarArchivo(solicitud.archivo);
    return this.ejecutarConEstrategia(solicitud, (estrategia) =>
      estrategia.extraerDatos<T>(solicitud),
    );
  }

  private async ejecutarConEstrategia<T>(
    solicitud: SolicitudOcr,
    operacion: (estrategia: EstrategiaOcr) => Promise<T>,
  ): Promise<T> {
    const nombreElegido = solicitud.estrategia ?? this.estrategiaPorDefecto;
    const principal = this.estrategiasPorNombre.get(nombreElegido);

    if (!principal) {
      throw new BadRequestException(`Estrategia OCR no reconocida: "${nombreElegido}".`);
    }

    const respaldo =
      this.estrategiaRespaldo && this.estrategiaRespaldo !== principal.nombre
        ? this.estrategiasPorNombre.get(this.estrategiaRespaldo)
        : undefined;

    this.asegurarHabilitado(principal, respaldo);

    if (!principal.estaConfigurada() && respaldo?.estaConfigurada()) {
      if (!respaldo.soportaMime(solicitud.archivo.mimeType)) {
        throw new BadRequestException(
          `La estrategia de respaldo "${respaldo.nombre}" no soporta ${solicitud.archivo.mimeType}.`,
        );
      }
      return operacion(respaldo);
    }

    try {
      return await operacion(principal);
    } catch (error) {
      const esFalloExterno =
        error instanceof BadGatewayException || error instanceof GatewayTimeoutException;

      if (
        esFalloExterno &&
        respaldo &&
        respaldo.estaConfigurada() &&
        respaldo.soportaMime(solicitud.archivo.mimeType)
      ) {
        this.logger.warn(
          `Fallo en estrategia OCR "${principal.nombre}", reintentando con respaldo "${respaldo.nombre}": ${error.message}`,
        );
        return operacion(respaldo);
      }

      throw error;
    }
  }

  private asegurarHabilitado(principal: EstrategiaOcr, respaldo?: EstrategiaOcr): void {
    const bandera = this.configService.get<string | boolean>("OCR_HABILITADO", false);
    const habilitado = bandera === true || bandera === "true";
    const hayLista = principal.estaConfigurada() || Boolean(respaldo?.estaConfigurada());

    if (!habilitado || !hayLista) {
      this.logger.warn(
        `Intento de uso de OCR deshabilitado o sin configurar (estrategia: ${principal.nombre}).`,
      );
      throw new ServiceUnavailableException(
        "El servicio de OCR no está habilitado o configurado en el servidor.",
      );
    }
  }

  private validarArchivo(archivo: ArchivoOcr): void {
    if (!MIME_TYPES_OCR_PERMITIDOS.includes(archivo.mimeType)) {
      throw new BadRequestException(
        `Tipo de archivo no soportado para OCR (${archivo.mimeType}). Permitidos: ${MIME_TYPES_OCR_PERMITIDOS.join(", ")}.`,
      );
    }

    const buffer = decodificarBufferOcr(archivo);
    const bytes = buffer.byteLength;

    if (bytes === 0) {
      throw new BadRequestException("El archivo enviado para OCR está vacío.");
    }

    if (bytes > this.maxBytes) {
      throw new BadRequestException(
        `El archivo para OCR supera el tamaño máximo permitido de ${Math.round(this.maxBytes / (1024 * 1024))} MB.`,
      );
    }

    if (!validarMagicBytesOcr(buffer, archivo.mimeType)) {
      throw new BadRequestException(
        `El contenido binario del archivo no coincide con el tipo declarado (${archivo.mimeType}).`,
      );
    }
  }
}
