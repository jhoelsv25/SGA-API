import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { hashPassword, hashSha256 } from "../../common/utils";
import type { MimeTypeOcr } from "../../core/ocr/constants";
import { OcrService } from "../../core/ocr/ocr.service";
import { CargosRepository } from "../cargos/repositories/cargos.repository";
import { DocentesRepository } from "../docentes/repositories/docentes.repository";
import { validarFechasDocente } from "../docentes/utils";
import type { DarBajaFichaActualDto } from "../personas/dto/baja-ficha.dto";
import { PersonasRepository } from "../personas/repositories/personas.repository";
import {
  conflictoConDependencias,
  conflictoFichaVigente,
  esFichaVigente,
  FICHA_MESSAGES,
} from "../personas/utils/ficha-academica.util";
import { RolesRepository } from "../roles/repositories/roles.repository";
import { generateTemporaryPassword } from "../users/utils/password-generator.util";
import { CARGO_ESTUDIANTE_DEFAULT, ESTUDIANTE_MESSAGES, ROL_ESTUDIANTE_DEFAULT } from "./constants";
import type {
  CreateEstudianteDto,
  CreateEstudianteResponseDto,
  EstudianteQueryDto,
  EstudianteResponseDto,
  OcrDocumentoEstudianteResponseDto,
  PaginatedEstudiantesResponseDto,
  UpdateEstudianteDto,
} from "./dto";
import { INSTRUCCION_OCR_DOCUMENTO_ESTUDIANTE } from "./prompts";
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
    private readonly docentesRepository: DocentesRepository,
    @Optional() private readonly ocrService?: OcrService,
  ) {}

  async extraerDatosDocumentoOcr(
    archivo: Express.Multer.File | undefined,
    actorId?: string,
    ip?: string,
  ): Promise<OcrDocumentoEstudianteResponseDto> {
    if (!archivo) {
      throw new BadRequestException("Debe adjuntar una imagen o PDF del documento.");
    }
    if (!this.ocrService) {
      throw new ServiceUnavailableException("El servicio OCR no está disponible.");
    }
    const resultado = await this.ocrService.extraerDatos<{
      dni?: string | null;
      apellidoPaterno?: string | null;
      apellidoMaterno?: string | null;
      nombres?: string | null;
      fechaNacimiento?: string | null;
      sexo?: "M" | "F" | null;
    }>({
      archivo: {
        contenido: archivo.buffer,
        mimeType: archivo.mimetype as MimeTypeOcr,
      },
      instruccion: INSTRUCCION_OCR_DOCUMENTO_ESTUDIANTE,
    });

    await this.auditService.log({
      ...(actorId ? { usuarioId: actorId } : {}),
      accion: "crear",
      tabla: "estudiantes_ocr",
      valorNuevo: {
        estrategia: resultado.estrategia,
        mimeType: archivo.mimetype,
        bytes: archivo.size,
      },
      direccionIp: ip,
    });

    return {
      dni: resultado.datos.dni ?? null,
      apellidoPaterno: resultado.datos.apellidoPaterno ?? null,
      apellidoMaterno: resultado.datos.apellidoMaterno ?? null,
      nombres: resultado.datos.nombres ?? null,
      fechaNacimiento: resultado.datos.fechaNacimiento ?? null,
      sexo: resultado.datos.sexo ?? null,
      estrategia: resultado.estrategia,
    };
  }

  /**
   * Una persona solo puede tener una ficha académica vigente (docente o estudiante).
   * Si tiene la de docente vigente: sin `baja` se rechaza con un 409 de código estable;
   * con `baja` se cesa al docente y se devuelve cómo deshacerlo si la creación falla.
   */
  private async liberarFichaDocente(
    personaId: string,
    baja: DarBajaFichaActualDto | undefined,
    actorId: string,
    ip?: string,
  ): Promise<(() => Promise<void>) | null> {
    const docente = await this.docentesRepository.findByPersonaId(personaId);
    if (!docente || !esFichaVigente("docente", docente.estado)) return null;

    if (!baja) {
      throw conflictoFichaVigente("estudiante", {
        tipo: "docente",
        id: docente.id,
        codigo: docente.codigo,
        estado: docente.estado,
      });
    }

    if ((await this.docentesRepository.contarCargaVigente(docente.id)) > 0) {
      throw conflictoConDependencias(FICHA_MESSAGES.DOCENTE_CON_CARGA);
    }

    const fechaCese = baja.fecha ?? new Date().toISOString().slice(0, 10);
    validarFechasDocente(docente.fechaIngreso, fechaCese);

    await this.docentesRepository.cesar(docente.id, fechaCese, actorId);
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "docentes",
      registroId: docente.id,
      valorAnterior: { estado: docente.estado, fechaCese: docente.fechaCese },
      valorNuevo: {
        estado: "cesado",
        fechaCese,
        motivo: baja.motivo,
        origen: "cambio_de_condicion_a_estudiante",
      },
      direccionIp: ip,
    });

    return async () => {
      await this.docentesRepository.reactivar(docente.id, actorId);
    };
  }

  private async assertSinFichaEstudianteVigente(personaId: string): Promise<void> {
    const existente = await this.repository.findByPersonaId(personaId);
    if (!existente) return;
    throw new ConflictException(
      existente.estado === "activo"
        ? ESTUDIANTE_MESSAGES.PERSONA_YA_ESTUDIANTE
        : ESTUDIANTE_MESSAGES.PERSONA_ESTUDIANTE_DE_BAJA,
    );
  }

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

      await this.assertSinFichaEstudianteVigente(dto.personaId);
    } else if (dto.nuevaPersona) {
      validarFechaNacimiento(dto.nuevaPersona.fechaNacimiento);

      const existingDoc = await this.personasRepository.findByDocumento(
        dto.nuevaPersona.tipoDocumento,
        dto.nuevaPersona.numeroDocumento.trim(),
      );
      if (existingDoc) {
        await this.assertSinFichaEstudianteVigente(existingDoc.id);
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

    // 6b. Liberar la ficha de docente vigente (si la hay y se pidió la baja)
    const deshacerBaja = dto.personaId
      ? await this.liberarFichaDocente(dto.personaId, dto.darBajaFichaActual, actorId, ip)
      : null;

    let created: CreateEstudianteResponseDto;
    try {
      created = await this.repository.create({
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
    } catch (error) {
      if (deshacerBaja) {
        await deshacerBaja().catch((e: unknown) =>
          this.logger.error(`No se pudo revertir el cese de la ficha de docente: ${String(e)}`),
        );
      }
      throw error;
    }

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

  /** Baja lógica de la ficha de estudiante (estado 'retirado'). Bloquea si tiene matrícula activa. */
  async darDeBaja(
    id: string,
    dto: DarBajaFichaActualDto,
    actorId: string,
    ip?: string,
  ): Promise<{ estudiante: EstudianteResponseDto; message: string }> {
    const actual = await this.findById(id);

    if (!esFichaVigente("estudiante", actual.estado)) {
      throw new BadRequestException("La ficha del estudiante ya está dada de baja.");
    }
    if ((await this.repository.contarMatriculasActivas(id)) > 0) {
      throw conflictoConDependencias(FICHA_MESSAGES.ESTUDIANTE_CON_MATRICULA);
    }

    const estudiante = await this.repository.cambiarEstado(id, "retirado");
    if (!estudiante) {
      throw new NotFoundException(ESTUDIANTE_MESSAGES.NOT_FOUND);
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "estudiantes",
      registroId: id,
      valorAnterior: { estado: actual.estado },
      valorNuevo: { estado: "retirado", motivo: dto.motivo, fechaBaja: dto.fecha ?? null },
      direccionIp: ip,
    });

    return { estudiante, message: FICHA_MESSAGES.ESTUDIANTE_DE_BAJA };
  }

  /** Reactiva un estudiante retirado o trasladado, si la persona no tiene ficha de docente vigente. */
  async reactivar(
    id: string,
    actorId: string,
    ip?: string,
  ): Promise<{ estudiante: EstudianteResponseDto; message: string }> {
    const actual = await this.findById(id);

    if (actual.estado === "egresado") {
      throw new BadRequestException(FICHA_MESSAGES.ESTUDIANTE_EGRESADO);
    }
    if (actual.estado === "activo") {
      throw new BadRequestException(FICHA_MESSAGES.ESTUDIANTE_NO_DE_BAJA);
    }

    const docente = await this.docentesRepository.findByPersonaId(actual.personaId);
    if (docente && esFichaVigente("docente", docente.estado)) {
      throw conflictoFichaVigente("estudiante", {
        tipo: "docente",
        id: docente.id,
        codigo: docente.codigo,
        estado: docente.estado,
      });
    }

    const estudiante = await this.repository.cambiarEstado(id, "activo");
    if (!estudiante) {
      throw new NotFoundException(ESTUDIANTE_MESSAGES.NOT_FOUND);
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "estudiantes",
      registroId: id,
      valorAnterior: { estado: actual.estado },
      valorNuevo: { estado: "activo", origen: "reactivacion" },
      direccionIp: ip,
    });

    return { estudiante, message: FICHA_MESSAGES.ESTUDIANTE_REACTIVADO };
  }
}
