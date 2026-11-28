import { DOCUMENTO_SESION as M, fechaDocumento } from "../constants/sesion-documento.constants";
import type { CompetenciaPlanificada, ConceptoMapa, MomentoPlanificado } from "../interfaces";

export interface DatosSesion {
  lema: string;
  institucion: string;
  docente: string;
  coordinador: string | null;
  area: string;
  bimestre: string | null;
  unidad: string | null;
  nivelGrado: string;
  fechaInicio: string;
  fechaFin: string;
  secciones: string[];
  duracionMin: number;
  numero: number | null;
  titulo: string;
  proposito: string | null;
  competencias: CompetenciaPlanificada[];
  enfoques: { enfoque: string; valores: string[]; acciones: string[] }[];
  transversales: { competencia: string; capacidades: string[]; actividad: string | null }[];
  momentos: MomentoPlanificado[];
  mapaVisual: ConceptoMapa[];
  criterios: string[];
  evidencia: string | null;
  producto: string | null;
  instrumento: string | null;
  acuerdos: string[];
  materiales: { recursos: string[]; comunidad: string[] };
  /** Una por sección; vacío si el instrumento no es lista de cotejo o no hay criterios. */
  listasCotejo: { seccion: string; estudiantes: string[] }[];
  borrador: boolean;
}

/** Cada línea no vacía de un texto libre. */
export const lineasDe = (texto: string | null) =>
  (texto ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export const numeroSesion = (n: number | null) =>
  n === null ? M.vacio : String(n).padStart(2, "0");

export const rangoFechas = (d: Pick<DatosSesion, "fechaInicio" | "fechaFin">) =>
  d.fechaInicio === d.fechaFin
    ? fechaDocumento(d.fechaInicio)
    : `${fechaDocumento(d.fechaInicio)} - ${fechaDocumento(d.fechaFin)}`;

/** Datos informativos en pares de etiqueta y valor: dos por fila. */
export function filasInformativas(d: DatosSesion): [string, string, string, string][] {
  const F = M.datosInformativos.filas;
  const bimestre = [d.bimestre, d.unidad].filter(Boolean).join(" / ").toUpperCase();
  return [
    [F.docente, d.docente, F.area, d.area],
    [F.coordinador, d.coordinador ?? M.vacio, F.bimestre, bimestre || M.vacio],
    [F.nivelGrado, d.nivelGrado, F.fecha, rangoFechas(d)],
    [F.secciones, d.secciones.join(", "), F.duracion, `${d.duracionMin} minutos`],
  ];
}

/** Encabezado de cada anexo, en filas de dos pares. */
export function filasListaCotejo(
  d: DatosSesion,
  seccion: string,
): [string, string, string, string][] {
  const F = M.listaCotejo.filas;
  return [
    [F.institucion, d.institucion, F.area, d.area],
    [F.docente, d.docente, F.nivelGrado, d.nivelGrado],
    [F.fecha, rangoFechas(d), F.numero, numeroSesion(d.numero)],
    [F.seccion, seccion, F.producto, d.producto ?? d.evidencia ?? M.vacio],
  ];
}

/** Anchos de la lista de cotejo: número, nombre y un indicador por criterio. */
export function anchosListaCotejo(criterios: number): number[] {
  const { anchoNumero, anchoNombre } = M.listaCotejo;
  const resto = (100 - anchoNumero - anchoNombre) / criterios;
  return [anchoNumero, anchoNombre, ...Array<number>(criterios).fill(resto)];
}
