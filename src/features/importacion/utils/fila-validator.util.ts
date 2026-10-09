import { IMPORTACION_MESSAGES } from "../constants";

export interface ValidacionFilaBasica {
  esValida: boolean;
  mensaje?: string;
}

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
