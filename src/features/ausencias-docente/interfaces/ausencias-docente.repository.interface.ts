export interface SesionParaAusencia {
  id: string;
  fecha: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:mm"
  horaFin: string; // "HH:mm"
  horaInicioReal: string | null;
  horaFinReal: string | null;
  estado: string;
  docenteId: string;
  docenteNombre: string;
  docentePersonaId: string;
  docenteUsuarioId: string;
  cursoNombre: string;
  seccionNombre: string;
  anioAcademicoId: string;
}

export interface AusenciaFila {
  id: string;
  ausenciaRaizId: string | null;
  sesionClaseId: string;
  registradoPorId: string;
  horaDesde: string;
  horaHasta: string;
  minutos: number;
  motivo: string;
  observacion: string | null;
  descargo: string | null;
  descargoEn: string | null;
  version: number;
  vigente: boolean;
  motivoCambio: string | null;
  anulada: boolean;
  anuladaPorId: string | null;
  anuladaEn: string | null;
  motivoAnulacion: string | null;
  registradoEn: string;
}

export interface EvidenciaFila {
  id: string;
  ausenciaId: string;
  archivoUrl: string;
  tomadaEn: string | null;
  orden: number;
  vigente: boolean;
}

export interface AusenciaConDetalle extends AusenciaFila {
  sesion: SesionParaAusencia;
  fotos: EvidenciaFila[];
  registradoPorNombre: string;
}

export interface DatosCrearAusencia {
  sesionClaseId: string;
  registradoPorId: string;
  horaDesde: string;
  horaHasta: string;
  motivo: string;
  observacion?: string | null;
}

export interface DatosCrearEvidencia {
  archivoUrl: string;
  tomadaEn?: string | null;
  orden: number;
}

export interface DatosCrearVersion {
  ausenciaRaizId: string;
  sesionClaseId: string;
  registradoPorId: string;
  horaDesde: string;
  horaHasta: string;
  motivo: string;
  observacion?: string | null;
  version: number;
  motivoCambio: string;
}

export interface FiltrosListarSupervisor {
  anioAcademicoId?: string;
  periodoId?: string;
  docenteId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface IAusenciasDocenteRepository {
  buscarSesionParaAusencia(sesionId: string): Promise<SesionParaAusencia | null>;
  buscarAusenciasVigentesDeSesion(sesionId: string, exceptoId?: string): Promise<AusenciaFila[]>;
  buscarPorId(id: string): Promise<AusenciaConDetalle | null>;
  buscarVersionesDeRaiz(raizId: string): Promise<AusenciaConDetalle[]>;
  crearAusenciaConFotos(
    datos: DatosCrearAusencia,
    fotos: DatosCrearEvidencia[],
  ): Promise<AusenciaConDetalle>;
  crearNuevaVersion(
    versionAnteriorId: string,
    datosVersion: DatosCrearVersion,
    fotosNuevas: DatosCrearEvidencia[],
    fotosRetiradasIds?: string[],
  ): Promise<AusenciaConDetalle>;
  anularAusencia(
    id: string,
    anuladaPorId: string,
    motivoAnulacion: string,
  ): Promise<AusenciaConDetalle>;
  guardarDescargo(id: string, descargo: string): Promise<void>;
  listarSupervisor(filtros: FiltrosListarSupervisor): Promise<AusenciaConDetalle[]>;
  listarPorDocente(docenteId: string, anioAcademicoId?: string): Promise<AusenciaConDetalle[]>;
  docentePorPersonaId(personaId: string): Promise<{ id: string } | null>;
  usuarioPorPersonaId(personaId: string): Promise<{ id: string } | null>;
  bimestreEstaBloqueado(fecha: string, docenteId: string): Promise<boolean>;
  obtenerVariableSistema(codigo: string): Promise<string | null>;
  buscarPeriodoIdPorFecha(fecha: string): Promise<string | null>;
}
