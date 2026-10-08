import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { CARGO_MESSAGES } from "./constants";
import { CargoResponseDto, CreateCargoDto, UpdateCargoDto } from "./dto";
import { CargosRepository } from "./repositories";

/**
 * RF-002 V2 (HU4): catálogo de cargos del personal y sus roles sugeridos.
 * El cargo no da permisos: solo sugiere roles al asignarlo (RF-007).
 */
@Injectable()
export class CargosService {
  constructor(
    private readonly cargosRepository: CargosRepository,
    private readonly auditService: AuditService,
  ) {}

  async findAll(soloVigentes = false): Promise<CargoResponseDto[]> {
    return this.cargosRepository.findAll(soloVigentes);
  }

  async findById(id: string): Promise<CargoResponseDto> {
    const cargo = await this.cargosRepository.findById(id);
    if (!cargo) throw new NotFoundException(CARGO_MESSAGES.NOT_FOUND);
    return cargo;
  }

  async create(dto: CreateCargoDto, actorId: string, ip?: string): Promise<CargoResponseDto> {
    if (await this.cargosRepository.findByName(dto.nombre)) {
      throw new ConflictException(CARGO_MESSAGES.DUPLICATE);
    }
    const roles = [...new Set(dto.rolesSugeridosIds ?? [])];
    await this.validarRoles(roles);

    const id = await this.cargosRepository.create(
      { nombre: dto.nombre, descripcion: dto.descripcion ?? null },
      roles,
    );

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "cargos",
      registroId: id,
      valorNuevo: { nombre: dto.nombre, rolesSugeridosIds: roles },
      direccionIp: ip,
    });

    return this.findById(id);
  }

  async update(
    id: string,
    dto: UpdateCargoDto,
    actorId: string,
    ip?: string,
  ): Promise<CargoResponseDto> {
    const actual = await this.findById(id);

    if (dto.nombre && dto.nombre.toLowerCase() !== actual.nombre.toLowerCase()) {
      const existente = await this.cargosRepository.findByName(dto.nombre);
      if (existente && existente.id !== id) {
        throw new ConflictException(CARGO_MESSAGES.DUPLICATE);
      }
    }
    const roles =
      dto.rolesSugeridosIds !== undefined ? [...new Set(dto.rolesSugeridosIds)] : undefined;
    if (roles) await this.validarRoles(roles);

    await this.cargosRepository.update(
      id,
      {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
        ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion } : {}),
      },
      roles,
    );

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "cargos",
      registroId: id,
      valorAnterior: {
        nombre: actual.nombre,
        rolesSugeridosIds: actual.rolesSugeridos.map((p) => p.id),
      },
      valorNuevo: { ...dto },
      direccionIp: ip,
    });

    return this.findById(id);
  }

  async deactivate(id: string, actorId: string, ip?: string): Promise<CargoResponseDto> {
    const cargo = await this.findById(id);
    if ((await this.cargosRepository.countPersonasVigentes(id)) > 0) {
      throw new BadRequestException(CARGO_MESSAGES.IN_USE);
    }
    await this.cargosRepository.setVigente(id, false);
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "cargos",
      registroId: id,
      valorAnterior: { vigente: cargo.vigente },
      valorNuevo: { vigente: false },
      direccionIp: ip,
    });
    return this.findById(id);
  }

  async reactivate(id: string, actorId: string, ip?: string): Promise<CargoResponseDto> {
    const cargo = await this.findById(id);
    await this.cargosRepository.setVigente(id, true);
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "cargos",
      registroId: id,
      valorAnterior: { vigente: cargo.vigente },
      valorNuevo: { vigente: true },
      direccionIp: ip,
    });
    return this.findById(id);
  }

  private async validarRoles(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    if ((await this.cargosRepository.countRolesActivos(ids)) !== ids.length) {
      throw new BadRequestException(CARGO_MESSAGES.ROL_INVALIDO);
    }
  }
}
