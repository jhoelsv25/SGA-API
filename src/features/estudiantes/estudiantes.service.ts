import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { hashPassword, hashSha256 } from "../../common/utils";
import { CargosRepository } from "../cargos/repositories/cargos.repository";
import { PersonasRepository } from "../personas/repositories/personas.repository";
import { RolesRepository } from "../roles/repositories/roles.repository";
import { generateTemporaryPassword } from "../users/utils/password-generator.util";
import { CARGO_ESTUDIANTE_DEFAULT, ESTUDIANTE_MESSAGES, ROL_ESTUDIANTE_DEFAULT } from "./constants";
import type {
  CreateEstudianteDto,
  CreateEstudianteResponseDto,
  EstudianteQueryDto,
  EstudianteResponseDto,
  PaginatedEstudiantesResponseDto,
  UpdateEstudianteDto,
} from "./dto";
import { EstudiantesRepository } from "./repositories/estudiantes.repository";
import {
  generateCodigoCredencial,
  generateCredencialPin,
  validarDiscapacidadEstudiante,
  validarFechaNacimiento,
} from "./utils";

@Injectable()
export class EstudiantesService {
  private readonly logger = new Logger(EstudiantesService.name);

  constructor(
    private readonly repository: EstudiantesRepository,
    private readonly personasRepository: PersonasRepository,
    private readonly cargosRepository: CargosRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query?: EstudianteQueryDto): Promise<PaginatedEstudiantesResponseDto> {
    return this.repository.findAll(query);
  }

  async findById(id: string): Promise<EstudianteResponseDto> {
    const estudiante = await this.repository.findById(id);
    if (!estudiante) {
      throw new NotFoundException(ESTUDIANTE_MESSAGES.NOT_FOUND);
    }
    return estudiante;
  }

  async create(
    dto: CreateEstudianteDto,
    actorId: string,
    ip?: string,
  ): Promise<CreateEstudianteResponseDto> {
    // 1. Validar código único de estudiante (Código SIAGIE)
    const existingCodigo = await this.repository.findByCodigo(dto.codigo);
    if (existingCodigo) {
      throw new ConflictException(ESTUDIANTE_MESSAGES.CODIGO_DUPLICADO);
    }

    // 2. Validar detalle de discapacidad
    validarDiscapacidadEstudiante(dto.tieneDiscapacidad, dto.detalleDiscapacidad);

    // 3. Validar persona y unicidad de ficha
    if (dto.personaId) {
      const persona = await this.personasRepository.findById(dto.personaId);
      if (!persona) {
        throw new NotFoundException("Persona seleccionada no encontrada en el padrón.");
      }

      const existingEstudiante = await this.repository.findByPersonaId(dto.personaId);
      if (existingEstudiante) {
        throw new ConflictException(ESTUDIANTE_MESSAGES.PERSONA_YA_ESTUDIANTE);
      }
    } else if (dto.nuevaPersona) {
      validarFechaNacimiento(dto.nuevaPersona.fechaNacimiento);

      const existingDoc = await this.personasRepository.findByDocumento(
        dto.nuevaPersona.tipoDocumento,
        dto.nuevaPersona.numeroDocumento.trim(),
      );
      if (existingDoc) {
        const existingEstudiante = await this.repository.findByPersonaId(existingDoc.id);
        if (existingEstudiante) {
          throw new ConflictException(ESTUDIANTE_MESSAGES.PERSONA_YA_ESTUDIANTE);
        }
        dto.personaId = existingDoc.id;
        dto.nuevaPersona = undefined;
      }
    } else {
      throw new BadRequestException(
        "Debe indicar una persona existente o los datos para registrarla.",
      );
    }

    // 4. Resolver cargo Estudiante
    const cargoEstudiante = await this.cargosRepository.findByName(CARGO_ESTUDIANTE_DEFAULT);
    if (!cargoEstudiante) {
      throw new NotFoundException(ESTUDIANTE_MESSAGES.CARGO_NOT_FOUND);
    }

    // 5. Resolver rol Estudiante
    const rolEstudiante = await this.rolesRepository.findByName(ROL_ESTUDIANTE_DEFAULT);
    if (!rolEstudiante) {
      throw new NotFoundException(ESTUDIANTE_MESSAGES.ROL_NOT_FOUND);
    }

    // 6. Generar credenciales de marcación y contraseña temporal
    const pinPlano = generateCredencialPin();
    const pinHash = hashSha256(pinPlano);
    const codigoCredencial = generateCodigoCredencial(dto.codigo);

    const tempPassword = generateTemporaryPassword(10);
    const contrasenaHash = await hashPassword(tempPassword);

    const created = await this.repository.create({
      dto,
      actorId,
      cargoId: cargoEstudiante.id,
      rolId: rolEstudiante.id,
      pinPlano,
      pinHash,
      codigoCredencial,
      tempPassword,
      contrasenaHash,
    });

    // 7. Auditoría inmutable
    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "estudiantes",
      registroId: created.estudiante.id,
      valorNuevo: {
        codigo: created.estudiante.codigo,
        personaId: created.estudiante.personaId,
        nombreCompleto: created.estudiante.persona.nombreCompleto,
        fechaIngreso: created.estudiante.fechaIngreso,
        estado: created.estudiante.estado,
        credencial: codigoCredencial,
      },
      direccionIp: ip,
    });

    return created;
  }

  async update(
    id: string,
    dto: UpdateEstudianteDto,
    actorId: string,
    ip?: string,
  ): Promise<EstudianteResponseDto> {
    const actual = await this.findById(id);

    // Validar discapacidad
    const tieneDiscapacidadFinal =
      dto.tieneDiscapacidad !== undefined ? dto.tieneDiscapacidad : actual.tieneDiscapacidad;
    const detalleDiscapacidadFinal =
      dto.detalleDiscapacidad !== undefined ? dto.detalleDiscapacidad : actual.detalleDiscapacidad;

    validarDiscapacidadEstudiante(tieneDiscapacidadFinal, detalleDiscapacidadFinal);

    const updated = await this.repository.update(id, dto);
    if (!updated) {
      throw new NotFoundException(ESTUDIANTE_MESSAGES.NOT_FOUND);
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "estudiantes",
      registroId: id,
      valorAnterior: {
        fechaIngreso: actual.fechaIngreso,
        lenguaMaterna: actual.lenguaMaterna,
        religion: actual.religion,
        tieneDiscapacidad: actual.tieneDiscapacidad,
        detalleDiscapacidad: actual.detalleDiscapacidad,
        grupoSanguineo: actual.grupoSanguineo,
        alergias: actual.alergias,
        condicionesMedicas: actual.condicionesMedicas,
        seguroSalud: actual.seguroSalud,
        estado: actual.estado,
      },
      valorNuevo: {
        fechaIngreso: updated.fechaIngreso,
        lenguaMaterna: updated.lenguaMaterna,
        religion: updated.religion,
        tieneDiscapacidad: updated.tieneDiscapacidad,
        detalleDiscapacidad: updated.detalleDiscapacidad,
        grupoSanguineo: updated.grupoSanguineo,
        alergias: updated.alergias,
        condicionesMedicas: updated.condicionesMedicas,
        seguroSalud: updated.seguroSalud,
        estado: updated.estado,
      },
      direccionIp: ip,
    });

    return updated;
  }

  async delete(id: string, actorId: string, ip?: string): Promise<{ message: string }> {
    const actual = await this.findById(id);

    const deleted = await this.repository.delete(id, actorId);
    if (!deleted) {
      throw new NotFoundException(ESTUDIANTE_MESSAGES.NOT_FOUND);
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "eliminar",
      tabla: "estudiantes",
      registroId: id,
      valorAnterior: {
        codigo: actual.codigo,
        personaId: actual.personaId,
        nombreCompleto: actual.persona.nombreCompleto,
        estado: actual.estado,
      },
      direccionIp: ip,
    });

    return { message: ESTUDIANTE_MESSAGES.DELETED_SUCCESS };
  }
}
