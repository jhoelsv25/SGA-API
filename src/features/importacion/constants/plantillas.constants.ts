import { TIPO_IMPORTACION, type TipoImportacion } from "./importacion.constants";

/** Valores de las listas desplegables de las plantillas: son exactamente los que acepta el sistema. */
export const LISTAS_PLANTILLA = {
  tipoDocumento: ["dni", "carne_extranjeria", "pasaporte", "partida_nacimiento"],
  sexo: ["M", "F"],
  tipoContrato: ["nombrado", "contratado", "practicante"],
  jornada: ["20", "24", "30", "40"],
  parentesco: [
    "padre",
    "madre",
    "abuelo",
    "abuela",
    "hermano",
    "hermana",
    "tio",
    "tia",
    "tutor_legal",
    "otro",
  ],
  siNo: ["SI", "NO"],
  tipoMatricula: ["nuevo", "continuador", "traslado"],
} as const;

export type NombreLista = keyof typeof LISTAS_PLANTILLA;

export interface CampoPlantilla {
  /** Clave interna que recibe el backend (la misma que arma el lector del frontend). */
  key: string;
  /** Encabezado visible, sin instrucciones; el `*` lo agrega el generador si es obligatorio. */
  header: string;
  ancho: number;
  requerido: boolean;
  tipo: "texto" | "fecha" | "lista";
  lista?: NombreLista;
  ayuda: string;
  ejemplo: string;
}

const tipoDocumento: CampoPlantilla = {
  key: "tipoDocumento",
  header: "Tipo de documento",
  ancho: 20,
  requerido: true,
  tipo: "lista",
  lista: "tipoDocumento",
  ayuda: "Elija de la lista.",
  ejemplo: "dni",
};

/** Bloque de datos de la persona: idéntico en las 4 plantillas. */
export const CAMPOS_PERSONA: CampoPlantilla[] = [
  tipoDocumento,
  {
    key: "numeroDocumento",
    header: "Número de documento",
    ancho: 20,
    requerido: true,
    tipo: "texto",
    ayuda: "DNI: exactamente 8 dígitos.",
    ejemplo: "71234567",
  },
  {
    key: "apellidoPaterno",
    header: "Apellido paterno",
    ancho: 20,
    requerido: true,
    tipo: "texto",
    ayuda: "",
    ejemplo: "García",
  },
  {
    key: "apellidoMaterno",
    header: "Apellido materno",
    ancho: 20,
    requerido: false,
    tipo: "texto",
    ayuda: "",
    ejemplo: "Pérez",
  },
  {
    key: "nombres",
    header: "Nombres",
    ancho: 25,
    requerido: true,
    tipo: "texto",
    ayuda: "",
    ejemplo: "Juan Carlos",
  },
  {
    key: "sexo",
    header: "Sexo",
    ancho: 10,
    requerido: true,
    tipo: "lista",
    lista: "sexo",
    ayuda: "M o F.",
    ejemplo: "M",
  },
  {
    key: "fechaNacimiento",
    header: "Fecha de nacimiento",
    ancho: 20,
    requerido: false,
    tipo: "fecha",
    ayuda: "Fecha en formato día/mes/año. No puede ser futura.",
    ejemplo: "1990-05-15",
  },
  {
    key: "celular",
    header: "Celular",
    ancho: 16,
    requerido: false,
    tipo: "texto",
    ayuda: "",
    ejemplo: "987654321",
  },
  {
    key: "correo",
    header: "Correo electrónico",
    ancho: 28,
    requerido: false,
    tipo: "texto",
    ayuda: "No puede repetirse con otra persona.",
    ejemplo: "juan.garcia@ejemplo.com",
  },
  {
    key: "direccion",
    header: "Dirección",
    ancho: 30,
    requerido: false,
    tipo: "texto",
    ayuda: "",
    ejemplo: "Jr. Lima 123",
  },
  {
    key: "distrito",
    header: "Distrito",
    ancho: 20,
    requerido: false,
    tipo: "texto",
    ayuda: "",
    ejemplo: "Lircay",
  },
];

const fechaIngreso: CampoPlantilla = {
  key: "fechaIngreso",
  header: "Fecha de ingreso",
  ancho: 18,
  requerido: true,
  tipo: "fecha",
  ayuda: "Fecha en formato día/mes/año.",
  ejemplo: "2027-03-01",
};

const CAMPOS_ESTUDIANTE: CampoPlantilla[] = [
  {
    key: "codigoSiagie",
    header: "Código SIAGIE",
    ancho: 18,
    requerido: true,
    tipo: "texto",
    ayuda: "Único por estudiante.",
    ejemplo: "2026-0001",
  },
  { ...fechaIngreso, ejemplo: "2026-03-01" },
];

const CAMPOS_ESTUDIANTE_FICHA: CampoPlantilla[] = [
  {
    key: "lenguaMaterna",
    header: "Lengua materna",
    ancho: 18,
    requerido: false,
    tipo: "texto",
    ayuda: "",
    ejemplo: "Castellano",
  },
  {
    key: "religion",
    header: "Religión",
    ancho: 16,
    requerido: false,
    tipo: "texto",
    ayuda: "",
    ejemplo: "Católica",
  },
  {
    key: "tieneDiscapacidad",
    header: "¿Tiene discapacidad?",
    ancho: 18,
    requerido: false,
    tipo: "lista",
    lista: "siNo",
    ayuda: "SI o NO. Si no indica nada se toma NO.",
    ejemplo: "NO",
  },
  {
    key: "detalleDiscapacidad",
    header: "Detalle de la discapacidad",
    ancho: 28,
    requerido: false,
    tipo: "texto",
    ayuda: "Solo si respondió SI en «¿Tiene discapacidad?».",
    ejemplo: "",
  },
];

const CAMPOS_DOCENTE: CampoPlantilla[] = [
  {
    key: "codigoDocente",
    header: "Código de docente",
    ancho: 18,
    requerido: true,
    tipo: "texto",
    ayuda: "Único por docente.",
    ejemplo: "DOC-2027-01",
  },
  {
    key: "tipoContrato",
    header: "Tipo de contrato",
    ancho: 18,
    requerido: true,
    tipo: "lista",
    lista: "tipoContrato",
    ayuda: "Elija de la lista.",
    ejemplo: "nombrado",
  },
  {
    key: "jornada",
    header: "Jornada en horas",
    ancho: 16,
    requerido: true,
    tipo: "lista",
    lista: "jornada",
    ayuda: "20, 24, 30 o 40.",
    ejemplo: "30",
  },
  fechaIngreso,
];

const CAMPOS_DOCENTE_FICHA: CampoPlantilla[] = [
  {
    key: "especialidad",
    header: "Especialidad",
    ancho: 24,
    requerido: false,
    tipo: "texto",
    ayuda: "",
    ejemplo: "Matemática",
  },
  {
    key: "tituloProfesional",
    header: "Título profesional",
    ancho: 28,
    requerido: false,
    tipo: "texto",
    ayuda: "",
    ejemplo: "Licenciado en Educación",
  },
];

const CAMPOS_APODERADO: CampoPlantilla[] = [
  {
    key: "codigoSiagieEstudiante",
    header: "Código SIAGIE del estudiante",
    ancho: 26,
    requerido: true,
    tipo: "texto",
    ayuda: "El estudiante ya debe estar registrado.",
    ejemplo: "2026-0001",
  },
  {
    key: "parentesco",
    header: "Parentesco",
    ancho: 16,
    requerido: true,
    tipo: "lista",
    lista: "parentesco",
    ayuda: "Elija de la lista.",
    ejemplo: "madre",
  },
  {
    key: "esPrincipal",
    header: "¿Es apoderado principal?",
    ancho: 22,
    requerido: false,
    tipo: "lista",
    lista: "siNo",
    ayuda: "SI o NO. Solo puede haber uno principal por estudiante en el archivo.",
    ejemplo: "SI",
  },
];

const CAMPOS_MATRICULA: CampoPlantilla[] = [
  {
    key: "codigoSiagie",
    header: "Código SIAGIE",
    ancho: 22,
    requerido: true,
    tipo: "texto",
    ayuda: "Código SIAGIE (o DNI) del estudiante ya registrado en el padrón.",
    ejemplo: "00000078360633",
  },
  {
    key: "grado",
    header: "Grado",
    ancho: 18,
    requerido: true,
    tipo: "texto",
    ayuda: "Número o nombre del grado (ej: 1, PRIMERO, 2, SEGUNDO...).",
    ejemplo: "PRIMERO",
  },
  {
    key: "seccion",
    header: "Sección",
    ancho: 14,
    requerido: true,
    tipo: "texto",
    ayuda: "Nombre exacto de la sección activa en el año escolar (ej: A, B, 2 AP).",
    ejemplo: "A",
  },
  {
    key: "tipoMatricula",
    header: "Tipo de matrícula",
    ancho: 18,
    requerido: false,
    tipo: "lista",
    lista: "tipoMatricula",
    ayuda: "nuevo, continuador o traslado. Si se deja vacío se usa continuador.",
    ejemplo: "continuador",
  },
  {
    key: "fechaMatricula",
    header: "Fecha de matrícula",
    ancho: 20,
    requerido: false,
    tipo: "fecha",
    ayuda: "Formato día/mes/año. Si se deja vacío usa la fecha de hoy.",
    ejemplo: "2026-03-02",
  },
  {
    key: "esRepitente",
    header: "¿Es repitente?",
    ancho: 16,
    requerido: false,
    tipo: "lista",
    lista: "siNo",
    ayuda: "SI o NO. Por defecto NO.",
    ejemplo: "NO",
  },
  {
    key: "colegioProcedencia",
    header: "Colegio de procedencia",
    ancho: 28,
    requerido: false,
    tipo: "texto",
    ayuda: "Obligatorio solo si el tipo de matrícula es traslado.",
    ejemplo: "",
  },
  {
    key: "observaciones",
    header: "Observaciones",
    ancho: 30,
    requerido: false,
    tipo: "texto",
    ayuda: "Notas adicionales opcionales.",
    ejemplo: "",
  },
];

export interface DefinicionPlantilla {
  titulo: string;
  campos: CampoPlantilla[];
}

/** Columnas de cada plantilla: primero lo propio de la ficha, luego la persona, luego el resto de la ficha. */
export const PLANTILLAS: Record<TipoImportacion, DefinicionPlantilla> = {
  [TIPO_IMPORTACION.PERSONAS]: { titulo: "Personas", campos: [...CAMPOS_PERSONA] },
  [TIPO_IMPORTACION.ESTUDIANTES]: {
    titulo: "Estudiantes",
    campos: [...CAMPOS_ESTUDIANTE, ...CAMPOS_PERSONA, ...CAMPOS_ESTUDIANTE_FICHA],
  },
  [TIPO_IMPORTACION.DOCENTES]: {
    titulo: "Docentes",
    campos: [...CAMPOS_DOCENTE, ...CAMPOS_PERSONA, ...CAMPOS_DOCENTE_FICHA],
  },
  [TIPO_IMPORTACION.APODERADOS]: {
    titulo: "Apoderados",
    campos: [...CAMPOS_APODERADO, ...CAMPOS_PERSONA],
  },
  [TIPO_IMPORTACION.MATRICULAS]: {
    titulo: "Matrículas",
    campos: [...CAMPOS_MATRICULA],
  },
};
