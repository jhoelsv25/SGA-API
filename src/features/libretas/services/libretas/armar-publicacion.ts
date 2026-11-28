import { BadRequestException } from "@nestjs/common";
import { MENSAJES_LIBRETAS, mensajeOtraSeccion } from "../../constants";
import type {
  ArchivoAsignado,
  ArchivoCarga,
  AsignacionManual,
  CandidatoLibreta,
  EstadoLibreta,
  LibretaSeccionRow,
} from "../../interfaces";
import { clasificarArchivo, estaATiempo } from "../../utils";
import { clasificarArchivoConOcr } from "./clasificar";
import type { LibretasServiceCalls, LibretasServiceDeps } from "./deps";
import { PublicacionLista } from "./shared";

export async function armarPublicacion(
  deps: LibretasServiceDeps,
  calls: LibretasServiceCalls,
  archivos: ArchivoCarga[],
  candidatos: CandidatoLibreta[],
  porMatricula: Map<string, LibretaSeccionRow>,
  otras: Array<{ matriculaId: string; nombreCompleto: string }>,
  manualPorNombre: Map<string, AsignacionManual>,
): Promise<PublicacionLista[]> {
  const lista: PublicacionLista[] = [];
  const estadoEnLote = new Map<string, EstadoLibreta>();

  for (const archivo of archivos) {
    let clasificado = clasificarArchivo(archivo.nombre, candidatos);
    if (clasificado.tipo === "sin_reconocer" && !manualPorNombre.has(archivo.nombre)) {
      clasificado = await clasificarArchivoConOcr(deps, archivo, candidatos, clasificado);
    }
    const elegido = calls.resolverElegido(
      clasificado,
      manualPorNombre,
      porMatricula,
      otras,
      archivo.nombre,
    );
    if (!elegido) continue;

    const estadoPrevio = estadoEnLote.get(elegido.matriculaId) ?? elegido.estado;
    const esReemplazo = estadoPrevio !== "pendiente";
    const motivo = (manualPorNombre.get(archivo.nombre)?.motivo ?? "").trim();
    if (esReemplazo && !motivo) {
      throw new BadRequestException(MENSAJES_LIBRETAS.REEMPLAZO_SIN_MOTIVO);
    }

    const fila = porMatricula.get(elegido.matriculaId);
    const estado: EstadoLibreta = esReemplazo
      ? estadoPrevio
      : estaATiempo(fila?.fechaLimite ?? "1970-01-01")
        ? "a_tiempo"
        : "fuera_de_plazo";
    estadoEnLote.set(elegido.matriculaId, estado);

    lista.push({
      item: { ...elegido, estado },
      buffer: archivo.buffer,
      tamanoBytes: archivo.tamanoBytes,
      motivo: esReemplazo ? motivo : null,
      esReemplazo,
      estado,
    });
  }

  return lista;
}

export function resolverElegido(
  clasificado: ReturnType<typeof clasificarArchivo>,
  manualPorNombre: Map<string, AsignacionManual>,
  porMatricula: Map<string, LibretaSeccionRow>,
  otras: Array<{ matriculaId: string; nombreCompleto: string }>,
  nombreArchivo: string,
): ArchivoAsignado | null {
  if (clasificado.tipo === "asignada") return clasificado;
  if (clasificado.tipo !== "sin_reconocer") return null;

  const manual = manualPorNombre.get(nombreArchivo);
  if (!manual) return null;
  const estudiante = porMatricula.get(manual.matriculaId);
  if (!estudiante?.libretaId || !estudiante.estado) {
    const nombre = otras.find((item) => item.matriculaId === manual.matriculaId)?.nombreCompleto;
    throw new BadRequestException(
      nombre ? mensajeOtraSeccion(nombre) : MENSAJES_LIBRETAS.ASIGNACION_INVALIDA,
    );
  }
  const esOcr = manual.origen === "ocr";
  return {
    nombreArchivo,
    matriculaId: estudiante.matriculaId,
    nombreCompleto: estudiante.nombreCompleto,
    libretaId: estudiante.libretaId,
    estado: estudiante.estado,
    asignacion: esOcr ? "automatica" : "manual",
    metodoReconocimiento: esOcr ? "ocr" : undefined,
    codigoLeido: esOcr ? estudiante.codigo : null,
    usuarioEstudianteId: estudiante.usuarioEstudianteId,
    usuarioApoderadoId: estudiante.usuarioApoderadoId,
  };
}
