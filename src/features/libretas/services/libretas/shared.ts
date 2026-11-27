import type { ArchivoAsignado, EstadoLibreta } from "../../interfaces";

export interface PublicacionLista {
  item: ArchivoAsignado;
  buffer: Buffer;
  tamanoBytes: number;
  motivo: string | null;
  esReemplazo: boolean;
  estado: EstadoLibreta;
}
