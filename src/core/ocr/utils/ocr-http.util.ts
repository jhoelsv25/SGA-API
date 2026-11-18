import { BadGatewayException, BadRequestException, GatewayTimeoutException } from "@nestjs/common";
import { MimeTypeOcr } from "../constants";
import { ArchivoOcr } from "../interfaces";

export function decodificarBufferOcr(archivo: ArchivoOcr): Buffer {
  if (Buffer.isBuffer(archivo.contenido)) {
    return archivo.contenido;
  }

  const limpio = archivo.contenido.replace(/^data:[^;]+;base64,/, "").trim();
  if (!limpio) {
    throw new BadRequestException("El archivo para OCR está vacío.");
  }
  return Buffer.from(limpio, "base64");
}

export function validarMagicBytesOcr(buffer: Buffer, mimeType: MimeTypeOcr): boolean {
  if (buffer.byteLength < 4) {
    return false;
  }

  switch (mimeType) {
    case "image/jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png":
      return (
        buffer.byteLength >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    case "image/webp":
      return (
        buffer.byteLength >= 12 &&
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    case "application/pdf":
      return buffer.byteLength >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }
}

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
