import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { esViolacionUnica } from "../marcaciones/utils";
import { MENSAJES_BIOMETRICO } from "./constants";
import type {
  AsignarCodigoBiometricoDto,
  CodigoBiometricoResponseDto,
  GuardarProgramacionDto,
  ProgramacionResponseDto,
  SincronizacionRelojResponseDto,
} from "./dto";
import { BiometricoRepository } from "./repositories";

/** Código con el que el reloj identifica a cada persona. Las marcaciones llegan directo a la base (SGA-NET). */
@Injectable()
export class BiometricoService {
  constructor(
    private readonly repository: BiometricoRepository,
    private readonly auditService: AuditService,
  ) {}

  async obtenerCodigo(personaId: string): Promise<CodigoBiometricoResponseDto> {
    const persona = await this.repository.findPersonaBasica(personaId);
    if (!persona) throw new NotFoundException(MENSAJES_BIOMETRICO.PERSONA_NO_ENCONTRADA);
    return {
      personaId,
      nombreCompleto: persona.nombreCompleto,
      codigoBiometrico: persona.codigoBiometrico,
      mensaje: "",
    };
  }

  async asignarCodigo(
    personaId: string,
    dto: AsignarCodigoBiometricoDto,
    actorId: string,
    ip?: string,
  ): Promise<CodigoBiometricoResponseDto> {
    const persona = await this.repository.findPersonaBasica(personaId);
    if (!persona) throw new NotFoundException(MENSAJES_BIOMETRICO.PERSONA_NO_ENCONTRADA);
    const codigo = dto.codigo.trim();

    const otra = await this.repository.findPersonaPorCodigo(codigo);
    if (otra && otra.id !== personaId) {
      throw new ConflictException(MENSAJES_BIOMETRICO.CODIGO_REPETIDO);
    }
    try {
      await this.repository.asignarCodigo(personaId, codigo);
    } catch (error) {
      if (esViolacionUnica(error)) {
        throw new ConflictException(MENSAJES_BIOMETRICO.CODIGO_REPETIDO);
      }
      throw error;
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "personas",
      registroId: personaId,
      valorAnterior: { codigoBiometrico: persona.codigoBiometrico },
      valorNuevo: { codigoBiometrico: codigo },
      direccionIp: ip,
    });
    return {
      personaId,
      nombreCompleto: persona.nombreCompleto,
      codigoBiometrico: codigo,
      mensaje: MENSAJES_BIOMETRICO.CODIGO_ASIGNADO(persona.nombreCompleto),
    };
  }

  async quitarCodigo(
    personaId: string,
    actorId: string,
    ip?: string,
  ): Promise<CodigoBiometricoResponseDto> {
    const persona = await this.repository.findPersonaBasica(personaId);
    if (!persona) throw new NotFoundException(MENSAJES_BIOMETRICO.PERSONA_NO_ENCONTRADA);
    await this.repository.asignarCodigo(personaId, null);
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "personas",
      registroId: personaId,
      valorAnterior: { codigoBiometrico: persona.codigoBiometrico },
      valorNuevo: { codigoBiometrico: null },
      direccionIp: ip,
    });
    return {
      personaId,
      nombreCompleto: persona.nombreCompleto,
      codigoBiometrico: null,
      mensaje: MENSAJES_BIOMETRICO.CODIGO_QUITADO(persona.nombreCompleto),
    };
  }

  async obtenerProgramacion(): Promise<ProgramacionResponseDto> {
    const { horarios, actualizadoEn } = await this.repository.listarProgramacion();
    return { horarios, actualizadoEn, mensaje: "" };
  }

  /** Reemplaza la lista de horas. Las tareas de Windows se crean después, desde el programa del reloj. */
  async guardarProgramacion(
    dto: GuardarProgramacionDto,
    actorId: string,
    ip?: string,
  ): Promise<ProgramacionResponseDto> {
    const vistas = new Set<string>();
    for (const h of dto.horarios) {
      if (vistas.has(h.hora))
        throw new BadRequestException(MENSAJES_BIOMETRICO.HORA_REPETIDA(h.hora));
      vistas.add(h.hora);
    }
    const dias = (d: string): string => [...new Set(d.split(","))].sort().join(",");
    const nuevos = dto.horarios
      .map((h) => ({ hora: h.hora, dias: dias(h.dias), activa: h.activa }))
      .sort((a, b) => a.hora.localeCompare(b.hora));

    const anterior = await this.repository.listarProgramacion();
    await this.repository.reemplazarProgramacion(nuevos);
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "biometrico_programacion",
      registroId: "programacion",
      valorAnterior: { horarios: anterior.horarios },
      valorNuevo: { horarios: nuevos },
      direccionIp: ip,
    });
    const actual = await this.repository.listarProgramacion();
    return {
      horarios: actual.horarios,
      actualizadoEn: actual.actualizadoEn,
      mensaje: MENSAJES_BIOMETRICO.PROGRAMACION_GUARDADA,
    };
  }

  async listarSincronizaciones(): Promise<SincronizacionRelojResponseDto[]> {
    return this.repository.listarSincronizaciones();
  }
}
