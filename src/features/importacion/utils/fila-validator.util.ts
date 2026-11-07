import type { TipoDocumento } from "../../personas/constants";
import { IMPORTACION_MESSAGES } from "../constants";
import { normalizarSexo, normalizarTipoDocumento } from "./fila-normalizador.util";
import { getOptStr, getStr } from "./fila-parser.util";

export interface ValidacionFilaBasica {
  esValida: boolean;
  mensaje?: string;
}

export type ValidacionFilaPersonaResultado =
  | {
      esValida: true;
      tipoDocumento: TipoDocumento;
      numeroDocumento: string;
      nombres: string;
      apellidoPaterno: string;
      fechaNacimiento?: string;
      mensaje?: never;
    }
  | {
      esValida: false;
      mensaje: string;
      tipoDocumento?: never;
      numeroDocumento?: never;
      nombres?: never;
      apellidoPaterno?: never;
      fechaNacimiento?: never;
    };

/**
 * Valida los datos comunes obligatorios de una persona en la fila de importación.
 */
export function validarCamposObligatoriosPersona(
  numeroDocumento: string,
  nombres: string,
  apellidoPaterno: string,
): ValidacionFilaBasica {
  if (!numeroDocumento || !nombres || !apellidoPaterno) {
    return {
      esValida: false,
      mensaje: "Faltan datos obligatorios (documento, nombres o apellido paterno).",
    };
  }
  return { esValida: true };
}

/**
 * Valida formato de DNI peruano (exactamente 8 dígitos numéricos).
 */
export function validarFormatoDni(
  tipoDocumento: string,
  numeroDocumento: string,
): ValidacionFilaBasica {
  if (tipoDocumento === "dni" && !/^[0-9]{8}$/.test(numeroDocumento)) {
    return {
      esValida: false,
      mensaje: IMPORTACION_MESSAGES.DNI_INVALIDO,
    };
  }
  return { esValida: true };
}

/**
 * Valida que la fecha de nacimiento no sea futura.
 */
export function validarFechaNacimientoNoFutura(fechaNacimiento?: string): ValidacionFilaBasica {
  if (fechaNacimiento) {
    const fechaNac = new Date(fechaNacimiento);
    if (!Number.isNaN(fechaNac.getTime()) && fechaNac > new Date()) {
      return {
        esValida: false,
        mensaje: IMPORTACION_MESSAGES.FECHA_NACIMIENTO_FUTURA,
      };
    }
  }
  return { esValida: true };
}

/**
 * Ejecuta todas las validaciones estáticas preliminares de la persona en la fila.
 */
export function validarEstructuraPersonaFila(
  tipoDocumento: string,
  numeroDocumento: string,
  nombres: string,
  apellidoPaterno: string,
  fechaNacimiento?: string,
): ValidacionFilaBasica {
  const obligatorios = validarCamposObligatoriosPersona(numeroDocumento, nombres, apellidoPaterno);
  if (!obligatorios.esValida) return obligatorios;

  const formatoDni = validarFormatoDni(tipoDocumento, numeroDocumento);
  if (!formatoDni.esValida) return formatoDni;

  const fechaVal = validarFechaNacimientoNoFutura(fechaNacimiento);
  if (!fechaVal.esValida) return fechaVal;

  return { esValida: true };
}

/**
 * Valida de forma integral la persona de una fila de importación:
 * tipo de documento, sexo, campos obligatorios, formato DNI y fecha de nacimiento.
 */
export function validarPersonaFila(datos: Record<string, unknown>): ValidacionFilaPersonaResultado {
  const tipoDocumento = normalizarTipoDocumento(getStr(datos, "tipoDocumento", "tipo_documento"));
  if (!tipoDocumento) {
    return {
      esValida: false,
      mensaje: IMPORTACION_MESSAGES.TIPO_DOCUMENTO_INVALIDO,
    };
  }

  if (!normalizarSexo(getStr(datos, "sexo"))) {
    return {
      esValida: false,
      mensaje: IMPORTACION_MESSAGES.SEXO_INVALIDO,
    };
  }

  const numeroDocumento = getStr(datos, "numeroDocumento", "numero_documento");
  const nombres = getStr(datos, "nombres");
  const apellidoPaterno = getStr(datos, "apellidoPaterno", "apellido_paterno");
  const fechaNacimiento = getOptStr(datos, "fechaNacimiento", "fecha_nacimiento");

  const validacion = validarEstructuraPersonaFila(
    tipoDocumento,
    numeroDocumento,
    nombres,
    apellidoPaterno,
    fechaNacimiento,
  );

  if (!validacion.esValida) {
    return {
      esValida: false,
      mensaje: validacion.mensaje || "Datos de persona inválidos.",
    };
  }

  return {
    esValida: true,
    tipoDocumento: tipoDocumento as TipoDocumento,
    numeroDocumento,
    nombres,
    apellidoPaterno,
    fechaNacimiento,
  };
}
