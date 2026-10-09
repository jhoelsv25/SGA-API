import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { hashSha256 } from "../../common/utils";
import { PersonasRepository } from "../personas/repositories/personas.repository";
import { CREDENCIAL_MESSAGES } from "./constants";
import type {
  CambiarPinDto,
  CarneDatosDto,
  CredencialResponseDto,
  ReemitirCredencialDto,
} from "./dto";
import { CredencialesRepository } from "./repositories/credenciales.repository";
import { generarCodigoCredencial, generarPinConHash } from "./utils";

@Injectable()
export class CredencialesService {
  constructor(
    private readonly repository: CredencialesRepository,
    private readonly personasRepository: PersonasRepository,
    private readonly auditService: AuditService,
  ) {}

  async reemitir(
    dto: ReemitirCredencialDto,
    actorId: string,
    ip?: string,
  ): Promise<CredencialResponseDto> {
    const persona = await this.personasRepository.findById(dto.personaId);
    if (!persona) {
      throw new NotFoundException(CREDENCIAL_MESSAGES.PERSONA_NOT_FOUND);
    }

    const { pinPlano, pinHash } = generarPinConHash();
    const nuevoCodigo = generarCodigoCredencial(persona.numeroDocumento, true);

    const { nuevaCredencial, anteriorId } = await this.repository.reemitir({
      personaId: dto.personaId,
      motivo: dto.motivo.trim(),
      nuevoCodigo,
      nuevoPinHash: pinHash,
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "credenciales",
      registroId: nuevaCredencial.id,
      valorAnterior: anteriorId ? { credencialAnteriorId: anteriorId } : undefined,
      valorNuevo: {
        codigo: nuevaCredencial.codigo,
        motivoAnulacion: dto.motivo.trim(),
      },
      direccionIp: ip,
    });

    return {
      id: nuevaCredencial.id,
      personaId: nuevaCredencial.personaId,
      codigo: nuevaCredencial.codigo,
      activa: nuevaCredencial.activa,
      emitidaEn: nuevaCredencial.emitidaEn,
      venceEn: nuevaCredencial.venceEn,
      pin: pinPlano,
      mensaje: CREDENCIAL_MESSAGES.REEMITIDA_EXITO,
    };
  }

  async cambiarPin(
    dto: CambiarPinDto,
    personaId: string,
    actorId: string,
    ip?: string,
  ): Promise<{ mensaje: string }> {
    const credencial = await this.repository.findActivaByPersonaId(personaId);
    if (!credencial) {
      throw new NotFoundException(CREDENCIAL_MESSAGES.CREDENCIAL_NOT_FOUND);
    }

    if (dto.pinActual) {
      const hashActual = hashSha256(dto.pinActual);
      if (credencial.pinHash && credencial.pinHash !== hashActual) {
        throw new BadRequestException(CREDENCIAL_MESSAGES.PIN_ACTUAL_INCORRECTO);
      }
    }

    const nuevoPinHash = hashSha256(dto.nuevoPin);
    await this.repository.actualizarPin(credencial.id, nuevoPinHash);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "credenciales",
      registroId: credencial.id,
      valorNuevo: { personaId },
      direccionIp: ip,
    });

    return { mensaje: CREDENCIAL_MESSAGES.PIN_ACTUALIZADO };
  }

  async obtenerCarne(personaId: string): Promise<CarneDatosDto> {
    const carne = await this.repository.findPersonaForCarne(personaId);
    if (!carne) {
      throw new NotFoundException(CREDENCIAL_MESSAGES.CREDENCIAL_NOT_FOUND);
    }
    return carne;
  }

  async obtenerActiva(personaId: string): Promise<CredencialResponseDto> {
    const cred = await this.repository.findActivaByPersonaId(personaId);
    if (!cred) {
      throw new NotFoundException(CREDENCIAL_MESSAGES.CREDENCIAL_NOT_FOUND);
    }
    return {
      id: cred.id,
      personaId: cred.personaId,
      codigo: cred.codigo,
      activa: cred.activa,
      emitidaEn: cred.emitidaEn,
      venceEn: cred.venceEn,
    };
  }
}
