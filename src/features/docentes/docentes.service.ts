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
import { CARGO_DOCENTE_DEFAULT, DOCENTE_MESSAGES, ROL_DOCENTE_DEFAULT } from "./constants";
import type {
  CesarDocenteDto,
  CreateDocenteDto,
  CreateDocenteResponseDto,
  DocenteQueryDto,
  DocenteResponseDto,
  PaginatedDocentesResponseDto,
  UpdateDocenteDto,
} from "./dto";
import { DocentesRepository } from "./repositories/docentes.repository";
import { generateCodigoCredencial, generateCredencialPin, validarFechasDocente } from "./utils";

@Injectable()
export class DocentesService {
  private readonly logger = new Logger(DocentesService.name);

  constructor(
    private readonly repository: DocentesRepository,
    private readonly personasRepository: PersonasRepository,
    private readonly cargosRepository: CargosRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query?: DocenteQueryDto): Promise<PaginatedDocentesResponseDto> {
    return this.repository.findAll(query);
  }

  async findById(id: string): Promise<DocenteResponseDto> {
    const docente = await this.repository.findById(id);
    if (!docente) {
      throw new NotFoundException(DOCENTE_MESSAGES.NOT_FOUND);
    }
    return docente;
  }

  async create(
    dto: CreateDocenteDto,
    actorId: string,
    ip?: string,
  ): Promise<CreateDocenteResponseDto> {
    // 1. Validar código único de docente
    const existingCodigo = await this.repository.findByCodigo(dto.codigo);
    if (existingCodigo) {
      throw new ConflictException(DOCENTE_MESSAGES.CODIGO_DUPLICADO);
    }

    // 2. Validar persona y unicidad de ficha
    let numeroDocumento: string;

    if (dto.personaId) {
      const persona = await this.personasRepository.findById(dto.personaId);
      if (!persona) {
        throw new NotFoundException("Persona seleccionada no encontrada en el padrón.");
      }
      numeroDocumento = persona.numeroDocumento;

      const existingDocente = await this.repository.findByPersonaId(dto.personaId);
      if (existingDocente) {
        throw new ConflictException(DOCENTE_MESSAGES.PERSONA_YA_DOCENTE);
      }
    } else if (dto.nuevaPersona) {
      numeroDocumento = dto.nuevaPersona.numeroDocumento.trim();

      const existingDoc = await this.personasRepository.findByDocumento(
        dto.nuevaPersona.tipoDocumento,
        numeroDocumento,
      );
      if (existingDoc) {
        // Si ya existe la persona por documento, verificar si ya tiene ficha docente
        const existingDocente = await this.repository.findByPersonaId(existingDoc.id);
        if (existingDocente) {
          throw new ConflictException(DOCENTE_MESSAGES.PERSONA_YA_DOCENTE);
        }
        // Asignar el personaId existente para reutilizarla
        dto.personaId = existingDoc.id;
        dto.nuevaPersona = undefined;
      }
    } else {
      throw new BadRequestException("Debe indicar una persona existente o los datos para crearla.");
    }

    // 3. Resolver cargo docente
    let cargoId = dto.cargoId;
    if (!cargoId) {
      const cargoDefault = await this.cargosRepository.findByName(CARGO_DOCENTE_DEFAULT);
      if (!cargoDefault) {
        throw new NotFoundException(DOCENTE_MESSAGES.CARGO_NOT_FOUND);
      }
      cargoId = cargoDefault.id;
    } else {
      const cargo = await this.cargosRepository.findById(cargoId);
      if (!cargo) {
        throw new NotFoundException(DOCENTE_MESSAGES.CARGO_NOT_FOUND);
      }
    }

    // 4. Resolver rol Docente
    const rolDocente = await this.rolesRepository.findByName(ROL_DOCENTE_DEFAULT);
    if (!rolDocente) {
      throw new NotFoundException(DOCENTE_MESSAGES.ROL_NOT_FOUND);
    }

    // 5. Generar credenciales de marcación y contraseña temporal si aplica
    const pinPlano = generateCredencialPin();
    const pinHash = hashSha256(pinPlano);
    const codigoCredencial = generateCodigoCredencial(numeroDocumento);

    const tempPassword = generateTemporaryPassword(10);
    const contrasenaHash = await hashPassword(tempPassword);

    const created = await this.repository.create({
      dto,
      actorId,
      cargoId,
      rolId: rolDocente.id,
      pinPlano,
      pinHash,
      codigoCredencial,
      tempPassword,
      contrasenaHash,
    });

    // 6. Auditoría inmutable
    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "docentes",
      registroId: created.docente.id,
      valorNuevo: {
        codigo: created.docente.codigo,
        personaId: created.docente.personaId,
        nombreCompleto: created.docente.persona.nombreCompleto,
        tipoContrato: created.docente.tipoContrato,
        jornadaHoras: created.docente.jornadaHoras,
        fechaIngreso: created.docente.fechaIngreso,
        estado: created.docente.estado,
        credencial: codigoCredencial,
      },
      direccionIp: ip,
    });

    return created;
  }

  async update(
    id: string,
    dto: UpdateDocenteDto,
    actorId: string,
    ip?: string,
  ): Promise<DocenteResponseDto> {
    const existing = await this.findById(id);

    if (dto.fechaIngreso || dto.fechaCese) {
      validarFechasDocente(
        dto.fechaIngreso ?? existing.fechaIngreso,
        dto.fechaCese ?? existing.fechaCese,
      );
    }

    const updated = await this.repository.update(id, dto);
    if (!updated) {
      throw new NotFoundException(DOCENTE_MESSAGES.NOT_FOUND);
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "docentes",
      registroId: id,
      valorAnterior: {
        especialidad: existing.especialidad,
        tituloProfesional: existing.tituloProfesional,
        tipoContrato: existing.tipoContrato,
        jornadaHoras: existing.jornadaHoras,
        fechaIngreso: existing.fechaIngreso,
        fechaCese: existing.fechaCese,
        estado: existing.estado,
      },
      valorNuevo: {
        ...dto,
      },
      direccionIp: ip,
    });

    return updated;
  }

  async cesar(
    id: string,
    dto: CesarDocenteDto,
    actorId: string,
    ip?: string,
  ): Promise<{ docente: DocenteResponseDto; message: string }> {
    const existing = await this.findById(id);

    if (existing.estado === "cesado") {
      throw new BadRequestException(DOCENTE_MESSAGES.ALREADY_CESADO);
    }

    validarFechasDocente(existing.fechaIngreso, dto.fechaCese);

    const result = await this.repository.cesar(id, dto.fechaCese);
    if (!result) {
      throw new NotFoundException(DOCENTE_MESSAGES.NOT_FOUND);
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "docentes",
      registroId: id,
      valorAnterior: {
        estado: existing.estado,
        fechaCese: existing.fechaCese,
      },
      valorNuevo: {
        estado: "cesado",
        fechaCese: dto.fechaCese,
        motivo: dto.motivo,
        mantuvoCuentaActiva: result.mantuvoCuentaActiva,
      },
      direccionIp: ip,
    });

    const message = result.mantuvoCuentaActiva
      ? "Docente cesado. Su cuenta sigue activa porque cuenta con otras fichas activas (ej. apoderado)."
      : DOCENTE_MESSAGES.CESADO_SUCCESS;

    return {
      docente: result.docente,
      message,
    };
  }
}
