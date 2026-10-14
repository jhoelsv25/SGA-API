import { Workbook } from "exceljs";

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

/**
 * Genera el archivo Excel (.xlsx) con el libro de notas del aula virtual (CP-RF016-27).
 * Incluye por estudiante la nota de cada tarea, promedios por tipo, nota final numérica y literal (AD, A, B, C).
 */
export async function generarExcelLibroNotas(datos: DatosLibroNotasExcel): Promise<Buffer> {
  const workbook = new Workbook();
  workbook.creator = "SGA Colegio";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Libro de Notas", {
    views: [{ showGridLines: true }],
  });

  // Título e información institucional
  worksheet.mergeCells("A1:H1");
  const cellTitulo = worksheet.getCell("A1");
  cellTitulo.value = `LIBRO DE NOTAS - ${datos.cursoNombre.toUpperCase()} (${datos.seccionNombre})`;
  cellTitulo.font = { bold: true, size: 14, color: { argb: "FF1E293B" } };
  cellTitulo.alignment = { vertical: "middle", horizontal: "left" };

  worksheet.mergeCells("A2:H2");
  const cellPeriodo = worksheet.getCell("A2");
  cellPeriodo.value = `Periodo: ${datos.periodoNombre} · Fecha de reporte: ${new Date().toLocaleDateString("es-PE")}`;
  cellPeriodo.font = { italic: true, size: 10, color: { argb: "FF64748B" } };

  worksheet.addRow([]); // Fila 3 en blanco

  // Cabeceras de columnas (Fila 4)
  const headers = ["N.°", "Código", "Estudiante"];
  for (const t of datos.tareas) {
    headers.push(`${t.titulo} (${t.tipo})`);
  }
  headers.push("Nota Final (0-20)", "Literal");

  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E40AF" }, // Azul institucional
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Filas por cada estudiante
  datos.estudiantes.forEach((est, index) => {
    const filaValores: Array<string | number> = [index + 1, est.codigo, est.nombreCompleto];

    for (const t of datos.tareas) {
      const nota = est.notasPorTarea[t.id];
      filaValores.push(nota !== null && nota !== undefined ? Number(nota.toFixed(2)) : "—");
    }

    filaValores.push(Number(est.notaFinal.toFixed(2)));
    filaValores.push(est.notaLiteral);

    const row = worksheet.addRow(filaValores);
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      // Alinear texto a la izquierda para nombre; centrar los números
      if (colNumber === 3) {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
      // Resaltar columna final
      if (colNumber === headers.length - 1 || colNumber === headers.length) {
        cell.font = { bold: true };
      }
    });
  });

  // Ajuste automático de anchos de columna
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const val = cell.value;
      const columnLength =
        val === null || val === undefined ? 0 : typeof val === "object" ? 12 : String(val).length;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.max(maxLength + 3, 12);
  });
  if (worksheet.getColumn(3)) worksheet.getColumn(3).width = 32; // Estudiante

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
