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
import { EstudiantesRepository } from "../estudiantes/repositories/estudiantes.repository";
import type { DarBajaFichaActualDto } from "../personas/dto/baja-ficha.dto";
import {
  conflictoConDependencias,
  conflictoFichaVigente,
  esFichaVigente,
  FICHA_MESSAGES,
} from "../personas/utils/ficha-academica.util";
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
    private readonly estudiantesRepository: EstudiantesRepository,
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

  /**
   * Una persona solo puede tener una ficha académica vigente (docente o estudiante).
   * Si tiene la de estudiante vigente: sin `baja` se rechaza con un 409 de código estable;
   * con `baja` se da de baja (retirado) y se devuelve cómo deshacerlo si la creación falla.
   */
  private async liberarFichaEstudiante(
    personaId: string,
    baja: DarBajaFichaActualDto | undefined,
    actorId: string,
    ip?: string,
  ): Promise<(() => Promise<void>) | null> {
    const estudiante = await this.estudiantesRepository.findByPersonaId(personaId);
    if (!estudiante || !esFichaVigente("estudiante", estudiante.estado)) return null;

    if (!baja) {
      throw conflictoFichaVigente("docente", {
        tipo: "estudiante",
        id: estudiante.id,
        codigo: estudiante.codigo,
        estado: estudiante.estado,
      });
    }

    if ((await this.estudiantesRepository.contarMatriculasActivas(estudiante.id)) > 0) {
      throw conflictoConDependencias(FICHA_MESSAGES.ESTUDIANTE_CON_MATRICULA);
    }

    await this.estudiantesRepository.cambiarEstado(estudiante.id, "retirado");
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "estudiantes",
      registroId: estudiante.id,
      valorAnterior: { estado: estudiante.estado },
      valorNuevo: {
        estado: "retirado",
        motivo: baja.motivo,
        fechaBaja: baja.fecha ?? null,
        origen: "cambio_de_condicion_a_docente",
      },
      direccionIp: ip,
    });

    return async () => {
      await this.estudiantesRepository.cambiarEstado(estudiante.id, "activo");
    };
  }

  private async assertSinFichaDocenteVigente(personaId: string): Promise<void> {
    const existente = await this.repository.findByPersonaId(personaId);
    if (!existente) return;
    throw new ConflictException(
      existente.estado === "cesado"
        ? DOCENTE_MESSAGES.PERSONA_DOCENTE_CESADO
        : DOCENTE_MESSAGES.PERSONA_YA_DOCENTE,
    );
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

      await this.assertSinFichaDocenteVigente(dto.personaId);
    } else if (dto.nuevaPersona) {
      numeroDocumento = dto.nuevaPersona.numeroDocumento.trim();

      const existingDoc = await this.personasRepository.findByDocumento(
        dto.nuevaPersona.tipoDocumento,
        numeroDocumento,
      );
      if (existingDoc) {
        // Si ya existe la persona por documento, verificar si ya tiene ficha docente
        await this.assertSinFichaDocenteVigente(existingDoc.id);
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

    // 5b. Liberar la ficha de estudiante vigente (si la hay y se pidió la baja)
    const deshacerBaja = dto.personaId
      ? await this.liberarFichaEstudiante(dto.personaId, dto.darBajaFichaActual, actorId, ip)
      : null;

    let created: CreateDocenteResponseDto;
    try {
      created = await this.repository.create({
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
    } catch (error) {
      if (deshacerBaja) {
        await deshacerBaja().catch((e: unknown) =>
          this.logger.error(`No se pudo revertir la baja de la ficha de estudiante: ${String(e)}`),
        );
      }
      throw error;
    }

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

    if ((await this.repository.contarCargaVigente(id)) > 0) {
      throw conflictoConDependencias(FICHA_MESSAGES.DOCENTE_CON_CARGA);
    }

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

  async reactivar(
    id: string,
    actorId: string,
    ip?: string,
  ): Promise<{ docente: DocenteResponseDto; message: string }> {
    const existing = await this.findById(id);

    if (existing.estado !== "cesado") {
      throw new BadRequestException(FICHA_MESSAGES.DOCENTE_NO_CESADO);
    }

    // La otra ficha debe estar de baja para poder reactivar esta
    const estudiante = await this.estudiantesRepository.findByPersonaId(existing.personaId);
    if (estudiante && esFichaVigente("estudiante", estudiante.estado)) {
      throw conflictoFichaVigente("docente", {
        tipo: "estudiante",
        id: estudiante.id,
        codigo: estudiante.codigo,
        estado: estudiante.estado,
      });
    }

    const docente = await this.repository.reactivar(id);
    if (!docente) {
      throw new NotFoundException(DOCENTE_MESSAGES.NOT_FOUND);
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "docentes",
      registroId: id,
      valorAnterior: { estado: existing.estado, fechaCese: existing.fechaCese },
      valorNuevo: { estado: "activo", fechaCese: null, origen: "reactivacion" },
      direccionIp: ip,
    });

    return { docente, message: FICHA_MESSAGES.DOCENTE_REACTIVADO };
  }
}
