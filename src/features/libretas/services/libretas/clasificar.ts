import { BadRequestException, Logger } from "@nestjs/common";
import {
  CONCURRENCIA_OCR_LIBRETAS,
  INSTRUCCION_OCR_LIBRETA,
  MAX_ARCHIVOS_POR_CARGA,
  MAX_BYTES_PDF,
  MENSAJES_LIBRETAS,
} from "../../constants";
import type {
  ArchivoCarga,
  CandidatoLibreta,
  ClasificacionArchivo,
  CodigoOtraSeccionRow,
  DatosOcrLibreta,
  LibretaSeccionRow,
} from "../../interfaces";
import { clasificarArchivo, clasificarPorDatosOcr } from "../../utils";
import type { LibretasServiceDeps, LibretasServiceCalls } from "./deps";

const logger = new Logger("LibretasClasificar");

/**
 * Si el nombre del archivo no coincide con ningún código y el servicio OCR está habilitado,
 * intenta extraer código, DNI o nombre del contenido del PDF como respaldo.
 */
export async function clasificarArchivoConOcr(
  deps: LibretasServiceDeps,
  archivo: ArchivoCarga,
  candidatosLista: CandidatoLibreta[],
  clasificacionPrevia?: ClasificacionArchivo,
): Promise<ClasificacionArchivo> {
  const previa = clasificacionPrevia ?? clasificarArchivo(archivo.nombre, candidatosLista);
  if (previa.tipo !== "sin_reconocer") return previa;
  if (!deps.ocrService?.estaHabilitado()) return previa;

  try {
    const respuesta = await deps.ocrService.extraerDatos<DatosOcrLibreta>({
      archivo: {
        contenido: archivo.buffer,
        mimeType: "application/pdf",
      },
      instruccion: INSTRUCCION_OCR_LIBRETA,
    });
    return clasificarPorDatosOcr(archivo.nombre, respuesta.datos, candidatosLista);
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    logger.warn(`Respaldo OCR omitido para libreta "${archivo.nombre}": ${detalle}`);
    return previa;
  }
}

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
  const candidatosLista = calls.candidatos(deSeccion, otras);

  const resultados: ClasificacionArchivo[] = archivos.map((archivo) =>
    clasificarArchivo(archivo.nombre, candidatosLista),
  );

  if (!deps.ocrService?.estaHabilitado()) {
    return resultados;
  }

  const pendientesOcr: number[] = [];
  for (let i = 0; i < resultados.length; i++) {
    if (resultados[i].tipo === "sin_reconocer") pendientesOcr.push(i);
  }

  for (let i = 0; i < pendientesOcr.length; i += CONCURRENCIA_OCR_LIBRETAS) {
    const lote = pendientesOcr.slice(i, i + CONCURRENCIA_OCR_LIBRETAS);
    const resueltos = await Promise.all(
      lote.map((indice) =>
        clasificarArchivoConOcr(deps, archivos[indice], candidatosLista, resultados[indice]),
      ),
    );
    lote.forEach((indice, posicion) => {
      resultados[indice] = resueltos[posicion];
    });
  }

  return resultados;
}

export function candidatos(
  deSeccion: LibretaSeccionRow[],
  otras: CodigoOtraSeccionRow[],
): CandidatoLibreta[] {
  return [
    ...deSeccion.map((item) => ({
      matriculaId: item.matriculaId,
      codigo: item.codigo,
      numeroDocumento: item.numeroDocumento ?? null,
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
      numeroDocumento: item.numeroDocumento ?? null,
      nombreCompleto: item.nombreCompleto,
      enSeccion: false,
      libretaId: null,
      estado: null,
      usuarioEstudianteId: null,
      usuarioApoderadoId: null,
    })),
  ];
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
      archivo.tamanoBytes <= 0,
  );
  if (invalido) {
    throw new BadRequestException(MENSAJES_LIBRETAS.ARCHIVO_INVALIDO);
  }
}
