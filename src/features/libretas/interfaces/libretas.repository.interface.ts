import type { AlcanceLibreta, EstadoLibreta } from "./libretas.types";

export interface PeriodoLibretaRow {
  id: string;
  nombre: string;
  anioAcademicoId: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface LibretaSeccionRow {
  matriculaId: string;
  codigo: string;
  numeroDocumento?: string | null;
  nombreCompleto: string;
  seccionId: string;
  libretaId: string | null;
  estado: EstadoLibreta | null;
  fechaLimite: string | null;
  usuarioEstudianteId: string | null;
  usuarioApoderadoId: string | null;
}

export interface CodigoOtraSeccionRow {
  matriculaId: string;
  codigo: string;
  numeroDocumento?: string | null;
  nombreCompleto: string;
}

export interface PublicacionPersistida {
  libretaId: string;
  nombreOriginal: string;
  archivoUrl: string;
  tamanoBytes: number;
  asignacion: "automatica" | "manual";
  codigoLeido: string | null;
  motivo: string | null;
  esReemplazo: boolean;
  estado: EstadoLibreta;
}

export interface SeguimientoSeccionRow {
  seccionId: string;
  seccionNombre: string;
  gradoNombre: string;
  aTiempo: number;
  fueraDePlazo: number;
  pendientes: number;
  vistas: number;
}

export interface DetalleLibretaRow {
  libretaId: string;
  matriculaId: string;
  codigo: string;
  nombreCompleto: string;
  estado: EstadoLibreta;
  vistoEn: string | null;
  fechaLimite: string;
}

export interface MiLibretaRow {
  id: string;
  periodoId: string;
  bimestre: string;
  estado: EstadoLibreta;
  fechaLimite: string;
  archivoUrl: string | null;
  vistoEn: string | null;
  estudianteNombre: string;
}

export interface LibretaAperturaRow {
  id: string;
  estado: EstadoLibreta;
  bimestre: string;
  archivoUrl: string | null;
  nombreArchivo: string | null;
  vistoEn: string | null;
  seccionId: string;
  estudiantePersonaId: string;
  apoderadoPersonaIds: string[];
}

export interface HistorialArchivoRow {
  id: string;
  nombreOriginal: string;
  asignacion: "automatica" | "manual";
  vigente: boolean;
  motivo: string | null;
  subidoPorNombre: string;
  subidoEn: string;
}

export interface AlcanceRolRow {
  rolId: string;
  rolNombre: string;
  alcance: AlcanceLibreta;
}

export interface SeccionResumenRow {
  id: string;
  nombre: string;
  gradoNombre: string;
}

export interface LibretasRepositoryContract {
  anioDeTrabajo(headerId?: string): Promise<string>;
  obtenerPeriodo(periodoId: string): Promise<PeriodoLibretaRow | null>;
  existeProgramacion(periodoId: string): Promise<boolean>;
  programar(periodoId: string, anioId: string, fechaLimite: string): Promise<number>;
  cambiarFechaPendientes(periodoId: string, fechaLimite: string): Promise<number>;
  crearPendientesDeMatricula(matriculaId: string): Promise<number>;
  eliminarPendientesAntesDeLimite(matriculaId: string, fechaRetiro: string): Promise<number>;
  listarDeSeccion(seccionId: string, periodoId: string): Promise<LibretaSeccionRow[]>;
  listarCodigosOtrasSecciones(anioId: string, seccionId: string): Promise<CodigoOtraSeccionRow[]>;
  obtenerAlcance(rolId: string): Promise<AlcanceLibreta | null>;
  guardarAlcance(
    rolId: string,
    alcance: AlcanceLibreta,
    actorId: string,
  ): Promise<AlcanceLibreta | null>;
  listarAlcances(): Promise<AlcanceRolRow[]>;
  esTutorDeSeccion(personaId: string, seccionId: string): Promise<boolean>;
  dictaEnSeccion(personaId: string, seccionId: string): Promise<boolean>;
  publicar(items: PublicacionPersistida[], actorId: string): Promise<void>;
  seguimiento(periodoId: string, seccionIds?: string[]): Promise<SeguimientoSeccionRow[]>;
  detalleSeccion(seccionId: string, periodoId: string): Promise<DetalleLibretaRow[]>;
  misLibretas(personaId: string, rol: string): Promise<MiLibretaRow[]>;
  obtenerParaApertura(libretaId: string): Promise<LibretaAperturaRow | null>;
  registrarPrimeraVista(libretaId: string, usuarioId: string): Promise<void>;
  historial(libretaId: string): Promise<HistorialArchivoRow[]>;
  listarPeriodos(
    anioId: string,
  ): Promise<Array<PeriodoLibretaRow & { fechaLimite: string | null }>>;
  listarSecciones(anioId: string): Promise<SeccionResumenRow[]>;
  seccionesDePersona(personaId: string, alcance: AlcanceLibreta): Promise<string[]>;
}
