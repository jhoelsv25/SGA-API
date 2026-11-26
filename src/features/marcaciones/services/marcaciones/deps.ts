import { AuditService } from "../../../../common/services/audit.service";
import { AniosAcademicosService } from "../../../anio-escolar/anios.service";
import { CalendarioService } from "../../../calendario/calendario.service";
import { EquiposService } from "../../../equipos/equipos.service";
import { NotificacionesService } from "../../../notificaciones/notificaciones.service";
import { TurnosRepository } from "../../../turnos/repositories/turnos.repository";
import { VariablesSistemaService } from "../../../variables-sistema/variables-sistema.service";
import type { TurnoResponseDto } from "../../../turnos/dto";
import { type TipoMarcacion, type TipoPersonaMarcacion } from "../../constants";
import type { MarcacionKioskoResponseDto } from "../../dto";
import type {
  CredencialParaMarcar,
  MarcacionDelDia,
  PersonaAutenticada,
  PersonaParaMarcar,
} from "../../interfaces";
import { MarcacionesRepository } from "../../repositories";
import { type DecisionMarca } from "../../utils";

export type MarcacionesServiceDeps = {
  repository: MarcacionesRepository;
  equiposService: EquiposService;
  turnosRepository: TurnosRepository;
  calendarioService: CalendarioService;
  aniosService: AniosAcademicosService;
  auditService: AuditService;
  variablesService: VariablesSistemaService;
  notificacionesService: NotificacionesService | undefined;
};

export type MarcacionesServiceCalls = {
  autenticarCredencial: (
    codigo: string,
    pin: string,
  ) => Promise<{ credencial: CredencialParaMarcar; persona: PersonaAutenticada }>;
  exigirMatriculaSiEstudiante: (persona: PersonaParaMarcar) => Promise<void>;
  turnoDe: (tipoPersona: TipoPersonaMarcacion) => Promise<TurnoResponseDto>;
  esDiaConClases: (fecha: string, turno: TurnoResponseDto) => Promise<boolean>;
  minutosEntreVias: () => Promise<number>;
  reetiquetarEntradaComoSalida: (
    entrada: MarcacionDelDia,
    turno: TurnoResponseDto,
    diaConClases: boolean,
  ) => Promise<void>;
  dejarRastroDeIgnorada: (
    personaId: string,
    fechaHora: string,
    origen: "kiosko" | "biometrico",
    decision: Extract<DecisionMarca, { accion: "ignorar" }>,
  ) => Promise<void>;
  respuestaIgnorada: (
    persona: PersonaParaMarcar,
    previas: MarcacionDelDia[],
    decision: Extract<DecisionMarca, { accion: "ignorar" }>,
  ) => MarcacionKioskoResponseDto;
  respuestaYaMarco: (
    persona: PersonaParaMarcar,
    previas: { tipo: TipoMarcacion; fechaHora: string }[],
  ) => MarcacionKioskoResponseDto;
  mensajeDeResultado: (
    nombre: string,
    tipo: TipoMarcacion,
    hora: string,
    resultado: string,
    minutos: number,
  ) => string;
  despacharAlertaTardanza: (
    persona: PersonaAutenticada,
    minutosTardanza: number,
    horaMarcada: string,
  ) => Promise<void>;
};
