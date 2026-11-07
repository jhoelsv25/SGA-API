import { Workbook } from "exceljs";
import { TIPO_IMPORTACION, type TipoImportacion } from "../constants";
import type { CredencialEmitidaDto } from "../dto";

/**
 * Genera el Buffer de la plantilla oficial Excel (.xlsx) para el tipo de importación especificado.
 */
export async function generarPlantillaExcel(tipo: TipoImportacion): Promise<Buffer> {
  const workbook = new Workbook();
  workbook.creator = "SGA Colegio";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`Plantilla ${tipo}`);

  let columns: Array<{ header: string; key: string; width: number }> = [];
  let ejemploRow: Record<string, unknown> = {};

  switch (tipo) {
    case TIPO_IMPORTACION.PERSONAS:
      columns = [
        { header: "Tipo de Documento (dni/ce/pasaporte)", key: "tipoDocumento", width: 18 },
        { header: "Número de Documento", key: "numeroDocumento", width: 20 },
        { header: "Apellido Paterno", key: "apellidoPaterno", width: 20 },
        { header: "Apellido Materno", key: "apellidoMaterno", width: 20 },
        { header: "Nombres", key: "nombres", width: 25 },
        { header: "Sexo (M/F)", key: "sexo", width: 12 },
        { header: "Fecha de Nacimiento (YYYY-MM-DD)", key: "fechaNacimiento", width: 20 },
        { header: "Celular", key: "celular", width: 16 },
        { header: "Correo Electrónico", key: "correo", width: 28 },
      ];
      ejemploRow = {
        tipoDocumento: "dni",
        numeroDocumento: "71234567",
        apellidoPaterno: "García",
        apellidoMaterno: "Pérez",
        nombres: "Juan Carlos",
        sexo: "M",
        fechaNacimiento: "1990-05-15",
        celular: "987654321",
        correo: "juan.garcia@ejemplo.com",
      };
      break;

    case TIPO_IMPORTACION.ESTUDIANTES:
      columns = [
        { header: "Código SIAGIE", key: "codigoSiagie", width: 18 },
        { header: "Fecha de Ingreso (YYYY-MM-DD)", key: "fechaIngreso", width: 20 },
        { header: "Tipo de Documento", key: "tipoDocumento", width: 18 },
        { header: "Número de Documento", key: "numeroDocumento", width: 20 },
        { header: "Apellido Paterno", key: "apellidoPaterno", width: 20 },
        { header: "Apellido Materno", key: "apellidoMaterno", width: 20 },
        { header: "Nombres", key: "nombres", width: 25 },
        { header: "Sexo (M/F)", key: "sexo", width: 12 },
        { header: "Fecha de Nacimiento", key: "fechaNacimiento", width: 20 },
        { header: "Celular", key: "celular", width: 16 },
        { header: "Correo Electrónico", key: "correo", width: 28 },
      ];
      ejemploRow = {
        codigoSiagie: "2026-0001",
        fechaIngreso: "2026-03-01",
        tipoDocumento: "dni",
        numeroDocumento: "78123456",
        apellidoPaterno: "Mendoza",
        apellidoMaterno: "Castro",
        nombres: "Sofía Valeria",
        sexo: "F",
        fechaNacimiento: "2012-09-20",
        celular: "912345678",
        correo: "sofia.mendoza@estudiante.edu.pe",
      };
      break;

    case TIPO_IMPORTACION.DOCENTES:
      columns = [
        { header: "Código de Docente", key: "codigoDocente", width: 18 },
        { header: "Especialidad", key: "especialidad", width: 24 },
        {
          header: "Tipo de Contrato (nombrado/contratado/practicante)",
          key: "tipoContrato",
          width: 24,
        },
        { header: "Jornada Horas (20/24/30/40)", key: "jornada", width: 16 },
        { header: "Fecha de Ingreso (YYYY-MM-DD)", key: "fechaIngreso", width: 20 },
        { header: "Tipo de Documento", key: "tipoDocumento", width: 18 },
        { header: "Número de Documento", key: "numeroDocumento", width: 20 },
        { header: "Apellido Paterno", key: "apellidoPaterno", width: 20 },
        { header: "Apellido Materno", key: "apellidoMaterno", width: 20 },
        { header: "Nombres", key: "nombres", width: 25 },
        { header: "Sexo (M/F)", key: "sexo", width: 12 },
        { header: "Fecha de Nacimiento", key: "fechaNacimiento", width: 20 },
        { header: "Celular", key: "celular", width: 16 },
        { header: "Correo Electrónico", key: "correo", width: 28 },
      ];
      ejemploRow = {
        codigoDocente: "DOC-2027-01",
        especialidad: "Matemática",
        tipoContrato: "nombrado",
        jornada: 30,
        fechaIngreso: "2027-03-01",
        tipoDocumento: "dni",
        numeroDocumento: "40123456",
        apellidoPaterno: "Benítez",
        apellidoMaterno: "Ramos",
        nombres: "Javier Eduardo",
        sexo: "M",
        fechaNacimiento: "1985-04-12",
        celular: "998877665",
        correo: "javier.benitez@colegio.edu.pe",
      };
      break;

    case TIPO_IMPORTACION.APODERADOS:
      columns = [
        { header: "Código SIAGIE del Estudiante", key: "codigoSiagieEstudiante", width: 24 },
        {
          header: "Parentesco (madre/padre/abuelo/abuela/tutor_legal/otro)",
          key: "parentesco",
          width: 24,
        },
        { header: "¿Es Principal? (SI/NO)", key: "esPrincipal", width: 18 },
        { header: "Tipo de Documento", key: "tipoDocumento", width: 18 },
        { header: "Número de Documento", key: "numeroDocumento", width: 20 },
        { header: "Apellido Paterno", key: "apellidoPaterno", width: 20 },
        { header: "Apellido Materno", key: "apellidoMaterno", width: 20 },
        { header: "Nombres", key: "nombres", width: 25 },
        { header: "Sexo (M/F)", key: "sexo", width: 12 },
        { header: "Celular", key: "celular", width: 16 },
        { header: "Correo Electrónico", key: "correo", width: 28 },
      ];
      ejemploRow = {
        codigoSiagieEstudiante: "1020304050",
        parentesco: "madre",
        esPrincipal: "SI",
        tipoDocumento: "dni",
        numeroDocumento: "42123456",
        apellidoPaterno: "Flores",
        apellidoMaterno: "Zúñiga",
        nombres: "Elena Rosa",
        sexo: "F",
        celular: "976543210",
        correo: "elena.flores@ejemplo.com",
      };
      break;
  }

  sheet.columns = columns;

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF722F37" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 28;

  sheet.addRow(ejemploRow);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Genera el Buffer de un archivo Excel institucional con las credenciales y PINs generados,
 * decorado con el membrete oficial y los colores corporativos de la I.E. Nuestra Señora del Carmen.
 */
export async function construirExcelCredenciales(
  credenciales: CredencialEmitidaDto[],
): Promise<Buffer> {
  const workbook = new Workbook();
  workbook.creator = "I.E. Nuestra Señora del Carmen - SGA Colegio";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Credenciales Emitidas", {
    views: [{ showGridLines: true }],
  });

  const GRANATE_PRINCIPAL = "FF722F37";
  const GRANATE_SUBTITULO = "FFF5E8EB";
  const TEXTO_GRANATE = "FF501524";
  const BORDE_TABLA = "FFE5D5DA";
  const FILA_PAR = "FFFDF8F9";
  const BLANCO = "FFFFFFFF";

  // Configurar anchos de columna (A a H)
  sheet.getColumn(1).width = 7; // N°
  sheet.getColumn(2).width = 38; // Apellidos y Nombres
  sheet.getColumn(3).width = 16; // N° Documento
  sheet.getColumn(4).width = 18; // Rol
  sheet.getColumn(5).width = 22; // Usuario de Acceso
  sheet.getColumn(6).width = 24; // Contraseña Temporal
  sheet.getColumn(7).width = 26; // Código Credencial
  sheet.getColumn(8).width = 18; // PIN de Marcación

  // Membrete Institucional
  // Fila 1: Título Principal Institución
  sheet.mergeCells("A1:H1");
  const r1 = sheet.getCell("A1");
  r1.value = 'I.E. DE MUJERES "NUESTRA SEÑORA DEL CARMEN" — LIRCAY';
  r1.font = { name: "Calibri", size: 14, bold: true, color: { argb: BLANCO } };
  r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRANATE_PRINCIPAL } };
  r1.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 32;

  // Fila 2: Subtítulo y Dependencia
  sheet.mergeCells("A2:H2");
  const r2 = sheet.getCell("A2");
  r2.value =
    "Lircay · Angaraes · Huancavelica | UGEL Angaraes | Sistema de Gestión Académica (SGA)";
  r2.font = { name: "Calibri", size: 10, italic: true, color: { argb: TEXTO_GRANATE } };
  r2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRANATE_SUBTITULO } };
  r2.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(2).height = 20;

  // Fila 3: Título del Reporte
  sheet.mergeCells("A3:H3");
  const r3 = sheet.getCell("A3");
  r3.value = "REPORTE OFICIAL DE CREDENCIALES DE ACCESO Y MARCACIÓN EN KIOSKO";
  r3.font = { name: "Calibri", size: 11, bold: true, color: { argb: GRANATE_PRINCIPAL } };
  r3.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(3).height = 24;

  // Fila 4: Metadatos de Emisión
  const ahora = new Date();
  const fechaStr = ahora.toLocaleDateString("es-PE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const horaStr = ahora.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  sheet.mergeCells("A4:H4");
  const r4 = sheet.getCell("A4");
  r4.value = `Emisión: ${fechaStr} a las ${horaStr}  |  Total de Credenciales: ${credenciales.length}  |  Documento Confidencial`;
  r4.font = { name: "Calibri", size: 9.5, color: { argb: "FF64748B" } };
  r4.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(4).height = 18;

  // Fila 5: Espacio separador
  sheet.getRow(5).height = 10;

  // Fila 6: Encabezados de la Tabla
  const encabezados = [
    "N°",
    "Apellidos y Nombres",
    "N° Documento",
    "Rol Institucional",
    "Usuario de Acceso",
    "Contraseña Temporal",
    "Código de Marcación",
    "PIN de Marcación",
  ];

  const headerRow = sheet.getRow(6);
  headerRow.height = 28;

  encabezados.forEach((encabezado, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = encabezado;
    cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: BLANCO } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: GRANATE_PRINCIPAL },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: TEXTO_GRANATE } },
      bottom: { style: "medium", color: { argb: TEXTO_GRANATE } },
      left: { style: "thin", color: { argb: TEXTO_GRANATE } },
      right: { style: "thin", color: { argb: TEXTO_GRANATE } },
    };
  });

  // Filas de Datos (a partir de la fila 7)
  credenciales.forEach((c, i) => {
    const rowNum = 7 + i;
    const dataRow = sheet.getRow(rowNum);
    dataRow.height = 22;

    const esPar = i % 2 === 1;
    const bgRowColor = esPar ? FILA_PAR : BLANCO;

    dataRow.values = [
      i + 1,
      c.nombreCompleto,
      c.numeroDocumento,
      c.tipoRol,
      c.nombreUsuario || "—",
      c.tempPassword || "—",
      c.codigoCredencial || "—",
      c.pin || "—",
    ];

    // Estilos celda por celda
    for (let colIdx = 1; colIdx <= 8; colIdx++) {
      const cell = dataRow.getCell(colIdx);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: bgRowColor },
      };
      cell.border = {
        top: { style: "thin", color: { argb: BORDE_TABLA } },
        bottom: { style: "thin", color: { argb: BORDE_TABLA } },
        left: { style: "thin", color: { argb: BORDE_TABLA } },
        right: { style: "thin", color: { argb: BORDE_TABLA } },
      };

      if (colIdx === 1) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { name: "Calibri", size: 10, color: { argb: "FF64748B" } };
      } else if (colIdx === 2) {
        cell.alignment = { horizontal: "left", vertical: "middle" };
        cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FF1E293B" } };
      } else if (colIdx === 3 || colIdx === 4) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { name: "Calibri", size: 10, color: { argb: "FF334155" } };
      } else if (colIdx === 5) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { name: "Consolas", size: 10.5, bold: true, color: { argb: "FF0F172A" } };
      } else if (colIdx === 6) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = {
          name: "Consolas",
          size: 10.5,
          bold: true,
          color: { argb: GRANATE_PRINCIPAL },
        };
      } else if (colIdx === 7) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { name: "Consolas", size: 10, bold: true, color: { argb: "FF1E293B" } };
      } else if (colIdx === 8) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { name: "Consolas", size: 11, bold: true, color: { argb: GRANATE_PRINCIPAL } };
      }
    }
  });

  // Fila final con advertencia de seguridad
  const totalRows = 7 + credenciales.length;
  const avisoRowIndex = totalRows + 1;
  sheet.mergeCells(`A${avisoRowIndex}:H${avisoRowIndex}`);
  const rAviso = sheet.getCell(`A${avisoRowIndex}`);
  rAviso.value =
    "🔒 AVISO DE CONFIDENCIALIDAD Y SEGURIDAD: Las contraseñas temporales y PINs de marcación son personales e intransferibles. Cada usuario deberá modificar su contraseña en su primer inicio de sesión en la plataforma.";
  rAviso.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF94A3B8" } };
  rAviso.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(avisoRowIndex).height = 24;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
