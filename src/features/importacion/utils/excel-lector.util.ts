import { BadRequestException } from "@nestjs/common";
import { Workbook, type CellValue } from "exceljs";
import { IMPORTACION_MAX_FILAS, IMPORTACION_MESSAGES } from "../constants";

const CAMPOS_FECHA = new Set(["fechaNacimiento", "fechaIngreso", "fechaMatricula"]);

function dosDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

function normalizarEncabezado(encabezado: string): string {
  const limpio = encabezado
    .replace(/\*/g, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (limpio.includes("detalle") && limpio.includes("discapacidad")) return "detalleDiscapacidad";
  if (limpio.includes("discapacidad")) return "tieneDiscapacidad";
  if (limpio.includes("lengua")) return "lenguaMaterna";
  if (limpio.includes("religion")) return "religion";
  if (limpio.includes("titulo")) return "tituloProfesional";
  if (limpio.includes("direccion")) return "direccion";
  if (limpio.includes("distrito")) return "distrito";

  if (
    limpio === "n°" ||
    limpio === "nro" ||
    limpio === "n" ||
    limpio === "item" ||
    limpio === "orden" ||
    limpio === "#"
  ) {
    return "numeroOrden";
  }

  if (limpio.includes("siagie") && limpio.includes("estudiante")) return "codigoSiagieEstudiante";
  if (limpio.includes("siagie")) return "codigoSiagie";
  if (limpio.includes("docente") && (limpio.includes("codigo") || limpio.includes("cod"))) {
    return "codigoDocente";
  }
  if (limpio.includes("estudiante") && (limpio.includes("codigo") || limpio.includes("cod"))) {
    return "codigoSiagieEstudiante";
  }
  if (limpio === "codigo" || limpio === "cod" || limpio === "cod.") return "codigo";
  if (limpio.includes("tipo") && (limpio.includes("documento") || limpio.includes("doc"))) {
    return "tipoDocumento";
  }
  if (
    limpio.includes("documento") ||
    limpio.includes("dni") ||
    limpio.includes("num_doc") ||
    limpio.includes("nro_doc") ||
    limpio === "doc"
  ) {
    return "numeroDocumento";
  }
  if (limpio.includes("paterno")) return "apellidoPaterno";
  if (limpio.includes("materno")) return "apellidoMaterno";
  if (limpio.includes("nombres") || limpio === "nombre") return "nombres";
  if (limpio.includes("sexo") || limpio === "genero") return "sexo";
  if (limpio.includes("nacimiento") || limpio === "fec_nac") return "fechaNacimiento";
  if (limpio.includes("celular") || limpio.includes("telefono") || limpio === "cel") {
    return "celular";
  }
  if (limpio.includes("correo") || limpio.includes("email")) return "correo";
  if (limpio.includes("ingreso") || limpio === "fec_ingreso") return "fechaIngreso";
  if (limpio.includes("especialidad")) return "especialidad";
  if (limpio.includes("contrato")) return "tipoContrato";
  if (limpio.includes("jornada") || limpio.includes("horas")) return "jornada";
  if (limpio.includes("parentesco")) return "parentesco";
  if (limpio.includes("principal")) return "esPrincipal";
  if (limpio.includes("grado")) return "grado";
  if (limpio.includes("seccion")) return "seccion";
  if (limpio.includes("tipo") && limpio.includes("matricula")) return "tipoMatricula";
  if (limpio.includes("fecha") && limpio.includes("matricula")) return "fechaMatricula";
  if (limpio.includes("repitente")) return "esRepitente";
  if (limpio.includes("procedencia")) return "colegioProcedencia";
  if (limpio.includes("observacion")) return "observaciones";

  return encabezado.trim();
}

function esFechaSerialExcel(numero: number): string | null {
  if (!Number.isFinite(numero) || numero < 1) return null;
  const milisegundosPorDia = 86_400_000;
  // Epoch de Excel (1899-12-30 UTC compensando el bug de 1900)
  const baseUtc = Date.UTC(1899, 11, 30);
  const fecha = new Date(baseUtc + Math.round(numero) * milisegundosPorDia);
  if (Number.isNaN(fecha.getTime())) return null;
  return `${fecha.getUTCFullYear()}-${dosDigitos(fecha.getUTCMonth() + 1)}-${dosDigitos(fecha.getUTCDate())}`;
}

function convertirValorFechaIso(valor: CellValue): string {
  if (valor instanceof Date) {
    return `${valor.getUTCFullYear()}-${dosDigitos(valor.getUTCMonth() + 1)}-${dosDigitos(valor.getUTCDate())}`;
  }
  if (typeof valor === "number") {
    return esFechaSerialExcel(valor) ?? String(valor);
  }
  const texto = extraerTextoCelda(valor);
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(texto);
  if (dmy) {
    return `${dmy[3]}-${dosDigitos(Number(dmy[2]))}-${dosDigitos(Number(dmy[1]))}`;
  }
  return texto;
}

function extraerTextoCelda(valor: CellValue): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "string") return valor.trim();
  if (typeof valor === "number") return String(valor).trim();
  if (typeof valor === "boolean") return valor ? "SI" : "NO";
  if (valor instanceof Date) {
    return `${valor.getUTCFullYear()}-${dosDigitos(valor.getUTCMonth() + 1)}-${dosDigitos(valor.getUTCDate())}`;
  }
  if (typeof valor === "object") {
    if ("richText" in valor && Array.isArray(valor.richText)) {
      return valor.richText
        .map((parte) => parte.text)
        .join("")
        .trim();
    }
    if ("text" in valor && typeof valor.text === "string") {
      return valor.text.trim();
    }
    if ("result" in valor) {
      return extraerTextoCelda(valor.result);
    }
  }
  return "";
}

function esArchivoXlsxValido(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}

/**
 * Lee un archivo Excel (.xlsx) desde Buffer en memoria y devuelve las filas normalizadas
 * listas para validación e importación masiva.
 */
export async function leerFilasDesdeExcelBuffer(
  buffer: Buffer,
): Promise<Record<string, unknown>[]> {
  if (!esArchivoXlsxValido(buffer)) {
    throw new BadRequestException("El archivo debe ser un documento Excel válido (.xlsx).");
  }

  const workbook = new Workbook();
  try {
    await workbook.xlsx.load(Uint8Array.from(buffer).buffer);
  } catch {
    throw new BadRequestException(
      "No se pudo leer el archivo Excel. Verifique que no esté dañado.",
    );
  }

  const hoja =
    workbook.worksheets.find((w) => w.name.trim().toLowerCase() === "datos") ??
    workbook.worksheets[0];

  if (!hoja) {
    throw new BadRequestException("El archivo Excel no contiene hojas de datos.");
  }

  const filaEncabezado = hoja.getRow(1);
  const columnasPorIndice = new Map<number, string>();
  filaEncabezado.eachCell({ includeEmpty: false }, (celda, colNumber) => {
    const texto = extraerTextoCelda(celda.value);
    if (texto) {
      columnasPorIndice.set(colNumber, normalizarEncabezado(texto));
    }
  });

  if (columnasPorIndice.size === 0) {
    throw new BadRequestException("La primera fila del archivo Excel no contiene encabezados.");
  }

  const filas: Record<string, unknown>[] = [];
  const totalFilasHoja = hoja.rowCount;

  for (let numFila = 2; numFila <= totalFilasHoja; numFila++) {
    const fila = hoja.getRow(numFila);
    const registro: Record<string, unknown> = {};
    let tieneContenido = false;

    for (const [colNumber, clave] of columnasPorIndice.entries()) {
      const valorRaw = fila.getCell(colNumber).value;
      const valor = CAMPOS_FECHA.has(clave)
        ? convertirValorFechaIso(valorRaw)
        : extraerTextoCelda(valorRaw);

      if (valor !== "") {
        tieneContenido = true;
      }
      registro[clave] = valor;
    }

    if (tieneContenido) {
      filas.push(registro);
      if (filas.length > IMPORTACION_MAX_FILAS) {
        throw new BadRequestException(IMPORTACION_MESSAGES.LIMITE_FILAS_SUPERADO);
      }
    }
  }

  if (filas.length === 0) {
    throw new BadRequestException(IMPORTACION_MESSAGES.SIN_FILAS);
  }

  return filas;
}
