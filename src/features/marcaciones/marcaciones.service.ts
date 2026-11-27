import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { hashSha256 } from "../../common/utils";
import { AniosAcademicosService } from "../anio-escolar/anios.service";
import { CalendarioService } from "../calendario/calendario.service";
import { EquiposService } from "../equipos/equipos.service";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import { TurnosRepository } from "../turnos/repositories/turnos.repository";
import { VariablesSistemaService } from "../variables-sistema/variables-sistema.service";
import type { TurnoResponseDto } from "../turnos/dto";
import {
  LIMITE_REPORTE_MAXIMO,
  LIMITE_REPORTE_POR_DEFECTO,
  MENSAJES_MARCACION,
  PROPOSITO_EQUIPO_MARCACION,
  mensajeEntrada,
  mensajeSalida,
  mensajeTardanza,
  mensajeYaMarcoEntrada,
  mensajeYaMarcoReciente,
  VARIABLE_HORARIO_POR_CLASES,
  VARIABLE_MINUTOS_ENTRE_VIAS,
  VARIABLE_SEGUNDOS_DOBLE_LECTURA,
  type TipoMarcacion,
  type TipoPersonaMarcacion,
} from "./constants";
import type {
  JustificarMarcacionDto,
  MarcacionKioskoResponseDto,
  MarcacionResponseDto,
  MarcarKioskoDto,
  PanelMarcacionesHoyResponseDto,
  RegistrarMarcacionManualDto,
  ReporteMarcacionesQueryDto,
  ReporteMarcacionesResponseDto,
} from "./dto";
import type {
  CredencialParaMarcar,
  MarcacionDelDia,
  NuevaMarcacion,
  PersonaAutenticada,
  PersonaParaMarcar,
  ResultadoRegistroReloj,
} from "./interfaces";
import { MarcacionesRepository } from "./repositories";
import {
  ahoraEnColegio,
  decidirMarca,
  equipoPermite,
  esDiaLaborable,
  esViolacionUnica,
  esHoraValida,
  evaluarMarcacion,
  horaCorta,
  horaDeFechaHora,
  lecturaRepetidaEnKiosko,
  minutosEntre,
  type DecisionMarca,
  turnoSegunClases,
} from "./utils";

interface CambioAuditable {
  marcacionId: string;
  valorAnterior: Record<string, unknown>;
  valorNuevo: Record<string, unknown>;
}

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

  /** Marcación en un kiosko autorizado: código/QR + PIN. Usa siempre la hora del servidor. */
  async marcarEnKiosko(
    tokenEquipo: string | undefined,
    dto: MarcarKioskoDto,
  ): Promise<MarcacionKioskoResponseDto> {
    const { equipo } = await this.equiposService.validarKiosko(tokenEquipo);
    if (!equipo) {
      throw new ForbiddenException(MENSAJES_MARCACION.EQUIPO_NO_AUTORIZADO);
    }
    if (equipo.proposito !== PROPOSITO_EQUIPO_MARCACION) {
      throw new ForbiddenException(MENSAJES_MARCACION.EQUIPO_SIN_PROPOSITO);
    }

    const { credencial, persona } = await this.autenticarCredencial(dto.codigo, dto.pin);
    const { fecha, hora, fechaHora } = ahoraEnColegio();
    if (!equipoPermite(equipo.usuariosPermitidos, persona.tipoPersona)) {
      throw new ForbiddenException(MENSAJES_MARCACION.EQUIPO_EQUIVOCADO);
    }
    await this.exigirMatriculaSiEstudiante(persona);

    // Lo guardado al llegar el pedido: sirve para reconocer otro envío del kiosko que se procese a la vez.
    const alLlegar = new Set(
      (await this.repository.marcacionesDePersonaEnFecha(persona.personaId, fecha)).map(
        (m) => m.id,
      ),
    );
    const minutosEntreVias = await this.minutosEntreVias();
    // Los estudiantes solo marcan entrada: para ellos no hay salida falsa posible.
    const segundosDobleLectura =
      persona.tipoPersona === "estudiantes" ? 0 : await this.segundosDobleLectura();
    const turno = await this.turnoDePersona(persona.personaId, persona.tipoPersona, fecha);
    const diaConClases = turno
      ? await this.esDiaDeAsistencia(fecha, turno, persona.tipoPersona)
      : false;

    const resultado = await this.repository.conBloqueoDelDia(
      persona.personaId,
      fecha,
      async (repositorio) => {
        const previas = await repositorio.marcacionesDePersonaEnFecha(persona.personaId, fecha);
        const simultanea =
          previas.find((m) => m.origen === "kiosko" && !alLlegar.has(m.id)) ??
          lecturaRepetidaEnKiosko(previas, fechaHora, segundosDobleLectura);
        if (simultanea) {
          return { estado: "simultanea" as const, previas, simultanea };
        }
        const decision = decidirMarca({
          esEstudiante: persona.tipoPersona === "estudiantes",
          previas,
          fechaHora,
          origen: "kiosko",
          minutosEntreVias,
        });
        if (decision.accion === "ignorar") {
          return { estado: "ignorada" as const, previas, decision };
        }
        const turnoVigente = this.exigirTurno(turno);
        const evaluacion = evaluarMarcacion(decision.tipo, turnoVigente, hora, diaConClases);
        const reetiquetada =
          decision.accion === "registrar" && decision.reetiquetar
            ? await this.reetiquetarEntradaComoSalida(
                repositorio,
                decision.reetiquetar,
                turnoVigente,
                diaConClases,
              )
            : undefined;
        const { marcacion: creada, reemplazo } = await this.guardarMarca(
          repositorio,
          {
            personaId: persona.personaId,
            credencialId: credencial.id,
            turnoId: turnoVigente.id,
            tipo: decision.tipo,
            fechaHora,
            origen: "kiosko",
            resultado: evaluacion.resultado,
            minutosTardanza: evaluacion.minutosTardanza,
          },
          decision.accion === "reemplazar" ? decision.marca : undefined,
        );
        return {
          estado: "registrada" as const,
          tipo: decision.tipo,
          evaluacion,
          creada,
          reetiquetada,
          reemplazo,
        };
      },
    );

    if (resultado.estado === "simultanea") {
      return {
        registrada: false,
        mensaje: mensajeYaMarcoReciente(horaDeFechaHora(resultado.simultanea.fechaHora)),
        nombreCompleto: persona.nombreCompleto,
        fotoUrl: persona.fotoUrl,
      };
    }
    if (resultado.estado === "ignorada") {
      await this.dejarRastroDeIgnorada(persona.personaId, fechaHora, "kiosko", resultado.decision);
      return this.respuestaIgnorada(persona, resultado.previas, resultado.decision);
    }
    const { tipo, evaluacion, creada } = resultado;
    if (resultado.reetiquetada) await this.auditarReetiquetado(resultado.reetiquetada);
    if (resultado.reemplazo) await this.auditarReemplazo(resultado.reemplazo);

    const horaMarcada = horaCorta(hora);

    if (
      persona.tipoPersona === "estudiantes" &&
      creada.resultado === "tardanza" &&
      this.notificacionesService
    ) {
      this.despacharAlertaTardanza(persona, creada.minutosTardanza, horaMarcada).catch(() => {});
    }

    return {
      registrada: true,
      mensaje: this.mensajeDeResultado(
        persona.nombres,
        tipo,
        horaMarcada,
        evaluacion.resultado,
        evaluacion.minutosTardanza,
      ),
      nombreCompleto: persona.nombreCompleto,
      fotoUrl: persona.fotoUrl,
      tipo,
      resultado: creada.resultado,
      minutosTardanza: creada.minutosTardanza,
      hora: horaMarcada,
    };
  }

  /**
   * RF-022: registra una marcación leída de un reloj biométrico. Usa la hora del reloj (la que
   * llega en `fechaHora`, hora de Lima) y las mismas reglas de RF-010: la primera del día es
   * entrada y la última, salida; el botón del reloj no cuenta. Si el docente pone el dedo otra
   * vez dentro de `minutosAntirrebote`, se ignora para no convertir un rebote en salida.
   */
  async registrarDesdeReloj(
    persona: PersonaAutenticada,
    equipoId: string | undefined,
    fechaHora: string,
    minutosAntirrebote: number,
  ): Promise<ResultadoRegistroReloj> {
    const fecha = fechaHora.slice(0, 10);
    const hora = fechaHora.slice(11, 19);

    const minutosEntreVias = await this.minutosEntreVias();
    const turno = await this.turnoDePersona(persona.personaId, persona.tipoPersona, fecha);
    const diaConClases = turno
      ? await this.esDiaDeAsistencia(fecha, turno, persona.tipoPersona)
      : false;

    try {
      const resultado = await this.repository.conBloqueoDelDia(
        persona.personaId,
        fecha,
        async (repositorio) => {
          const previas = await repositorio.marcacionesDePersonaEnFecha(persona.personaId, fecha);
          if (previas.some((m) => m.fechaHora === fechaHora)) {
            return { estado: "duplicada" as const };
          }
          // El rebote es del dedo en el reloj. Una marca de otra vía la decide la ventana entre vías, que deja
          // rastro; si esa ventana está desactivada, el rebote sigue protegiendo. Con la salida ya registrada no
          // hace falta: la marca posterior solo actualiza la salida.
          const ultima = previas[previas.length - 1];
          if (
            ultima &&
            !previas.some((m) => m.tipo === "salida") &&
            (ultima.origen === "biometrico" || minutosEntreVias === 0)
          ) {
            const minutos = minutosEntre(ultima.fechaHora, fechaHora);
            if (minutos >= 0 && minutos < minutosAntirrebote) {
              return { estado: "ignorada" as const, razon: "rebote" as const };
            }
          }
          const decision = decidirMarca({
            esEstudiante: false,
            previas,
            fechaHora,
            origen: "biometrico",
            minutosEntreVias,
          });
          if (decision.accion === "ignorar") {
            return { estado: "descartada" as const, decision };
          }
          if (!turno || !turno.activo) {
            return { estado: "sin_turno" as const };
          }
          const evaluacion = evaluarMarcacion(decision.tipo, turno, hora, diaConClases);
          const reetiquetada =
            decision.accion === "registrar" && decision.reetiquetar
              ? await this.reetiquetarEntradaComoSalida(
                  repositorio,
                  decision.reetiquetar,
                  turno,
                  diaConClases,
                )
              : undefined;
          const { marcacion, reemplazo } = await this.guardarMarca(
            repositorio,
            {
              personaId: persona.personaId,
              credencialId: null,
              turnoId: turno.id,
              tipo: decision.tipo,
              fechaHora,
              origen: "biometrico",
              resultado: evaluacion.resultado,
              minutosTardanza: evaluacion.minutosTardanza,
              equipoId,
            },
            decision.accion === "reemplazar" ? decision.marca : undefined,
          );
          return { estado: "registrada" as const, marcacion, reetiquetada, reemplazo };
        },
      );

      if (resultado.estado === "descartada") {
        const { decision } = resultado;
        await this.dejarRastroDeIgnorada(persona.personaId, fechaHora, "biometrico", decision);
        return { estado: "ignorada", razon: decision.razon };
      }
      if (resultado.estado === "registrada") {
        if (resultado.reetiquetada) await this.auditarReetiquetado(resultado.reetiquetada);
        if (resultado.reemplazo) await this.auditarReemplazo(resultado.reemplazo);
        return { estado: "registrada", marcacion: resultado.marcacion };
      }
      return resultado;
    } catch (error) {
      if (esViolacionUnica(error)) return { estado: "duplicada" };
      throw error;
    }
  }

  /**
   * Valida código (o DNI) + PIN y que la credencial y la persona estén activas.
   * También lo usa el Kiosko de Sesiones (RF-011).
   */
  async autenticarCredencial(
    codigo: string,
    pin: string,
  ): Promise<{ credencial: CredencialParaMarcar; persona: PersonaAutenticada }> {
    const credencial = await this.repository.findCredencialPorCodigo(codigo.trim());
    if (!credencial || !credencial.pinHash || credencial.pinHash !== hashSha256(pin)) {
      throw new BadRequestException(MENSAJES_MARCACION.CODIGO_O_PIN_INCORRECTO);
    }
    const vencida = credencial.venceEn !== null && credencial.venceEn < ahoraEnColegio().fecha;
    if (!credencial.activa || vencida) {
      throw new ForbiddenException(MENSAJES_MARCACION.CREDENCIAL_INACTIVA);
    }
    const persona = await this.repository.findPersonaParaMarcar(credencial.personaId);
    if (!persona || !persona.tipoPersona || !persona.vigente) {
      throw new ForbiddenException(MENSAJES_MARCACION.CREDENCIAL_INACTIVA);
    }
    return { credencial, persona: { ...persona, tipoPersona: persona.tipoPersona } };
  }

  /** Marcación a mano (equipo con falla u olvido del carné): hora real y observación obligatoria. */
  async registrarManual(
    dto: RegistrarMarcacionManualDto,
    actorId: string,
    ip?: string,
  ): Promise<MarcacionResponseDto> {
    const observacion = dto.observacion?.trim();
    if (!observacion) {
      throw new BadRequestException(MENSAJES_MARCACION.OBSERVACION_REQUERIDA);
    }
    if (!esHoraValida(dto.hora)) {
      throw new BadRequestException(MENSAJES_MARCACION.HORA_INVALIDA);
    }

    const ahora = ahoraEnColegio();
    const fecha = dto.fecha ?? ahora.fecha;
    if (fecha > ahora.fecha || (fecha === ahora.fecha && dto.hora > horaCorta(ahora.hora))) {
      throw new BadRequestException(MENSAJES_MARCACION.FECHA_FUTURA);
    }

    const persona = await this.repository.findPersonaParaMarcar(dto.personaId);
    if (!persona || !persona.tipoPersona || !persona.vigente) {
      throw new NotFoundException(MENSAJES_MARCACION.PERSONA_NO_ENCONTRADA);
    }
    const esEstudiante = persona.tipoPersona === "estudiantes";
    if (esEstudiante && dto.tipo === "salida") {
      throw new BadRequestException(MENSAJES_MARCACION.SOLO_ENTRADA_ESTUDIANTES);
    }
    await this.exigirMatriculaSiEstudiante(persona);

    const turno = await this.turnoDePersona(persona.personaId, persona.tipoPersona, fecha);
    const diaConClases = turno
      ? await this.esDiaDeAsistencia(fecha, turno, persona.tipoPersona)
      : false;

    const { creada, reetiquetada, reemplazo } = await this.repository.conBloqueoDelDia(
      persona.personaId,
      fecha,
      async (repositorio) => {
        const previas = await repositorio.marcacionesDePersonaEnFecha(persona.personaId, fecha);
        const fechaHora = `${fecha} ${dto.hora}:00`;
        // La entrada es la hora más temprana y la salida la más tarde: solo así se acepta otra del mismo tipo.
        const mismoTipo = previas.find((m) => m.tipo === dto.tipo);
        const mejora =
          mismoTipo !== undefined &&
          !esEstudiante &&
          (dto.tipo === "salida"
            ? fechaHora > mismoTipo.fechaHora
            : fechaHora < mismoTipo.fechaHora);
        if (mismoTipo && !mejora) {
          throw new ConflictException(
            dto.tipo === "entrada"
              ? mensajeYaMarcoEntrada(horaDeFechaHora(mismoTipo.fechaHora))
              : MENSAJES_MARCACION.YA_MARCO_SALIDA,
          );
        }
        this.exigirOrdenDelDia(dto.tipo, fechaHora, previas);
        const turnoVigente = this.exigirTurno(turno);
        const evaluacion = evaluarMarcacion(dto.tipo, turnoVigente, dto.hora, diaConClases);
        // Entrada más temprana sin salida guardada (p. ej. solo marcó al irse): la anterior pasa a ser la salida.
        const pasaASalida =
          mejora && dto.tipo === "entrada" && !previas.some((m) => m.tipo === "salida")
            ? mismoTipo
            : undefined;
        const reetiquetada = pasaASalida
          ? await this.reetiquetarEntradaComoSalida(
              repositorio,
              pasaASalida,
              turnoVigente,
              diaConClases,
            )
          : undefined;
        const { marcacion, reemplazo } = await this.guardarMarca(
          repositorio,
          {
            personaId: persona.personaId,
            credencialId: null,
            turnoId: turnoVigente.id,
            tipo: dto.tipo,
            fechaHora,
            origen: "manual",
            resultado: evaluacion.resultado,
            minutosTardanza: evaluacion.minutosTardanza,
            observacion,
            registradaPorId: actorId,
          },
          mejora && !pasaASalida ? mismoTipo : undefined,
        );
        return { creada: marcacion, reetiquetada, reemplazo };
      },
    );
    if (reetiquetada) await this.auditarReetiquetado(reetiquetada);
    if (reemplazo) await this.auditarReemplazo(reemplazo);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "marcaciones",
      registroId: creada.id,
      valorNuevo: {
        personaId: persona.personaId,
        tipo: dto.tipo,
        fechaHora: creada.fechaHora,
        resultado: creada.resultado,
        origen: "manual",
        observacion,
      },
      direccionIp: ip,
    });
    return creada;
  }

  /** Justifica una tardanza o salida anticipada; conserva el resultado. */
  async justificar(
    id: string,
    dto: JustificarMarcacionDto,
    actorId: string,
    ip?: string,
  ): Promise<MarcacionResponseDto> {
    const motivo = dto.motivo?.trim();
    if (!motivo) {
      throw new BadRequestException(MENSAJES_MARCACION.MOTIVO_JUSTIFICACION_REQUERIDO);
    }
    const marcacion = await this.repository.findById(id);
    if (!marcacion) {
      throw new NotFoundException(MENSAJES_MARCACION.MARCACION_NO_ENCONTRADA);
    }
    if (marcacion.resultado !== "tardanza" && marcacion.resultado !== "salida_anticipada") {
      throw new BadRequestException(MENSAJES_MARCACION.NO_JUSTIFICABLE);
    }
    if (marcacion.justificada) {
      throw new ConflictException(MENSAJES_MARCACION.YA_JUSTIFICADA);
    }

    const actualizada = await this.repository.justificar(id, motivo, actorId);
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "marcaciones",
      registroId: id,
      valorAnterior: { justificada: false },
      valorNuevo: { justificada: true, motivo, resultado: actualizada.resultado },
      direccionIp: ip,
    });
    return actualizada;
  }

  async panelDeHoy(): Promise<PanelMarcacionesHoyResponseDto> {
    const { fecha } = ahoraEnColegio();
    const anio = await this.aniosService.anioVigente();
    const turnoEstudiantes = await this.turnosRepository.findByAplicaA("estudiantes");
    const diaConClases = turnoEstudiantes
      ? await this.esDiaConClases(fecha, turnoEstudiantes)
      : false;
    const grupos = await this.repository.panelDelDia(fecha, anio?.id ?? null);
    return { fecha, diaConClases, ...grupos };
  }

  async reporte(query: ReporteMarcacionesQueryDto): Promise<ReporteMarcacionesResponseDto> {
    if (query.hasta < query.desde) {
      throw new BadRequestException("La fecha de fin debe ser posterior al inicio.");
    }
    const limite = Math.min(query.limit ?? LIMITE_REPORTE_POR_DEFECTO, LIMITE_REPORTE_MAXIMO);
    return this.repository.reporte(query, limite);
  }

  private async exigirMatriculaSiEstudiante(persona: PersonaParaMarcar): Promise<void> {
    if (persona.tipoPersona !== "estudiantes" || !persona.estudianteId) return;
    const anio = await this.aniosService.anioVigente();
    const matriculado = anio
      ? await this.repository.tieneMatriculaVigente(persona.estudianteId, anio.id)
      : false;
    if (!matriculado) {
      throw new ForbiddenException(MENSAJES_MARCACION.SIN_MATRICULA);
    }
  }

  /** La entrada va antes que la salida, también cuando se registran a mano. */
  private exigirOrdenDelDia(
    tipo: TipoMarcacion,
    fechaHora: string,
    previas: readonly MarcacionDelDia[],
  ): void {
    const otra = previas.find((m) => m.tipo !== tipo);
    if (!otra) return;
    if (tipo === "salida" && fechaHora <= otra.fechaHora) {
      throw new BadRequestException(MENSAJES_MARCACION.SALIDA_ANTES_DE_ENTRADA);
    }
    if (tipo === "entrada" && fechaHora >= otra.fechaHora) {
      throw new BadRequestException(MENSAJES_MARCACION.ENTRADA_DESPUES_DE_SALIDA);
    }
  }

  /** Guarda la marca como nueva o en el lugar de la que reemplaza. Devuelve también lo que había, para auditarlo. */
  private async guardarMarca(
    repositorio: MarcacionesRepository,
    nueva: NuevaMarcacion,
    reemplazada?: MarcacionDelDia,
  ): Promise<{ marcacion: MarcacionResponseDto; reemplazo?: CambioAuditable }> {
    if (!reemplazada) return { marcacion: await repositorio.insertar(nueva) };
    const anterior = await repositorio.findById(reemplazada.id);
    const marcacion = await repositorio.reemplazar(reemplazada.id, nueva);
    return {
      marcacion,
      reemplazo: {
        marcacionId: reemplazada.id,
        valorAnterior: {
          fechaHora: reemplazada.fechaHora,
          origen: reemplazada.origen,
          resultado: anterior?.resultado,
          minutosTardanza: anterior?.minutosTardanza,
          justificada: anterior?.justificada,
          motivoJustificacion: anterior?.motivoJustificacion,
        },
        valorNuevo: {
          fechaHora: nueva.fechaHora,
          origen: nueva.origen,
          resultado: nueva.resultado,
          minutosTardanza: nueva.minutosTardanza,
          motivo:
            nueva.tipo === "salida"
              ? "Marca más tarde: es la nueva salida."
              : "Marca más temprana: es la nueva entrada.",
        },
      },
    };
  }

  private async auditarReemplazo(cambio: CambioAuditable): Promise<void> {
    await this.auditService.log({
      usuarioId: null,
      accion: "actualizar",
      tabla: "marcaciones",
      registroId: cambio.marcacionId,
      valorAnterior: cambio.valorAnterior,
      valorNuevo: cambio.valorNuevo,
    });
  }

  /**
   * Turno con el que se evalúa a una persona en una fecha. Para el docente con clases ese día, la entrada y la salida
   * esperadas salen de su horario; en los demás casos vale el turno general de su tipo.
   */
  private async turnoDePersona(
    personaId: string,
    tipoPersona: TipoPersonaMarcacion,
    fecha: string,
  ): Promise<TurnoResponseDto | null> {
    const general = await this.turnosRepository.findByAplicaA(tipoPersona);
    if (!general || tipoPersona !== "docentes") return general;
    if (!(await this.variablesService.isActiva(VARIABLE_HORARIO_POR_CLASES.codigo, false))) {
      return general;
    }
    const clases = await this.repository.clasesDeDocenteEnFecha(personaId, fecha);
    return turnoSegunClases(general, clases, fecha);
  }

  private exigirTurno(turno: TurnoResponseDto | null | undefined): TurnoResponseDto {
    if (!turno || !turno.activo) {
      throw new BadRequestException(MENSAJES_MARCACION.SIN_TURNO);
    }
    return turno;
  }

  /** Estudiantes: día con clases. Personal: día en que trabaja, aunque no haya clases. */
  private async esDiaDeAsistencia(
    fecha: string,
    turno: TurnoResponseDto,
    tipoPersona: string,
  ): Promise<boolean> {
    if (tipoPersona === "estudiantes") return this.esDiaConClases(fecha, turno);
    if (!esDiaLaborable(fecha, turno.diasLaborables)) return false;
    return !(await this.calendarioService.fechasSinTrabajoPersonal([fecha])).has(fecha);
  }

  private async esDiaConClases(fecha: string, turno: TurnoResponseDto): Promise<boolean> {
    if (!esDiaLaborable(fecha, turno.diasLaborables)) return false;
    return !(await this.calendarioService.suspendeClasesEn(fecha));
  }

  private async segundosDobleLectura(): Promise<number> {
    const { codigo, porDefecto } = VARIABLE_SEGUNDOS_DOBLE_LECTURA;
    const valor = Number(await this.variablesService.getValor(codigo, String(porDefecto)));
    return Number.isInteger(valor) && valor >= 0 ? valor : porDefecto;
  }

  /** Minutos en los que una marca de otra vía se toma como la misma asistencia (variable del sistema). */
  private async minutosEntreVias(): Promise<number> {
    const valor = Number(
      await this.variablesService.getValor(
        VARIABLE_MINUTOS_ENTRE_VIAS.codigo,
        String(VARIABLE_MINUTOS_ENTRE_VIAS.porDefecto),
      ),
    );
    return Number.isFinite(valor) && valor >= 0 ? valor : VARIABLE_MINUTOS_ENTRE_VIAS.porDefecto;
  }

  /**
   * Llegó una marca anterior a la entrada ya guardada (p. ej. un lote atrasado del reloj): la anterior pasa a ser
   * la entrada y la guardada se convierte en salida, con su resultado recalculado. La justificación era de la
   * entrada, así que no pasa a la salida. Devuelve el cambio para auditarlo.
   */
  private async reetiquetarEntradaComoSalida(
    repositorio: MarcacionesRepository,
    entrada: MarcacionDelDia,
    turno: TurnoResponseDto,
    diaConClases: boolean,
  ): Promise<CambioAuditable> {
    const anterior = await repositorio.findById(entrada.id);
    const evaluacion = evaluarMarcacion(
      "salida",
      turno,
      entrada.fechaHora.slice(11, 19),
      diaConClases,
    );
    const nuevo = {
      tipo: "salida" as const,
      resultado: evaluacion.resultado,
      minutosTardanza: evaluacion.minutosTardanza,
    };
    await repositorio.reetiquetar(entrada.id, nuevo);
    return {
      marcacionId: entrada.id,
      valorAnterior: {
        tipo: "entrada",
        resultado: anterior?.resultado,
        minutosTardanza: anterior?.minutosTardanza,
        justificada: anterior?.justificada,
        motivoJustificacion: anterior?.motivoJustificacion,
      },
      valorNuevo: { ...nuevo, justificada: false },
    };
  }

  /** Se audita después de confirmar la transacción: la bitácora usa otra conexión. */
  private async auditarReetiquetado(cambio: CambioAuditable): Promise<void> {
    await this.auditService.log({
      usuarioId: null,
      accion: "actualizar",
      tabla: "marcaciones",
      registroId: cambio.marcacionId,
      valorAnterior: cambio.valorAnterior,
      valorNuevo: {
        ...cambio.valorNuevo,
        motivo: "Llegó una marcación anterior: la entrada pasa a ser la salida.",
      },
    });
  }

  /** Una marca descartada por coincidir con otra vía no se guarda como asistencia, pero queda a la vista. */
  private async dejarRastroDeIgnorada(
    personaId: string,
    fechaHora: string,
    origen: "kiosko" | "biometrico",
    decision: Extract<DecisionMarca, { accion: "ignorar" }>,
  ): Promise<void> {
    // Las marcas que no cuentan también quedan guardadas, para poder revisarlas.
    if (decision.razon === "intermedia") {
      await this.auditService.log({
        usuarioId: null,
        accion: "crear",
        tabla: "marcaciones_intermedias",
        valorNuevo: { personaId, fechaHora, origen },
      });
    }
    if (decision.razon !== "duplicada_entre_vias") return;
    await this.auditService.log({
      usuarioId: null,
      accion: "crear",
      tabla: "marcaciones_duplicadas_entre_vias",
      valorNuevo: {
        personaId,
        fechaHora,
        origen,
        coincideCon: {
          marcacionId: decision.con.id,
          origen: decision.con.origen,
          tipo: decision.con.tipo,
          fechaHora: decision.con.fechaHora,
        },
      },
    });
  }

  private respuestaIgnorada(
    persona: PersonaParaMarcar,
    previas: MarcacionDelDia[],
    decision: Extract<DecisionMarca, { accion: "ignorar" }>,
  ): MarcacionKioskoResponseDto {
    if (decision.razon === "duplicada_entre_vias") {
      return {
        registrada: false,
        mensaje: mensajeYaMarcoReciente(horaDeFechaHora(decision.con.fechaHora)),
        nombreCompleto: persona.nombreCompleto,
        fotoUrl: persona.fotoUrl,
      };
    }
    if (decision.razon === "intermedia") {
      return {
        registrada: false,
        mensaje: MENSAJES_MARCACION.MARCA_INTERMEDIA,
        nombreCompleto: persona.nombreCompleto,
        fotoUrl: persona.fotoUrl,
      };
    }
    return this.respuestaYaMarco(persona, previas);
  }

  private respuestaYaMarco(
    persona: PersonaParaMarcar,
    previas: { tipo: TipoMarcacion; fechaHora: string }[],
  ): MarcacionKioskoResponseDto {
    const entrada = previas.find((m) => m.tipo === "entrada");
    let mensaje: string = MENSAJES_MARCACION.YA_MARCO_ENTRADA_Y_SALIDA;
    if (!entrada) {
      mensaje = MENSAJES_MARCACION.YA_MARCO_SALIDA;
    } else if (persona.tipoPersona === "estudiantes") {
      mensaje = mensajeYaMarcoEntrada(horaDeFechaHora(entrada.fechaHora));
    }
    return {
      registrada: false,
      mensaje,
      nombreCompleto: persona.nombreCompleto,
      fotoUrl: persona.fotoUrl,
    };
  }

  private mensajeDeResultado(
    nombre: string,
    tipo: TipoMarcacion,
    hora: string,
    resultado: string,
    minutos: number,
  ): string {
    if (resultado === "fuera_de_turno") return MENSAJES_MARCACION.FUERA_DE_HORARIO;
    if (tipo === "salida") return mensajeSalida(nombre, hora);
    return resultado === "tardanza"
      ? mensajeTardanza(nombre, hora, minutos)
      : mensajeEntrada(nombre, hora);
  }

  private async despacharAlertaTardanza(
    persona: PersonaAutenticada,
    minutosTardanza: number,
    horaMarcada: string,
  ): Promise<void> {
    if (!this.notificacionesService) return;
    try {
      const apoderados = await this.repository.findApoderadosDePersonaEstudiante(persona.personaId);
      for (const apo of apoderados) {
        await this.notificacionesService.enviar({
          usuarioId: apo.usuarioId,
          titulo: "Aviso de tardanza en ingreso",
          mensaje: `El estudiante ${persona.nombreCompleto} ingresó al colegio con ${minutosTardanza} minutos de tardanza a las ${horaMarcada}.`,
          tipo: "alerta",
          enlaceUrl: "/admin/mi-asistencia",
          canales: ["in_app", "push", "email", "webhook"],
        });
      }
    } catch {
      // Silenciar para no afectar la marcación en el kiosko
    }
  }
}
