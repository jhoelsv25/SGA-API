export const IMPORTACION_MAX_FILAS = 500;

export const TIPO_IMPORTACION = {
  PERSONAS: "personas",
  ESTUDIANTES: "estudiantes",
  DOCENTES: "docentes",
  APODERADOS: "apoderados",
  MATRICULAS: "matriculas",
  CARGA_ACADEMICA: "carga_academica",
  HORARIOS: "horarios",
} as const;

export type TipoImportacion = (typeof TIPO_IMPORTACION)[keyof typeof TIPO_IMPORTACION];

export const IMPORTACION_MESSAGES = {
  LIMITE_FILAS_SUPERADO: `El archivo supera las ${IMPORTACION_MAX_FILAS} filas. Divídalo en varios archivos.`,
  SIN_FILAS: "El archivo no contiene filas de datos para procesar.",
  PLANTILLA_INCORRECTA: (tipo: string) =>
    `El archivo no corresponde a la plantilla de ${tipo}. Descárguela de nuevo.`,
  ESTUDIANTE_NO_EXISTE: "No existe un estudiante con ese código SIAGIE.",
  DOS_PRINCIPALES_MISMO_ESTUDIANTE: "El estudiante ya tiene un apoderado principal en el archivo.",
  TIPO_DOCUMENTO_INVALIDO:
    "El tipo de documento debe ser: dni, carne_extranjeria, pasaporte o partida_nacimiento.",
  SEXO_INVALIDO: "El sexo es obligatorio y debe ser M o F.",
  DNI_INVALIDO: "El DNI debe tener 8 dígitos.",
  FECHA_NACIMIENTO_FUTURA: "La fecha de nacimiento no puede ser futura.",
  CORREO_REPETIDO: "El correo ya está registrado para otra persona.",
  CODIGO_DOCENTE_REPETIDO: "Ya existe un docente con ese código.",
  CODIGO_SIAGIE_REPETIDO: "Ya existe un estudiante con ese código SIAGIE.",
  YA_REGISTRADO: (tipo: string) => `Esta persona ya está registrada como ${tipo}.`,
  IMPORTACION_EXITO: (importados: number, tipo: string, omitidos: number) =>
    `Se importaron ${importados} ${tipo}. ${omitidos} filas se omitieron; descargue el resumen.`,
} as const;
