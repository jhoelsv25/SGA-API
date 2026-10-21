import type { EstadoJustificacion, EstadoSesion } from "../constants";
import type { SesionResponseDto } from "../dto";
import type { BloqueDelDia, SesionPlanificada } from "../utils";

export interface DatosFirmaIngreso {
  hora: string;
  tema: string;
  minutosRetraso: number;
  equipoId: string;
}

export interface DatosFirmaSalida {
  hora: string;
  minutosPerdidos: number;
  estado: Extract<EstadoSesion, "cumplida" | "parcial">;
  equipoId: string;
}

export interface ResultadoCierre {
  noCumplidas: number;
  parciales: number;
  docentesAfectados?: string[];
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
  firmarIngreso(id: string, docenteId: string, datos: DatosFirmaIngreso): Promise<boolean>;
  firmarSalida(id: string, docenteId: string, datos: DatosFirmaSalida): Promise<boolean>;
  actualizarTema(id: string, tema: string): Promise<void>;
  reemplazar(id: string, docenteId: string): Promise<boolean>;
  solicitarJustificacion(id: string, motivo: string, documentoUrl: string | null): Promise<void>;
  resolverJustificacion(
    id: string,
    estado: Extract<EstadoJustificacion, "aprobada" | "rechazada">,
    usuarioId: string,
    comentario: string | null,
  ): Promise<void>;
  justificacionesPorEstado(estado: EstadoJustificacion): Promise<SesionResponseDto[]>;
  docenteDePersona(personaId: string): Promise<{ id: string; activo: boolean } | null>;
  docenteActivo(docenteId: string): Promise<boolean>;
  valoresVariables(codigos: readonly string[]): Promise<Map<string, string>>;
}
