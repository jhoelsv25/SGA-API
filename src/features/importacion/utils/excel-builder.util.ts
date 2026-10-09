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
    fgColor: { argb: "FF1E293B" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 28;

  sheet.addRow(ejemploRow);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Genera el Buffer de un archivo Excel institucional con las credenciales y PINs generados.
 */
export async function construirExcelCredenciales(
  credenciales: CredencialEmitidaDto[],
): Promise<Buffer> {
  const workbook = new Workbook();
  workbook.creator = "SGA Colegio";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Credenciales Emitidas");

  sheet.columns = [
    { header: "Apellidos y Nombres", key: "nombreCompleto", width: 34 },
    { header: "N° Documento", key: "numeroDocumento", width: 16 },
    { header: "Rol", key: "tipoRol", width: 16 },
    { header: "Usuario de Acceso", key: "nombreUsuario", width: 22 },
    { header: "Contraseña Temporal", key: "tempPassword", width: 22 },
    { header: "Código Credencial", key: "codigoCredencial", width: 22 },
    { header: "PIN de Marcación", key: "pin", width: 16 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 28;

  for (const c of credenciales) {
    const row = sheet.addRow({
      nombreCompleto: c.nombreCompleto,
      numeroDocumento: c.numeroDocumento,
      tipoRol: c.tipoRol,
      nombreUsuario: c.nombreUsuario || "—",
      tempPassword: c.tempPassword || "—",
      codigoCredencial: c.codigoCredencial || "—",
      pin: c.pin || "—",
    });
    row.alignment = { vertical: "middle" };
    row.getCell("numeroDocumento").alignment = { horizontal: "center", vertical: "middle" };
    row.getCell("tipoRol").alignment = { horizontal: "center", vertical: "middle" };
    row.getCell("pin").alignment = { horizontal: "center", vertical: "middle" };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
