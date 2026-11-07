import type {
  OrigenMarcacion,
  ResultadoMarcacion,
  TipoMarcacion,
  TipoPersonaMarcacion,
} from "../constants";
import type {
  GrupoPanelDto,
  MarcacionResponseDto,
  ReporteMarcacionesQueryDto,
  ReporteMarcacionesResponseDto,
} from "../dto";

export interface CredencialParaMarcar {
  id: string;
  personaId: string;
  pinHash: string | null;
  activa: boolean;
  venceEn: string | null;
}

export interface PersonaParaMarcar {
  personaId: string;
  nombres: string;
  nombreCompleto: string;
  fotoUrl: string | null;
  tipoPersona: TipoPersonaMarcacion | null;
  estudianteId: string | null;
  /** Docente o administrativo con vínculo activo; los estudiantes dependen de la matrícula. */
  vigente: boolean;
}

export type PersonaAutenticada = PersonaParaMarcar & { tipoPersona: TipoPersonaMarcacion };

export interface NuevaMarcacion {
  personaId: string;
  credencialId: string | null;
  turnoId: string;
  tipo: TipoMarcacion;
  fechaHora: string;
  origen: OrigenMarcacion;
  resultado: ResultadoMarcacion;
  minutosTardanza: number;
  observacion?: string;
  registradaPorId?: string;
  /** RF-022: reloj biométrico que originó la marcación. */
  equipoId?: string;
}

/** Resultado de procesar una marcación leída de un reloj biométrico (RF-022). */
export type ResultadoRegistroReloj =
  | { estado: "registrada"; marcacion: MarcacionResponseDto }
  | { estado: "duplicada" }
  | { estado: "ignorada"; razon: "rebote" | "jornada_completa" | "duplicada_entre_vias" }
  | { estado: "sin_turno" };

export interface MarcacionDelDia {
  id: string;
  tipo: TipoMarcacion;
  fechaHora: string;
  origen: OrigenMarcacion;
}

/** Cambia el tipo de una marcación ya guardada y recalcula su resultado (entrada ↔ salida). */
export interface CambioDeTipo {
  tipo: TipoMarcacion;
  resultado: ResultadoMarcacion;
  minutosTardanza: number;
}

export interface IMarcacionesRepository {
  findCredencialPorCodigo(codigo: string): Promise<CredencialParaMarcar | null>;
  findPersonaParaMarcar(personaId: string): Promise<PersonaParaMarcar | null>;
  tieneMatriculaVigente(estudianteId: string, anioAcademicoId: string): Promise<boolean>;
  marcacionesDePersonaEnFecha(personaId: string, fecha: string): Promise<MarcacionDelDia[]>;
  insertar(data: NuevaMarcacion): Promise<MarcacionResponseDto>;
  reetiquetar(id: string, cambio: CambioDeTipo): Promise<void>;
  findById(id: string): Promise<MarcacionResponseDto | null>;
  justificar(id: string, motivo: string, usuarioId: string): Promise<MarcacionResponseDto>;
  panelDelDia(
    fecha: string,
    anioAcademicoId: string | null,
  ): Promise<{
    estudiantes: GrupoPanelDto;
    personal: GrupoPanelDto;
  }>;
  reporte(
    query: ReporteMarcacionesQueryDto,
    limite: number,
  ): Promise<ReporteMarcacionesResponseDto>;
}
