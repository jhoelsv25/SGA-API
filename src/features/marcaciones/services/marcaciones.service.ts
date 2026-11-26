import { Injectable, Optional } from "@nestjs/common";
import { AuditService } from "../../../common/services/audit.service";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import { CalendarioService } from "../../calendario/calendario.service";
import { EquiposService } from "../../equipos/equipos.service";
import { NotificacionesService } from "../../notificaciones/notificaciones.service";
import { TurnosRepository } from "../../turnos/repositories/turnos.repository";
import { VariablesSistemaService } from "../../variables-sistema/variables-sistema.service";
import type { TurnoResponseDto } from "../../turnos/dto";
import { type TipoMarcacion, type TipoPersonaMarcacion } from "../constants";
import type {
  JustificarMarcacionDto,
  MarcacionKioskoResponseDto,
  MarcacionResponseDto,
  MarcarKioskoDto,
  PanelMarcacionesHoyResponseDto,
  RegistrarMarcacionManualDto,
  ReporteMarcacionesQueryDto,
  ReporteMarcacionesResponseDto,
} from "../dto";
import type {
  CredencialParaMarcar,
  MarcacionDelDia,
  PersonaAutenticada,
  PersonaParaMarcar,
  ResultadoRegistroReloj,
} from "../interfaces";
import { MarcacionesRepository } from "../repositories";
import { type DecisionMarca } from "../utils";
import type { MarcacionesServiceDeps, MarcacionesServiceCalls } from "./marcaciones/deps";
import * as parte1 from "./marcaciones/marcar-en-kiosko";
import * as parte2 from "./marcaciones/panel-de-hoy";

@Injectable()
export class MarcacionesService {
  constructor(
    private readonly repository: MarcacionesRepository,
    private readonly equiposService: EquiposService,
    private readonly turnosRepository: TurnosRepository,
    private readonly calendarioService: CalendarioService,
    private readonly aniosService: AniosAcademicosService,
    private readonly auditService: AuditService,
    private readonly variablesService: VariablesSistemaService,
    @Optional()
    private readonly notificacionesService?: NotificacionesService,
  ) {}

  private dependencias(): MarcacionesServiceDeps {
    return {
      repository: this.repository,
      equiposService: this.equiposService,
      turnosRepository: this.turnosRepository,
      calendarioService: this.calendarioService,
      aniosService: this.aniosService,
      auditService: this.auditService,
      variablesService: this.variablesService,
      notificacionesService: this.notificacionesService,
    };
  }

  private llamadas(): MarcacionesServiceCalls {
    return {
      autenticarCredencial: (codigo, pin) => this.autenticarCredencial(codigo, pin),
      exigirMatriculaSiEstudiante: (persona) => this.exigirMatriculaSiEstudiante(persona),
      turnoDe: (tipoPersona) => this.turnoDe(tipoPersona),
      esDiaConClases: (fecha, turno) => this.esDiaConClases(fecha, turno),
      minutosEntreVias: () => this.minutosEntreVias(),
      reetiquetarEntradaComoSalida: (entrada, turno, diaConClases) =>
        this.reetiquetarEntradaComoSalida(entrada, turno, diaConClases),
      dejarRastroDeIgnorada: (personaId, fechaHora, origen, decision) =>
        this.dejarRastroDeIgnorada(personaId, fechaHora, origen, decision),
      respuestaIgnorada: (persona, previas, decision) =>
        this.respuestaIgnorada(persona, previas, decision),
      respuestaYaMarco: (persona, previas) => this.respuestaYaMarco(persona, previas),
      mensajeDeResultado: (nombre, tipo, hora, resultado, minutos) =>
        this.mensajeDeResultado(nombre, tipo, hora, resultado, minutos),
      despacharAlertaTardanza: (persona, minutosTardanza, horaMarcada) =>
        this.despacharAlertaTardanza(persona, minutosTardanza, horaMarcada),
    };
  }

  /** Marcación en un kiosko autorizado: código/QR + PIN. Usa siempre la hora del servidor. */
  async marcarEnKiosko(
    tokenEquipo: string | undefined,
    dto: MarcarKioskoDto,
  ): Promise<MarcacionKioskoResponseDto> {
    return parte1.marcarEnKiosko(this.dependencias(), this.llamadas(), tokenEquipo, dto);
  }

  /**
   * RF-022: registra una marcación leída de un reloj biométrico. Usa la hora del reloj (la que
   * llega en `fechaHora`, hora de Lima) y las mismas reglas de RF-010: la primera del día es
   * entrada y la siguiente salida; el botón del reloj no cuenta. Si el docente pone el dedo otra
   * vez dentro de `minutosAntirrebote`, se ignora para no convertir un rebote en salida.
   */
  async registrarDesdeReloj(
    persona: PersonaAutenticada,
    equipoId: string | undefined,
    fechaHora: string,
    minutosAntirrebote: number,
  ): Promise<ResultadoRegistroReloj> {
    return parte1.registrarDesdeReloj(
      this.dependencias(),
      this.llamadas(),
      persona,
      equipoId,
      fechaHora,
      minutosAntirrebote,
    );
  }

  /**
   * Valida código (o DNI) + PIN y que la credencial y la persona estén activas.
   * También lo usa el Kiosko de Sesiones (RF-011).
   */
  async autenticarCredencial(
    codigo: string,
    pin: string,
  ): Promise<{ credencial: CredencialParaMarcar; persona: PersonaAutenticada }> {
    return parte1.autenticarCredencial(this.dependencias(), codigo, pin);
  }

  /** Marcación a mano (equipo con falla u olvido del carné): hora real y observación obligatoria. */
  async registrarManual(
    dto: RegistrarMarcacionManualDto,
    actorId: string,
    ip?: string,
  ): Promise<MarcacionResponseDto> {
    return parte1.registrarManual(this.dependencias(), this.llamadas(), dto, actorId, ip);
  }

  /** Justifica una tardanza o salida anticipada; conserva el resultado. */
  async justificar(
    id: string,
    dto: JustificarMarcacionDto,
    actorId: string,
    ip?: string,
  ): Promise<MarcacionResponseDto> {
    return parte1.justificar(this.dependencias(), id, dto, actorId, ip);
  }

  async panelDeHoy(): Promise<PanelMarcacionesHoyResponseDto> {
    return parte2.panelDeHoy(this.dependencias(), this.llamadas());
  }

  async reporte(query: ReporteMarcacionesQueryDto): Promise<ReporteMarcacionesResponseDto> {
    return parte2.reporte(this.dependencias(), query);
  }

  private async exigirMatriculaSiEstudiante(persona: PersonaParaMarcar): Promise<void> {
    return parte2.exigirMatriculaSiEstudiante(this.dependencias(), persona);
  }

  private async turnoDe(tipoPersona: TipoPersonaMarcacion): Promise<TurnoResponseDto> {
    return parte2.turnoDe(this.dependencias(), tipoPersona);
  }

  private async esDiaConClases(fecha: string, turno: TurnoResponseDto): Promise<boolean> {
    return parte2.esDiaConClases(this.dependencias(), fecha, turno);
  }

  /** Minutos en los que una marca de otra vía se toma como la misma asistencia (variable del sistema). */
  private async minutosEntreVias(): Promise<number> {
    return parte2.minutosEntreVias(this.dependencias());
  }

  /**
   * Llegó una marca anterior a la entrada ya guardada (p. ej. un lote atrasado del reloj): la anterior pasa a ser
   * la entrada y la guardada se convierte en salida, con su resultado recalculado. Queda auditado.
   */
  private async reetiquetarEntradaComoSalida(
    entrada: MarcacionDelDia,
    turno: TurnoResponseDto,
    diaConClases: boolean,
  ): Promise<void> {
    return parte2.reetiquetarEntradaComoSalida(this.dependencias(), entrada, turno, diaConClases);
  }

  /** Una marca descartada por coincidir con otra vía no se guarda como asistencia, pero queda a la vista. */
  private async dejarRastroDeIgnorada(
    personaId: string,
    fechaHora: string,
    origen: "kiosko" | "biometrico",
    decision: Extract<DecisionMarca, { accion: "ignorar" }>,
  ): Promise<void> {
    return parte2.dejarRastroDeIgnorada(
      this.dependencias(),
      personaId,
      fechaHora,
      origen,
      decision,
    );
  }

  private respuestaIgnorada(
    persona: PersonaParaMarcar,
    previas: MarcacionDelDia[],
    decision: Extract<DecisionMarca, { accion: "ignorar" }>,
  ): MarcacionKioskoResponseDto {
    return parte2.respuestaIgnorada(this.llamadas(), persona, previas, decision);
  }

  private respuestaYaMarco(
    persona: PersonaParaMarcar,
    previas: { tipo: TipoMarcacion; fechaHora: string }[],
  ): MarcacionKioskoResponseDto {
    return parte2.respuestaYaMarco(persona, previas);
  }

  private mensajeDeResultado(
    nombre: string,
    tipo: TipoMarcacion,
    hora: string,
    resultado: string,
    minutos: number,
  ): string {
    return parte2.mensajeDeResultado(nombre, tipo, hora, resultado, minutos);
  }

  private async despacharAlertaTardanza(
    persona: PersonaAutenticada,
    minutosTardanza: number,
    horaMarcada: string,
  ): Promise<void> {
    return parte2.despacharAlertaTardanza(
      this.dependencias(),
      persona,
      minutosTardanza,
      horaMarcada,
    );
  }
}
