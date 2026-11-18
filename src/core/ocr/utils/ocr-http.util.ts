import { BadGatewayException, BadRequestException, GatewayTimeoutException } from "@nestjs/common";
import { ArchivoOcr } from "../interfaces";

export function archivoOcrABase64(archivo: ArchivoOcr): string {
  if (Buffer.isBuffer(archivo.contenido)) {
    return archivo.contenido.toString("base64");
  }

  const limpio = archivo.contenido.replace(/^data:[^;]+;base64,/, "").trim();
  if (!limpio) {
    throw new BadRequestException("El archivo para OCR está vacío.");
  }
  return limpio;
}

export function parsearJsonOcr<T>(textoCrudo: string): T {
  const limpio = textoCrudo
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(limpio) as T;
  } catch {
    throw new BadGatewayException("El proveedor OCR devolvió una respuesta JSON inválida.");
  }
}

export async function ejecutarPeticionOcr(
  url: string,
  opciones: RequestInit,
  timeoutMs: number,
  nombreEstrategia: string,
): Promise<unknown> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);

  try {
    const respuesta = await fetch(url, {
      ...opciones,
      signal: controlador.signal,
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => "");
      throw new BadGatewayException(
        `Error HTTP ${respuesta.status} desde OCR ${nombreEstrategia}: ${detalle.slice(0, 300)}`,
      );
    }

    return (await respuesta.json()) as unknown;
  } catch (error) {
    if (error instanceof BadGatewayException) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new GatewayTimeoutException(
        `Tiempo de espera agotado (${timeoutMs} ms) al consultar OCR ${nombreEstrategia}.`,
      );
    }
    throw new BadGatewayException(
      `No se pudo comunicar con OCR ${nombreEstrategia}: ${
        error instanceof Error ? error.message : "Error desconocido"
      }`,
    );
  } finally {
    clearTimeout(temporizador);
  }
}
