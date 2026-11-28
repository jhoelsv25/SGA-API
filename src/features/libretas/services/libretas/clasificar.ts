import { BadRequestException } from "@nestjs/common";
import { MAX_ARCHIVOS_POR_CARGA, MAX_BYTES_PDF, MENSAJES_LIBRETAS } from "../../constants";
import type { ArchivoCarga, CandidatoLibreta, LibretaSeccionRow } from "../../interfaces";
import { clasificarArchivo } from "../../utils";
import type { LibretasServiceDeps, LibretasServiceCalls } from "./deps";

export async function clasificar(
  deps: LibretasServiceDeps,
  calls: LibretasServiceCalls,
  seccionId: string,
  periodoId: string,
  anioId: string,
  archivos: ArchivoCarga[],
) {
  const deSeccion = await deps.repository.listarDeSeccion(seccionId, periodoId);
  const otras = await deps.repository.listarCodigosOtrasSecciones(anioId, seccionId);
  const candidatos = calls.candidatos(deSeccion, otras);
  return archivos.map((archivo) => clasificarArchivo(archivo.nombre, candidatos));
}

export function candidatos(
  deSeccion: LibretaSeccionRow[],
  otras: Array<{ matriculaId: string; codigo: string; nombreCompleto: string }>,
): CandidatoLibreta[] {
  return [
    ...deSeccion.map((item) => ({
      matriculaId: item.matriculaId,
      codigo: item.codigo,
      nombreCompleto: item.nombreCompleto,
      enSeccion: true,
      libretaId: item.libretaId,
      estado: item.estado,
      usuarioEstudianteId: item.usuarioEstudianteId,
      usuarioApoderadoId: item.usuarioApoderadoId,
    })),
    ...otras.map((item) => ({
      matriculaId: item.matriculaId,
      codigo: item.codigo,
      nombreCompleto: item.nombreCompleto,
      enSeccion: false,
      libretaId: null,
      estado: null,
      usuarioEstudianteId: null,
      usuarioApoderadoId: null,
    })),
  ];
}

function tieneFirmaPdf(buffer: Buffer): boolean {
  return buffer.byteLength >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

export function validarArchivos(archivos: ArchivoCarga[]): void {
  if (archivos.length === 0) {
    throw new BadRequestException(MENSAJES_LIBRETAS.SIN_ARCHIVOS);
  }
  if (archivos.length > MAX_ARCHIVOS_POR_CARGA) {
    throw new BadRequestException(MENSAJES_LIBRETAS.DEMASIADOS_ARCHIVOS);
  }
  const invalido = archivos.some(
    (archivo) =>
      archivo.mime !== "application/pdf" ||
      !archivo.nombre.toLowerCase().endsWith(".pdf") ||
      archivo.tamanoBytes > MAX_BYTES_PDF ||
      archivo.tamanoBytes <= 0 ||
      !tieneFirmaPdf(archivo.buffer),
  );
  if (invalido) {
    throw new BadRequestException(MENSAJES_LIBRETAS.ARCHIVO_INVALIDO);
  }
}
