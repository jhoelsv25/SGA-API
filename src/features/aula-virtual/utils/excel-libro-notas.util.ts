import {
  generarReporteExcel,
  type ColumnaReporte,
} from "../../../common/excel/reporte-excel.builder";

export interface EstudianteLibroNotasExcel {
  codigo: string;
  nombreCompleto: string;
  notasPorTarea: Record<string, number | null>;
  promediosPorTipo: Record<string, number | null>;
  notaFinal: number;
  notaLiteral: string;
}

export interface TareaColumnaExcel {
  id: string;
  titulo: string;
  tipo: string;
}

export interface DatosLibroNotasExcel {
  cursoNombre: string;
  seccionNombre: string;
  periodoNombre: string;
  tareas: TareaColumnaExcel[];
  estudiantes: EstudianteLibroNotasExcel[];
}

export interface ContextoLibroNotas {
  institucion: string;
  generadoPor: string;
}

/**
 * Reporte Excel estándar (skill `estandar-reportes-excel`) del libro de notas del aula virtual (CP-RF016-27).
 * Por estudiante: nota de cada tarea, nota final numérica y literal (AD, A, B, C). La nota que falta queda vacía.
 */
export async function generarExcelLibroNotas(
  datos: DatosLibroNotasExcel,
  contexto: ContextoLibroNotas,
): Promise<Buffer> {
  const columnas: ColumnaReporte[] = [
    { header: "N.°", key: "numero", ancho: 8, tipo: "numero" },
    { header: "Código", key: "codigo", ancho: 16 },
    { header: "Estudiante", key: "estudiante", ancho: 34, requerido: true },
    ...datos.tareas.map((t) => ({
      header: `${t.titulo} (${t.tipo})`,
      key: `tarea_${t.id}`,
      ancho: 16,
      tipo: "numero" as const,
    })),
    { header: "Nota final (0-20)", key: "notaFinal", ancho: 16, tipo: "numero", requerido: true },
    { header: "Literal", key: "notaLiteral", ancho: 10, requerido: true },
  ];

  const filas = datos.estudiantes.map((est, i) => {
    const fila: Record<string, string | number | null> = {
      numero: i + 1,
      codigo: est.codigo,
      estudiante: est.nombreCompleto,
      notaFinal: Number(est.notaFinal.toFixed(2)),
      notaLiteral: est.notaLiteral,
    };
    for (const t of datos.tareas) {
      const nota = est.notasPorTarea[t.id];
      fila[`tarea_${t.id}`] = nota === null || nota === undefined ? null : Number(nota.toFixed(2));
    }
    return fila;
  });

  return generarReporteExcel({
    titulo: `Libro de notas — ${datos.cursoNombre} (${datos.seccionNombre})`,
    modulo: "libro-notas",
    columnas,
    filas,
    filtros: {
      Curso: datos.cursoNombre,
      Sección: datos.seccionNombre,
      Periodo: datos.periodoNombre,
    },
    ...contexto,
  });
}
