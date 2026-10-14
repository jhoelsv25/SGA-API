import { MENSAJES_LIBRETAS, mensajeOtraSeccion } from "../constants";
import type {
  ArchivoAsignado,
  ArchivoOtraSeccion,
  ArchivoSinReconocer,
  CandidatoLibreta,
  ClasificacionArchivo,
} from "../interfaces";

export function formatearFechaLimite(iso: string): string {
  const [anio, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

/** Fecha calendario en Lima (YYYY-MM-DD). La publicación a tiempo llega hasta el final de ese día. */
export function fechaEnLima(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}

export function estaATiempo(fechaLimite: string, ahora: Date = new Date()): boolean {
  return fechaEnLima(ahora) <= fechaLimite.slice(0, 10);
}

export function tokensDeNombre(nombre: string): string[] {
  return nombre
    .replace(/\.pdf$/i, "")
    .split(/[^0-9A-Za-z]+/)
    .filter((token) => token.length >= 3);
}

export function clasificarArchivo(
  nombreArchivo: string,
  candidatos: CandidatoLibreta[],
): ClasificacionArchivo {
  const tokens = new Set(tokensDeNombre(nombreArchivo).map((token) => token.toLowerCase()));
  const coincidencias = candidatos.filter((candidato) =>
    tokens.has(candidato.codigo.toLowerCase()),
  );

  if (coincidencias.length !== 1) {
    return {
      tipo: "sin_reconocer",
      nombreArchivo,
      mensaje: MENSAJES_LIBRETAS.CODIGO_NO_RECONOCIDO,
    };
  }

  const match = coincidencias[0];
  if (!match.enSeccion || !match.libretaId || !match.estado) {
    return {
      tipo: "otra_seccion",
      nombreArchivo,
      nombreEstudiante: match.nombreCompleto,
      mensaje: mensajeOtraSeccion(match.nombreCompleto),
    };
  }

  return {
    tipo: "asignada",
    nombreArchivo,
    matriculaId: match.matriculaId,
    nombreCompleto: match.nombreCompleto,
    libretaId: match.libretaId,
    estado: match.estado,
    asignacion: "automatica",
    codigoLeido: match.codigo,
    usuarioEstudianteId: match.usuarioEstudianteId,
    usuarioApoderadoId: match.usuarioApoderadoId,
  };
}

export function resumirClasificacion(items: ClasificacionArchivo[]): {
  asignadas: ArchivoAsignado[];
  sinReconocer: ArchivoSinReconocer[];
  otraSeccion: ArchivoOtraSeccion[];
} {
  const asignadas: ArchivoAsignado[] = [];
  const sinReconocer: ArchivoSinReconocer[] = [];
  const otraSeccion: ArchivoOtraSeccion[] = [];

  for (const item of items) {
    if (item.tipo === "asignada") asignadas.push(item);
    else if (item.tipo === "sin_reconocer") sinReconocer.push(item);
    else otraSeccion.push(item);
  }

  return { asignadas, sinReconocer, otraSeccion };
}
