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
import type { CredencialParaMarcar, PersonaAutenticada, PersonaParaMarcar } from "./interfaces";
import { MarcacionesRepository } from "./repositories";
import {
  ahoraEnColegio,
  equipoPermite,
  esDiaLaborable,
  esHoraValida,
  evaluarMarcacion,
  horaCorta,
  horaDeFechaHora,
  siguienteTipo,
} from "./utils";

@Injectable()
export class MarcacionesService {
  constructor(
    private readonly repository: MarcacionesRepository,
    private readonly equiposService: EquiposService,
    private readonly turnosRepository: TurnosRepository,
    private readonly calendarioService: CalendarioService,
    private readonly aniosService: AniosAcademicosService,
    private readonly auditService: AuditService,
    @Optional()
    private readonly notificacionesService?: NotificacionesService,
  ) {}

  /** Marcación en un kiosko autorizado: código/QR + PIN. Usa siempre la hora del servidor. */
  async marcarEnKiosko(
    tokenEquipo: string | undefined,
    dto: MarcarKioskoDto,
    ip?: string,
  ): Promise<MarcacionKioskoResponseDto> {
    const { equipo } = await this.equiposService.validarKiosko(tokenEquipo, ip);
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

    const previas = await this.repository.marcacionesDePersonaEnFecha(persona.personaId, fecha);
    const tipo = siguienteTipo(
      persona.tipoPersona === "estudiantes",
      previas.map((m) => m.tipo),
    );
    if (!tipo) {
      return this.respuestaYaMarco(persona, previas);
    }

    const turno = await this.turnoDe(persona.tipoPersona);
    const diaConClases = await this.esDiaConClases(fecha, turno);
    const evaluacion = evaluarMarcacion(tipo, turno, hora, diaConClases);

    const creada = await this.repository.insertar({
      personaId: persona.personaId,
      credencialId: credencial.id,
      turnoId: turno.id,
      tipo,
      fechaHora,
      origen: "kiosko",
      resultado: evaluacion.resultado,
      minutosTardanza: evaluacion.minutosTardanza,
    });

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

    const previas = await this.repository.marcacionesDePersonaEnFecha(persona.personaId, fecha);
    if (previas.some((m) => m.tipo === dto.tipo)) {
      throw new ConflictException(
        dto.tipo === "entrada"
          ? mensajeYaMarcoEntrada(
              horaDeFechaHora(previas.find((m) => m.tipo === "entrada")!.fechaHora),
            )
          : MENSAJES_MARCACION.YA_MARCO_SALIDA,
      );
    }

    const turno = await this.turnoDe(persona.tipoPersona);
    const diaConClases = await this.esDiaConClases(fecha, turno);
    const evaluacion = evaluarMarcacion(dto.tipo, turno, dto.hora, diaConClases);

    const creada = await this.repository.insertar({
      personaId: persona.personaId,
      credencialId: null,
      turnoId: turno.id,
      tipo: dto.tipo,
      fechaHora: `${fecha} ${dto.hora}:00`,
      origen: "manual",
      resultado: evaluacion.resultado,
      minutosTardanza: evaluacion.minutosTardanza,
      observacion,
      registradaPorId: actorId,
    });

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

  private async turnoDe(tipoPersona: TipoPersonaMarcacion): Promise<TurnoResponseDto> {
    const turno = await this.turnosRepository.findByAplicaA(tipoPersona);
    if (!turno || !turno.activo) {
      throw new BadRequestException(MENSAJES_MARCACION.SIN_TURNO);
    }
    return turno;
  }

  private async esDiaConClases(fecha: string, turno: TurnoResponseDto): Promise<boolean> {
    if (!esDiaLaborable(fecha, turno.diasLaborables)) return false;
    return !(await this.calendarioService.suspendeClasesEn(fecha));
  }

  private respuestaYaMarco(
    persona: PersonaParaMarcar,
    previas: { tipo: TipoMarcacion; fechaHora: string }[],
  ): MarcacionKioskoResponseDto {
    const entrada = previas.find((m) => m.tipo === "entrada");
    const mensaje =
      persona.tipoPersona === "estudiantes" && entrada
        ? mensajeYaMarcoEntrada(horaDeFechaHora(entrada.fechaHora))
        : MENSAJES_MARCACION.YA_MARCO_ENTRADA_Y_SALIDA;
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
