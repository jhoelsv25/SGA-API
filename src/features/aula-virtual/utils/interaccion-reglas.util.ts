import { extname } from "node:path";
import {
  EXTENSIONES_ADJUNTO_INTERACCION,
  MENSAJES_INTERACCION,
  MINUTOS_MAXIMO_EDICION_INTERACCION,
  TAMANO_MAXIMO_ADJUNTO_INTERACCION_BYTES,
} from "../constants";

export interface ValidacionResultado {
  valido: boolean;
  mensaje?: string;
}

/**
 * Valida que el formato del adjunto en el muro o chat sea imagen o PDF.
 */
export function validarFormatoAdjuntoInteraccion(nombreArchivo: string): ValidacionResultado {
  const ext = extname(nombreArchivo).toLowerCase();
  if (!(EXTENSIONES_ADJUNTO_INTERACCION as readonly string[]).includes(ext)) {
    return {
      valido: false,
      mensaje: MENSAJES_INTERACCION.FORMATO_ADJUNTO_NO_PERMITIDO,
    };
  }
  return { valido: true };
}

/**
 * Valida que una publicación, comentario o mensaje tenga texto no vacío o un adjunto.
 * Regla: "Escriba un texto o agregue un adjunto." (CP-RF017-03)
 */
export function validarTextoOAdjunto(
  contenido?: string | null,
  tieneAdjunto: boolean = false,
): ValidacionResultado {
  const tieneTexto = Boolean(contenido && contenido.trim().length > 0);
  if (!tieneTexto && !tieneAdjunto) {
    return {
      valido: false,
      mensaje: MENSAJES_INTERACCION.PUBLICACION_VACIA,
    };
  }
  return { valido: true };
}

/**
 * Valida el tamaño máximo del adjunto (10 MB).
 * Regla: "El adjunto supera el máximo de 10 MB." (CP-RF017-04)
 */
export function validarTamanoAdjunto(
  tamanoBytes: number,
  maximoBytes: number = TAMANO_MAXIMO_ADJUNTO_INTERACCION_BYTES,
): ValidacionResultado {
  if (tamanoBytes > maximoBytes) {
    return {
      valido: false,
      mensaje: MENSAJES_INTERACCION.ADJUNTO_MUY_PESADO,
    };
  }
  return { valido: true };
}

/**
 * Valida si el contenido aún se encuentra dentro de la ventana de 15 minutos para ser editado.
 * Regla: "Solo puede editar dentro de los 15 minutos de publicado." (CP-RF017-06)
 */
export function estaDentroDePlazoEdicion(
  creadoEn: string | Date,
  ahora: Date = new Date(),
  minutosMaximos: number = MINUTOS_MAXIMO_EDICION_INTERACCION,
): boolean {
  const fechaCreacion = typeof creadoEn === "string" ? new Date(creadoEn) : creadoEn;
  const diferenciaMs = ahora.getTime() - fechaCreacion.getTime();
  if (diferenciaMs < 0) return true; // en caso de leve desfase de reloj
  const diferenciaMinutos = diferenciaMs / (1000 * 60);
  return diferenciaMinutos <= minutosMaximos;
}

/**
 * Valida que se proporcione un motivo válido al ocultar contenido por moderación.
 * Regla: "Indique el motivo para ocultar el contenido." (CP-RF017-13)
 */
export function validarMotivoOcultamiento(motivo?: string | null): ValidacionResultado {
  if (!motivo || motivo.trim().length === 0) {
    return {
      valido: false,
      mensaje: MENSAJES_INTERACCION.MOTIVO_REQUERIDO,
    };
  }
  return { valido: true };
}

/**
 * Valida que el año escolar no esté cerrado.
 * Regla: "El año escolar está cerrado. El muro y el chat son de solo lectura." (CP-RF017-19)
 */
export function validarAnioParaInteraccion(estadoAnio?: string | null): ValidacionResultado {
  if (estadoAnio && estadoAnio.toLowerCase() === "cerrado") {
    return {
      valido: false,
      mensaje: MENSAJES_INTERACCION.ANIO_CERRADO,
    };
  }
  return { valido: true };
}
