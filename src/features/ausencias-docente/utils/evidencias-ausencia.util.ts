import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { BadRequestException, InternalServerErrorException } from "@nestjs/common";
import {
  FOTO_MIME_TYPES,
  FOTO_TAMANO_MAXIMO_BYTES,
  MENSAJES_AUSENCIA,
  type FotoMimeType,
} from "../constants";
import type { DatosCrearEvidencia } from "../interfaces";

/**
 * Obtiene la extensión de archivo normalizada a partir del MIME type.
 */
export function obtenerExtensionPorMime(mimetype: string): string {
  if (mimetype === "image/jpeg") {
    return ".jpg";
  }
  return ".png";
}

/**
 * Valida que cada archivo adjunto cumpla con el formato permitido (PNG/JPEG) y tamaño máximo (5 MB).
 */
export function validarEvidenciasFotograficas(fotos?: Express.Multer.File[]): void {
  const listaFotos = fotos ?? [];
  for (const foto of listaFotos) {
    const esMimeValido = FOTO_MIME_TYPES.includes(foto.mimetype as FotoMimeType);
    const esTamanoValido = foto.size <= FOTO_TAMANO_MAXIMO_BYTES;
    if (!esMimeValido || !esTamanoValido) {
      throw new BadRequestException(MENSAJES_AUSENCIA.FOTO_INVALIDA);
    }
  }
}

/**
 * Parsea y valida el JSON de metadatos de fotos opcional.
 */
export function parsearMetadatosFotos(metadatosJson?: string): Array<{ tomadaEn?: string }> {
  if (!metadatosJson) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(metadatosJson);
    if (!Array.isArray(parsed)) {
      throw new BadRequestException(MENSAJES_AUSENCIA.METADATOS_FOTOS_INVALIDOS);
    }
    return parsed as Array<{ tomadaEn?: string }>;
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException(MENSAJES_AUSENCIA.METADATOS_FOTOS_INVALIDOS);
  }
}

/**
 * Valida fotos, parsea metadatos y genera la estructura de evidencias fotográficas para persistencia en base de datos.
 */
export function prepararEvidenciasParaGuardar(
  fotos?: Express.Multer.File[],
  metadatosJson?: string,
): {
  evidencias: DatosCrearEvidencia[];
  nombresArchivos: string[];
  listaFotos: Express.Multer.File[];
} {
  validarEvidenciasFotograficas(fotos);
  const metadatosFotos = parsearMetadatosFotos(metadatosJson);

  const listaFotos = fotos ?? [];
  const evidencias: DatosCrearEvidencia[] = [];
  const nombresArchivos: string[] = [];

  for (let i = 0; i < listaFotos.length; i++) {
    const foto = listaFotos[i];
    const idFoto = randomUUID();
    const extension = obtenerExtensionPorMime(foto.mimetype);
    const nombreArchivo = `${idFoto}${extension}`;
    nombresArchivos.push(nombreArchivo);

    const tomadaEn = metadatosFotos[i]?.tomadaEn ?? null;
    evidencias.push({
      archivoUrl: `/uploads/ausencias/${nombreArchivo}`,
      tomadaEn,
      orden: i + 1,
    });
  }

  return { evidencias, nombresArchivos, listaFotos };
}

/**
 * Persiste físicamente los archivos de evidencias fotográficas en el directorio uploads/ausencias/.
 * En caso de error, limpia los archivos escritos para evitar archivos huérfanos.
 */
export async function guardarFotosEnDisco(
  listaFotos: Express.Multer.File[],
  nombresArchivos: string[],
): Promise<void> {
  if (listaFotos.length === 0) {
    return;
  }

  const carpeta = path.join(process.cwd(), "uploads", "ausencias");
  const archivosEscritos: string[] = [];

  try {
    let carpetaCreada = false;
    for (let i = 0; i < listaFotos.length; i++) {
      const foto = listaFotos[i];
      if (foto.buffer && foto.buffer.length > 0) {
        if (!carpetaCreada) {
          await fs.promises.mkdir(carpeta, { recursive: true });
          carpetaCreada = true;
        }
        const rutaCompleta = path.join(carpeta, nombresArchivos[i]);
        await fs.promises.writeFile(rutaCompleta, foto.buffer);
        archivosEscritos.push(rutaCompleta);
      }
    }
  } catch {
    await Promise.all(
      archivosEscritos.map(async (ruta) => {
        try {
          await fs.promises.unlink(ruta);
        } catch {
          // Silenciar error al eliminar archivo durante cleanup
        }
      }),
    );
    throw new InternalServerErrorException(
      "No se pudieron guardar las evidencias fotográficas en disco.",
    );
  }
}
