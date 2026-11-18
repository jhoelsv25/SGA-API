import { BadGatewayException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createGateway, generateText, jsonSchema, JSONSchema7, Output } from "ai";
import { IA_DEFAULTS } from "../constants";
import {
  ProveedorIa,
  RespuestaEstructuradaIa,
  RespuestaTextoIa,
  SolicitudEstructuradaIa,
  SolicitudTextoIa,
  UsoTokensIa,
} from "../interfaces";
import { obtenerConfigIa } from "../utils";

/**
 * Adaptador unificado usando Vercel AI SDK (`ai`) + Vercel AI Gateway.
 * Permite invocar cualquier modelo (`mistral/mistral-small-latest`, `zai/glm-4.5`,
 * `google/gemini-2.5-flash`, etc.) con una sola clave `AI_GATEWAY_API_KEY`.
 */
@Injectable()
export class ProveedorVercelGateway implements ProveedorIa {
  readonly nombre = IA_DEFAULTS.NOMBRE_PROVEEDOR;

  private readonly apiKey: string;
  private readonly modeloPorDefecto: string;
  private readonly timeoutMs: number;
  private readonly gateway: ReturnType<typeof createGateway>;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = obtenerConfigIa(this.configService, "AI_GATEWAY_API_KEY", "IA_API_KEY");
    this.modeloPorDefecto = obtenerConfigIa(
      this.configService,
      "IA_MODELO",
      "IA_GATEWAY_MODELO",
      IA_DEFAULTS.MODELO_GATEWAY,
    );
    this.timeoutMs = this.configService.get<number>("IA_TIMEOUT_MS", IA_DEFAULTS.TIMEOUT_MS);

    const urlBase = this.configService.get<string>("IA_URL_BASE", "").trim();
    this.gateway = createGateway({
      apiKey: this.apiKey,
      ...(urlBase ? { baseURL: urlBase } : {}),
    });
  }

  estaConfigurado(): boolean {
    return this.apiKey.length > 0;
  }

  async generarTexto(solicitud: SolicitudTextoIa): Promise<RespuestaTextoIa> {
    const modelo = solicitud.modelo ?? this.modeloPorDefecto;

    try {
      const resultado = await generateText({
        model: this.gateway(modelo),
        system: solicitud.instruccionSistema,
        prompt: solicitud.prompt,
        temperature: solicitud.temperatura ?? IA_DEFAULTS.TEMPERATURA_TEXTO,
        maxOutputTokens: solicitud.maxTokensSalida,
        timeout: this.timeoutMs,
      });

      return {
        texto: resultado.text.trim(),
        modelo,
        proveedor: this.nombre,
        uso: this.mapearUso(resultado.usage),
      };
    } catch (error) {
      throw this.envolverError(error);
    }
  }

  async generarEstructurado<T>(
    solicitud: SolicitudEstructuradaIa,
  ): Promise<RespuestaEstructuradaIa<T>> {
    const modelo = solicitud.modelo ?? this.modeloPorDefecto;

    try {
      const salida = solicitud.esquemaJson
        ? Output.object({
            schema: jsonSchema<T>(solicitud.esquemaJson as JSONSchema7),
          })
        : Output.json();

      const resultado = await generateText({
        model: this.gateway(modelo),
        system: solicitud.instruccionSistema,
        prompt: solicitud.prompt,
        output: salida,
        temperature: solicitud.temperatura ?? IA_DEFAULTS.TEMPERATURA_ESTRUCTURADA,
        maxOutputTokens: solicitud.maxTokensSalida,
        timeout: this.timeoutMs,
      });

      return {
        datos: resultado.output as T,
        textoCrudo: resultado.text,
        modelo,
        proveedor: this.nombre,
        uso: this.mapearUso(resultado.usage),
      };
    } catch (error) {
      throw this.envolverError(error);
    }
  }

  private mapearUso(usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  }): UsoTokensIa | undefined {
    if (!usage) {
      return undefined;
    }
    return {
      tokensEntrada: usage.inputTokens ?? 0,
      tokensSalida: usage.outputTokens ?? 0,
      tokensTotal: usage.totalTokens ?? 0,
    };
  }

  private envolverError(error: unknown): BadGatewayException {
    const mensaje = error instanceof Error ? error.message : "Error desconocido en AI Gateway";
    return new BadGatewayException(`Error al consultar Vercel AI Gateway: ${mensaje}`);
  }
}
