export interface UsoTokensIa {
  tokensEntrada: number;
  tokensSalida: number;
  tokensTotal: number;
}

export interface SolicitudTextoIa {
  prompt: string;
  instruccionSistema?: string;
  modelo?: string;
  temperatura?: number;
  maxTokensSalida?: number;
}

export interface SolicitudEstructuradaIa extends SolicitudTextoIa {
  /** Esquema JSON opcional para guiar la respuesta estructurada del proveedor. */
  esquemaJson?: Record<string, unknown>;
}

export interface RespuestaTextoIa {
  texto: string;
  modelo: string;
  proveedor: string;
  uso?: UsoTokensIa;
}

export interface RespuestaEstructuradaIa<T> {
  datos: T;
  textoCrudo: string;
  modelo: string;
  proveedor: string;
  uso?: UsoTokensIa;
}

/**
 * Contrato común para proveedores de generación de texto y salidas estructuradas.
 */
export interface ProveedorIa {
  readonly nombre: string;

  estaConfigurado(): boolean;

  generarTexto(solicitud: SolicitudTextoIa): Promise<RespuestaTextoIa>;

  generarEstructurado<T>(solicitud: SolicitudEstructuradaIa): Promise<RespuestaEstructuradaIa<T>>;
}
