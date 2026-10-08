import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../../../common/services/audit.service";
import { GradoResponseDto, UpdateGradoDto } from "../dto";
import { GradosRepository } from "../repositories";

@Injectable()
export class GradosService {
  constructor(
    private readonly repository: GradosRepository,
    private readonly auditService: AuditService,
  ) {}

  async findAll(): Promise<GradoResponseDto[]> {
    return this.repository.findAll();
  }

  async findById(id: string): Promise<GradoResponseDto> {
    const grado = await this.repository.findById(id);
    if (!grado) {
      throw new NotFoundException(`El grado con ID ${id} no existe.`);
    }
    return grado;
  }

  async update(
    id: string,
    dto: UpdateGradoDto,
    actorId: string,
    ip?: string,
  ): Promise<GradoResponseDto> {
    const existing = await this.findById(id);

    const updated = await this.repository.updateNombre(id, dto.nombre.trim());
    if (!updated) {
      throw new NotFoundException(`El grado con ID ${id} no existe.`);
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "grados",
      registroId: id,
      valorAnterior: { nombre: existing.nombre },
      valorNuevo: { nombre: updated.nombre },
      direccionIp: ip,
    });

    return updated;
  }
}
