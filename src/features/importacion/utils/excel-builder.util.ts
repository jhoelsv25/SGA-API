import { Workbook } from "exceljs";
import {
  COLOR_OBLIGATORIO,
  COLOR_OPCIONAL,
  generarReporteExcel,
} from "../../../common/excel/reporte-excel.builder";
import {
  IMPORTACION_MAX_FILAS,
  LISTAS_PLANTILLA,
  PLANTILLAS,
  type NombreLista,
  type TipoImportacion,
} from "../constants";
import type { CredencialEmitidaDto } from "../dto";

const FILAS_CON_AYUDAS = 500;

function letraColumna(indice: number): string {
  let n = indice;
  let letra = "";
  while (n > 0) {
    const resto = (n - 1) % 26;
    letra = String.fromCharCode(65 + resto) + letra;
    n = Math.floor((n - 1) / 26);
  }
  return letra;
}

/**
 * Genera la plantilla oficial Excel (.xlsx) del tipo indicado, con el formato estándar:
 * - «Datos»: encabezados limpios (* = obligatorio), listas desplegables y formato de fecha. Sin filas de ejemplo.
 * - «Instrucciones»: qué escribir en cada columna, con un ejemplo.
 * - «Listas»: los valores permitidos de cada lista desplegable.
 */
export async function generarPlantillaExcel(tipo: TipoImportacion): Promise<Buffer> {
  const { titulo, campos } = PLANTILLAS[tipo];

  const workbook = new Workbook();
  workbook.creator = "SGA Colegio";
  workbook.created = new Date();

  // La hoja de datos va primero: es la que lee el sistema al importar
  const datos = workbook.addWorksheet("Datos");
  const instrucciones = workbook.addWorksheet("Instrucciones");
  const listas = workbook.addWorksheet("Listas");

  // --- Listas ---
  const nombresListas = Object.keys(LISTAS_PLANTILLA) as NombreLista[];
  const rangoLista = new Map<NombreLista, string>();
  nombresListas.forEach((nombre, i) => {
    const col = letraColumna(i + 1);
    const valores: readonly string[] = LISTAS_PLANTILLA[nombre];
    listas.getCell(`${col}1`).value = nombre;
    listas.getCell(`${col}1`).font = { bold: true };
    valores.forEach((v, j) => {
      listas.getCell(`${col}${j + 2}`).value = v;
    });
    listas.getColumn(i + 1).width = 22;
    rangoLista.set(nombre, `=Listas!$${col}$2:$${col}$${valores.length + 1}`);
  });

  // --- Datos ---
  datos.columns = campos.map((c) => ({
    header: c.requerido ? `${c.header} *` : c.header,
    key: c.key,
    width: Math.max(c.ancho, c.header.length + 4),
  }));

  const encabezado = datos.getRow(1);
  encabezado.font = { bold: true, color: { argb: "FFFFFFFF" } };
  encabezado.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  encabezado.height = 30;
  campos.forEach((c, i) => {
    encabezado.getCell(i + 1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: c.requerido ? COLOR_OBLIGATORIO : COLOR_OPCIONAL },
    };
  });
  datos.views = [{ state: "frozen", ySplit: 1 }];

  campos.forEach((c, i) => {
    const columna = datos.getColumn(i + 1);
    // Fechas con formato de fecha; el resto como texto para no perder ceros iniciales (DNI, celular)
    columna.numFmt = c.tipo === "fecha" ? "dd/mm/yyyy" : "@";

    const letra = letraColumna(i + 1);
    for (let fila = 2; fila <= FILAS_CON_AYUDAS + 1; fila++) {
      const celda = datos.getCell(`${letra}${fila}`);
      if (c.tipo === "lista" && c.lista) {
        celda.dataValidation = {
          type: "list",
          allowBlank: !c.requerido,
          formulae: [rangoLista.get(c.lista) ?? ""],
          showErrorMessage: true,
          errorStyle: "stop",
          errorTitle: "Valor no permitido",
          error: "Elija un valor de la lista desplegable.",
        };
      } else if (c.tipo === "fecha") {
        celda.dataValidation = {
          type: "date",
          operator: "greaterThan",
          allowBlank: !c.requerido,
          formulae: [new Date(Date.UTC(1900, 0, 1))],
          showErrorMessage: true,
          errorStyle: "stop",
          errorTitle: "Fecha no válida",
          error: "Escriba una fecha válida, por ejemplo 15/05/1990.",
        };
      }
    }
  });

  // --- Instrucciones ---
  instrucciones.columns = [
    { key: "columna", width: 32 },
    { key: "obligatorio", width: 14 },
    { key: "ayuda", width: 58 },
    { key: "ejemplo", width: 28 },
  ];
  instrucciones.mergeCells("A1:D1");
  instrucciones.getCell("A1").value = `Plantilla de ${titulo} — SGA Colegio`;
  instrucciones.getCell("A1").font = { bold: true, size: 14 };

  const notas = [
    "1. Escriba los datos en la hoja «Datos», una persona por fila, desde la fila 2.",
    "2. Las columnas con * son obligatorias. Las demás pueden quedar vacías.",
    "3. No cambie, mueva ni borre los encabezados de la hoja «Datos».",
    "4. Donde hay una flecha, elija el valor de la lista desplegable.",
    "5. Las fechas se escriben como día/mes/año (por ejemplo 15/05/1990).",
    `6. Máximo ${IMPORTACION_MAX_FILAS} filas por archivo. Si hay más, divídalo en varios archivos.`,
    "7. Antes de guardar en el sistema verá una vista previa; solo se importan las filas válidas.",
  ];
  notas.forEach((texto, i) => {
    instrucciones.mergeCells(`A${i + 2}:D${i + 2}`);
    instrucciones.getCell(`A${i + 2}`).value = texto;
  });

  const filaTabla = notas.length + 3;
  const cabecera = instrucciones.getRow(filaTabla);
  ["Columna", "Obligatorio", "Qué escribir", "Ejemplo"].forEach((t, i) => {
    const celda = cabecera.getCell(i + 1);
    celda.value = t;
    celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_OBLIGATORIO } };
  });
  campos.forEach((c, i) => {
    const fila = instrucciones.getRow(filaTabla + 1 + i);
    fila.getCell(1).value = c.header;
    fila.getCell(2).value = c.requerido ? "Sí" : "No";
    const opciones = c.lista ? `Valores: ${LISTAS_PLANTILLA[c.lista].join(", ")}. ` : "";
    fila.getCell(3).value = `${opciones}${c.ayuda}`.trim() || "Texto libre.";
    fila.getCell(3).alignment = { wrapText: true, vertical: "top" };
    fila.getCell(4).value = c.ejemplo || "—";
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export interface ContextoReporteCredenciales {
  institucion: string;
  generadoPor: string;
}

/**
 * Reporte Excel estándar (skill `estandar-reportes-excel`) de las credenciales y PINs generados.
 * Contiene datos sensibles: solo se entrega a quien ejecutó la importación.
 */
export async function construirExcelCredenciales(
  credenciales: CredencialEmitidaDto[],
  contexto: ContextoReporteCredenciales,
): Promise<Buffer> {
  return generarReporteExcel({
    titulo: "Credenciales emitidas",
    modulo: "credenciales",
    columnas: [
      { header: "Apellidos y nombres", key: "nombreCompleto", ancho: 34, requerido: true },
      { header: "Número de documento", key: "numeroDocumento", ancho: 20 },
      { header: "Rol", key: "tipoRol", ancho: 16 },
      { header: "Usuario de acceso", key: "nombreUsuario", ancho: 22 },
      { header: "Contraseña temporal", key: "tempPassword", ancho: 22 },
      { header: "Código de credencial", key: "codigoCredencial", ancho: 22 },
      { header: "PIN de marcación", key: "pin", ancho: 16 },
    ],
    filas: credenciales.map((c) => ({
      nombreCompleto: c.nombreCompleto,
      numeroDocumento: c.numeroDocumento,
      tipoRol: c.tipoRol,
      nombreUsuario: c.nombreUsuario,
      tempPassword: c.tempPassword,
      codigoCredencial: c.codigoCredencial,
      pin: c.pin,
    })),
    ...contexto,
  });
}
