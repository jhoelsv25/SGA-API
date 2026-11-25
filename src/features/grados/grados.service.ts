import { Injectable, NotFoundException, Optional } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { CacheService } from "../../core/cache/cache.service";
import { GradoResponseDto, UpdateGradoDto } from "./dto";
import { GradosRepository } from "./repositories/grados.repository";

const CLAVE_CACHE_GRADOS = "catalogos:grados:all";
const TTL_CACHE_GRADOS_SEGUNDOS = 600;

@Injectable()
export class GradosService {
  constructor(
    private readonly repository: GradosRepository,
    private readonly auditService: AuditService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async findAll(): Promise<GradoResponseDto[]> {
    if (!this.cacheService) {
      return this.repository.findAll();
    }
    return this.cacheService.getOrSet(
      CLAVE_CACHE_GRADOS,
      () => this.repository.findAll(),
      TTL_CACHE_GRADOS_SEGUNDOS,
    );
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

    await this.cacheService?.del(CLAVE_CACHE_GRADOS);

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
