import type { CreatePersonaDto, PersonaResponseDto } from "../../personas/dto";
import type { CredencialEmitidaDto, FilaPrevisualizadaDto } from "../dto";

export type Sexo = "M" | "F";

export interface ProcesarFilaResult {
  credencial?: CredencialEmitidaDto;
}

export interface AnalizarFilaContext {
  numeroFila: number;
  datos: Record<string, unknown>;
  personaExistente: PersonaResponseDto | null;
  codigosEnLote: Set<string>;
  principalesPorEstudiante: Set<string>;
}

export interface ProcesarFilaContext {
  datos: Record<string, unknown>;
  basePersona: CreatePersonaDto;
  personaExistente: PersonaResponseDto | null;
  actorId: string;
  ip?: string;
}

export interface IEntidadImportHandler {
  analizar(contexto: AnalizarFilaContext): Promise<FilaPrevisualizadaDto> | FilaPrevisualizadaDto;
  procesar(contexto: ProcesarFilaContext): Promise<ProcesarFilaResult | null>;
}
