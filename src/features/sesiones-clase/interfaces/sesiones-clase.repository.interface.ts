import type { EstadoJustificacion, EstadoSesion } from "../constants";
import type { SesionResponseDto } from "../dto";
import type { BloqueDelDia, SesionPlanificada } from "../utils";

export interface DatosFirmaIngreso {
  hora: string;
  tema: string;
  minutosRetraso: number;
  equipoId: string | null;
}

export interface DatosFirmaSalida {
  hora: string;
  minutosPerdidos: number;
  estado: Extract<EstadoSesion, "cumplida" | "parcial">;
  equipoId: string | null;
}

export interface DatosSolicitudJustificacion {
  motivoCodigo: string;
  motivo: string;
  documentoUrl: string | null;
}

export interface MinutosPerdidosDocente {
  docenteId: string;
  docenteNombre: string;
  minutos: number;
}

export interface ResultadoCierre {
  noCumplidas: number;
  parciales: number;
  docentesAfectados?: string[];
}

export interface TemaRecienteCurso {
  cursoNombre: string;
  seccionNombre: string;
  temas: string[];
}

export interface ISesionesClaseRepository {
  bloquesDelDia(anioAcademicoId: string, diaSemana: number): Promise<BloqueDelDia[]>;
  insertarSesiones(fecha: string, planes: SesionPlanificada[]): Promise<number>;
  cerrarDia(
    fecha: string,
    salidaAutomatica: boolean,
    observacion: string,
  ): Promise<ResultadoCierre>;
  findById(id: string): Promise<SesionResponseDto | null>;
  sesionesDelDia(fecha: string): Promise<SesionResponseDto[]>;
  sesionesDeDocente(docenteId: string, desde: string, hasta: string): Promise<SesionResponseDto[]>;
  ultimosTemasDocente(
    docenteId: string,
    antesDeFecha: string,
    limite?: number,
  ): Promise<TemaRecienteCurso[]>;
  cursoSeccionDeSesion(sesionId: string): Promise<string | null>;
  firmarIngreso(id: string, docenteId: string, datos: DatosFirmaIngreso): Promise<boolean>;
  firmarSalida(id: string, docenteId: string, datos: DatosFirmaSalida): Promise<boolean>;
  actualizarTema(id: string, tema: string): Promise<void>;
  reemplazar(id: string, docenteId: string): Promise<boolean>;
  solicitarJustificacion(id: string, datos: DatosSolicitudJustificacion): Promise<void>;
  resolverJustificacion(
    id: string,
    estado: Extract<EstadoJustificacion, "aprobada" | "rechazada">,
    usuarioId: string,
    comentario: string | null,
  ): Promise<void>;
  justificacionesPorEstado(estado: EstadoJustificacion): Promise<SesionResponseDto[]>;
  /** Fechas AAAA-MM-DD que suspenden clases en el rango (feriados y suspensiones). */
  diasSinClases(desde: string, hasta: string): Promise<string[]>;
  /** Días distintos con sesiones justificadas por permiso personal en el año lectivo de la fecha. */
  diasPermisoPersonal(docenteId: string, fecha: string): Promise<string[]>;
  /** Minutos perdidos por docente en el rango, sin contar las sesiones justificadas. */
  minutosPerdidosPorDocente(desde: string, hasta: string): Promise<MinutosPerdidosDocente[]>;
  /** true si la alerta no estaba registrada (se debe enviar); false si ya se había enviado. */
  registrarAlertaEnviada(clave: string): Promise<boolean>;
  usuariosConRol(nombresRol: readonly string[]): Promise<string[]>;
  docenteDePersona(personaId: string): Promise<{ id: string; activo: boolean } | null>;
  docenteActivo(docenteId: string): Promise<boolean>;
  valoresVariables(codigos: readonly string[]): Promise<Map<string, string>>;
}
