import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../../../common/services/audit.service";
import { CreateCursoDto, CursoResponseDto, FilterCursoDto, UpdateCursoDto } from "../dto";
import { CursosRepository } from "../repositories";

@Injectable()
export class CursosService {
  constructor(
    private readonly repository: CursosRepository,
    private readonly auditService: AuditService,
  ) {}

  async findAll(filter?: FilterCursoDto): Promise<CursoResponseDto[]> {
    return this.repository.findAll(filter);
  }

  async findById(id: string): Promise<CursoResponseDto> {
    const curso = await this.repository.findById(id);
    if (!curso) {
      throw new NotFoundException(`El curso con ID ${id} no existe.`);
    }
    return curso;
  }

  async create(dto: CreateCursoDto, actorId: string, ip?: string): Promise<CursoResponseDto> {
    const existing = await this.repository.findByCodigo(dto.codigo);
    if (existing) {
      throw new ConflictException("Ya existe un curso con ese código.");
    }

    const created = await this.repository.create(dto);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "cursos",
      registroId: created.id,
      valorNuevo: {
        codigo: created.codigo,
        nombre: created.nombre,
        areaCurricular: created.areaCurricular,
        colorHex: created.colorHex,
      },
      direccionIp: ip,
    });

    return created;
  }

  async update(
    id: string,
    dto: UpdateCursoDto,
    actorId: string,
    ip?: string,
  ): Promise<CursoResponseDto> {
    const existing = await this.findById(id);

    if (dto.codigo && dto.codigo.trim().toUpperCase() !== existing.codigo.toUpperCase()) {
      const codeDuplicate = await this.repository.findByCodigo(dto.codigo, id);
      if (codeDuplicate) {
        throw new ConflictException("Ya existe un curso con ese código.");
      }
    }

    const updated = await this.repository.update(id, dto);
    if (!updated) {
      throw new NotFoundException(`El curso con ID ${id} no existe.`);
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "cursos",
      registroId: id,
      valorAnterior: {
        codigo: existing.codigo,
        nombre: existing.nombre,
        areaCurricular: existing.areaCurricular,
        colorHex: existing.colorHex,
      },
      valorNuevo: {
        codigo: updated.codigo,
        nombre: updated.nombre,
        areaCurricular: updated.areaCurricular,
        colorHex: updated.colorHex,
      },
      direccionIp: ip,
    });

    return updated;
  }

  async desactivar(id: string, actorId: string, ip?: string): Promise<CursoResponseDto> {
    const existing = await this.findById(id);

    if (!existing.activo) {
      return existing;
    }

    const hasLoad = await this.repository.hasCargaAcademicaAnioEnCurso(id);
    if (hasLoad) {
      throw new ConflictException(
        "No se puede desactivar: el curso tiene carga académica en el año en curso.",
      );
    }

    const updated = await this.repository.softDelete(id);
    if (!updated) {
      throw new NotFoundException(`El curso con ID ${id} no existe.`);
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "cursos",
      registroId: id,
      valorAnterior: { activo: true },
      valorNuevo: { activo: false, accion: "desactivar", eliminadoEn: updated.eliminadoEn },
      direccionIp: ip,
    });

    return updated;
  }

  async reactivar(id: string, actorId: string, ip?: string): Promise<CursoResponseDto> {
    const existing = await this.findById(id);

    if (existing.activo) {
      return existing;
    }

    const codeDuplicate = await this.repository.findByCodigo(existing.codigo, id);
    if (codeDuplicate) {
      throw new ConflictException(
        "Ya existe otro curso activo con el mismo código. Modifíquelo antes de reactivar.",
      );
    }

    const updated = await this.repository.reactivate(id);
    if (!updated) {
      throw new NotFoundException(`El curso con ID ${id} no existe.`);
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "cursos",
      registroId: id,
      valorAnterior: { activo: false },
      valorNuevo: { activo: true, accion: "reactivar" },
      direccionIp: ip,
    });

    return updated;
  }
}
