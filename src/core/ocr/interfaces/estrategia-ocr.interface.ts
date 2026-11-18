import { MimeTypeOcr, TipoEstrategiaOcr } from "../constants";

export interface ArchivoOcr {
  /** Contenido binario o cadena Base64 sin prefijo data URI. */
  contenido: Buffer | string;
  mimeType: MimeTypeOcr;
}

export interface SolicitudOcr {
  archivo: ArchivoOcr;
  /** Instrucción adicional para guiar la lectura o extracción. */
  instruccion?: string;
  /** Permite forzar una estrategia concreta ("mistral" | "glm") por petición. */
  estrategia?: TipoEstrategiaOcr;
  modelo?: string;
}

export interface SolicitudOcrEstructurada extends SolicitudOcr {
  /** Esquema JSON opcional para guiar la estructura de salida. */
  esquemaJson?: Record<string, unknown>;
}

export interface RespuestaOcr {
  textoExtraido: string;
  modelo: string;
  estrategia: TipoEstrategiaOcr;
}

export interface RespuestaOcrEstructurada<T> {
  datos: T;
  textoCrudo: string;
  modelo: string;
  estrategia: TipoEstrategiaOcr;
}

export type DocumentoOcrMistral =
  { type: "document_url"; document_url: string } | { type: "image_url"; image_url: string };

export interface RespuestaApiOcrMistral {
  model?: string;
  pages?: Array<{
    index?: number;
    markdown?: string;
  }>;
}

export interface RespuestaApiVisionGlm {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

/**
 * Contrato del patrón Strategy para proveedores de OCR.
 */
export interface EstrategiaOcr {
  readonly nombre: TipoEstrategiaOcr;

  estaConfigurada(): boolean;

  soportaMime(mimeType: MimeTypeOcr): boolean;

  extraerTexto(solicitud: SolicitudOcr): Promise<RespuestaOcr>;

  extraerDatos<T>(solicitud: SolicitudOcrEstructurada): Promise<RespuestaOcrEstructurada<T>>;
}
