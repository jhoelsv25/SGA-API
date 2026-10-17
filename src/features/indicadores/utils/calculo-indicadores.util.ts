import { MENSAJES_INDICADORES, METADATA_INDICADORES } from "../constants";
import type { ConteoLibretasFila, ConteoMaterialesFila, ConteoSesionesFila } from "../interfaces";
import type { DesgloseCspDto, DesgloseIgmDto, DesgloseIsaDto, IndicadorCalculadoDto } from "../dto";

/**
 * Redondea un valor numérico a 2 decimales usando EPSILON para evitar sesgos de punto flotante.
 */
export function redondear2Decimales(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Formatea un porcentaje numérico a texto con 2 decimales fijos ("96.61 %") o "Sin datos".
 */
export function formatearPorcentaje(valor: number | null): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) {
    return "Sin datos";
  }
  return `${valor.toFixed(2)} %`;
}

/**
 * Calcula un ratio porcentual entre numerador y denominador redondeado a 2 decimales.
 * Retorna null si el denominador es menor o igual a cero.
 */
export function calcularRatioPorcentaje(numerador: number, denominador: number): number | null {
  if (denominador <= 0 || Number.isNaN(numerador) || Number.isNaN(denominador)) {
    return null;
  }
  return redondear2Decimales((numerador / denominador) * 100);
}

/**
 * Construye el DTO calculado de CSP a partir de un conteo de sesiones y el estado de vigencia/curso.
 */
export function estructurarCsp(
  conteo: ConteoSesionesFila,
  enCurso: boolean,
): IndicadorCalculadoDto<DesgloseCspDto> {
  const planificadas = Number(conteo.planificadas ?? 0);
  const cumplidas = Number(conteo.cumplidas ?? 0);
  const parciales = Number(conteo.parciales ?? 0);
  const noCumplidas = Number(conteo.noCumplidas ?? 0);
  const justificadas = Number(conteo.justificadas ?? 0);

  const numerador = cumplidas + parciales;
  const denominadorEfectivo = planificadas - justificadas;

  const sinDatos = planificadas === 0 || denominadorEfectivo <= 0;
  const porcentaje = sinDatos ? null : calcularRatioPorcentaje(numerador, denominadorEfectivo);
  const porcentajeTexto = formatearPorcentaje(porcentaje);

  const desglose: DesgloseCspDto = {
    planificadas,
    cumplidas,
    parciales,
    noCumplidas,
    justificadas,
    denominadorEfectivo: Math.max(0, denominadorEfectivo),
  };

  const resultado: IndicadorCalculadoDto<DesgloseCspDto> = {
    indicador: "CSP",
    nombre: METADATA_INDICADORES.CSP.nombre,
    dimension: METADATA_INDICADORES.CSP.dimension,
    formula: METADATA_INDICADORES.CSP.formula,
    numerador,
    denominador: Math.max(0, denominadorEfectivo),
    porcentaje,
    porcentajeTexto,
    enCurso,
    sinDatos,
    desglose,
  };

  if (sinDatos) {
    resultado.mensajeSinDatos = MENSAJES_INDICADORES.SIN_DATOS;
  }

  return resultado;
}

/**
 * Construye el DTO calculado de ISA a partir de un conteo de libretas y el estado de vigencia/curso.
 */
export function estructurarIsa(
  conteo: ConteoLibretasFila,
  enCurso: boolean,
): IndicadorCalculadoDto<DesgloseIsaDto> {
  const programadas = Number(conteo.programadas ?? 0);
  const publicadasATiempo = Number(conteo.publicadasATiempo ?? 0);
  const publicadasFueraDePlazo = Number(conteo.publicadasFueraDePlazo ?? 0);
  const pendientes = Number(conteo.pendientes ?? 0);
  const vistasPorFamilia = Number(conteo.vistasPorFamilia ?? 0);

  const sinDatos = programadas === 0;
  const porcentaje = sinDatos ? null : calcularRatioPorcentaje(publicadasATiempo, programadas);
  const porcentajeTexto = formatearPorcentaje(porcentaje);
  const porcentajeVistasFamilia =
    programadas > 0 ? (calcularRatioPorcentaje(vistasPorFamilia, programadas) ?? 0) : 0;

  const desglose: DesgloseIsaDto = {
    programadas,
    publicadasATiempo,
    publicadasFueraDePlazo,
    pendientes,
    vistasPorFamilia,
    porcentajeVistasFamilia,
  };

  const resultado: IndicadorCalculadoDto<DesgloseIsaDto> = {
    indicador: "ISA",
    nombre: METADATA_INDICADORES.ISA.nombre,
    dimension: METADATA_INDICADORES.ISA.dimension,
    formula: METADATA_INDICADORES.ISA.formula,
    numerador: publicadasATiempo,
    denominador: programadas,
    porcentaje,
    porcentajeTexto,
    enCurso,
    sinDatos,
    desglose,
  };

  if (sinDatos) {
    resultado.mensajeSinDatos = MENSAJES_INDICADORES.SIN_DATOS;
  }

  return resultado;
}

/**
 * Construye el DTO calculado de IGM a partir de un conteo de materiales y el estado de vigencia/curso.
 */
export function estructurarIgm(
  conteo: ConteoMaterialesFila,
  enCurso: boolean,
): IndicadorCalculadoDto<DesgloseIgmDto> {
  const planificados = Number(conteo.planificados ?? 0);
  const publicadosATiempo = Number(conteo.publicadosATiempo ?? 0);
  const publicadosFueraDePlazo = Number(conteo.publicadosFueraDePlazo ?? 0);
  const pendientes = Number(conteo.pendientes ?? 0);
  const extras = Number(conteo.extras ?? 0);

  const sinDatos = planificados === 0;
  const porcentaje = sinDatos ? null : calcularRatioPorcentaje(publicadosATiempo, planificados);
  const porcentajeTexto = formatearPorcentaje(porcentaje);

  const desglose: DesgloseIgmDto = {
    planificados,
    publicadosATiempo,
    publicadosFueraDePlazo,
    pendientes,
    extras,
  };

  const resultado: IndicadorCalculadoDto<DesgloseIgmDto> = {
    indicador: "IGM",
    nombre: METADATA_INDICADORES.IGM.nombre,
    dimension: METADATA_INDICADORES.IGM.dimension,
    formula: METADATA_INDICADORES.IGM.formula,
    numerador: publicadosATiempo,
    denominador: planificados,
    porcentaje,
    porcentajeTexto,
    enCurso,
    sinDatos,
    desglose,
  };

  if (sinDatos) {
    resultado.mensajeSinDatos = MENSAJES_INDICADORES.SIN_DATOS;
  }

  return resultado;
}
