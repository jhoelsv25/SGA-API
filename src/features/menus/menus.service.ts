import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { CreateMenuContainerDto } from "./dto/create-menu-container.dto";
import { CreateMenuOptionDto } from "./dto/create-menu-option.dto";
import { CreateModuleDto } from "./dto/create-module.dto";
import {
  MenuItemResponseDto,
  ModuleMenuTreeResponseDto,
  ModuleResponseDto,
} from "./dto/menu-response.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";
import { UpdateModuleDto } from "./dto/update-module.dto";
import { MenusRepository } from "./repositories/menus.repository";

@Injectable()
export class MenusService {
  constructor(
    private readonly menusRepository: MenusRepository,
    private readonly auditService: AuditService,
  ) {}

  async findAllModules(soloVigentes?: boolean): Promise<ModuleResponseDto[]> {
    return this.menusRepository.findAllModules(soloVigentes);
  }

  async findModuleById(id: string): Promise<ModuleResponseDto> {
    const mod = await this.menusRepository.findModuleById(id);
    if (!mod) {
      throw new NotFoundException("Módulo no encontrado.");
    }
    return mod;
  }

  async createModule(
    dto: CreateModuleDto,
    actorId: string,
    ip?: string,
  ): Promise<ModuleResponseDto> {
    const existing = await this.menusRepository.findModuleByCode(dto.codigo);
    if (existing) {
      throw new ConflictException("Ya existe un módulo con ese código.");
    }

    const created = await this.menusRepository.createModule(dto);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "modulos",
      registroId: created.id,
      valorNuevo: { codigo: created.codigo, nombre: created.nombre },
      direccionIp: ip,
    });

    return created;
  }

  async updateModule(
    id: string,
    dto: UpdateModuleDto,
    actorId: string,
    ip?: string,
  ): Promise<ModuleResponseDto> {
    const mod = await this.findModuleById(id);

    if (dto.codigo && dto.codigo.trim().toLowerCase() !== mod.codigo.toLowerCase()) {
      const existing = await this.menusRepository.findModuleByCode(dto.codigo);
      if (existing && existing.id !== id) {
        throw new ConflictException("Ya existe un módulo con ese código.");
      }
    }

    const updated = await this.menusRepository.updateModule(id, dto);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "modulos",
      registroId: id,
      valorAnterior: { codigo: mod.codigo, nombre: mod.nombre, vigente: mod.vigente },
      valorNuevo: {
        codigo: updated.codigo,
        nombre: updated.nombre,
        vigente: updated.vigente,
      },
      direccionIp: ip,
    });

    return updated;
  }

  async findAllMenuItems(moduloId?: string): Promise<MenuItemResponseDto[]> {
    return this.menusRepository.findAllMenuItems(moduloId);
  }

  async findMenuItemById(id: string): Promise<MenuItemResponseDto> {
    const item = await this.menusRepository.findMenuItemById(id);
    if (!item) {
      throw new NotFoundException("Elemento de menú no encontrado.");
    }
    return item;
  }

  async createContainer(
    dto: CreateMenuContainerDto,
    actorId: string,
    ip?: string,
  ): Promise<MenuItemResponseDto> {
    await this.findModuleById(dto.moduloId);

    const created = await this.menusRepository.createMenuItem({
      moduloId: dto.moduloId,
      nombre: dto.nombre,
      icono: dto.icono,
      orden: dto.orden,
      esContenedor: true,
      menuPadreId: null,
      ruta: null,
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "menus",
      registroId: created.id,
      valorNuevo: {
        nombre: created.nombre,
        moduloId: created.moduloId,
        esContenedor: true,
      },
      direccionIp: ip,
    });

    return created;
  }

  async createOption(
    dto: CreateMenuOptionDto,
    actorId: string,
    ip?: string,
  ): Promise<MenuItemResponseDto> {
    // Regla: Una opción del menú debe tener contenedor y ruta
    if (!dto.menuPadreId || !dto.ruta || dto.ruta.trim() === "") {
      throw new BadRequestException("Una opción del menú debe tener contenedor y ruta.");
    }

    await this.findModuleById(dto.moduloId);

    const parent = await this.findMenuItemById(dto.menuPadreId);
    if (!parent.esContenedor) {
      throw new BadRequestException("El menú padre asignado debe ser un contenedor válido.");
    }

    const created = await this.menusRepository.createMenuItem({
      moduloId: dto.moduloId,
      menuPadreId: dto.menuPadreId,
      nombre: dto.nombre,
      ruta: dto.ruta.trim(),
      icono: dto.icono,
      orden: dto.orden,
      esContenedor: false,
      aplicaciones: dto.aplicaciones,
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "menus",
      registroId: created.id,
      valorNuevo: {
        nombre: created.nombre,
        ruta: created.ruta,
        contenedorId: created.menuPadreId,
      },
      direccionIp: ip,
    });

    return created;
  }

  async updateMenuItem(
    id: string,
    dto: UpdateMenuDto,
    actorId: string,
    ip?: string,
  ): Promise<MenuItemResponseDto> {
    const item = await this.findMenuItemById(id);

    // Si es una opción, no se le puede vaciar la ruta
    if (!item.esContenedor && dto.ruta !== undefined && dto.ruta.trim() === "") {
      throw new BadRequestException("Una opción del menú debe tener contenedor y ruta.");
    }

    // Si es un contenedor, no puede tener ruta ni padre
    if (item.esContenedor) {
      if (dto.ruta) {
        throw new BadRequestException("Un contenedor no puede tener ruta.");
      }
      if (dto.menuPadreId) {
        throw new BadRequestException("Un contenedor no puede tener padre.");
      }
    }

    const updated = await this.menusRepository.updateMenuItem(id, dto);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "menus",
      registroId: id,
      valorAnterior: {
        nombre: item.nombre,
        ruta: item.ruta,
        vigente: item.vigente,
      },
      valorNuevo: {
        nombre: updated.nombre,
        ruta: updated.ruta,
        vigente: updated.vigente,
      },
      direccionIp: ip,
    });

    return updated;
  }

  async deleteMenuItem(id: string, actorId: string, ip?: string): Promise<{ message: string }> {
    const item = await this.findMenuItemById(id);

    await this.menusRepository.deleteMenuItem(id);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "eliminar",
      tabla: "menus",
      registroId: id,
      valorAnterior: { nombre: item.nombre, esContenedor: item.esContenedor },
      direccionIp: ip,
    });

    return { message: "Elemento de menú eliminado exitosamente" };
  }

  async getUserMenu(rolId: string, roleName: string): Promise<ModuleMenuTreeResponseDto[]> {
    const esAdmin = roleName === "Administrador";
    return this.menusRepository.getMenuTreeForRole(rolId, esAdmin);
  }
}
