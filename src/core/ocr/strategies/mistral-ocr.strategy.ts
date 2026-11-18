import { BadGatewayException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IaService } from "../../ia";
import {
  MIME_TYPES_OCR_PERMITIDOS,
  MimeTypeOcr,
  OCR_DEFAULTS,
  TIPOS_ESTRATEGIA_OCR,
} from "../constants";
import {
  DocumentoOcrMistral,
  EstrategiaOcr,
  RespuestaApiOcrMistral,
  RespuestaOcr,
  RespuestaOcrEstructurada,
  SolicitudOcr,
  SolicitudOcrEstructurada,
} from "../interfaces";
import { archivoOcrABase64, ejecutarPeticionOcr } from "../utils";

/**
 * Estrategia OCR usando Mistral (`/v1/ocr` con `mistral-ocr-latest`, capa gratuita).
 * Soporta imágenes y PDFs directos.
 */
@Injectable()
export class EstrategiaOcrMistral implements EstrategiaOcr {
  readonly nombre = TIPOS_ESTRATEGIA_OCR.MISTRAL;

  private readonly apiKey: string;
  private readonly modeloPorDefecto: string;
  private readonly urlBase: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly iaService: IaService,
  ) {
    this.apiKey =
      this.configService.get<string>("OCR_MISTRAL_API_KEY", "").trim() ||
      this.configService.get<string>("IA_MISTRAL_API_KEY", "").trim();
    this.modeloPorDefecto = this.configService.get<string>(
      "OCR_MISTRAL_MODELO",
      OCR_DEFAULTS.MODELO_MISTRAL_OCR,
    );
    this.urlBase = this.configService
      .get<string>("OCR_MISTRAL_URL_BASE", OCR_DEFAULTS.URL_BASE_MISTRAL)
      .replace(/\/+$/, "");
    this.timeoutMs = this.configService.get<number>("OCR_TIMEOUT_MS", OCR_DEFAULTS.TIMEOUT_MS);
  }

  estaConfigurada(): boolean {
    return this.apiKey.length > 0;
  }

  soportaMime(mimeType: MimeTypeOcr): boolean {
    return MIME_TYPES_OCR_PERMITIDOS.includes(mimeType);
  }

  async extraerTexto(solicitud: SolicitudOcr): Promise<RespuestaOcr> {
    const modelo = solicitud.modelo ?? this.modeloPorDefecto;
    const base64 = archivoOcrABase64(solicitud.archivo);
    const dataUri = `data:${solicitud.archivo.mimeType};base64,${base64}`;

    const documento: DocumentoOcrMistral =
      solicitud.archivo.mimeType === "application/pdf"
        ? { type: "document_url", document_url: dataUri }
        : { type: "image_url", image_url: dataUri };

    const respuestaCruda = (await ejecutarPeticionOcr(
      `${this.urlBase}/ocr`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: modelo,
          document: documento,
          include_image_base64: false,
        }),
      },
      this.timeoutMs,
      this.nombre,
    )) as RespuestaApiOcrMistral;

    const textoExtraido = (respuestaCruda.pages ?? [])
      .map((pagina) => pagina.markdown?.trim() ?? "")
      .filter((contenido) => contenido.length > 0)
      .join("\n\n---\n\n")
      .trim();

    if (!textoExtraido) {
      throw new BadGatewayException(
        "El servicio OCR de Mistral no devolvió texto legible del documento.",
      );
    }

    return {
      textoExtraido,
      modelo: respuestaCruda.model ?? modelo,
      estrategia: this.nombre,
    };
  }

  async extraerDatos<T>(solicitud: SolicitudOcrEstructurada): Promise<RespuestaOcrEstructurada<T>> {
    const ocr = await this.extraerTexto(solicitud);
    const instruccion =
      solicitud.instruccion ??
      "Extrae la información del documento transcrito y devuélvela en formato JSON válido.";

    const estructurado = await this.iaService.generarEstructurado<T>({
      prompt: `${instruccion}\n\nContenido extraído del documento:\n${ocr.textoExtraido}`,
      esquemaJson: solicitud.esquemaJson,
    });

    return {
      datos: estructurado.datos,
      textoCrudo: estructurado.textoCrudo,
      modelo: ocr.modelo,
      estrategia: this.nombre,
    };
  }
}
