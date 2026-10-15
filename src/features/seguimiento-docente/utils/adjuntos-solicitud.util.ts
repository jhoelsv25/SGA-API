import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { BadRequestException } from "@nestjs/common";
import {
  ADJUNTO_SOLICITUD_MIME_TYPES,
  ADJUNTO_SOLICITUD_TAMANO_MAXIMO_BYTES,
  type AdjuntoSolicitudMimeType,
} from "../constants";

/**
 * Resultado del procesamiento y guardado de un adjunto de solicitud.
 */
export interface ResultadoAdjuntoSolicitud {
  adjuntoRuta: string | null;
  adjuntoNombre: string | null;
}

/**
 * Valida y procesa un archivo adjunto opcional para una solicitud de revisión de consolidado.
 * Admite archivos en memoria (buffer) o en disco (path), validando tamaño (≤ 5 MB)
 * y tipos MIME permitidos (PDF, PNG, JPG).
 */
export async function procesarAdjuntoSolicitud(
  adjunto?: Express.Multer.File,
): Promise<ResultadoAdjuntoSolicitud> {
  if (!adjunto) {
    return { adjuntoRuta: null, adjuntoNombre: null };
  }

  const esTamanoValido = adjunto.size <= ADJUNTO_SOLICITUD_TAMANO_MAXIMO_BYTES;
  const esMimeValido = ADJUNTO_SOLICITUD_MIME_TYPES.includes(
    adjunto.mimetype as AdjuntoSolicitudMimeType,
  );

  if (!esTamanoValido || !esMimeValido) {
    throw new BadRequestException(
      "El archivo adjunto no es válido. Debe ser PDF, PNG o JPG de hasta 5 MB.",
    );
  }

  // Si Multer ya guardó en disco o es un archivo simulado con ruta
  if (adjunto.path) {
    return {
      adjuntoRuta: adjunto.path,
      adjuntoNombre: adjunto.originalname || adjunto.filename || "adjunto",
    };
  }

  // Si Multer utilizó almacenamiento en memoria con buffer
  if (adjunto.buffer && adjunto.buffer.length > 0) {
    const carpetaDestino = path.join(process.cwd(), "uploads", "solicitudes-revision");
    await fs.promises.mkdir(carpetaDestino, { recursive: true });

    let extension = path.extname(adjunto.originalname || "");
    if (!extension) {
      if (adjunto.mimetype === "application/pdf") {
        extension = ".pdf";
      } else if (adjunto.mimetype === "image/jpeg") {
        extension = ".jpg";
      } else {
        extension = ".png";
      }
    }

    const nombreArchivo = `${randomUUID()}${extension}`;
    const rutaCompleta = path.join(carpetaDestino, nombreArchivo);
    await fs.promises.writeFile(rutaCompleta, adjunto.buffer);

    return {
      adjuntoRuta: `/uploads/solicitudes-revision/${nombreArchivo}`,
      adjuntoNombre: adjunto.originalname || nombreArchivo,
    };
  }

  const nombreFinal = adjunto.originalname || adjunto.filename || null;
  const rutaFinal = adjunto.filename ? `/uploads/solicitudes-revision/${adjunto.filename}` : null;

  return {
    adjuntoRuta: rutaFinal,
    adjuntoNombre: nombreFinal,
  };
}
