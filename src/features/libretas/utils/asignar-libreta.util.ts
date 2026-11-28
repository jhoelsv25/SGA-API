import { MENSAJES_LIBRETAS, mensajeOtraSeccion } from "../constants";
import type {
  ArchivoAsignado,
  ArchivoOtraSeccion,
  ArchivoSinReconocer,
  CandidatoLibreta,
  ClasificacionArchivo,
  DatosOcrLibreta,
  MetodoReconocimientoLibreta,
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
  return construirClasificacionDesdeCandidato(nombreArchivo, match, match.codigo, "nombre");
}

function construirClasificacionDesdeCandidato(
  nombreArchivo: string,
  match: CandidatoLibreta,
  codigoLeido: string,
  metodoReconocimiento: MetodoReconocimientoLibreta,
): ClasificacionArchivo {
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
    metodoReconocimiento,
    codigoLeido,
    usuarioEstudianteId: match.usuarioEstudianteId,
    usuarioApoderadoId: match.usuarioApoderadoId,
  };
}

function normalizarClave(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function palabrasNombre(valor: string): string[] {
  return normalizarClave(valor)
    .split(/[^a-z0-9]+/)
    .filter((palabra) => palabra.length >= 2)
    .sort();
}

function coincidenNombres(a: string, b: string): boolean {
  const palabrasA = palabrasNombre(a);
  const palabrasB = palabrasNombre(b);
  if (palabrasA.length < 2 || palabrasA.length !== palabrasB.length) return false;
  return palabrasA.every((palabra, indice) => palabra === palabrasB[indice]);
}

/**
 * Empareja un archivo no reconocido por nombre usando los datos extraídos por OCR
 * del contenido del PDF: primero código de estudiante, luego DNI y por último nombre completo.
 */
export function clasificarPorDatosOcr(
  nombreArchivo: string,
  datos: DatosOcrLibreta | null | undefined,
  candidatos: CandidatoLibreta[],
): ClasificacionArchivo {
  const sinReconocer: ClasificacionArchivo = {
    tipo: "sin_reconocer",
    nombreArchivo,
    mensaje: MENSAJES_LIBRETAS.CODIGO_NO_RECONOCIDO,
  };
  if (!datos) return sinReconocer;

  const codigo = datos.codigoEstudiante?.trim();
  if (codigo && codigo.length >= 3) {
    const clave = codigo.toLowerCase();
    const porCodigo = candidatos.filter((c) => c.codigo.toLowerCase() === clave);
    if (porCodigo.length === 1) {
      return construirClasificacionDesdeCandidato(
        nombreArchivo,
        porCodigo[0],
        porCodigo[0].codigo,
        "ocr",
      );
    }
  }

  const dni = datos.dni?.replace(/\D/g, "");
  if (dni && dni.length >= 6) {
    const porDni = candidatos.filter(
      (c) =>
        (c.numeroDocumento && c.numeroDocumento.replace(/\D/g, "") === dni) ||
        c.codigo.replace(/\D/g, "") === dni,
    );
    if (porDni.length === 1) {
      return construirClasificacionDesdeCandidato(nombreArchivo, porDni[0], dni, "ocr");
    }
  }

  const nombre = datos.nombreCompleto?.trim();
  if (nombre) {
    const porNombre = candidatos.filter((c) => coincidenNombres(c.nombreCompleto, nombre));
    if (porNombre.length === 1) {
      return construirClasificacionDesdeCandidato(
        nombreArchivo,
        porNombre[0],
        porNombre[0].codigo,
        "ocr",
      );
    }
  }

  return sinReconocer;
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
