import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AnioLectivoCls } from "../../common/anio-lectivo";
import { AuditService } from "../../common/services/audit.service";
import { AniosAcademicosService } from "../anio-escolar/anios.service";
import { DocentesRepository } from "../docentes";
import { GradosService } from "../grados";
import { MENSAJES_SECCIONES, TABLA_SECCIONES } from "./constants";
import { CreateSeccionDto, SeccionQueryDto, SeccionResponseDto, UpdateSeccionDto } from "./dto";
import { SeccionesRepository } from "./repositories";
import { construirMensajeSeccionRepetida } from "./utils";

@Injectable()
export class SeccionesService {
  constructor(
    private readonly seccionesRepo: SeccionesRepository,
    private readonly gradosService: GradosService,
    private readonly docentesRepo: DocentesRepository,
    private readonly aniosService: AniosAcademicosService,
    private readonly anioLectivoCls: AnioLectivoCls,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateSeccionDto, actorId: string, ip?: string): Promise<SeccionResponseDto> {
    if (dto.vacantes <= 0) {
      throw new BadRequestException(MENSAJES_SECCIONES.VACANTES_INVALIDAS);
    }

    const anio = await this.resolverAnio(true);
    const grado = await this.gradosService.findById(dto.gradoId);

    const nombreTrimmed = dto.nombre.trim();
    const seccionExistente = await this.seccionesRepo.findPorNombre(
      anio.id,
      dto.gradoId,
      nombreTrimmed,
    );
    if (seccionExistente) {
      throw new ConflictException(construirMensajeSeccionRepetida(nombreTrimmed, grado.numero));
    }

    if (dto.tutorId) {
      const docente = await this.docentesRepo.findById(dto.tutorId);
      if (!docente || docente.estado !== "activo") {
        throw new BadRequestException(MENSAJES_SECCIONES.TUTOR_DOCENTE_INACTIVO);
      }

      const tutorOcupado = await this.seccionesRepo.tutorOcupado(anio.id, dto.tutorId);
      if (tutorOcupado) {
        throw new ConflictException(MENSAJES_SECCIONES.TUTOR_OCUPADO);
      }
    }

    const creada = await this.seccionesRepo.createConCarga({
      anioAcademicoId: anio.id,
      gradoId: dto.gradoId,
      nombre: nombreTrimmed,
      aula: dto.aula?.trim() || null,
      vacantes: dto.vacantes,
      tutorId: dto.tutorId ?? null,
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: TABLA_SECCIONES,
      registroId: creada.id,
      valorNuevo: this.serializarAuditoria(creada),
      direccionIp: ip,
    });

    return creada;
  }

  async update(
    id: string,
    dto: UpdateSeccionDto,
    actorId: string,
    ip?: string,
  ): Promise<SeccionResponseDto> {
    const seccion = await this.seccionesRepo.findById(id);
    if (!seccion) {
      throw new NotFoundException(MENSAJES_SECCIONES.SECCION_NO_ENCONTRADA);
    }

    const anio = await this.aniosService.findById(seccion.anioAcademicoId);
    if (anio.estado === "cerrado") {
      throw new BadRequestException(MENSAJES_SECCIONES.ANIO_CERRADO);
    }

    if (dto.vacantes !== undefined && dto.vacantes <= 0) {
      throw new BadRequestException(MENSAJES_SECCIONES.VACANTES_INVALIDAS);
    }

    if (dto.nombre && dto.nombre.trim() !== seccion.nombre) {
      const grado = await this.gradosService.findById(seccion.gradoId);
      const nombreTrimmed = dto.nombre.trim();
      const seccionExistente = await this.seccionesRepo.findPorNombre(
        seccion.anioAcademicoId,
        seccion.gradoId,
        nombreTrimmed,
        id,
      );
      if (seccionExistente) {
        throw new ConflictException(construirMensajeSeccionRepetida(nombreTrimmed, grado.numero));
      }
    }

    if (dto.tutorId) {
      const docente = await this.docentesRepo.findById(dto.tutorId);
      if (!docente || docente.estado !== "activo") {
        throw new BadRequestException(MENSAJES_SECCIONES.TUTOR_DOCENTE_INACTIVO);
      }

      const tutorOcupado = await this.seccionesRepo.tutorOcupado(
        seccion.anioAcademicoId,
        dto.tutorId,
        id,
      );
      if (tutorOcupado) {
        throw new ConflictException(MENSAJES_SECCIONES.TUTOR_OCUPADO);
      }
    }

    const actualizada = await this.seccionesRepo.update(id, dto);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: TABLA_SECCIONES,
      registroId: id,
      valorAnterior: this.serializarAuditoria(seccion),
      valorNuevo: this.serializarAuditoria(actualizada),
      direccionIp: ip,
    });

    return actualizada;
  }

  async cerrar(id: string, actorId: string, ip?: string): Promise<SeccionResponseDto> {
    const seccion = await this.seccionesRepo.findById(id);
    if (!seccion) {
      throw new NotFoundException(MENSAJES_SECCIONES.SECCION_NO_ENCONTRADA);
    }

    const anio = await this.aniosService.findById(seccion.anioAcademicoId);
    if (anio.estado === "cerrado") {
      throw new BadRequestException(MENSAJES_SECCIONES.ANIO_CERRADO);
    }

    const matriculados = await this.seccionesRepo.contarMatriculadosVigentes(id);
    if (matriculados > 0) {
      throw new ConflictException(MENSAJES_SECCIONES.SECCION_CON_MATRICULADOS);
    }

    const cerrada = await this.seccionesRepo.cerrar(id);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: TABLA_SECCIONES,
      registroId: id,
      valorAnterior: { estado: seccion.estado },
      valorNuevo: { estado: cerrada.estado },
      direccionIp: ip,
    });

    return cerrada;
  }

  async findAll(query?: SeccionQueryDto): Promise<SeccionResponseDto[]> {
    const anio = await this.resolverAnio(false);
    return this.seccionesRepo.findAll(anio.id, query);
  }

  async findById(id: string): Promise<SeccionResponseDto> {
    const seccion = await this.seccionesRepo.findById(id);
    if (!seccion) {
      throw new NotFoundException(MENSAJES_SECCIONES.SECCION_NO_ENCONTRADA);
    }
    return seccion;
  }

  private async resolverAnio(requiereEscritura: boolean) {
    const id = this.anioLectivoCls.id();
    const anio = id ? await this.aniosService.findById(id) : await this.aniosService.findEnCurso();
    if (requiereEscritura && anio.estado === "cerrado") {
      throw new BadRequestException(MENSAJES_SECCIONES.ANIO_CERRADO);
    }
    return anio;
  }

  private serializarAuditoria(seccion: SeccionResponseDto): Record<string, unknown> {
    return {
      id: seccion.id,
      anioAcademicoId: seccion.anioAcademicoId,
      gradoId: seccion.gradoId,
      gradoNumero: seccion.gradoNumero,
      gradoNombre: seccion.gradoNombre,
      nombre: seccion.nombre,
      aula: seccion.aula,
      vacantes: seccion.vacantes,
      estado: seccion.estado,
      tutor: seccion.tutor,
      matriculados: seccion.matriculados,
      totalCursos: seccion.totalCursos,
      cursosSinDocente: seccion.cursosSinDocente,
    };
  }
}
