import { LISTAS_PLANTILLA } from "../constants";
import {
  JORNADAS_VALIDAS,
  normalizarFechaIso,
  normalizarOpcion,
  normalizarSiNo,
} from "./fila-normalizador.util";
import { getOptStr, getStr } from "./fila-parser.util";
import type { ValidacionFilaBasica } from "./fila-validator.util";

const OK: ValidacionFilaBasica = { esValida: true };

function error(mensaje: string): ValidacionFilaBasica {
  return { esValida: false, mensaje };
}

function validarFechaIngreso(datos: Record<string, unknown>): ValidacionFilaBasica {
  const raw = getStr(datos, "fechaIngreso", "fecha_ingreso");
  if (!raw) return error("La fecha de ingreso es obligatoria.");
  if (!normalizarFechaIso(raw)) {
    return error("La fecha de ingreso no es válida. Use día/mes/año (por ejemplo 01/03/2027).");
  }
  return OK;
}

/** Docente: contrato y jornada de la lista, fecha de ingreso válida. No se corrige nada en silencio. */
export function validarCamposDocenteFila(datos: Record<string, unknown>): ValidacionFilaBasica {
  const contrato = getStr(datos, "tipoContrato", "tipo_contrato");
  if (!contrato) return error("El tipo de contrato es obligatorio.");
  if (!normalizarOpcion(contrato, LISTAS_PLANTILLA.tipoContrato)) {
    return error(`El tipo de contrato debe ser: ${LISTAS_PLANTILLA.tipoContrato.join(", ")}.`);
  }

  const jornada = getStr(datos, "jornada", "jornadaHoras");
  if (!jornada) return error("La jornada es obligatoria.");
  if (!JORNADAS_VALIDAS.includes(jornada)) {
    return error(`La jornada debe ser: ${JORNADAS_VALIDAS.join(", ")} horas.`);
  }

  return validarFechaIngreso(datos);
}

/** Estudiante: fecha de ingreso válida; el detalle de discapacidad solo si responde SI. */
export function validarCamposEstudianteFila(datos: Record<string, unknown>): ValidacionFilaBasica {
  const ingreso = validarFechaIngreso(datos);
  if (!ingreso.esValida) return ingreso;

  const discapacidad = normalizarSiNo(getStr(datos, "tieneDiscapacidad", "tiene_discapacidad"));
  if (discapacidad === null) return error("«¿Tiene discapacidad?» debe ser SI o NO.");
  if (!discapacidad && getOptStr(datos, "detalleDiscapacidad", "detalle_discapacidad")) {
    return error("Indique el detalle solo si el estudiante tiene discapacidad.");
  }
  return OK;
}

/** Apoderado: parentesco de la lista y «principal» SI/NO. */
export function validarCamposApoderadoFila(datos: Record<string, unknown>): ValidacionFilaBasica {
  const parentesco = getStr(datos, "parentesco");
  if (!parentesco) return error("El parentesco es obligatorio.");
  if (!normalizarOpcion(parentesco, LISTAS_PLANTILLA.parentesco)) {
    return error(`El parentesco debe ser: ${LISTAS_PLANTILLA.parentesco.join(", ")}.`);
  }

  if (normalizarSiNo(getStr(datos, "esPrincipal", "es_principal")) === null) {
    return error("«¿Es apoderado principal?» debe ser SI o NO.");
  }
  return OK;
}
