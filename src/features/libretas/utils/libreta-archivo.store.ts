import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { CARPETA_LIBRETAS } from "../constants";

@Injectable()
export class LibretaArchivoStore {
  async guardar(buffer: Buffer): Promise<string> {
    const carpeta = path.join(process.cwd(), "uploads", CARPETA_LIBRETAS);
    await mkdir(carpeta, { recursive: true });
    const nombre = `${randomUUID()}.pdf`;
    await writeFile(path.join(carpeta, nombre), buffer);
    return `/uploads/${CARPETA_LIBRETAS}/${nombre}`;
  }

  rutaAbsoluta(archivoUrl: string): string {
    const relativo = archivoUrl.replace(/^\/uploads\//, "");
    return path.join(process.cwd(), "uploads", relativo);
  }
}
