import { Workbook } from "exceljs";
import type { TableroIndicadoresResponseDto } from "../dto";

export interface DatosInstitucionReporte {
  nombre: string;
  codigoModular?: string | null;
  ugel?: string | null;
  dre?: string | null;
  direccion?: string | null;
}

export interface DetalleSesionExcel {
  fecha: string;
  docente: string;
  dni: string;
  curso: string;
  seccion: string;
  grado: string;
  horaPlanInicio: string;
  horaPlanFin: string;
  horaRealInicio: string;
  horaRealFin: string;
  minutosPerdidos: number;
  estado: string;
  justificacion: string;
}

export interface DetalleLibretaExcel {
  codigoEstudiante: string;
  nombreCompleto: string;
  grado: string;
  seccion: string;
  fechaLimite: string;
  fechaSubida: string;
  estado: string;
  vistoPorFamilia: string;
  fechaVisto: string;
}

export interface DetalleMaterialExcel {
  titulo: string;
  curso: string;
  docente: string;
  tipoMaterial: string;
  esPlanificado: string;
  fechaProgramada: string;
  fechaPublicacion: string;
  cumplimiento: string;
}

export interface ParametrosGenerarExcelIndicadores {
  institucion: DatosInstitucionReporte;
  tablero: TableroIndicadoresResponseDto;
  filtroIndicador?: string | null;
  filtroDocenteId?: string | null;
  detalleSesiones?: DetalleSesionExcel[];
  detalleLibretas?: DetalleLibretaExcel[];
  detalleMateriales?: DetalleMaterialExcel[];
}

const COLOR_GUINDO_HEX = "FF7A1228";
const COLOR_BLANCO_HEX = "FFFFFFFF";

/**
 * Genera el libro oficial de Excel con el resumen de métricas y hojas de datos crudos (RF-020, CP-RF020-18).
 */
export async function generarExcelIndicadores(
  parametros: ParametrosGenerarExcelIndicadores,
): Promise<Buffer> {
  const libro = new Workbook();
  libro.creator = "Sistema de Gestión Académica (SGA)";
  libro.created = new Date();

  const {
    institucion,
    tablero,
    detalleSesiones = [],
    detalleLibretas = [],
    detalleMateriales = [],
  } = parametros;

  // ─────────────────────────────────────────────────────────────────────────────
  // HOJA 1: Resumen Indicadores
  // ─────────────────────────────────────────────────────────────────────────────
  const hojaResumen = libro.addWorksheet("Resumen Indicadores", {
    views: [{ showGridLines: true }],
  });

  hojaResumen.columns = [
    { key: "col1", width: 28 },
    { key: "col2", width: 26 },
    { key: "col3", width: 34 },
    { key: "col4", width: 16 },
    { key: "col5", width: 16 },
    { key: "col6", width: 18 },
    { key: "col7", width: 18 },
  ];

  // Membrete Institucional
  hojaResumen.addRow([institucion.nombre.toUpperCase()]);
  const filaTitulo = hojaResumen.getRow(1);
  filaTitulo.font = { name: "Arial", size: 14, bold: true, color: { argb: COLOR_GUINDO_HEX } };

  hojaResumen.addRow([
    `Código Modular: ${institucion.codigoModular || "S/N"} | UGEL: ${institucion.ugel || "S/N"} | DRE: ${institucion.dre || "S/N"}`,
  ]);
  hojaResumen.getRow(2).font = { name: "Arial", size: 9, italic: true };

  hojaResumen.addRow([`Dirección: ${institucion.direccion || "S/N"}`]);
  hojaResumen.getRow(3).font = { name: "Arial", size: 9, italic: true };

  hojaResumen.addRow([]);
  hojaResumen.addRow([
    `REPORTE DE INDICADORES DE EFICACIA INSTITUCIONAL — PERÍODO: ${tablero.periodoNombre || "GENERAL"} (${tablero.enCurso ? "EN CURSO" : "CERRADO"})`,
  ]);
  const filaSubtitulo = hojaResumen.getRow(5);
  filaSubtitulo.font = { name: "Arial", size: 11, bold: true };

  hojaResumen.addRow([]);

  // Encabezados de Tabla Resumen
  const filaEncabezadoResumen = hojaResumen.addRow([
    "Indicador",
    "Dimensión",
    "Fórmula Metodológica",
    "Numerador",
    "Denominador",
    "Resultado (%)",
    "Estado",
  ]);
  filaEncabezadoResumen.font = {
    name: "Arial",
    size: 10,
    bold: true,
    color: { argb: COLOR_BLANCO_HEX },
  };
  filaEncabezadoResumen.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLOR_GUINDO_HEX },
  };
  filaEncabezadoResumen.alignment = { vertical: "middle", horizontal: "center" };

  const filasIndicadores = [
    {
      codigo: tablero.csp.indicador,
      nombre: tablero.csp.nombre,
      dimension: tablero.csp.dimension,
      formula: tablero.csp.formula,
      numerador: tablero.csp.numerador,
      denominador: tablero.csp.denominador,
      porcentajeTexto: tablero.csp.porcentajeTexto,
      estado: tablero.csp.enCurso ? "En curso" : "Consolidado",
    },
    {
      codigo: tablero.isa.indicador,
      nombre: tablero.isa.nombre,
      dimension: tablero.isa.dimension,
      formula: tablero.isa.formula,
      numerador: tablero.isa.numerador,
      denominador: tablero.isa.denominador,
      porcentajeTexto: tablero.isa.porcentajeTexto,
      estado: tablero.isa.enCurso ? "En curso" : "Consolidado",
    },
    {
      codigo: tablero.igm.indicador,
      nombre: tablero.igm.nombre,
      dimension: tablero.igm.dimension,
      formula: tablero.igm.formula,
      numerador: tablero.igm.numerador,
      denominador: tablero.igm.denominador,
      porcentajeTexto: tablero.igm.porcentajeTexto,
      estado: tablero.igm.enCurso ? "En curso" : "Consolidado",
    },
  ];

  for (const item of filasIndicadores) {
    const fila = hojaResumen.addRow([
      `${item.codigo} — ${item.nombre}`,
      item.dimension,
      item.formula,
      item.numerador,
      item.denominador,
      item.porcentajeTexto,
      item.estado,
    ]);
    fila.font = { name: "Arial", size: 9 };
    fila.alignment = { vertical: "middle" };
    fila.getCell(4).alignment = { horizontal: "right" };
    fila.getCell(5).alignment = { horizontal: "right" };
    fila.getCell(6).alignment = { horizontal: "center" };
    fila.getCell(7).alignment = { horizontal: "center" };
  }

  // Desgloses Técnicos
  hojaResumen.addRow([]);
  hojaResumen.addRow(["DESGLOSE TÉCNICO DE CATEGORÍAS"]);
  hojaResumen.getRow(hojaResumen.rowCount).font = {
    name: "Arial",
    size: 10,
    bold: true,
    color: { argb: COLOR_GUINDO_HEX },
  };

  hojaResumen.addRow([
    "CSP (Sesiones)",
    `Planificadas: ${tablero.csp.desglose.planificadas}`,
    `Cumplidas: ${tablero.csp.desglose.cumplidas}`,
    `Parciales: ${tablero.csp.desglose.parciales}`,
    `No cumplidas: ${tablero.csp.desglose.noCumplidas}`,
    `Justificadas: ${tablero.csp.desglose.justificadas}`,
    `Efectivas: ${tablero.csp.desglose.denominadorEfectivo}`,
  ]);

  hojaResumen.addRow([
    "ISA (Libretas)",
    `Programadas: ${tablero.isa.desglose.programadas}`,
    `A tiempo: ${tablero.isa.desglose.publicadasATiempo}`,
    `Fuera de plazo: ${tablero.isa.desglose.publicadasFueraDePlazo}`,
    `Pendientes: ${tablero.isa.desglose.pendientes}`,
    `Vistas familia: ${tablero.isa.desglose.vistasPorFamilia} (${tablero.isa.desglose.porcentajeVistasFamilia} %)`,
    "",
  ]);

  hojaResumen.addRow([
    "IGM (Materiales)",
    `Planificados: ${tablero.igm.desglose.planificados}`,
    `A tiempo: ${tablero.igm.desglose.publicadosATiempo}`,
    `Fuera de plazo: ${tablero.igm.desglose.publicadosFueraDePlazo}`,
    `Pendientes: ${tablero.igm.desglose.pendientes}`,
    `Extras (excluidos): ${tablero.igm.desglose.extras}`,
    "",
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HOJA 2: Detalle Sesiones CSP
  // ─────────────────────────────────────────────────────────────────────────────
  const hojaSesiones = libro.addWorksheet("Detalle Sesiones CSP", {
    views: [{ showGridLines: true }],
  });

  hojaSesiones.columns = [
    { header: "Fecha", key: "fecha", width: 14 },
    { header: "Docente", key: "docente", width: 30 },
    { header: "DNI", key: "dni", width: 14 },
    { header: "Curso", key: "curso", width: 26 },
    { header: "Sección", key: "seccion", width: 12 },
    { header: "Grado", key: "grado", width: 14 },
    { header: "Hora Plan Inicio", key: "horaPlanInicio", width: 16 },
    { header: "Hora Plan Fin", key: "horaPlanFin", width: 16 },
    { header: "Hora Real Inicio", key: "horaRealInicio", width: 16 },
    { header: "Hora Real Fin", key: "horaRealFin", width: 16 },
    { header: "Minutos Perdidos", key: "minutosPerdidos", width: 16 },
    { header: "Estado de Sesión", key: "estado", width: 18 },
    { header: "Justificación", key: "justificacion", width: 30 },
  ];

  const cabeceraSesiones = hojaSesiones.getRow(1);
  cabeceraSesiones.font = {
    name: "Arial",
    size: 9.5,
    bold: true,
    color: { argb: COLOR_BLANCO_HEX },
  };
  cabeceraSesiones.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLOR_GUINDO_HEX },
  };
  cabeceraSesiones.alignment = { vertical: "middle", horizontal: "center" };

  if (detalleSesiones.length > 0) {
    for (const item of detalleSesiones) {
      hojaSesiones.addRow(item);
    }
  } else {
    hojaSesiones.addRow({
      fecha: "--",
      docente: "Sin registros de sesiones para los filtros seleccionados",
      dni: "--",
      curso: "--",
      seccion: "--",
      grado: "--",
      horaPlanInicio: "--",
      horaPlanFin: "--",
      horaRealInicio: "--",
      horaRealFin: "--",
      minutosPerdidos: 0,
      estado: "SIN_DATOS",
      justificacion: "--",
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HOJA 3: Detalle Libretas ISA
  // ─────────────────────────────────────────────────────────────────────────────
  const hojaLibretas = libro.addWorksheet("Detalle Libretas ISA", {
    views: [{ showGridLines: true }],
  });

  hojaLibretas.columns = [
    { header: "Código Estudiante", key: "codigoEstudiante", width: 18 },
    { header: "Nombre Completo", key: "nombreCompleto", width: 32 },
    { header: "Grado", key: "grado", width: 14 },
    { header: "Sección", key: "seccion", width: 12 },
    { header: "Fecha Límite", key: "fechaLimite", width: 16 },
    { header: "Fecha Subida", key: "fechaSubida", width: 16 },
    { header: "Estado", key: "estado", width: 20 },
    { header: "Visto por Familia", key: "vistoPorFamilia", width: 18 },
    { header: "Fecha Visto", key: "fechaVisto", width: 18 },
  ];

  const cabeceraLibretas = hojaLibretas.getRow(1);
  cabeceraLibretas.font = {
    name: "Arial",
    size: 9.5,
    bold: true,
    color: { argb: COLOR_BLANCO_HEX },
  };
  cabeceraLibretas.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLOR_GUINDO_HEX },
  };
  cabeceraLibretas.alignment = { vertical: "middle", horizontal: "center" };

  if (detalleLibretas.length > 0) {
    for (const item of detalleLibretas) {
      hojaLibretas.addRow(item);
    }
  } else {
    hojaLibretas.addRow({
      codigoEstudiante: "--",
      nombreCompleto: "Sin registros de libretas para los filtros seleccionados",
      grado: "--",
      seccion: "--",
      fechaLimite: "--",
      fechaSubida: "--",
      estado: "SIN_DATOS",
      vistoPorFamilia: "--",
      fechaVisto: "--",
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HOJA 4: Detalle Materiales IGM
  // ─────────────────────────────────────────────────────────────────────────────
  const hojaMateriales = libro.addWorksheet("Detalle Materiales IGM", {
    views: [{ showGridLines: true }],
  });

  hojaMateriales.columns = [
    { header: "Título", key: "titulo", width: 32 },
    { header: "Curso", key: "curso", width: 26 },
    { header: "Docente", key: "docente", width: 30 },
    { header: "Tipo de Material", key: "tipoMaterial", width: 18 },
    { header: "Es Planificado", key: "esPlanificado", width: 16 },
    { header: "Fecha Programada", key: "fechaProgramada", width: 18 },
    { header: "Fecha Publicación", key: "fechaPublicacion", width: 18 },
    { header: "Cumplimiento", key: "cumplimiento", width: 20 },
  ];

  const cabeceraMateriales = hojaMateriales.getRow(1);
  cabeceraMateriales.font = {
    name: "Arial",
    size: 9.5,
    bold: true,
    color: { argb: COLOR_BLANCO_HEX },
  };
  cabeceraMateriales.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLOR_GUINDO_HEX },
  };
  cabeceraMateriales.alignment = { vertical: "middle", horizontal: "center" };

  if (detalleMateriales.length > 0) {
    for (const item of detalleMateriales) {
      hojaMateriales.addRow(item);
    }
  } else {
    hojaMateriales.addRow({
      titulo: "Sin registros de materiales para los filtros seleccionados",
      curso: "--",
      docente: "--",
      tipoMaterial: "--",
      esPlanificado: "--",
      fechaProgramada: "--",
      fechaPublicacion: "--",
      cumplimiento: "SIN_DATOS",
    });
  }

  const arrayBuffer = await libro.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
