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
  diaSemana: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
  tipoBloque: ["clase", "receso"],
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

export const CAMPOS_ESTUDIANTE: CampoPlantilla[] = [
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

export const CAMPOS_ESTUDIANTE_FICHA: CampoPlantilla[] = [
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

export const CAMPOS_DOCENTE: CampoPlantilla[] = [
  {
    key: "codigoDocente",
    header: "Código de docente",
    ancho: 20,
    requerido: false,
    tipo: "texto",
    ayuda: "Opcional. Si se deja vacío, el sistema genera uno (ej. 20261124000001).",
    ejemplo: "20261124000001",
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

export const CAMPOS_DOCENTE_FICHA: CampoPlantilla[] = [
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

export const CAMPOS_APODERADO: CampoPlantilla[] = [
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
