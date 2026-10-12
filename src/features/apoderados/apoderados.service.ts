import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { hashPassword } from "../../common/utils";
import { CargosRepository } from "../cargos/repositories/cargos.repository";
import { PersonasRepository } from "../personas/repositories/personas.repository";
import { RolesRepository } from "../roles/repositories/roles.repository";
import { generateTemporaryPassword } from "../users/utils/password-generator.util";
import { APODERADO_MESSAGES, CARGO_APODERADO_DEFAULT, ROL_APODERADO_DEFAULT } from "./constants";
import type {
  ApoderadoQueryDto,
  ApoderadoResponseDto,
  CreateApoderadoDto,
  CreateApoderadoResponseDto,
  EstudianteDelApoderadoResponseDto,
  PaginatedApoderadosResponseDto,
  UpdateApoderadoDto,
  VincularEstudianteApoderadoDto,
  VinculoFamiliarResponseDto,
} from "./dto";
import { ApoderadosRepository } from "./repositories/apoderados.repository";

@Injectable()
export class ApoderadosService {
  private readonly logger = new Logger(ApoderadosService.name);

  constructor(
    private readonly repository: ApoderadosRepository,
    private readonly personasRepository: PersonasRepository,
    private readonly cargosRepository: CargosRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query?: ApoderadoQueryDto): Promise<PaginatedApoderadosResponseDto> {
    return this.repository.findAll(query);
  }

  async findById(id: string): Promise<ApoderadoResponseDto> {
    const apoderado = await this.repository.findById(id);
    if (!apoderado) {
      throw new NotFoundException(APODERADO_MESSAGES.NOT_FOUND);
    }
    return apoderado;
  }

  async findByEstudianteId(estudianteId: string): Promise<ApoderadoResponseDto[]> {
    return this.repository.findByEstudianteId(estudianteId);
  }

  async findMisEstudiantes(
    apoderadoPersonaId: string,
  ): Promise<EstudianteDelApoderadoResponseDto[]> {
    return this.repository.findEstudiantesByApoderadoPersonaId(apoderadoPersonaId);
  }

  async create(
    dto: CreateApoderadoDto,
    actorId: string,
    ip?: string,
  ): Promise<CreateApoderadoResponseDto> {
    // 1. Validar persona y unicidad de ficha
    if (dto.personaId) {
      const persona = await this.personasRepository.findById(dto.personaId);
      if (!persona) {
        throw new NotFoundException("Persona seleccionada no encontrada en el padrón.");
      }

      const existingApoderado = await this.repository.findByPersonaId(dto.personaId);
      if (existingApoderado) {
        throw new ConflictException(APODERADO_MESSAGES.PERSONA_YA_APODERADO);
      }
    } else if (dto.nuevaPersona) {
      const existingDoc = await this.personasRepository.findByDocumento(
        dto.nuevaPersona.tipoDocumento,
        dto.nuevaPersona.numeroDocumento.trim(),
      );
      if (existingDoc) {
        const existingApoderado = await this.repository.findByPersonaId(existingDoc.id);
        if (existingApoderado) {
          throw new ConflictException(APODERADO_MESSAGES.PERSONA_YA_APODERADO);
        }
        dto.personaId = existingDoc.id;
        dto.nuevaPersona = undefined;
      }
    } else {
      throw new BadRequestException(
        "Debe indicar una persona existente o los datos para registrarla.",
      );
    }

    // 2. Resolver cargo Apoderado(a)
    const cargoApoderado = await this.cargosRepository.findByName(CARGO_APODERADO_DEFAULT);
    if (!cargoApoderado) {
      throw new NotFoundException(APODERADO_MESSAGES.CARGO_NOT_FOUND);
    }

    // 3. Resolver rol Apoderado
    const rolApoderado = await this.rolesRepository.findByName(ROL_APODERADO_DEFAULT);
    if (!rolApoderado) {
      throw new NotFoundException(APODERADO_MESSAGES.ROL_NOT_FOUND);
    }

    // 4. Generar contraseña temporal si se requiere crear cuenta nueva
    const tempPassword = generateTemporaryPassword(10);
    const contrasenaHash = await hashPassword(tempPassword);

    const created = await this.repository.create({
      dto,
      actorId,
      cargoId: cargoApoderado.id,
      rolId: rolApoderado.id,
      tempPassword,
      contrasenaHash,
    });

    // 5. Auditoría inmutable
    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "apoderados",
      registroId: created.apoderado.id,
      valorNuevo: {
        id: created.apoderado.id,
        personaId: created.apoderado.personaId,
        nombreCompleto: created.apoderado.persona.nombreCompleto,
        ocupacion: created.apoderado.ocupacion,
        gradoInstruccion: created.apoderado.gradoInstruccion,
        vinculoEstudianteId: dto.estudianteId,
        parentesco: dto.parentesco,
      },
      direccionIp: ip,
    });

    return created;
  }

  async update(
    id: string,
    dto: UpdateApoderadoDto,
    actorId: string,
    ip?: string,
  ): Promise<ApoderadoResponseDto> {
    const existing = await this.findById(id);

    const updated = await this.repository.update(id, dto);
    if (!updated) {
      throw new NotFoundException(APODERADO_MESSAGES.NOT_FOUND);
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "apoderados",
      registroId: id,
      valorAnterior: {
        ocupacion: existing.ocupacion,
        centroLaboral: existing.centroLaboral,
        telefonoLaboral: existing.telefonoLaboral,
        gradoInstruccion: existing.gradoInstruccion,
      },
      valorNuevo: {
        ...dto,
      },
      direccionIp: ip,
    });

    return updated;
  }

  async delete(id: string, actorId: string, ip?: string): Promise<{ message: string }> {
    const existing = await this.findById(id);

    const ok = await this.repository.delete(id, actorId);
    if (!ok) {
      throw new NotFoundException(APODERADO_MESSAGES.NOT_FOUND);
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "eliminar",
      tabla: "apoderados",
      registroId: id,
      valorAnterior: {
        personaId: existing.personaId,
        nombreCompleto: existing.persona.nombreCompleto,
      },
      direccionIp: ip,
    });

    return { message: APODERADO_MESSAGES.DELETED_SUCCESS };
  }

  async vincularEstudiante(
    dto: VincularEstudianteApoderadoDto,
    actorId: string,
    ip?: string,
  ): Promise<VinculoFamiliarResponseDto> {
    const vinculo = await this.repository.vincularEstudiante(dto);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "estudiante_apoderados",
      registroId: `${dto.estudianteId}:${dto.apoderadoId}`,
      valorNuevo: {
        estudianteId: dto.estudianteId,
        apoderadoId: dto.apoderadoId,
        parentesco: dto.parentesco,
        esPrincipal: dto.esPrincipal,
        viveConEstudiante: dto.viveConEstudiante,
      },
      direccionIp: ip,
    });

    return vinculo;
  }

  async desvincularEstudiante(
    estudianteId: string,
    apoderadoId: string,
    actorId: string,
    ip?: string,
  ): Promise<{ message: string }> {
    const vinculo = await this.repository.getVinculo(estudianteId, apoderadoId);
    if (!vinculo) {
      throw new NotFoundException(APODERADO_MESSAGES.VINCULO_NOT_FOUND);
    }

    const ok = await this.repository.desvincularEstudiante(estudianteId, apoderadoId);
    if (!ok) {
      throw new NotFoundException(APODERADO_MESSAGES.VINCULO_NOT_FOUND);
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "eliminar",
      tabla: "estudiante_apoderados",
      registroId: `${estudianteId}:${apoderadoId}`,
      valorAnterior: {
        estudianteId,
        apoderadoId,
        parentesco: vinculo.parentesco,
        esPrincipal: vinculo.esPrincipal,
      },
      direccionIp: ip,
    });

    return { message: APODERADO_MESSAGES.DESVINCULADO_SUCCESS };
  }
}
