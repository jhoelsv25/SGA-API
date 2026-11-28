export type EstadoLibreta = "pendiente" | "a_tiempo" | "fuera_de_plazo";
export type AlcanceLibreta = "tutoria" | "mis_secciones" | "colegio";
export type AsignacionLibreta = "automatica" | "manual";
export type MetodoReconocimientoLibreta = "nombre" | "ocr";

export interface ActorLibreta {
  id: string;
  roleId: string;
  role: string;
  personaId: string;
}

export interface ArchivoCarga {
  nombre: string;
  mime: string;
  tamanoBytes: number;
  buffer: Buffer;
}

export interface AsignacionManual {
  nombreArchivo: string;
  matriculaId: string;
  motivo?: string;
  origen?: "manual" | "ocr";
}

export interface DatosOcrLibreta {
  codigoEstudiante?: string | null;
  dni?: string | null;
  nombreCompleto?: string | null;
}

export interface CandidatoLibreta {
  matriculaId: string;
  codigo: string;
  numeroDocumento?: string | null;
  nombreCompleto: string;
  enSeccion: boolean;
  libretaId: string | null;
  estado: EstadoLibreta | null;
  usuarioEstudianteId: string | null;
  usuarioApoderadoId: string | null;
}

export interface ArchivoAsignado {
  nombreArchivo: string;
  matriculaId: string;
  nombreCompleto: string;
  libretaId: string;
  estado: EstadoLibreta;
  asignacion: AsignacionLibreta;
  metodoReconocimiento?: MetodoReconocimientoLibreta;
  codigoLeido: string | null;
  usuarioEstudianteId: string | null;
  usuarioApoderadoId: string | null;
}

export interface ArchivoSinReconocer {
  nombreArchivo: string;
  mensaje: string;
}

export interface ArchivoOtraSeccion {
  nombreArchivo: string;
  nombreEstudiante: string;
  mensaje: string;
}

export type ClasificacionArchivo =
  | ({ tipo: "asignada" } & ArchivoAsignado)
  | ({ tipo: "sin_reconocer" } & ArchivoSinReconocer)
  | ({ tipo: "otra_seccion" } & ArchivoOtraSeccion);
