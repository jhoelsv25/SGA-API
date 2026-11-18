import { BadGatewayException, BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MimeTypeOcr, OCR_DEFAULTS, TIPOS_ESTRATEGIA_OCR } from "../constants";
import {
  EstrategiaOcr,
  RespuestaApiVisionGlm,
  RespuestaOcr,
  RespuestaOcrEstructurada,
  SolicitudOcr,
  SolicitudOcrEstructurada,
} from "../interfaces";
import { archivoOcrABase64, ejecutarPeticionOcr, parsearJsonOcr } from "../utils";

/**
 * Estrategia OCR usando GLM Vision (Zhipu AI / BigModel, de paga).
 * Soporta imágenes (JPEG, PNG, WEBP).
 */
@Injectable()
export class EstrategiaOcrGlm implements EstrategiaOcr {
  readonly nombre = TIPOS_ESTRATEGIA_OCR.GLM;

  private readonly apiKey: string;
  private readonly modeloPorDefecto: string;
  private readonly urlBase: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.apiKey =
      this.configService.get<string>("OCR_GLM_API_KEY", "").trim() ||
      this.configService.get<string>("IA_GLM_API_KEY", "").trim();
    this.modeloPorDefecto = this.configService.get<string>(
      "OCR_GLM_MODELO",
      OCR_DEFAULTS.MODELO_GLM_OCR,
    );
    this.urlBase = this.configService
      .get<string>("OCR_GLM_URL_BASE", OCR_DEFAULTS.URL_BASE_GLM)
      .replace(/\/+$/, "");
    this.timeoutMs = this.configService.get<number>("OCR_TIMEOUT_MS", OCR_DEFAULTS.TIMEOUT_MS);
  }

  estaConfigurada(): boolean {
    return this.apiKey.length > 0;
  }

  soportaMime(mimeType: MimeTypeOcr): boolean {
    return mimeType !== "application/pdf";
  }

  async extraerTexto(solicitud: SolicitudOcr): Promise<RespuestaOcr> {
    this.validarImagen(solicitud.archivo.mimeType);
    const modelo = solicitud.modelo ?? this.modeloPorDefecto;
    const instruccion =
      solicitud.instruccion ??
      "Extrae todo el texto visible de la imagen de forma fiel, respetando el orden de lectura y saltos de línea. Devuelve únicamente el texto extraído.";

    const textoExtraido = await this.invocarVision(modelo, instruccion, solicitud, false);

    return {
      textoExtraido,
      modelo,
      estrategia: this.nombre,
    };
  }

  async extraerDatos<T>(solicitud: SolicitudOcrEstructurada): Promise<RespuestaOcrEstructurada<T>> {
    this.validarImagen(solicitud.archivo.mimeType);
    const modelo = solicitud.modelo ?? this.modeloPorDefecto;
    const baseInstruccion =
      solicitud.instruccion ??
      "Analiza la imagen adjunta y extrae la información en formato JSON válido.";
    const instruccion = solicitud.esquemaJson
      ? `${baseInstruccion}\nEsquema esperado: ${JSON.stringify(solicitud.esquemaJson)}`
      : baseInstruccion;

    const textoCrudo = await this.invocarVision(modelo, instruccion, solicitud, true);
    const datos = parsearJsonOcr<T>(textoCrudo);

    return {
      datos,
      textoCrudo,
      modelo,
      estrategia: this.nombre,
    };
  }

  private validarImagen(mimeType: MimeTypeOcr): void {
    if (!this.soportaMime(mimeType)) {
      throw new BadRequestException(
        "La estrategia OCR de GLM solo admite imágenes (JPEG, PNG, WEBP). Usa la estrategia mistral para PDFs directos.",
      );
    }
  }

  private async invocarVision(
    modelo: string,
    instruccion: string,
    solicitud: SolicitudOcr,
    formatoJson: boolean,
  ): Promise<string> {
    const base64 = archivoOcrABase64(solicitud.archivo);

    const respuestaCruda = (await ejecutarPeticionOcr(
      `${this.urlBase}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: modelo,
          temperature: 0.1,
          ...(formatoJson ? { response_format: { type: "json_object" } } : {}),
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: instruccion },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${solicitud.archivo.mimeType};base64,${base64}`,
                  },
                },
              ],
            },
          ],
        }),
      },
      this.timeoutMs,
      this.nombre,
    )) as RespuestaApiVisionGlm;

    const contenido = respuestaCruda.choices?.[0]?.message?.content?.trim() ?? "";

    if (!contenido) {
      throw new BadGatewayException(
        "La estrategia OCR de GLM no devolvió contenido en la respuesta.",
      );
    }

    return contenido;
  }
}
