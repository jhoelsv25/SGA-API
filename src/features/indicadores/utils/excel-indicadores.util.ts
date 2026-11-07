import {
  generarReporteExcel,
  type ColumnaReporte,
} from "../../../common/excel/reporte-excel.builder";
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
  /** Usuario que genera el reporte. */
  generadoPor: string;
  institucion: DatosInstitucionReporte;
  tablero: TableroIndicadoresResponseDto;
  filtroIndicador?: string | null;
  filtroDocenteId?: string | null;
  detalleSesiones?: DetalleSesionExcel[];
  detalleLibretas?: DetalleLibretaExcel[];
  detalleMateriales?: DetalleMaterialExcel[];
}

const col = (
  header: string,
  key: string,
  ancho: number,
  tipo?: "texto" | "numero",
): ColumnaReporte => ({ header, key, ancho, tipo });

/**
 * Reporte Excel estándar (skill `estandar-reportes-excel`) de indicadores (RF-020, CP-RF020-18):
 * «Reporte» = resumen de los 3 indicadores; hojas de desglose y de datos crudos; «Información».
 */
export async function generarExcelIndicadores(
  parametros: ParametrosGenerarExcelIndicadores,
): Promise<Buffer> {
  const {
    institucion,
    tablero,
    generadoPor,
    detalleSesiones = [],
    detalleLibretas = [],
    detalleMateriales = [],
  } = parametros;

  const indicadores = [tablero.csp, tablero.isa, tablero.igm];
  const resumen = indicadores.map((i) => ({
    indicador: `${i.indicador} — ${i.nombre}`,
    dimension: i.dimension,
    formula: i.formula,
    numerador: i.numerador,
    denominador: i.denominador,
    resultado: i.porcentajeTexto,
    estado: i.enCurso ? "En curso" : "Consolidado",
  }));

  const d = (indicador: string, concepto: string, valor: number | string) => ({
    indicador,
    concepto,
    valor,
  });
  const { csp, isa, igm } = tablero;
  const desglose = [
    d("CSP (Sesiones)", "Planificadas", csp.desglose.planificadas),
    d("CSP (Sesiones)", "Cumplidas", csp.desglose.cumplidas),
    d("CSP (Sesiones)", "Parciales", csp.desglose.parciales),
    d("CSP (Sesiones)", "No cumplidas", csp.desglose.noCumplidas),
    d("CSP (Sesiones)", "Justificadas", csp.desglose.justificadas),
    d("CSP (Sesiones)", "Efectivas", csp.desglose.denominadorEfectivo),
    d("ISA (Libretas)", "Programadas", isa.desglose.programadas),
    d("ISA (Libretas)", "Publicadas a tiempo", isa.desglose.publicadasATiempo),
    d("ISA (Libretas)", "Publicadas fuera de plazo", isa.desglose.publicadasFueraDePlazo),
    d("ISA (Libretas)", "Pendientes", isa.desglose.pendientes),
    d("ISA (Libretas)", "Vistas por la familia", isa.desglose.vistasPorFamilia),
    d("ISA (Libretas)", "Vistas por la familia (%)", isa.desglose.porcentajeVistasFamilia),
    d("IGM (Materiales)", "Planificados", igm.desglose.planificados),
    d("IGM (Materiales)", "Publicados a tiempo", igm.desglose.publicadosATiempo),
    d("IGM (Materiales)", "Publicados fuera de plazo", igm.desglose.publicadosFueraDePlazo),
    d("IGM (Materiales)", "Pendientes", igm.desglose.pendientes),
    d("IGM (Materiales)", "Extras (excluidos)", igm.desglose.extras),
  ];

  return generarReporteExcel({
    titulo: "Indicadores de eficacia institucional",
    modulo: "indicadores",
    columnas: [
      col("Indicador", "indicador", 30),
      col("Dimensión", "dimension", 26),
      col("Fórmula metodológica", "formula", 40),
      col("Numerador", "numerador", 14, "numero"),
      col("Denominador", "denominador", 14, "numero"),
      col("Resultado", "resultado", 14),
      col("Estado", "estado", 16),
    ],
    filas: resumen,
    hojasExtra: [
      {
        nombre: "Desglose",
        columnas: [
          col("Indicador", "indicador", 22),
          col("Concepto", "concepto", 30),
          col("Valor", "valor", 12, "numero"),
        ],
        filas: desglose,
      },
      {
        nombre: "Detalle Sesiones CSP",
        columnas: [
          col("Fecha", "fecha", 14),
          col("Docente", "docente", 30),
          col("DNI", "dni", 14),
          col("Curso", "curso", 26),
          col("Sección", "seccion", 12),
          col("Grado", "grado", 14),
          col("Hora plan inicio", "horaPlanInicio", 16),
          col("Hora plan fin", "horaPlanFin", 16),
          col("Hora real inicio", "horaRealInicio", 16),
          col("Hora real fin", "horaRealFin", 16),
          col("Minutos perdidos", "minutosPerdidos", 16, "numero"),
          col("Estado de la sesión", "estado", 18),
          col("Justificación", "justificacion", 30),
        ],
        filas: detalleSesiones as unknown as Record<string, string | number>[],
      },
      {
        nombre: "Detalle Libretas ISA",
        columnas: [
          col("Código del estudiante", "codigoEstudiante", 20),
          col("Apellidos y nombres", "nombreCompleto", 34),
          col("Grado", "grado", 14),
          col("Sección", "seccion", 12),
          col("Fecha límite", "fechaLimite", 16),
          col("Fecha de subida", "fechaSubida", 16),
          col("Estado", "estado", 18),
          col("Vista por la familia", "vistoPorFamilia", 18),
          col("Fecha de visto", "fechaVisto", 16),
        ],
        filas: detalleLibretas as unknown as Record<string, string | number>[],
      },
      {
        nombre: "Detalle Materiales IGM",
        columnas: [
          col("Título", "titulo", 34),
          col("Curso", "curso", 26),
          col("Docente", "docente", 30),
          col("Tipo de material", "tipoMaterial", 18),
          col("Planificado", "esPlanificado", 14),
          col("Fecha programada", "fechaProgramada", 18),
          col("Fecha de publicación", "fechaPublicacion", 20),
          col("Cumplimiento", "cumplimiento", 18),
        ],
        filas: detalleMateriales as unknown as Record<string, string | number>[],
      },
    ],
    filtros: {
      Período: `${tablero.periodoNombre || "General"} (${tablero.enCurso ? "en curso" : "cerrado"})`,
      Indicador: parametros.filtroIndicador ?? undefined,
      Docente: parametros.filtroDocenteId ?? undefined,
    },
    generadoPor,
    institucion: institucion.nombre,
    datosInstitucion: {
      "Código modular": institucion.codigoModular,
      UGEL: institucion.ugel,
      DRE: institucion.dre,
      Dirección: institucion.direccion,
    },
  });
}
